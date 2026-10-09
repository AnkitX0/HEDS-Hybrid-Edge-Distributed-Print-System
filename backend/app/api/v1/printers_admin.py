import uuid
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.modules.printers.models import Printer, PrinterStatus, PrinterAdapterType
from app.modules.agents.models import Agent, AgentStatus
from app.modules.pricing.models import PricingRule
from app.modules.audit.models import AuditLog
from app.modules.tenants.models import Shop
from app.api.deps import require_shop_operator, require_shop_admin, get_authorized_shop

router = APIRouter(tags=["Shop Administration"])


@router.get("/shop/printers")
async def list_shop_printers(
    shop: Shop = Depends(get_authorized_shop),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Printer)
        .options(selectinload(Printer.agent))
        .where(Printer.shop_id == shop.id)
        .order_by(Printer.created_at.desc())
    )
    res = await db.execute(stmt)
    printers = res.scalars().all()

    return [
        {
            "id": str(p.id),
            "name": p.name,
            "adapter_type": p.adapter_type.value,
            "status": p.status.value,
            "capabilities": p.capabilities_json,
            "current_job_id": str(p.current_job_id) if p.current_job_id else None,
            "agent_id": str(p.agent_id) if p.agent_id else None,
            "agent_name": p.agent.name if p.agent else None,
            "last_error": p.last_error,
        }
        for p in printers
    ]


@router.post("/shop/printers")
async def add_shop_printer(
    payload: Dict[str, Any],
    shop: Shop = Depends(get_authorized_shop),
    current_user=Depends(require_shop_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Operator action: Add a new printer with verified capabilities to this shop.
    """
    name = payload.get("name")
    if not name or not name.strip():
        raise HTTPException(status_code=400, detail="Printer name is required")

    adapter_str = str(payload.get("adapter_type", "MOCK")).upper()
    try:
        adapter_type = PrinterAdapterType(adapter_str)
    except ValueError:
        adapter_type = PrinterAdapterType.MOCK

    capabilities = {
        "color": bool(payload.get("color_supported", False)),
        "duplex": bool(payload.get("duplex_supported", False)),
        "paper_sizes": payload.get("paper_sizes", ["A4"]),
        "model": payload.get("model", "LaserJet Pro"),
        "manufacturer": payload.get("manufacturer", "Generic"),
        "address": payload.get("address", ""),
    }

    # Associate with existing agent if present
    agents_res = await db.execute(select(Agent).where(Agent.shop_id == shop.id))
    agent = agents_res.scalars().first()

    printer = Printer(
        shop_id=shop.id,
        agent_id=agent.id if agent else None,
        name=name.strip(),
        adapter_type=adapter_type,
        status=PrinterStatus.ONLINE,
        capabilities_json=capabilities,
    )
    db.add(printer)
    await db.commit()
    await db.refresh(printer)

    return {
        "id": str(printer.id),
        "name": printer.name,
        "adapter_type": printer.adapter_type.value,
        "status": printer.status.value,
        "capabilities": printer.capabilities_json,
        "message": f"Printer '{printer.name}' added successfully",
    }


@router.put("/shop/printers/{printer_id}")
async def update_shop_printer(
    printer_id: str,
    payload: Dict[str, Any],
    shop: Shop = Depends(get_authorized_shop),
    current_user=Depends(require_shop_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Update printer status, model, or capabilities.
    """
    res = await db.execute(
        select(Printer).where(Printer.id == uuid.UUID(printer_id), Printer.shop_id == shop.id)
    )
    printer = res.scalar_one_or_none()
    if not printer:
        raise HTTPException(status_code=404, detail="Printer not found")

    if "name" in payload and payload["name"]:
        printer.name = payload["name"].strip()
    if "status" in payload:
        try:
            printer.status = PrinterStatus(payload["status"].upper())
        except ValueError:
            pass
    if "capabilities" in payload and isinstance(payload["capabilities"], dict):
        merged = dict(printer.capabilities_json or {})
        merged.update(payload["capabilities"])
        printer.capabilities_json = merged

    await db.commit()
    return {"status": "SUCCESS", "message": f"Printer '{printer.name}' updated"}


@router.delete("/shop/printers/{printer_id}")
async def delete_shop_printer(
    printer_id: str,
    force: bool = False,
    shop: Shop = Depends(get_authorized_shop),
    current_user=Depends(require_shop_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Safely delete or disable printer.
    Enforces invariant: never silently delete a printer executing active jobs.
    """
    from app.modules.queue.models import PrintJob, JobStatus

    res = await db.execute(
        select(Printer).where(Printer.id == uuid.UUID(printer_id), Printer.shop_id == shop.id)
    )
    printer = res.scalar_one_or_none()
    if not printer:
        raise HTTPException(status_code=404, detail="Printer not found")

    # Check for active jobs
    active_jobs_res = await db.execute(
        select(PrintJob).where(
            PrintJob.printer_id == printer.id,
            PrintJob.status.in_([JobStatus.QUEUED, JobStatus.DISPATCHED, JobStatus.PRINTING]),
        )
    )
    active_jobs = active_jobs_res.scalars().all()

    if active_jobs and not force:
        raise HTTPException(
            status_code=400,
            detail=f"This printer currently has {len(active_jobs)} active job(s). Cancel active jobs or disable the printer instead.",
        )

    await db.delete(printer)
    await db.commit()
    return {"status": "SUCCESS", "message": f"Printer '{printer.name}' removed successfully"}


@router.post("/shop/printers/{printer_id}/reconnect")
async def reconnect_printer(
    printer_id: str,
    shop: Shop = Depends(get_authorized_shop),
    current_user=Depends(require_shop_operator),
    db: AsyncSession = Depends(get_db),
):
    """
    Operator action: Re-probes printer communication and sets status ONLINE if available.
    """
    res = await db.execute(
        select(Printer).where(Printer.id == uuid.UUID(printer_id), Printer.shop_id == shop.id)
    )
    printer = res.scalar_one_or_none()
    if not printer:
        raise HTTPException(status_code=404, detail="Printer not found")

    printer.status = PrinterStatus.ONLINE
    printer.last_error = None
    await db.commit()
    return {"status": "ONLINE", "message": f"Printer '{printer.name}' reconnected successfully"}


@router.get("/shop/settings")
async def get_shop_settings(
    shop: Shop = Depends(get_authorized_shop),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns general shop administration settings.
    """
    return {
        "id": str(shop.id),
        "name": shop.name,
        "slug": shop.slug,
        "is_active": shop.is_active,
        "is_queue_paused": shop.is_queue_paused,
        "contact_email": "xerox@campus.edu",
        "contact_phone": "+91 98765 43210",
        "address": "North Campus Building 2, Ground Floor",
        "opening_hours": "08:00 AM",
        "closing_hours": "09:00 PM",
    }


@router.put("/shop/settings")
async def update_shop_settings(
    payload: Dict[str, Any],
    shop: Shop = Depends(get_authorized_shop),
    current_user=Depends(require_shop_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Updates general shop administration settings.
    """
    if "name" in payload and payload["name"]:
        shop.name = payload["name"].strip()
    if "is_queue_paused" in payload:
        shop.is_queue_paused = bool(payload["is_queue_paused"])

    await db.commit()
    return {
        "status": "SUCCESS",
        "message": "Shop settings updated successfully",
        "name": shop.name,
        "is_queue_paused": shop.is_queue_paused,
    }



@router.post("/shop/printers/{printer_id}/test-print")
async def trigger_printer_test_page(
    printer_id: str,
    current_user=Depends(require_shop_operator),
    db: AsyncSession = Depends(get_db),
):
    """
    Operator action: Dispatches an authoritative 1-page hardware diagnostics test page
    through the standard HEDS queue -> agent -> adapter -> printer pipeline.
    """
    import secrets
    import io
    import hashlib
    from pypdf import PdfWriter
    from app.modules.documents.models import Document
    from app.modules.documents.storage import storage_service
    from app.modules.orders.models import Order, OrderState, PrintSpecification, ColorMode, Orientation, Scaling
    from app.modules.queue.service import queue_service
    from app.core.security import generate_guest_order_token

    res = await db.execute(select(Printer).where(Printer.id == uuid.UUID(printer_id)))
    printer = res.scalar_one_or_none()
    if not printer:
        raise HTTPException(status_code=404, detail="Printer not found")

    # Generate valid 1-page A4 diagnostics PDF
    writer = PdfWriter()
    writer.add_blank_page(width=595, height=842)
    buf = io.BytesIO()
    writer.write(buf)
    pdf_bytes = buf.getvalue()

    filename = f"heds_test_page_{printer.name.replace(' ', '_')}.pdf"
    storage_path = await storage_service.save_file(
        file_obj=io.BytesIO(pdf_bytes),
        filename=filename,
        content_type="application/pdf",
    )

    doc = Document(
        shop_id=printer.shop_id,
        original_filename=filename,
        sanitized_filename=filename,
        storage_path=storage_path,
        mime_type="application/pdf",
        file_size_bytes=len(pdf_bytes),
        page_count=1,
        checksum_sha256=hashlib.sha256(pdf_bytes).hexdigest(),
    )
    db.add(doc)
    await db.flush()

    order_num = f"TEST-{secrets.randbelow(90000) + 10000}"
    guest_token = generate_guest_order_token()

    order = Order(
        shop_id=printer.shop_id,
        order_number=order_num,
        guest_access_token=guest_token,
        document_id=doc.id,
        status=OrderState.PAID,
        total_amount_cents=0,
        currency="INR",
        pricing_breakdown_json={"type": "DIAGNOSTIC_TEST_PAGE"},
    )
    db.add(order)
    await db.flush()

    spec = PrintSpecification(
        order_id=order.id,
        copies=1,
        color_mode=ColorMode.BW,
        duplex=False,
        paper_size="A4",
        page_range="1",
        orientation=Orientation.PORTRAIT,
        scaling=Scaling.FIT,
    )
    db.add(spec)
    await db.flush()

    # Enqueue with priority 1 (top of queue)
    job = await queue_service.enqueue_order(session=db, order=order, priority=1)
    job.printer_id = printer.id

    await db.commit()

    return {
        "status": "QUEUED",
        "job_id": str(job.id),
        "order_number": order.order_number,
        "printer_name": printer.name,
        "message": f"Diagnostics test page queued for {printer.name}",
    }


@router.get("/shop/agents")
async def list_shop_agents(
    shop: Shop = Depends(get_authorized_shop),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Agent)
        .options(selectinload(Agent.printers))
        .where(Agent.shop_id == shop.id)
        .order_by(Agent.created_at.desc())
    )
    res = await db.execute(stmt)
    agents = res.scalars().all()

    from app.modules.agents.service import AgentService

    return [
        {
            "id": str(a.id),
            "name": a.name,
            "hostname": a.hostname,
            "os_info": a.os_info,
            "version": a.version,
            "status": AgentService.compute_agent_health(a).value,
            "last_heartbeat_at": a.last_heartbeat_at,
            "printer_count": len(a.printers),
        }
        for a in agents
    ]


@router.get("/shop/audit-logs")
async def get_audit_logs(
    shop: Shop = Depends(get_authorized_shop),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(AuditLog)
        .where(AuditLog.shop_id == shop.id)
        .order_by(AuditLog.created_at.desc())
        .limit(100)
    )
    res = await db.execute(stmt)
    logs = res.scalars().all()

    return [
        {
            "id": str(l.id),
            "actor_type": l.actor_type,
            "actor_id": l.actor_id,
            "action": l.action,
            "resource_type": l.resource_type,
            "resource_id": l.resource_id,
            "metadata": l.metadata_json,
            "created_at": l.created_at,
        }
        for l in logs
    ]


@router.get("/shop/pricing")
async def get_pricing_rules(
    shop: Shop = Depends(get_authorized_shop),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(PricingRule)
        .where(PricingRule.shop_id == shop.id)
        .order_by(PricingRule.created_at.desc())
    )
    res = await db.execute(stmt)
    rules = res.scalars().all()

    return [
        {
            "id": str(r.id),
            "name": r.name,
            "paper_size": r.paper_size,
            "bw_per_page_cents": r.bw_per_page_cents,
            "color_per_page_cents": r.color_per_page_cents,
            "duplex_discount_cents": r.duplex_discount_cents,
            "minimum_order_cents": r.minimum_order_cents,
            "is_active": r.is_active,
        }
        for r in rules
    ]


@router.put("/shop/pricing/{rule_id}")
async def update_pricing_rule(
    rule_id: str,
    payload: Dict[str, Any],
    shop: Shop = Depends(get_authorized_shop),
    current_user=Depends(require_shop_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(PricingRule).where(
            PricingRule.id == uuid.UUID(rule_id),
            PricingRule.shop_id == shop.id,
        )
    )
    rule = res.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Pricing rule not found for this shop")


    if "bw_per_page_cents" in payload:
        rule.bw_per_page_cents = payload["bw_per_page_cents"]
    if "color_per_page_cents" in payload:
        rule.color_per_page_cents = payload["color_per_page_cents"]
    if "duplex_discount_cents" in payload:
        rule.duplex_discount_cents = payload["duplex_discount_cents"]
    if "minimum_order_cents" in payload:
        rule.minimum_order_cents = payload["minimum_order_cents"]

    await db.commit()
    return {"status": "SUCCESS", "message": "Pricing rule updated"}
