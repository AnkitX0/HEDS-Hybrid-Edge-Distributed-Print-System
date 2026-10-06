import uuid
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.modules.queue.models import PrintJob, JobStatus
from app.modules.orders.models import Order, OrderState
from app.modules.orders.state_machine import OrderStateMachine
from app.modules.tenants.models import Shop
from app.api.deps import require_shop_operator
from app.api.v1.schemas import JobReconcileRequest

router = APIRouter(tags=["Queue"])


@router.get("/shop/queue")
async def list_shop_queue(
    current_user=Depends(require_shop_operator),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns live active and recent jobs for the shop dashboard.
    """
    stmt = (
        select(PrintJob)
        .options(
            selectinload(PrintJob.order).selectinload(Order.document),
            selectinload(PrintJob.order).selectinload(Order.print_specification),
            selectinload(PrintJob.printer),
            selectinload(PrintJob.agent),
        )
        .order_by(PrintJob.queued_at.desc())
        .limit(50)
    )
    res = await db.execute(stmt)
    jobs = res.scalars().all()

    items = []
    for idx, job in enumerate(jobs):
        order = job.order
        doc = order.document if order else None
        spec = order.print_specification if order else None

        items.append({
            "job_id": str(job.id),
            "order_id": str(order.id) if order else None,
            "order_number": order.order_number if order else "N/A",
            "position": idx + 1 if job.status == JobStatus.QUEUED else None,
            "status": job.status.value,
            "order_status": order.status.value if order else "UNKNOWN",
            "document_name": doc.original_filename if doc else "N/A",
            "pages": doc.page_count if doc else 1,
            "copies": spec.copies if spec else 1,
            "color_mode": spec.color_mode.value if spec else "BW",
            "duplex": spec.duplex if spec else False,
            "total_amount_cents": order.total_amount_cents if order else 0,
            "printer_name": job.printer.name if job.printer else "Unassigned",
            "agent_name": job.agent.name if job.agent else "Unassigned",
            "attempt_count": job.attempt_count,
            "error_message": job.error_message,
            "queued_at": job.queued_at,
            "created_at": job.created_at,
        })

    return items


@router.post("/jobs/{job_id}/retry")
async def retry_failed_job(
    job_id: str,
    current_user=Depends(require_shop_operator),
    db: AsyncSession = Depends(get_db),
):
    """
    Operator action: Retry a PRINT_FAILED or DISPATCH_FAILED job.
    Resets status to QUEUED so the agent scheduler can lease it again.
    """
    res = await db.execute(
        select(PrintJob).options(selectinload(PrintJob.order)).where(PrintJob.id == uuid.UUID(job_id))
    )
    job = res.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.status not in [JobStatus.FAILED, JobStatus.RECONCILING]:
        raise HTTPException(
            status_code=400,
            detail=f"Only FAILED or RECONCILING jobs can be retried. Current status is {job.status.value}",
        )

    job.status = JobStatus.QUEUED
    job.lease_id = None
    job.lease_expires_at = None
    job.error_message = None

    await OrderStateMachine.transition(
        session=db,
        order=job.order,
        target_state=OrderState.QUEUED,
        actor_type="OPERATOR",
        actor_id=str(current_user.id),
        reason="Operator manually retried print job",
    )
    await db.commit()
    return {"status": "SUCCESS", "message": f"Job {job_id} re-enqueued for print execution"}


@router.post("/jobs/{job_id}/cancel")
async def cancel_job(
    job_id: str,
    current_user=Depends(require_shop_operator),
    db: AsyncSession = Depends(get_db),
):
    """
    Operator action: Cancel a job before physical execution completes.
    """
    res = await db.execute(
        select(PrintJob).options(selectinload(PrintJob.order)).where(PrintJob.id == uuid.UUID(job_id))
    )
    job = res.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    job.status = JobStatus.CANCELLED
    await OrderStateMachine.transition(
        session=db,
        order=job.order,
        target_state=OrderState.CANCELLED,
        actor_type="OPERATOR",
        actor_id=str(current_user.id),
        reason="Operator cancelled job",
    )
    await db.commit()
    return {"status": "SUCCESS", "message": f"Job {job_id} cancelled"}


@router.post("/jobs/{job_id}/reconcile")
async def reconcile_ambiguous_job(
    job_id: str,
    payload: JobReconcileRequest,
    current_user=Depends(require_shop_operator),
    db: AsyncSession = Depends(get_db),
):
    """
    Operator resolution for an ambiguous physical state:
    Allows marking as completed (paper came out) or retrying (paper did not print).
    """
    res = await db.execute(
        select(PrintJob).options(selectinload(PrintJob.order)).where(PrintJob.id == uuid.UUID(job_id))
    )
    job = res.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    decision = payload.decision.upper()

    if decision == "MARK_COMPLETED":
        job.status = JobStatus.COMPLETED
        await OrderStateMachine.transition(
            session=db,
            order=job.order,
            target_state=OrderState.PRINT_COMPLETED,
            actor_type="OPERATOR",
            actor_id=str(current_user.id),
            reason=f"Operator verified physical output was completed: {payload.notes or ''}",
        )
        from app.modules.pickups.service import pickup_service
        await pickup_service.create_privacy_hold(session=db, order=job.order)

    elif decision == "RETRY_PRINT":
        job.status = JobStatus.QUEUED
        job.lease_id = None
        job.lease_expires_at = None
        await OrderStateMachine.transition(
            session=db,
            order=job.order,
            target_state=OrderState.QUEUED,
            actor_type="OPERATOR",
            actor_id=str(current_user.id),
            reason=f"Operator requested physical reprint: {payload.notes or ''}",
        )

    elif decision == "CANCEL":
        job.status = JobStatus.CANCELLED
        await OrderStateMachine.transition(
            session=db,
            order=job.order,
            target_state=OrderState.CANCELLED,
            actor_type="OPERATOR",
            actor_id=str(current_user.id),
            reason=f"Operator cancelled reconciling job: {payload.notes or ''}",
        )
    else:
        raise HTTPException(status_code=400, detail="Invalid decision. Choose MARK_COMPLETED, RETRY_PRINT, or CANCEL")

    await db.commit()
    return {"status": "RECONCILED", "decision": decision, "order_status": job.order.status.value}


@router.post("/shop/queue/toggle-pause")
async def toggle_queue_pause(
    current_user=Depends(require_shop_operator),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Shop).limit(1)
    res = await db.execute(stmt)
    shop = res.scalar_one_or_none()
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")

    shop.is_queue_paused = not shop.is_queue_paused
    await db.commit()
    return {
        "shop_id": str(shop.id),
        "is_queue_paused": shop.is_queue_paused,
        "message": f"Queue {'paused' if shop.is_queue_paused else 'resumed'}",
    }
