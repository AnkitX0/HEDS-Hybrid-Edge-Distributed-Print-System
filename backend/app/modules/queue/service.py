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
        Acquires next available job using atomic row-level locking (FOR UPDATE SKIP LOCKED)
        with deterministic capability-aware printer matching and lease assignment.
        """
        now = datetime.now(timezone.utc)
        lease_duration = timedelta(seconds=settings.JOB_LEASE_DURATION_SECONDS)

        # 1. Fetch available printers attached to this shop / agent
        printer_query = (
            select(Printer)
            .where(
                Printer.shop_id == shop_id,
                or_(Printer.agent_id == agent_id, Printer.agent_id.is_(None)),
                Printer.status.in_([PrinterStatus.ONLINE, PrinterStatus.BUSY]),
            )
        )
        printers_res = await session.execute(printer_query)
        available_printers = printers_res.scalars().all()

        # 2. Build query for candidate eligible jobs
        query = (
            select(PrintJob)
            .join(Order, PrintJob.order_id == Order.id)
            .options(
                selectinload(PrintJob.order).selectinload(Order.document),
                selectinload(PrintJob.order).selectinload(Order.print_specification),
                selectinload(PrintJob.printer),
            )
            .where(
                PrintJob.shop_id == shop_id,
                Order.status.in_([OrderState.QUEUED, OrderState.PAID]),
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
            .limit(10)
        )

        result = await session.execute(query)
        candidate_jobs = result.scalars().all()

        if not candidate_jobs:
            return None

        # 3. Deterministic Capability-Aware Matching
        selected_job = None
        selected_printer = None

        for job in candidate_jobs:
            if not available_printers:
                # Fallback for environments with virtual/mock printers discovered post-lease
                selected_job = job
                break

            spec = job.order.print_specification
            needed_color = (spec.color_mode.value == "COLOR") if spec else False
            needed_duplex = bool(spec.duplex) if spec else False
            needed_paper = str(spec.paper_size or "A4").upper() if spec else "A4"

            # Filter compatible printers
            compatible = []
            for p in available_printers:
                caps = p.capabilities_json or {}
                if needed_color and not caps.get("color", False):
                    continue
                if needed_duplex and not caps.get("duplex", False):
                    continue
                supported_sizes = [str(s).upper() for s in caps.get("paper_sizes", ["A4", "LETTER"])]
                if needed_paper not in supported_sizes:
                    continue
                compatible.append(p)

            if not compatible:
                continue

            # Deterministic ranking:
            # 1. Idle (ONLINE) over BUSY
            # 2. Monochrome affinity (prefer mono printer for B&W jobs to conserve color printer)
            def rank_printer(p: Printer):
                caps = p.capabilities_json or {}
                is_online = 0 if p.status == PrinterStatus.ONLINE else 1
                color_waste = 1 if (not needed_color and caps.get("color", False)) else 0
                return (is_online, color_waste)

            compatible.sort(key=rank_printer)
            selected_job = job
            selected_printer = compatible[0]
            break

        if not selected_job:
            return None

        job = selected_job

        # Lease the job
        lease_id = uuid.uuid4().hex
        job.lease_id = lease_id
        job.lease_expires_at = now + lease_duration
        job.agent_id = agent_id

        if selected_printer:
            job.printer_id = selected_printer.id
            job.printer = selected_printer
            selected_printer.current_job_id = job.id
            selected_printer.status = PrinterStatus.BUSY
        elif printer_id:
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
