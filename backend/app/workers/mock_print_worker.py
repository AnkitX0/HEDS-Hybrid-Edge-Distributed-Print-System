import asyncio
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.logging import logger
from app.core.database import AsyncSessionLocal
from app.modules.queue.models import PrintJob, JobStatus
from app.modules.orders.models import Order, OrderState
from app.modules.orders.state_machine import OrderStateMachine
from app.modules.pickups.service import pickup_service
from app.modules.printers.models import Printer, PrinterStatus


class CloudMockPrintWorker:
    """
    Isolated Cloud Demonstration Print Worker:
    Enables mentors / examiners to experience the complete student-to-counter
    workflow on a live cloud deployment without requiring a physical printer
    or the engineer's laptop to stay online.

    Strict architectural invariants:
    - Disabled by default. Only activates when ENABLE_MOCK_PRINT_WORKER=True.
    - All state transitions pass strictly through OrderStateMachine.transition().
    - Privacy hold OTPs are securely generated via pickup_service.prepare_for_pickup().
    - Never bypasses audit logging or queue idempotency rules.
    """

    def __init__(self):
        self._running = False

    async def run_loop(self, interval_seconds: float = 3.0):
        self._running = True
        logger.info("[MOCK WORKER] Cloud mock print worker started (Demo Mode active).")

        while self._running:
            try:
                processed = await self._process_next_job()
                # If a job was processed, pause briefly before next, else sleep interval
                await asyncio.sleep(1.0 if processed else interval_seconds)
            except asyncio.CancelledError:
                logger.info("[MOCK WORKER] Cloud mock print worker shutting down.")
                break
            except Exception as e:
                logger.error(f"[MOCK WORKER] Unexpected error in mock print loop: {e}", exc_info=True)
                await asyncio.sleep(interval_seconds)

    async def _process_next_job(self) -> bool:
        """
        Leases next queued job, simulates realistic spooling delay,
        and transitions order to PRINT_COMPLETED -> PICKUP_READY.
        """
        job_id: Optional[uuid.UUID] = None

        # Phase 1: Identify and lease queued job
        async with AsyncSessionLocal() as session:
            stmt = (
                select(PrintJob)
                .join(Order, PrintJob.order_id == Order.id)
                .options(
                    selectinload(PrintJob.order),
                    selectinload(PrintJob.printer),
                )
                .where(
                    PrintJob.status == JobStatus.QUEUED,
                    Order.status.in_([OrderState.QUEUED, OrderState.PAID, OrderState.DISPATCHED]),
                )
                .order_by(PrintJob.priority.asc(), PrintJob.queued_at.asc(), PrintJob.sequence.asc())
                .with_for_update(skip_locked=True)
                .limit(1)
            )
            res = await session.execute(stmt)
            job = res.scalar_one_or_none()

            if not job or not job.order:
                return False

            job_id = job.id
            now = datetime.now(timezone.utc)
            job.status = JobStatus.PRINTING
            job.started_at = now
            job.lease_id = uuid.uuid4().hex
            job.lease_expires_at = now + timedelta(seconds=60)
            job.attempt_count += 1

            # Match printer if none assigned
            if not job.printer_id:
                p_res = await session.execute(
                    select(Printer)
                    .where(Printer.shop_id == job.shop_id)
                    .limit(1)
                )
                printer = p_res.scalar_one_or_none()
                if printer:
                    job.printer_id = printer.id

            if job.order.status in [OrderState.QUEUED, OrderState.PAID]:
                await OrderStateMachine.transition(
                    session=session,
                    order=job.order,
                    target_state=OrderState.DISPATCHED,
                    actor_type="DEMO_WORKER",
                    actor_id="cloud-mock-printer",
                    reason="[CLOUD MOCK PRINTER] Leased job for demonstration spooling",
                )

            if job.order.status == OrderState.DISPATCHED:
                await OrderStateMachine.transition(
                    session=session,
                    order=job.order,
                    target_state=OrderState.PRINTING,
                    actor_type="DEMO_WORKER",
                    actor_id="cloud-mock-printer",
                    reason="[CLOUD MOCK PRINTER] Simulating print execution for mentor demonstration",
                )

            await session.commit()
            logger.info(f"[MOCK WORKER] Started printing job {job_id} for order {job.order.order_number}")

        # Phase 2: Simulate physical printing duration (2.5 seconds)
        # Allows live observers on student page & shop dashboard to see "PRINTING" state
        await asyncio.sleep(2.5)

        # Phase 3: Complete print job & engage Privacy Hold if batch finished
        async with AsyncSessionLocal() as session:
            res = await session.execute(
                select(PrintJob)
                .options(selectinload(PrintJob.order))
                .where(PrintJob.id == job_id)
            )
            job = res.scalar_one_or_none()
            if not job or not job.order:
                return True

            job.status = JobStatus.COMPLETED
            job.completed_at = datetime.now(timezone.utc)

            # Check if all sibling jobs for this order are completed
            sibling_res = await session.execute(
                select(PrintJob).where(PrintJob.order_id == job.order_id)
            )
            all_jobs = sibling_res.scalars().all()
            all_completed = all(j.status == JobStatus.COMPLETED for j in all_jobs)

            if all_completed and job.order.status != OrderState.COMPLETED:
                await OrderStateMachine.transition(
                    session=session,
                    order=job.order,
                    target_state=OrderState.PRINT_COMPLETED,
                    actor_type="DEMO_WORKER",
                    actor_id="cloud-mock-printer",
                    reason="[CLOUD MOCK PRINTER] Physical printing completed for all documents",
                )
                # Securely transitions to PICKUP_READY and creates salted OTP
                await pickup_service.prepare_for_pickup(session=session, order=job.order)
                logger.info(f"[MOCK WORKER] Order {job.order.order_number} is now READY FOR PICKUP")

            await session.commit()

        return True


mock_print_worker = CloudMockPrintWorker()
