import uuid
import secrets
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Response, status
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
    OrderDocument,
    OrderState,
    PrintSpecification,
    ColorMode,
    Orientation,
    Scaling,
)
from app.modules.queue.models import PrintJob, JobStatus
from app.modules.orders.receipt import generate_order_receipt_pdf
from app.api.deps import require_shop_operator, get_authorized_shop
from app.api.v1.schemas import (
    OrderResponse,
    DocumentUploadResponse,
    MultiDocumentUploadResponse,
    DocumentItemDetail,
    PricingQuoteRequest,
    PricingQuoteResponse,
    BatchOrderCreateRequest,
    BatchOrderItemInput,
)
from app.core.logging import logger

router = APIRouter(tags=["Orders"])



@router.post("/shops/{shop_slug}/documents/upload", response_model=DocumentUploadResponse)
async def upload_shop_document(
    shop_slug: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Step 1 of Student Flow:
    Upload and authoritatively inspect document.
    Validates MIME type, PDF header, corruption, password protection, and extracts exact page count.
    """
    res = await db.execute(
        select(Shop).where(Shop.slug == shop_slug, Shop.is_active == True)
    )
    shop = res.scalar_one_or_none()
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found or inactive")

    try:
        sanitized_name, storage_path, file_size, checksum, page_count = (
            await document_service.process_upload(
                file_obj=file.file,
                original_filename=file.filename or "upload.pdf",
                declared_mime_type=file.content_type or "application/pdf",
            )
        )
    except Exception as e:
        logger.error(f"[UPLOAD] Failed to process document upload: {e}")
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
    await db.commit()
    await db.refresh(doc)

    return DocumentUploadResponse(
        document_id=str(doc.id),
        filename=doc.original_filename,
        file_size_bytes=doc.file_size_bytes,
        page_count=doc.page_count,
        mime_type=doc.mime_type,
    )


@router.post("/shops/{shop_slug}/documents/upload-multiple", response_model=MultiDocumentUploadResponse)
async def upload_multiple_shop_documents(
    shop_slug: str,
    files: List[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Step 1 of Multi-File Student Flow:
    Accepts 1 to 10 documents (PDF, DOC, DOCX, JPG, JPEG, PNG, WEBP).
    Authoritatively inspects, converts Word/Images to printable PDF,
    determines page counts, merges into a canonical printable PDF,
    and returns authoritative total pages and document breakdown.
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files provided for upload.")

    if len(files) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 files allowed per upload.")

    res = await db.execute(
        select(Shop).where(Shop.slug == shop_slug, Shop.is_active == True)
    )
    shop = res.scalar_one_or_none()
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found or inactive")

    uploaded_tuples = []
    for f in files:
        uploaded_tuples.append((
            f.file,
            f.filename or "document.pdf",
            f.content_type or "application/octet-stream",
        ))

    try:
        composite_name, storage_path, total_size, checksum, total_pages, file_details = (
            await document_service.process_multi_upload(uploaded_tuples)
        )
    except Exception as e:
        logger.error(f"[UPLOAD-MULTI] Failed to process documents: {e}")
        raise HTTPException(status_code=400, detail=str(e))

    doc = Document(
        shop_id=shop.id,
        original_filename=composite_name if len(files) > 1 else files[0].filename or "document.pdf",
        sanitized_filename=composite_name,
        storage_path=storage_path,
        mime_type="application/pdf",
        file_size_bytes=total_size,
        page_count=total_pages,
        checksum_sha256=checksum,
    )
    db.add(doc)

    doc_items = []
    for item in file_details:
        if item.get("status") == "READY" and item.get("storage_path"):
            item_doc = Document(
                shop_id=shop.id,
                original_filename=item["filename"],
                sanitized_filename=item["sanitized_name"],
                storage_path=item["storage_path"],
                mime_type="application/pdf",
                file_size_bytes=item["file_size_bytes"],
                page_count=item["page_count"],
                checksum_sha256=item.get("checksum") or checksum,
            )
            db.add(item_doc)
            await db.flush()
            doc_items.append(
                DocumentItemDetail(
                    document_id=str(item_doc.id),
                    filename=item["filename"],
                    page_count=item["page_count"],
                    file_size_bytes=item["file_size_bytes"],
                    mime_type=item["mime_type"],
                    status="READY",
                    error=None,
                )
            )
        else:
            doc_items.append(
                DocumentItemDetail(
                    document_id=None,
                    filename=item["filename"],
                    page_count=0,
                    file_size_bytes=item["file_size_bytes"],
                    mime_type=item["mime_type"],
                    status="ERROR",
                    error=item.get("error") or "Failed to process document",
                )
            )

    await db.commit()
    await db.refresh(doc)

    return MultiDocumentUploadResponse(
        document_id=str(doc.id),
        filename=doc.original_filename,
        total_size_bytes=total_size,
        total_pages=total_pages,
        mime_type="application/pdf",
        documents=doc_items,
    )


@router.post("/shops/{shop_slug}/pricing/quote", response_model=PricingQuoteResponse)
async def get_pricing_quote(
    shop_slug: str,
    quote_req: PricingQuoteRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Calculates authoritative price breakdown based on backend pricing rules
    and exact document page count. Supports single-file or multi-document batch.
    """
    res = await db.execute(
        select(Shop)
        .options(selectinload(Shop.pricing_rules))
        .where(Shop.slug == shop_slug, Shop.is_active == True)
    )
    shop = res.scalar_one_or_none()
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found or inactive")

    active_rule = next((r for r in shop.pricing_rules if r.is_active), None)
    if not active_rule:
        active_rule = PricingRule(
            shop_id=shop.id,
            bw_per_page_cents=100,      # ₹1.00 base rate
            color_per_page_cents=1000,
            duplex_discount_cents=0,
            minimum_order_cents=100,    # ₹1.00 minimum
        )
        db.add(active_rule)
        await db.flush()

    # Multi-Document Batch Quote
    if quote_req.items and len(quote_req.items) > 0:
        batch_items = []
        for it in quote_req.items:
            doc_res = await db.execute(
                select(Document).where(
                    Document.id == uuid.UUID(it.document_id),
                    Document.shop_id == shop.id,
                )
            )
            item_doc = doc_res.scalar_one_or_none()
            if not item_doc:
                raise HTTPException(status_code=404, detail=f"Document '{it.document_id}' not found for this shop")

            spec = PrintSpecification(
                order_id=uuid.uuid4(),
                copies=max(1, it.copies),
                color_mode=it.color_mode,
                duplex=it.duplex,
                paper_size=it.paper_size.upper(),
                page_range=it.page_range.strip() if it.page_range else "all",
                orientation=it.orientation,
                scaling=it.scaling,
            )
            batch_items.append({
                "document_id": item_doc.id,
                "document_name": item_doc.original_filename,
                "page_count": item_doc.page_count,
                "spec": spec,
            })

        breakdown = pricing_engine.calculate_batch_price(items=batch_items, rule=active_rule)
        first_item = breakdown["items"][0] if breakdown["items"] else {}

        return PricingQuoteResponse(
            document_page_count=breakdown.get("total_pages"),
            active_pages=breakdown.get("total_active_pages"),
            copies=first_item.get("copies", 1),
            color_mode=first_item.get("color_mode", "BW"),
            duplex=first_item.get("duplex", False),
            paper_size=first_item.get("paper_size", "A4"),
            sheets_count=breakdown.get("total_sheets"),
            rate_per_page_cents=first_item.get("rate_per_page_cents", active_rule.bw_per_page_cents),
            raw_total_cents=breakdown["raw_total_cents"],
            duplex_discount_cents=breakdown["duplex_discount_cents"],
            subtotal_cents=breakdown["subtotal_cents"],
            minimum_order_cents=breakdown["minimum_order_cents"],
            final_amount_cents=breakdown["final_amount_cents"],
            currency=breakdown["currency"],
            formatted_total=breakdown["formatted_total"],
            total_documents=breakdown["total_documents"],
            total_pages=breakdown["total_pages"],
            items=breakdown["items"],
        )

    # Legacy Single-Document Quote
    page_count = quote_req.document_page_count
    if quote_req.document_id:
        doc_res = await db.execute(
            select(Document).where(
                Document.id == uuid.UUID(quote_req.document_id),
                Document.shop_id == shop.id,
            )
        )
        doc = doc_res.scalar_one_or_none()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found for this shop")
        page_count = doc.page_count

    if not page_count or page_count <= 0:
        raise HTTPException(status_code=400, detail="Valid document_id or positive document_page_count required")

    spec = PrintSpecification(
        order_id=uuid.uuid4(),
        copies=max(1, quote_req.copies),
        color_mode=quote_req.color_mode,
        duplex=quote_req.duplex,
        paper_size=quote_req.paper_size.upper(),
        page_range=quote_req.page_range.strip() if quote_req.page_range else "all",
        orientation=Orientation.PORTRAIT,
        scaling=Scaling.FIT,
    )

    breakdown = pricing_engine.calculate_price(
        document_page_count=page_count,
        spec=spec,
        rule=active_rule,
    )

    return PricingQuoteResponse(
        document_page_count=page_count,
        active_pages=breakdown["active_pages"],
        copies=breakdown["copies"],
        color_mode=breakdown["color_mode"],
        duplex=breakdown["duplex"],
        paper_size=breakdown["paper_size"],
        sheets_count=breakdown["sheets_count"],
        rate_per_page_cents=breakdown["rate_per_page_cents"],
        raw_total_cents=breakdown["raw_total_cents"],
        duplex_discount_cents=breakdown["duplex_discount_cents"],
        subtotal_cents=breakdown["subtotal_cents"],
        minimum_order_cents=breakdown["minimum_order_cents"],
        final_amount_cents=breakdown["final_amount_cents"],
        currency=breakdown["currency"],
        formatted_total=breakdown["formatted_total"],
    )


async def generate_unique_order_number(db: AsyncSession) -> str:
    for _ in range(15):
        num = f"ORD-{secrets.randbelow(900000) + 100000}"
        res = await db.execute(select(Order.id).where(Order.order_number == num))
        if not res.scalar_one_or_none():
            return num
    return f"ORD-{secrets.token_hex(4).upper()}"


@router.post("/shops/{shop_slug}/orders", response_model=OrderResponse)
async def create_student_order(
    shop_slug: str,
    document_id: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    copies: int = Form(1),
    color_mode: str = Form("BW"),
    duplex: bool = Form(False),
    paper_size: str = Form("A4"),
    page_range: str = Form("all"),
    orientation: str = Form("PORTRAIT"),
    scaling: str = Form("FIT"),
    batch_items_json: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Primary Student Entrypoint:
    Supports both single-document orders and multi-document print batches.
    Validates files, calculates authoritative price, persists individual PrintSpecifications
    and OrderDocuments, and transitions order to CREATED state.
    """
    import json
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

    active_rule = next((r for r in shop.pricing_rules if r.is_active), None)
    if not active_rule:
        active_rule = PricingRule(
            shop_id=shop.id,
            bw_per_page_cents=100,
            color_per_page_cents=1000,
            duplex_discount_cents=0,
            minimum_order_cents=100,
        )
        db.add(active_rule)
        await db.flush()

    # Case A: Multi-Document Batch Order via batch_items_json
    if batch_items_json:
        try:
            raw_items = json.loads(batch_items_json)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid batch_items_json payload")

        if not raw_items or not isinstance(raw_items, list):
            raise HTTPException(status_code=400, detail="batch_items_json must be a non-empty list")

        batch_items = []
        for it in raw_items:
            doc_id_str = it.get("document_id")
            if not doc_id_str:
                raise HTTPException(status_code=400, detail="Each batch item must have a document_id")

            doc_res = await db.execute(
                select(Document).where(
                    Document.id == uuid.UUID(doc_id_str),
                    Document.shop_id == shop.id,
                )
            )
            item_doc = doc_res.scalar_one_or_none()
            if not item_doc:
                raise HTTPException(status_code=404, detail=f"Document '{doc_id_str}' not found")

            c_mode = ColorMode(it.get("color_mode", "BW").upper())
            orient = Orientation(it.get("orientation", "PORTRAIT").upper())
            scale = Scaling(it.get("scaling", "FIT").upper())

            spec = PrintSpecification(
                order_id=uuid.uuid4(),
                copies=max(1, int(it.get("copies", 1))),
                color_mode=c_mode,
                duplex=bool(it.get("duplex", False)),
                paper_size=str(it.get("paper_size", "A4")).upper(),
                page_range=str(it.get("page_range", "all")).strip(),
                orientation=orient,
                scaling=scale,
            )
            batch_items.append({
                "document_id": item_doc.id,
                "document_name": item_doc.original_filename,
                "page_count": item_doc.page_count,
                "spec": spec,
            })

        breakdown = pricing_engine.calculate_batch_price(items=batch_items, rule=active_rule)
        order_num = await generate_unique_order_number(db)
        guest_token = generate_guest_order_token()

        order = Order(
            shop_id=shop.id,
            order_number=order_num,
            guest_access_token=guest_token,
            document_id=batch_items[0]["document_id"],
            status=OrderState.CREATED,
            total_amount_cents=breakdown["final_amount_cents"],
            currency=breakdown["currency"],
            pricing_breakdown_json=breakdown,
        )
        db.add(order)
        await db.flush()

        docs_response = []
        for idx, item in enumerate(batch_items):
            spec_obj = item["spec"]
            spec_obj.order_id = order.id
            db.add(spec_obj)
            await db.flush()

            order_doc = OrderDocument(
                order_id=order.id,
                document_id=item["document_id"],
                print_specification_id=spec_obj.id,
                sequence=idx + 1,
                page_count=item["page_count"],
                copies=spec_obj.copies,
                calculated_price_cents=breakdown["items"][idx]["final_amount_cents"],
            )
            db.add(order_doc)
            await db.flush()

            docs_response.append({
                "id": str(order_doc.id),
                "document_id": str(item["document_id"]),
                "sequence": idx + 1,
                "filename": item["document_name"],
                "page_count": item["page_count"],
                "copies": spec_obj.copies,
                "color_mode": spec_obj.color_mode.value,
                "duplex": spec_obj.duplex,
                "paper_size": spec_obj.paper_size,
                "page_range": spec_obj.page_range,
                "orientation": spec_obj.orientation.value,
                "scaling": spec_obj.scaling.value,
                "price_cents": order_doc.calculated_price_cents,
                "formatted_price": f"₹{order_doc.calculated_price_cents / 100:.2f}",
            })

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
            document_name=f"{len(batch_items)} documents" if len(batch_items) > 1 else batch_items[0]["document_name"],
            document_pages=breakdown.get("total_pages", 1),
            documents=docs_response,
            created_at=order.created_at,
        )

    # Case B: Legacy Single-File Order
    doc = None
    if document_id:
        doc_res = await db.execute(
            select(Document).where(
                Document.id == uuid.UUID(document_id),
                Document.shop_id == shop.id,
            )
        )
        doc = doc_res.scalar_one_or_none()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found for this shop")
        page_count = doc.page_count
    elif file:
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
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either document_id, file, or batch_items_json must be provided.",
        )

    spec = PrintSpecification(
        order_id=uuid.uuid4(),
        copies=max(1, copies),
        color_mode=ColorMode(color_mode.upper()),
        duplex=duplex,
        paper_size=paper_size.upper(),
        page_range=page_range.strip(),
        orientation=Orientation(orientation.upper()),
        scaling=Scaling(scaling.upper()),
    )

    breakdown = pricing_engine.calculate_price(
        document_page_count=page_count,
        spec=spec,
        rule=active_rule,
    )

    order_num = await generate_unique_order_number(db)
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
    await db.flush()

    order_doc = OrderDocument(
        order_id=order.id,
        document_id=doc.id,
        print_specification_id=spec.id,
        sequence=1,
        page_count=doc.page_count,
        copies=spec.copies,
        calculated_price_cents=breakdown["final_amount_cents"],
    )
    db.add(order_doc)
    await db.commit()
    await db.refresh(order)

    docs_response = [{
        "id": str(order_doc.id),
        "document_id": str(doc.id),
        "sequence": 1,
        "filename": doc.original_filename,
        "page_count": doc.page_count,
        "copies": spec.copies,
        "color_mode": spec.color_mode.value,
        "duplex": spec.duplex,
        "paper_size": spec.paper_size,
        "page_range": spec.page_range,
        "orientation": spec.orientation.value,
        "scaling": spec.scaling.value,
        "price_cents": order.total_amount_cents,
        "formatted_price": f"₹{order.total_amount_cents / 100:.2f}",
    }]

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
        documents=docs_response,
        created_at=order.created_at,
    )


@router.post("/shops/{shop_slug}/orders/batch", response_model=OrderResponse)
async def create_batch_student_order(
    shop_slug: str,
    payload: BatchOrderCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Dedicated JSON Batch Order Entrypoint:
    Accepts BatchOrderCreateRequest with itemized documents and configurations.
    """
    import json
    batch_json = json.dumps([item.model_dump() for item in payload.items])
    return await create_student_order(
        shop_slug=shop_slug,
        batch_items_json=batch_json,
        db=db,
    )


@router.get("/orders/{guest_token}", response_model=OrderResponse)
async def get_order_by_token(guest_token: str, db: AsyncSession = Depends(get_db)):
    """
    Public student tracking endpoint:
    Uses cryptographically random guest token. Never exposes sequential IDs.
    Returns itemized batch documents, dynamic queue position and wait time.
    """
    stmt = (
        select(Order)
        .options(
            selectinload(Order.document),
            selectinload(Order.print_specifications),
            selectinload(Order.order_documents).selectinload(OrderDocument.document),
            selectinload(Order.order_documents).selectinload(OrderDocument.print_specification),
            selectinload(Order.print_jobs),
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
        queued_ref = order.print_jobs[0].queued_at if (order.print_jobs and len(order.print_jobs) > 0) else order.created_at
        pos_stmt = select(func.count(PrintJob.id)).where(
            PrintJob.shop_id == order.shop_id,
            PrintJob.status == JobStatus.QUEUED,
            PrintJob.queued_at <= queued_ref,
        )
        pos_res = await db.execute(pos_stmt)
        queue_pos = pos_res.scalar_one() or 1
        estimated_wait = max(1, queue_pos * 2)
    elif order.status == OrderState.PRINTING:
        queue_pos = 0
        estimated_wait = 1

    docs_summary = []
    total_docs_pages = 0
    if order.order_documents:
        for od in sorted(order.order_documents, key=lambda x: x.sequence):
            od_spec = od.print_specification or order.print_specification
            p_cents = od.calculated_price_cents
            docs_summary.append({
                "id": str(od.id),
                "document_id": str(od.document_id),
                "sequence": od.sequence,
                "filename": od.document.original_filename if od.document else "Document",
                "page_count": od.page_count,
                "copies": od.copies,
                "color_mode": od_spec.color_mode.value if (od_spec and hasattr(od_spec.color_mode, "value")) else str(od_spec.color_mode if od_spec else "BW"),
                "duplex": od_spec.duplex if od_spec else False,
                "paper_size": od_spec.paper_size if od_spec else "A4",
                "page_range": od_spec.page_range if od_spec else "all",
                "price_cents": p_cents,
                "formatted_price": f"₹{p_cents / 100:.2f}",
            })
            total_docs_pages += od.page_count

    doc_display_name = order.document.original_filename if order.document else "document.pdf"
    if docs_summary and len(docs_summary) > 1:
        doc_display_name = f"{len(docs_summary)} documents"

    doc_pages_count = total_docs_pages if total_docs_pages > 0 else (order.document.page_count if order.document else 1)

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
        document_name=doc_display_name,
        document_pages=doc_pages_count,
        documents=docs_summary if docs_summary else None,
        created_at=order.created_at,
    )


@router.get("/orders/{guest_token}/events")
async def stream_order_events(guest_token: str):
    """
    Server-Sent Events (SSE) stream for sub-second order progress updates.
    Yields JSON payloads whenever order state mutates until reaching terminal state.
    """
    import json
    import asyncio
    from fastapi.responses import StreamingResponse
    from app.core.database import AsyncSessionLocal

    async def event_generator():
        last_status = None
        for _ in range(60):  # Stream for up to ~90s before native browser auto-reconnect
            async with AsyncSessionLocal() as session:
                res = await session.execute(
                    select(Order)
                    .options(
                        selectinload(Order.document),
                        selectinload(Order.pickup),
                        selectinload(Order.print_jobs),
                    )
                    .where(Order.guest_access_token == guest_token)
                )
                order = res.scalar_one_or_none()
                if not order:
                    yield "event: error\ndata: {\"error\": \"Order not found\"}\n\n"
                    break

                curr_status = order.status.value

                if curr_status != last_status:
                    last_status = curr_status
                    payload = {
                        "id": str(order.id),
                        "order_number": order.order_number,
                        "status": curr_status,
                        "total_amount_cents": order.total_amount_cents,
                    }
                    yield f"event: status\ndata: {json.dumps(payload)}\n\n"

                if curr_status in ["COMPLETED", "CANCELLED", "EXPIRED"]:
                    break

            yield ": keep-alive\n\n"
            await asyncio.sleep(1.5)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/orders/{guest_token}/receipt.pdf")
async def get_order_receipt_pdf_endpoint(
    guest_token: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Public student receipt download:
    Renders authoritative, clean PDF receipt generated directly from database order record.
    Supports complete batch itemization.
    """
    stmt = (
        select(Order)
        .options(
            selectinload(Order.document),
            selectinload(Order.print_specifications),
            selectinload(Order.order_documents).selectinload(OrderDocument.document),
            selectinload(Order.order_documents).selectinload(OrderDocument.print_specification),
            selectinload(Order.payment),
            selectinload(Order.shop),
        )
        .where(Order.guest_access_token == guest_token)
    )
    res = await db.execute(stmt)
    order = res.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    shop = order.shop
    shop_name = shop.name if shop else "Campus Xerox"
    spec = order.print_specification
    doc = order.document

    payment_method = "UPI / Razorpay" if order.payment and order.payment.gateway == "RAZORPAY" else "UPI / Digital Pay"
    gateway_id = order.payment.gateway_payment_id if order.payment else None

    items_list = []
    if order.order_documents:
        for od in sorted(order.order_documents, key=lambda x: x.sequence):
            od_spec = od.print_specification or spec
            items_list.append({
                "filename": od.document.original_filename if od.document else "Document",
                "page_count": od.page_count,
                "copies": od.copies,
                "color_mode": od_spec.color_mode.value if (od_spec and hasattr(od_spec.color_mode, "value")) else str(od_spec.color_mode if od_spec else "BW"),
                "duplex": od_spec.duplex if od_spec else False,
                "paper_size": od_spec.paper_size if od_spec else "A4",
                "price_cents": od.calculated_price_cents,
            })

    pdf_bytes = generate_order_receipt_pdf(
        shop_name=shop_name,
        order_number=order.order_number,
        guest_token=order.guest_access_token,
        document_name=doc.original_filename if doc else "document.pdf",
        page_count=doc.page_count if doc else 1,
        copies=spec.copies if spec else 1,
        color_mode=spec.color_mode.value if spec else "BW",
        duplex=spec.duplex if spec else False,
        paper_size=spec.paper_size if spec else "A4",
        total_amount_cents=order.total_amount_cents,
        created_at=order.created_at,
        pricing_breakdown=order.pricing_breakdown_json,
        payment_method=payment_method,
        gateway_id=gateway_id,
        items=items_list,
    )

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="receipt_{order.order_number}.pdf"',
            "Cache-Control": "private, max-age=60",
        },
    )


@router.get("/orders/{guest_token}/receipt")
async def get_order_receipt_json_endpoint(
    guest_token: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Returns structured metadata for student receipt display with batch itemization.
    """
    stmt = (
        select(Order)
        .options(
            selectinload(Order.document),
            selectinload(Order.print_specifications),
            selectinload(Order.order_documents).selectinload(OrderDocument.document),
            selectinload(Order.order_documents).selectinload(OrderDocument.print_specification),
            selectinload(Order.payment),
            selectinload(Order.shop),
        )
        .where(Order.guest_access_token == guest_token)
    )
    res = await db.execute(stmt)
    order = res.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    shop = order.shop
    spec = order.print_specification
    doc = order.document
    token_display = f"#{order.order_number.split('-')[-1]}" if "-" in order.order_number else f"#{order.order_number}"

    items_list = []
    if order.order_documents:
        for od in sorted(order.order_documents, key=lambda x: x.sequence):
            od_spec = od.print_specification or spec
            items_list.append({
                "sequence": od.sequence,
                "filename": od.document.original_filename if od.document else "Document",
                "page_count": od.page_count,
                "copies": od.copies,
                "color_mode": od_spec.color_mode.value if (od_spec and hasattr(od_spec.color_mode, "value")) else str(od_spec.color_mode if od_spec else "BW"),
                "duplex": od_spec.duplex if od_spec else False,
                "paper_size": od_spec.paper_size if od_spec else "A4",
                "price_cents": od.calculated_price_cents,
                "formatted_price": f"₹{od.calculated_price_cents / 100:.2f}",
            })

    return {
        "order_number": order.order_number,
        "token_display": token_display,
        "shop_name": shop.name if shop else "Campus Xerox",
        "document_name": doc.original_filename if doc else "document.pdf",
        "page_count": doc.page_count if doc else 1,
        "copies": spec.copies if spec else 1,
        "color_mode": spec.color_mode.value if spec else "BW",
        "duplex": spec.duplex if spec else False,
        "paper_size": spec.paper_size if spec else "A4",
        "total_amount_cents": order.total_amount_cents,
        "currency": order.currency,
        "status": order.status.value,
        "created_at": order.created_at.isoformat() if order.created_at else None,
        "documents": items_list,
        "pricing_breakdown": order.pricing_breakdown_json,
        "pdf_url": f"/api/v1/orders/{guest_token}/receipt.pdf",
    }


@router.get("/shop/orders")
async def list_shop_orders(
    status: Optional[str] = None,
    limit: int = 50,
    shop: Shop = Depends(get_authorized_shop),
    db: AsyncSession = Depends(get_db),
):
    """
    Operator endpoint: List recent orders with search and status filtering, scoped to authorized shop.
    Returns complete batch document itemization.
    """
    stmt = (
        select(Order)
        .options(
            selectinload(Order.document),
            selectinload(Order.print_specifications),
            selectinload(Order.order_documents).selectinload(OrderDocument.document),
            selectinload(Order.order_documents).selectinload(OrderDocument.print_specification),
            selectinload(Order.print_jobs).selectinload(PrintJob.printer),
            selectinload(Order.payment),
        )
        .where(Order.shop_id == shop.id)
        .order_by(Order.created_at.desc())
        .limit(min(100, max(1, limit)))
    )
    if status:
        try:
            target_state = OrderState(status.upper())
            stmt = stmt.where(Order.status == target_state)
        except ValueError:
            pass

    res = await db.execute(stmt)
    orders = res.scalars().all()

    items = []
    for o in orders:
        doc = o.document
        spec = o.print_specification
        jobs = o.print_jobs or []
        first_job = jobs[0] if jobs else None

        doc_list = []
        if o.order_documents:
            for od in sorted(o.order_documents, key=lambda x: x.sequence):
                od_spec = od.print_specification or spec
                doc_list.append({
                    "id": str(od.id),
                    "document_id": str(od.document_id),
                    "sequence": od.sequence,
                    "filename": od.document.original_filename if od.document else "N/A",
                    "pages": od.page_count,
                    "copies": od.copies,
                    "color_mode": od_spec.color_mode.value if (od_spec and hasattr(od_spec.color_mode, "value")) else str(od_spec.color_mode if od_spec else "BW"),
                    "duplex": od_spec.duplex if od_spec else False,
                    "paper_size": od_spec.paper_size if od_spec else "A4",
                    "price_cents": od.calculated_price_cents,
                })

        items.append({
            "id": str(o.id),
            "order_number": o.order_number,
            "status": o.status.value,
            "total_amount_cents": o.total_amount_cents,
            "currency": o.currency,
            "document_name": (f"{len(doc_list)} documents" if len(doc_list) > 1 else (doc.original_filename if doc else "N/A")),
            "pages": sum(d["pages"] for d in doc_list) if doc_list else (doc.page_count if doc else 1),
            "copies": spec.copies if spec else 1,
            "color_mode": spec.color_mode.value if spec else "BW",
            "duplex": spec.duplex if spec else False,
            "paper_size": spec.paper_size if spec else "A4",
            "printer_name": first_job.printer.name if first_job and first_job.printer else None,
            "payment_status": o.payment.status.value if o.payment else ("PAID" if o.status not in [OrderState.CREATED, OrderState.PAYMENT_PENDING, OrderState.PAYMENT_FAILED] else "PENDING"),
            "documents": doc_list,
            "jobs_count": len(jobs),
            "created_at": o.created_at.isoformat() if o.created_at else None,
        })
    return items
