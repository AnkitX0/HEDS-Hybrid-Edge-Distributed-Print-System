import uuid
import secrets
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import generate_guest_order_token
from app.modules.tenants.models import Shop
from app.modules.documents.models import Document
from app.modules.documents.service import document_service
from app.modules.pricing.models import PricingRule
from app.modules.pricing.service import pricing_engine
from app.modules.orders.models import (
    Order,
    OrderState,
    PrintSpecification,
    ColorMode,
    Orientation,
    Scaling,
)
from app.modules.queue.models import PrintJob, JobStatus
from app.modules.pickups.models import Pickup
from app.api.v1.schemas import OrderResponse

router = APIRouter(tags=["Orders"])


@router.post("/shops/{shop_slug}/orders", response_model=OrderResponse)
async def create_student_order(
    shop_slug: str,
    file: UploadFile = File(...),
    copies: int = Form(1),
    color_mode: str = Form("BW"),
    duplex: bool = Form(False),
    paper_size: str = Form("A4"),
    page_range: str = Form("all"),
    orientation: str = Form("PORTRAIT"),
    scaling: str = Form("FIT"),
    db: AsyncSession = Depends(get_db),
):
    """
    Primary Student Entrypoint:
    Validates file, inspects page count, calculates authoritative price,
    and creates order in CREATED state with a secure guest token.
    """
    # Find shop
    res = await db.execute(
        select(Shop)
        .options(selectinload(Shop.pricing_rules))
        .where(Shop.slug == shop_slug, Shop.is_active == True)
    )
    shop = res.scalar_one_or_none()
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found or inactive")

    if shop.is_queue_paused:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="This print shop's queue is temporarily paused by the operator.",
        )

    # Validate and process uploaded document
    try:
        sanitized_name, storage_path, file_size, checksum, page_count = (
            await document_service.process_upload(
                file_obj=file.file,
                original_filename=file.filename or "upload.pdf",
                declared_mime_type=file.content_type or "application/pdf",
            )
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    doc = Document(
        shop_id=shop.id,
        original_filename=file.filename or "upload.pdf",
        sanitized_filename=sanitized_name,
        storage_path=storage_path,
        mime_type=file.content_type or "application/pdf",
        file_size_bytes=file_size,
        page_count=page_count,
        checksum_sha256=checksum,
    )
    db.add(doc)
    await db.flush()

    # Create PrintSpecification
    spec = PrintSpecification(
        order_id=uuid.uuid4(),  # placeholder until order ID is assigned
        copies=max(1, copies),
        color_mode=ColorMode(color_mode.upper()),
        duplex=duplex,
        paper_size=paper_size.upper(),
        page_range=page_range.strip(),
        orientation=Orientation(orientation.upper()),
        scaling=Scaling(scaling.upper()),
    )

    # Find active pricing rule
    active_rule = next((r for r in shop.pricing_rules if r.is_active), None)
    if not active_rule:
        # Default fallback rule if none seeded
        active_rule = PricingRule(
            shop_id=shop.id,
            bw_per_page_cents=200,
            color_per_page_cents=1000,
            duplex_discount_cents=50,
            minimum_order_cents=200,
        )
        db.add(active_rule)
        await db.flush()

    # Calculate authoritative pricing breakdown
    breakdown = pricing_engine.calculate_price(
        document_page_count=page_count,
        spec=spec,
        rule=active_rule,
    )

    order_num = f"ORD-{secrets.randbelow(90000) + 10000}"
    guest_token = generate_guest_order_token()

    order = Order(
        shop_id=shop.id,
        order_number=order_num,
        guest_access_token=guest_token,
        document_id=doc.id,
        status=OrderState.CREATED,
        total_amount_cents=breakdown["final_amount_cents"],
        currency=breakdown["currency"],
        pricing_breakdown_json=breakdown,
    )
    db.add(order)
    await db.flush()

    spec.order_id = order.id
    db.add(spec)
    await db.commit()
    await db.refresh(order)

    return OrderResponse(
        id=str(order.id),
        order_number=order.order_number,
        guest_access_token=order.guest_access_token,
        shop_id=str(order.shop_id),
        status=order.status,
        total_amount_cents=order.total_amount_cents,
        currency=order.currency,
        pricing_breakdown=order.pricing_breakdown_json,
        document_name=doc.original_filename,
        document_pages=doc.page_count,
        created_at=order.created_at,
    )


@router.get("/orders/{guest_token}", response_model=OrderResponse)
async def get_order_by_token(guest_token: str, db: AsyncSession = Depends(get_db)):
    """
    Public student tracking endpoint:
    Uses cryptographically random guest token. Never exposes sequential IDs.
    Calculates dynamic queue position and wait time.
    """
    stmt = (
        select(Order)
        .options(
            selectinload(Order.document),
            selectinload(Order.print_specification),
            selectinload(Order.print_job),
            selectinload(Order.pickup),
        )
        .where(Order.guest_access_token == guest_token)
    )
    res = await db.execute(stmt)
    order = res.scalar_one_or_none()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Queue position calculation
    queue_pos = None
    estimated_wait = None

    if order.status in [OrderState.QUEUED, OrderState.DISPATCHED]:
        pos_stmt = select(func.count(PrintJob.id)).where(
            PrintJob.shop_id == order.shop_id,
            PrintJob.status == JobStatus.QUEUED,
            PrintJob.queued_at <= (order.print_job.queued_at if order.print_job else order.created_at),
        )
        pos_res = await db.execute(pos_stmt)
        queue_pos = pos_res.scalar_one() or 1
        estimated_wait = max(1, queue_pos * 2)
    elif order.status == OrderState.PRINTING:
        queue_pos = 0
        estimated_wait = 1

    # OTP is exposed only when state is PICKUP_READY or COMPLETED
    plain_otp = None
    if order.status in [OrderState.PICKUP_READY, OrderState.COMPLETED]:
        # Student bearer can see their pickup code
        if order.pickup and hasattr(order.pickup, "otp_hash"):
            plain_otp = getattr(order, "_last_plain_otp", None)

    return OrderResponse(
        id=str(order.id),
        order_number=order.order_number,
        guest_access_token=order.guest_access_token,
        shop_id=str(order.shop_id),
        status=order.status,
        total_amount_cents=order.total_amount_cents,
        currency=order.currency,
        pricing_breakdown=order.pricing_breakdown_json,
        queue_position=queue_pos,
        estimated_wait_minutes=estimated_wait,
        document_name=order.document.original_filename if order.document else "document.pdf",
        document_pages=order.document.page_count if order.document else 1,
        pickup_otp=plain_otp,
        created_at=order.created_at,
    )
