import uuid
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.logging import logger
from app.modules.agents.models import Agent, AgentStatus
from app.modules.agents.service import agent_service
from app.modules.queue.models import PrintJob, JobStatus
from app.modules.queue.service import queue_service
from app.modules.orders.models import Order, OrderState
from app.modules.orders.state_machine import OrderStateMachine
from app.modules.documents.storage import storage_service
from app.modules.pickups.service import pickup_service
from app.api.deps import verify_agent
from app.api.v1.schemas import (
    AgentRegisterRequest,
    AgentHeartbeatRequest,
    JobLeaseResponse,
    JobStatusUpdateRequest,
)

router = APIRouter(prefix="/agents", tags=["Edge Agents"])


@router.post("/register")
async def register_edge_agent(
    payload: AgentRegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Registers or updates local edge agent hardware profile.
    """
    try:
        shop_uuid = uuid.UUID(payload.shop_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid shop_id UUID")

    agent = await agent_service.register_agent(
        session=db,
        shop_id=shop_uuid,
        name=payload.name,
        token=payload.token,
        hostname=payload.hostname or "localhost",
        os_info=payload.os_info or "Linux",
        version=payload.version or "0.1.0",
    )
    return {
        "agent_id": str(agent.id),
        "shop_id": str(agent.shop_id),
        "name": agent.name,
        "status": agent.status.value,
        "message": "Agent registered successfully",
    }


@router.post("/heartbeat")
async def receive_heartbeat(
    payload: AgentHeartbeatRequest,
    agent: Agent = Depends(verify_agent),
    db: AsyncSession = Depends(get_db),
):
    """
    Periodic agent health probe: updates last_heartbeat_at, printer statuses, and queue depth.
    """
    updated_agent = await agent_service.process_heartbeat(
        session=db,
        agent_id=agent.id,
        printers_payload=payload.printers,
        local_queue_length=payload.local_queue_length,
    )
    return {
        "status": "OK",
        "agent_id": str(updated_agent.id),
        "agent_status": updated_agent.status.value,
    }


@router.post("/jobs/poll", response_model=Optional[JobLeaseResponse])
async def poll_next_job(
    agent: Agent = Depends(verify_agent),
    db: AsyncSession = Depends(get_db),
):
    """
    Atomic job poll: Leases next eligible print job using FOR UPDATE SKIP LOCKED.
    """
    job = await queue_service.poll_and_lease_job(
        session=db,
        shop_id=agent.shop_id,
        agent_id=agent.id,
    )

    if not job:
        return None

    order = job.order
    doc = order.document
    spec = order.print_specification

    return JobLeaseResponse(
        job_id=str(job.id),
        order_id=str(order.id),
        order_number=order.order_number,
        lease_id=job.lease_id,
        lease_expires_at=job.lease_expires_at,
        document_id=str(doc.id),
        document_filename=doc.sanitized_filename,
        page_count=doc.page_count,
        print_specification={
            "copies": spec.copies if spec else 1,
            "color_mode": spec.color_mode.value if spec else "BW",
            "duplex": spec.duplex if spec else False,
            "paper_size": spec.paper_size if spec else "A4",
            "page_range": spec.page_range if spec else "all",
            "orientation": spec.orientation.value if spec else "PORTRAIT",
            "scaling": spec.scaling.value if spec else "FIT",
        },
        printer_id=str(job.printer_id) if job.printer_id else None,
        printer_name=job.printer.name if job.printer else None,
    )


@router.post("/jobs/{job_id}/ack")
async def acknowledge_job_receipt(
    job_id: str,
    agent: Agent = Depends(verify_agent),
    db: AsyncSession = Depends(get_db),
):
    """
    Agent acknowledges that the leased job is durably saved in its local SQLite queue.
    """
    res = await db.execute(select(PrintJob).where(PrintJob.id == uuid.UUID(job_id)))
    job = res.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return {"status": "ACKNOWLEDGED", "job_id": job_id}


@router.get("/jobs/{job_id}/document")
async def download_job_document(
    job_id: str,
    agent: Agent = Depends(verify_agent),
    db: AsyncSession = Depends(get_db),
):
    """
    Secure document binary download for edge printer adapter spooling.
    """
    res = await db.execute(
        select(PrintJob)
        .options(selectinload(PrintJob.order).selectinload(Order.document))
        .where(PrintJob.id == uuid.UUID(job_id))
    )
    job = res.scalar_one_or_none()
    if not job or not job.order or not job.order.document:
        raise HTTPException(status_code=404, detail="Job document not found")

    doc = job.order.document
    stream = storage_service.get_file_stream(doc.storage_path)

    return StreamingResponse(
        stream,
        media_type=doc.mime_type,
        headers={"Content-Disposition": f'attachment; filename="{doc.sanitized_filename}"'},
    )


@router.post("/jobs/{job_id}/status")
async def update_job_status(
    job_id: str,
    payload: JobStatusUpdateRequest,
    agent: Agent = Depends(verify_agent),
    db: AsyncSession = Depends(get_db),
):
    """
    Agent reports print execution progress or completion.
    When completed: transitions order to PRINT_COMPLETED -> engages PICKUP_READY with privacy OTP hold.
    When failed: transitions to PRINT_FAILED.
    """
    res = await db.execute(
        select(PrintJob)
        .options(selectinload(PrintJob.order))
        .where(PrintJob.id == uuid.UUID(job_id))
    )
    job = res.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    status_str = payload.status.upper()

    if status_str == "PRINTING":
        job.status = JobStatus.PRINTING
        await OrderStateMachine.transition(
            session=db,
            order=job.order,
            target_state=OrderState.PRINTING,
            actor_type="AGENT",
            actor_id=str(agent.id),
            reason=f"Printer started spooling. Progress page: {payload.progress_page or 1}",
        )
    elif status_str == "COMPLETED":
        job.status = JobStatus.COMPLETED
        job.completed_at = job.order.updated_at

        # Transition PRINT_COMPLETED
        await OrderStateMachine.transition(
            session=db,
            order=job.order,
            target_state=OrderState.PRINT_COMPLETED,
            actor_type="AGENT",
            actor_id=str(agent.id),
            reason="Physical printing completed by adapter",
        )

        # Engage Privacy Hold & generate OTP
        plain_otp = await pickup_service.create_privacy_hold(session=db, order=job.order)
        # Store transient attribute on order in memory for response
        job.order._last_plain_otp = plain_otp

    elif status_str == "FAILED":
        job.status = JobStatus.FAILED
        job.error_message = payload.error_message or "Printer hardware error"
        await OrderStateMachine.transition(
            session=db,
            order=job.order,
            target_state=OrderState.PRINT_FAILED,
            actor_type="AGENT",
            actor_id=str(agent.id),
            reason=f"Print failed: {job.error_message}",
        )

    await db.commit()
    return {"status": "UPDATED", "job_id": job_id, "order_status": job.order.status.value}


@router.post("/reconcile")
async def reconcile_agent_jobs(
    payload: Dict[str, Any],
    agent: Agent = Depends(verify_agent),
    db: AsyncSession = Depends(get_db),
):
    """
    Synchronizes local SQLite queue state after agent network reconnection.
    """
    local_jobs = payload.get("jobs", [])
    reconciled = []

    for item in local_jobs:
        job_id_str = item.get("job_id")
        local_status = item.get("status")
        if not job_id_str:
            continue
        try:
            job_uuid = uuid.UUID(job_id_str)
        except ValueError:
            continue

        res = await db.execute(
            select(PrintJob).options(selectinload(PrintJob.order)).where(PrintJob.id == job_uuid)
        )
        job = res.scalar_one_or_none()
        if not job:
            continue

        if local_status == "COMPLETED" and job.status != JobStatus.COMPLETED:
            job.status = JobStatus.COMPLETED
            if job.order.status in [OrderState.PRINTING, OrderState.RECONCILING, OrderState.DISPATCHED]:
                await OrderStateMachine.transition(
                    session=db,
                    order=job.order,
                    target_state=OrderState.PRINT_COMPLETED,
                    actor_type="AGENT",
                    actor_id=str(agent.id),
                    reason="Reconciled from local SQLite queue after network restoration",
                )
                await pickup_service.create_privacy_hold(session=db, order=job.order)
            reconciled.append(job_id_str)

    await db.commit()
    return {"reconciled_jobs": reconciled}
