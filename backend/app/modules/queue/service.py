import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy import select, update, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.logging import logger
from app.modules.queue.models import PrintJob, JobStatus
from app.modules.orders.models import Order, OrderState
from app.modules.printers.models import Printer, PrinterStatus
from app.modules.orders.state_machine import OrderStateMachine


class QueueService:
    @staticmethod
    async def enqueue_order(
        session: AsyncSession,
        order: Order,
        priority: int = 10,
    ) -> PrintJob:
        """
        Creates a new PrintJob record for a paid order and transitions order to QUEUED.
        """
        # Check if job already exists (idempotency check)
        existing = await session.execute(
            select(PrintJob).where(PrintJob.order_id == order.id)
        )
        job = existing.scalar_one_or_none()
        if job:
            return job

        job = PrintJob(
            order_id=order.id,
            shop_id=order.shop_id,
            priority=priority,
            status=JobStatus.QUEUED,
            attempt_count=0,
            queued_at=datetime.now(timezone.utc),
        )
        session.add(job)
        await session.flush()

        await OrderStateMachine.transition(
            session=session,
            order=order,
            target_state=OrderState.QUEUED,
            actor_type="SYSTEM",
            reason="Order payment settled; queued for print dispatch",
        )
        return job

    @staticmethod
    async def poll_and_lease_job(
        session: AsyncSession,
        shop_id: uuid.UUID,
        agent_id: uuid.UUID,
        printer_id: Optional[uuid.UUID] = None,
    ) -> Optional[PrintJob]:
        """
        Acquires next available job using atomic row-level locking (FOR UPDATE SKIP LOCKED).
        Assigns lease_id and lease_expires_at.
        """
        now = datetime.now(timezone.utc)
        lease_duration = timedelta(seconds=settings.JOB_LEASE_DURATION_SECONDS)

        # Build query for eligible jobs: QUEUED or RECOVERABLE expired leases
        query = (
            select(PrintJob)
            .join(Order, PrintJob.order_id == Order.id)
            .options(
                selectinload(PrintJob.order).selectinload(Order.document),
                selectinload(PrintJob.order).selectinload(Order.print_specification),
            )
            .where(
                PrintJob.shop_id == shop_id,
                or_(
                    PrintJob.status == JobStatus.QUEUED,
                    and_(
                        PrintJob.status == JobStatus.DISPATCHED,
                        PrintJob.lease_expires_at < now,
                    ),
                ),
            )
            .order_by(PrintJob.priority.asc(), PrintJob.queued_at.asc())
            .with_for_update(skip_locked=True)
            .limit(1)
        )

        result = await session.execute(query)
        job = result.scalar_one_or_none()

        if not job:
            return None

        # Lease the job
        lease_id = uuid.uuid4().hex
        job.lease_id = lease_id
        job.lease_expires_at = now + lease_duration
        job.agent_id = agent_id
        if printer_id:
            job.printer_id = printer_id
        job.status = JobStatus.DISPATCHED
        job.dispatched_at = now
        job.attempt_count += 1

        # Transition order to DISPATCHED
        await OrderStateMachine.transition(
            session=session,
            order=job.order,
            target_state=OrderState.DISPATCHED,
            actor_type="AGENT",
            actor_id=str(agent_id),
            reason=f"Leased by agent {agent_id} with lease {lease_id}",
        )

        await session.commit()
        return job

    @staticmethod
    async def reconcile_expired_leases(session: AsyncSession) -> int:
        """
        Scans for dispatched or printing jobs where the lease expired and agent did not renew.
        Transitions them to RECONCILING to prevent duplicate physical printing.
        """
        now = datetime.now(timezone.utc)
        stmt = (
            select(PrintJob)
            .options(selectinload(PrintJob.order))
            .where(
                PrintJob.status.in_([JobStatus.DISPATCHED, JobStatus.PRINTING]),
                PrintJob.lease_expires_at < now,
            )
            .with_for_update(skip_locked=True)
        )
        result = await session.execute(stmt)
        expired_jobs = result.scalars().all()
        reconciled_count = 0

        for job in expired_jobs:
            logger.warning(
                f"[RECONCILER] Job {job.id} lease expired at {job.lease_expires_at}. Moving to RECONCILING."
            )
            job.status = JobStatus.RECONCILING
            job.lease_id = None
            job.lease_expires_at = None

            await OrderStateMachine.transition(
                session=session,
                order=job.order,
                target_state=OrderState.RECONCILING,
                actor_type="SYSTEM",
                reason="Agent lease expired during print execution without heartbeat",
            )
            reconciled_count += 1

        if reconciled_count > 0:
            await session.commit()
        return reconciled_count


queue_service = QueueService()
