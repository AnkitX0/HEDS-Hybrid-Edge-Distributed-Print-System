import pytest
import uuid
import secrets
from datetime import datetime, timezone, timedelta
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models import Shop, Document, Order, OrderState, PrintJob, JobStatus, Agent
from app.modules.queue.service import queue_service


@pytest.mark.asyncio
async def test_agent_lease_expiration_and_reconciliation():
    """
    RELIABILITY TEST #2:
    Simulate an agent leasing a job and disappearing/crashing.
    Lease expires -> background reconciler marks RECONCILING -> job is recoverable.
    """
    async with AsyncSessionLocal() as session:
        shop_res = await session.execute(select(Shop).where(Shop.slug == "campus-xerox"))
        shop = shop_res.scalar_one()

        agent_res = await session.execute(select(Agent).where(Agent.shop_id == shop.id))
        agent = agent_res.scalars().first()

        doc = Document(
            shop_id=shop.id,
            original_filename="lease_test.pdf",
            sanitized_filename="lease_test.pdf",
            storage_path="storage_data/lease.pdf",
            mime_type="application/pdf",
            file_size_bytes=50000,
            page_count=2,
            checksum_sha256=secrets.token_hex(32),
        )
        session.add(doc)
        await session.flush()

        order = Order(
            shop_id=shop.id,
            order_number=f"ORD-LEASE-{secrets.token_hex(4)}",
            guest_access_token=f"tok_{secrets.token_hex(16)}",
            document_id=doc.id,
            status=OrderState.DISPATCHED,
            total_amount_cents=400,
            currency="INR",
            pricing_breakdown_json={"pages": 2},
        )
        session.add(order)
        await session.flush()

        # Simulate job with an expired lease
        expired_time = datetime.now(timezone.utc) - timedelta(minutes=5)
        job = PrintJob(
            order_id=order.id,
            shop_id=shop.id,
            agent_id=agent.id,
            status=JobStatus.DISPATCHED,
            lease_id="expired_lease_abc123",
            lease_expires_at=expired_time,
            queued_at=expired_time,
        )
        session.add(job)
        await session.commit()
        job_id = job.id

    # Run reconciler
    async with AsyncSessionLocal() as session:
        reconciled_count = await queue_service.reconcile_expired_leases(session)
        assert reconciled_count >= 1

    # Verify job state transitioned to RECONCILING, lease released
    async with AsyncSessionLocal() as session:
        refreshed_job = (await session.execute(select(PrintJob).where(PrintJob.id == job_id))).scalar_one()
        assert refreshed_job.status == JobStatus.RECONCILING
        assert refreshed_job.lease_id is None
        assert refreshed_job.lease_expires_at is None

        refreshed_order = (await session.execute(select(Order).where(Order.id == refreshed_job.order_id))).scalar_one()
        assert refreshed_order.status == OrderState.RECONCILING
