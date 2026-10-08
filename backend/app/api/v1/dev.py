import os
import uuid
import secrets
import asyncio
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.database import get_db, AsyncSessionLocal
from app.core.security import generate_guest_order_token
from app.core.logging import logger
from app.models import (
    Shop,
    Document,
    Order,
    OrderState,
    PrintSpecification,
    ColorMode,
    Orientation,
    Scaling,
    Payment,
    PaymentStatus,
    PaymentGatewayType,
    Printer,
    PrinterStatus,
    Agent,
    PrintJob,
    JobStatus,
    Pickup,
    AuditLog,
)
from app.modules.pricing.service import pricing_engine
from app.modules.queue.service import queue_service
from app.modules.orders.state_machine import OrderStateMachine
from app.modules.pickups.service import pickup_service

router = APIRouter(prefix="/dev", tags=["Development / Demo"])


async def run_demo_print_lifecycle(order_id: uuid.UUID, job_id: uuid.UUID):
    """
    Background executor for live examiner demo:
    Steps through real state machine transitions: QUEUED -> PRINTING -> PRINT_COMPLETED -> PICKUP_READY
    at high speed (1s/page) so complete vertical slice demonstrates in ~8 seconds.
    """
    try:
        # Step 1: Wait 2 seconds so examiner visibly observes order in QUEUED state on the live dashboard
        await asyncio.sleep(2.0)

        async with AsyncSessionLocal() as session:
            res = await session.execute(
                select(PrintJob)
                .options(selectinload(PrintJob.order))
                .where(PrintJob.id == job_id)
            )
            job = res.scalar_one_or_none()
            if not job or not job.order:
                return

            # Check if an external agent already claimed it
            if job.status not in [JobStatus.QUEUED, JobStatus.DISPATCHED]:
                return

            # Transition to DISPATCHED & PRINTING
            job.status = JobStatus.PRINTING
            job.started_at = datetime.now(timezone.utc)
            await OrderStateMachine.transition(
                session=session,
                order=job.order,
                target_state=OrderState.PRINTING,
                actor_type="AGENT",
                actor_id=str(job.agent_id or "campus-agent-01"),
                reason="Local MockPrinterAdapter started spooling pages",
            )
            audit1 = AuditLog(
                shop_id=job.shop_id,
                actor_type="AGENT",
                actor_id="campus-agent-01",
                action="PRINT_JOB_STARTED",
                resource_type="PrintJob",
                resource_id=job.order.order_number,
                metadata_json={"printer": "Xerox WorkCentre 7830", "pages": 3},
            )
            session.add(audit1)
            await session.commit()

        # Step 2: Simulate physical printing at ~1s per page (3 pages)
        for page in range(1, 4):
            await asyncio.sleep(1.0)
            logger.info(f"[DEMO PRINTER] Spooled page {page}/3 for order {job_id}")

        # Step 3: Complete print & engage Privacy Hold (PICKUP_READY)
        async with AsyncSessionLocal() as session:
            res = await session.execute(
                select(PrintJob)
                .options(selectinload(PrintJob.order))
                .where(PrintJob.id == job_id)
            )
            job = res.scalar_one_or_none()
            if not job or not job.order:
                return

            job.status = JobStatus.COMPLETED
            job.completed_at = datetime.now(timezone.utc)

            await OrderStateMachine.transition(
                session=session,
                order=job.order,
                target_state=OrderState.PRINT_COMPLETED,
                actor_type="AGENT",
                actor_id="campus-agent-01",
                reason="Physical printing completed by hardware adapter",
            )

            # Prepare order for counter pickup
            await pickup_service.prepare_for_pickup(session=session, order=job.order)

            audit2 = AuditLog(
                shop_id=job.shop_id,
                actor_type="SYSTEM",
                actor_id="PickupService",
                action="ORDER_READY_FOR_PICKUP",
                resource_type="Order",
                resource_id=job.order.order_number,
                metadata_json={"token": job.order.order_number, "note": f"Job {job.order.order_number} ready for counter pickup"},
            )
            session.add(audit2)
            await session.commit()
            logger.info(f"[DEMO PRINTER] Order {job.order.order_number} successfully placed in PICKUP_READY hold.")

    except Exception as e:
        logger.error(f"[DEMO PRINTER] Error during demo print execution: {e}", exc_info=True)


@router.post("/demo-print")
async def trigger_demo_print(db: AsyncSession = Depends(get_db)):
    """
    DEVELOPMENT-ONLY Examiner Demo Trigger:
    Instantiates a complete live order end-to-end through real domain services:
    Document -> Specification -> Authoritative Pricing -> Payment -> Enqueue -> Lifecycle.
    """
    env = getattr(settings, "ENVIRONMENT", getattr(settings, "APP_ENV", "development")).lower()
    if env in ["production", "prod"] or env not in ["development", "dev", "test"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Demo endpoint disabled in non-development environment.",
        )

    # 1. Fetch shop
    res = await db.execute(
        select(Shop)
        .options(selectinload(Shop.pricing_rules), selectinload(Shop.printers), selectinload(Shop.agents))
        .where(Shop.slug == "campus-xerox")
    )
    shop = res.scalar_one_or_none()
    if not shop:
        res = await db.execute(select(Shop).options(selectinload(Shop.pricing_rules)).limit(1))
        shop = res.scalar_one_or_none()
    if not shop:
        raise HTTPException(status_code=404, detail="No demonstration shop configured.")

    # 2. Document record
    filename = "sample-print.pdf"
    doc = Document(
        shop_id=shop.id,
        original_filename=filename,
        sanitized_filename=filename,
        storage_path=f"storage_data/{filename}",
        mime_type="application/pdf",
        file_size_bytes=142000,
        page_count=3,
        checksum_sha256=secrets.token_hex(32),
    )
    db.add(doc)
    await db.flush()

    # 3. Print specification
    spec = PrintSpecification(
        order_id=uuid.uuid4(),
        copies=1,
        color_mode=ColorMode.BW,
        duplex=True,
        paper_size="A4",
        page_range="all",
        orientation=Orientation.PORTRAIT,
        scaling=Scaling.FIT,
    )

    # 4. Authoritative Pricing
    active_rule = next((r for r in shop.pricing_rules if r.is_active), None)
    if not active_rule:
        rate_cents = doc.page_count * 100  # ₹1.00 / page fallback
        breakdown = {
            "active_pages": doc.page_count,
            "copies": 1,
            "color_mode": "BW",
            "duplex": True,
            "final_amount_cents": rate_cents,
            "formatted_total": f"₹{rate_cents / 100:.2f}",
            "currency": "INR",
        }
    else:
        breakdown = pricing_engine.calculate_price(
            document_page_count=doc.page_count,
            spec=spec,
            rule=active_rule,
        )

    # 5. Create Order
    order_number = f"HDS-{secrets.randbelow(900) + 1050}"
    guest_token = generate_guest_order_token()

    order = Order(
        shop_id=shop.id,
        order_number=order_number,
        guest_access_token=guest_token,
        document_id=doc.id,
        status=OrderState.CREATED,
        total_amount_cents=breakdown["final_amount_cents"],
        currency=breakdown.get("currency", "INR"),
        pricing_breakdown_json=breakdown,
    )
    db.add(order)
    await db.flush()

    spec.order_id = order.id
    db.add(spec)

    # 6. Mock Payment Settled
    payment = Payment(
        order_id=order.id,
        shop_id=shop.id,
        gateway=PaymentGatewayType.MOCK,
        gateway_payment_id=f"pay_mock_{secrets.token_hex(8)}",
        gateway_order_id=f"ord_mock_{secrets.token_hex(8)}",
        amount_cents=order.total_amount_cents,
        currency="INR",
        status=PaymentStatus.SUCCESS,
    )
    db.add(payment)

    await OrderStateMachine.transition(
        session=db,
        order=order,
        target_state=OrderState.PAYMENT_PENDING,
        actor_type="SYSTEM",
        reason="Demo order initiated",
    )
    await OrderStateMachine.transition(
        session=db,
        order=order,
        target_state=OrderState.PAID,
        actor_type="SYSTEM",
        reason="Demo sandbox payment settled",
    )

    # 7. Queue Order (Priority 1)
    job = await queue_service.enqueue_order(session=db, order=order, priority=1)

    # Assign default online printer
    online_printer = next((p for p in shop.printers if p.status == PrinterStatus.ONLINE), None)
    if online_printer:
        job.printer_id = online_printer.id
        job.agent_id = online_printer.agent_id

    audit = AuditLog(
        shop_id=shop.id,
        actor_type="USER",
        actor_id="OperatorDemo",
        action="DEMO_PRINT_TRIGGERED",
        resource_type="Order",
        resource_id=order.order_number,
        metadata_json={"order_number": order.order_number, "amount_cents": order.total_amount_cents},
    )
    session_audit = audit
    db.add(session_audit)

    await db.commit()
    await db.refresh(order)
    await db.refresh(job)

    # Spawn background progression worker
    asyncio.create_task(run_demo_print_lifecycle(order.id, job.id))

    return {
        "status": "QUEUED",
        "order_id": str(order.id),
        "order_number": order.order_number,
        "guest_access_token": order.guest_access_token,
        "amount_formatted": breakdown["formatted_total"],
        "message": f"Demo print job {order.order_number} enqueued. Execution starting in background.",
    }
