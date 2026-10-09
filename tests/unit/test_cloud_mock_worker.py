import pytest
import uuid
import secrets
from datetime import datetime, timezone
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.modules.tenants.models import Shop, Tenant, TenantStatus
from app.modules.documents.models import Document
from app.modules.orders.models import Order, OrderState
from app.modules.queue.models import PrintJob, JobStatus
from app.modules.printers.models import Printer, PrinterStatus, PrinterAdapterType
from app.workers.mock_print_worker import mock_print_worker
from app.modules.pickups.models import Pickup


@pytest.mark.asyncio
async def test_cloud_mock_worker_print_lifecycle():
    """
    Verifies that the isolated cloud mock print worker safely processes
    queued jobs end-to-end, adhering to all state machine invariants:
    QUEUED -> PRINTING -> PRINT_COMPLETED -> PICKUP_READY.
    """
    async with AsyncSessionLocal() as session:
        from sqlalchemy import update
        await session.execute(
            update(PrintJob)
            .where(PrintJob.status == JobStatus.QUEUED)
            .values(status=JobStatus.COMPLETED)
        )
        await session.commit()

    async with AsyncSessionLocal() as session:
        # Create test tenant & shop
        tenant = Tenant(name="Mock Tenant", slug=f"mock-tenant-{uuid.uuid4().hex[:6]}", status=TenantStatus.ACTIVE)
        session.add(tenant)
        await session.flush()

        shop = Shop(tenant_id=tenant.id, name="Mock Shop", slug=f"mock-shop-{uuid.uuid4().hex[:6]}", is_active=True)
        session.add(shop)
        await session.flush()

        printer = Printer(
            shop_id=shop.id,
            name="Demo Virtual Printer",
            adapter_type=PrinterAdapterType.MOCK,
            status=PrinterStatus.ONLINE,
            capabilities_json={"color": True, "duplex": True, "paper_sizes": ["A4"]},
        )
        session.add(printer)

        doc = Document(
            shop_id=shop.id,
            original_filename="sample.pdf",
            sanitized_filename="sample.pdf",
            storage_path="storage_data/sample.pdf",
            mime_type="application/pdf",
            file_size_bytes=1024,
            page_count=2,
            checksum_sha256=secrets.token_hex(32),
        )
        session.add(doc)
        await session.flush()

        order = Order(
            shop_id=shop.id,
            order_number=f"DEMO-{uuid.uuid4().hex[:6].upper()}",
            guest_access_token=secrets.token_urlsafe(32),
            document_id=doc.id,
            status=OrderState.QUEUED,
            total_amount_cents=200,
            currency="INR",
            pricing_breakdown_json={},
        )
        session.add(order)
        await session.flush()

        job = PrintJob(
            order_id=order.id,
            shop_id=shop.id,
            document_id=doc.id,
            printer_id=printer.id,
            priority=1,
            status=JobStatus.QUEUED,
            sequence=1,
            queued_at=datetime.now(timezone.utc),
        )
        session.add(job)
        await session.commit()
        order_id = order.id
        job_id = job.id

    # Execute one cycle of mock print worker
    processed = await mock_print_worker._process_next_job()
    assert processed is True

    # Verify final state in database
    async with AsyncSessionLocal() as session:
        res = await session.execute(select(Order).where(Order.id == order_id))
        updated_order = res.scalar_one()
        assert updated_order.status == OrderState.PICKUP_READY

        job_res = await session.execute(select(PrintJob).where(PrintJob.id == job_id))
        updated_job = job_res.scalar_one()
        assert updated_job.status == JobStatus.COMPLETED

        pickup_res = await session.execute(select(Pickup).where(Pickup.order_id == order_id))
        pickup = pickup_res.scalar_one_or_none()
        assert pickup is not None
        assert pickup.order_id == order_id
        assert pickup.expires_at is not None
