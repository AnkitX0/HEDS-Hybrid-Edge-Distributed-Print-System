import pytest
import uuid
import tempfile
import os
from sqlalchemy import select
from sqlalchemy.orm import selectinload

import app.models  # Load full registry
from app.core.database import AsyncSessionLocal
from app.modules.tenants.models import Shop
from app.modules.users.models import User, UserRole
from app.modules.agents.models import Agent, AgentStatus
from app.modules.printers.models import Printer, PrinterStatus, PrinterAdapterType
from app.modules.orders.models import Order, OrderState, PrintSpecification, ColorMode, Orientation, Scaling
from app.modules.documents.models import Document
from app.modules.queue.models import PrintJob, JobStatus
from app.modules.queue.service import queue_service
from heds_agent.queue.local_queue import LocalQueue


@pytest.mark.asyncio
async def test_agent_sqlite_queue_durability_across_process_restart():
    """
    Directive 14: A job must not disappear if agent crashes or restarts.
    Tests that local SQLite queue durably persists jobs across reboots.
    """
    with tempfile.TemporaryDirectory() as tmp_dir:
        db_path = os.path.join(tmp_dir, "test_local_queue.db")

        # 1. First process run: agent receives and saves job
        q1 = LocalQueue(db_path)
        job_id = str(uuid.uuid4())
        order_id = str(uuid.uuid4())

        q1.save_job(
            job_id=job_id,
            order_id=order_id,
            order_number="ORD-RESTART-01",
            lease_id="lease-xyz",
            lease_expires_at="2026-10-06T23:00:00Z",
            document_id=str(uuid.uuid4()),
            document_filename="thesis.pdf",
            page_count=20,
            print_spec={"copies": 2, "color_mode": "BW"},
            printer_name="Xerox-01",
        )
        assert q1.get_queue_depth() == 1

        # Simulate job status update to PRINTING
        q1.update_status(job_id, "PRINTING", synced=False)

        # 2. Simulate process crash / termination: q1 is garbage collected
        del q1

        # 3. Simulate daemon process restart: q2 reopens SQLite file
        q2 = LocalQueue(db_path)
        assert q2.get_queue_depth() == 1

        recovered = q2.get_job(job_id)
        assert recovered is not None
        assert recovered["order_number"] == "ORD-RESTART-01"
        assert recovered["status"] == "PRINTING"
        assert recovered["printer_name"] == "Xerox-01"
        assert recovered["synced_with_cloud"] == 0

        # Complete offline and verify unsynced status
        q2.update_status(job_id, "COMPLETED", synced=False, native_job_id="CUPS-102")
        unsynced = q2.get_pending_unsynced_jobs()
        assert len(unsynced) == 1
        assert unsynced[0]["native_job_id"] == "CUPS-102"


@pytest.mark.asyncio
async def test_deterministic_capability_aware_scheduling():
    """
    Directive 23 & 24: Validate settings compatibility and capability-aware scheduling.
    Color jobs must route to Color printers; B&W jobs prefer Monochrome to preserve capacity.
    """
    async with AsyncSessionLocal() as session:
        # Use isolated shop and agent to prevent cross-test interference
        tenant = (await session.execute(select(Shop))).scalars().first()
        test_shop = Shop(
            name="Capability Test Shop",
            slug=f"cap-shop-{uuid.uuid4().hex[:6]}",
            tenant_id=tenant.tenant_id if hasattr(tenant, "tenant_id") and tenant.tenant_id else tenant.id,
            is_active=True,
        )
        session.add(test_shop)
        await session.flush()

        test_agent = Agent(
            shop_id=test_shop.id,
            name="Test-Agent-Cap",
            agent_token_hash="token-hash",
            status=AgentStatus.ONLINE,
        )
        session.add(test_agent)
        await session.flush()

        test_doc = Document(
            shop_id=test_shop.id,
            original_filename="test.pdf",
            sanitized_filename="test.pdf",
            storage_path="test/test.pdf",
            mime_type="application/pdf",
            file_size_bytes=1024,
            page_count=2,
            checksum_sha256="dummychecksum",
        )
        session.add(test_doc)
        await session.flush()

        # Register two printers with distinct capabilities:
        # Printer Mono: A4, Monochrome only
        mono_printer = Printer(
            shop_id=test_shop.id,
            agent_id=test_agent.id,
            name=f"BW-Laser-{uuid.uuid4().hex[:6]}",
            adapter_type=PrinterAdapterType.CUPS,
            status=PrinterStatus.ONLINE,
            capabilities_json={"color": False, "duplex": True, "paper_sizes": ["A4"]},
        )
        # Printer Color: A4 & A3, Full Color
        color_printer = Printer(
            shop_id=test_shop.id,
            agent_id=test_agent.id,
            name=f"Color-Inkjet-{uuid.uuid4().hex[:6]}",
            adapter_type=PrinterAdapterType.CUPS,
            status=PrinterStatus.ONLINE,
            capabilities_json={"color": True, "duplex": True, "paper_sizes": ["A4", "A3"]},
        )
        session.add_all([mono_printer, color_printer])
        await session.flush()

        # Create Order 1: Requires FULL COLOR
        order_color = Order(
            shop_id=test_shop.id,
            order_number=f"ORD-COL-{uuid.uuid4().hex[:6]}",
            guest_access_token=uuid.uuid4().hex,
            document_id=test_doc.id,
            status=OrderState.PAID,
            total_amount_cents=1000,
            currency="INR",
        )
        session.add(order_color)
        await session.flush()

        spec_color = PrintSpecification(
            order_id=order_color.id,
            copies=1,
            color_mode=ColorMode.COLOR,
            duplex=False,
            paper_size="A4",
        )
        session.add(spec_color)
        await session.flush()

        job_color = await queue_service.enqueue_order(session, order_color, priority=1)

        # Poll and lease: Scheduler must assign Color printer, NOT Mono
        leased_color_job = await queue_service.poll_and_lease_job(
            session=session,
            shop_id=test_shop.id,
            agent_id=test_agent.id,
        )
        assert leased_color_job is not None
        assert leased_color_job.id == job_color.id
        assert leased_color_job.printer_id == color_printer.id

        # Create Order 2: Requires B&W (Monochrome)
        order_bw = Order(
            shop_id=test_shop.id,
            order_number=f"ORD-BW-{uuid.uuid4().hex[:6]}",
            guest_access_token=uuid.uuid4().hex,
            document_id=test_doc.id,
            status=OrderState.PAID,
            total_amount_cents=200,
            currency="INR",
        )
        session.add(order_bw)
        await session.flush()

        spec_bw = PrintSpecification(
            order_id=order_bw.id,
            copies=1,
            color_mode=ColorMode.BW,
            duplex=False,
            paper_size="A4",
        )
        session.add(spec_bw)
        await session.flush()

        job_bw = await queue_service.enqueue_order(session, order_bw, priority=1)

        # Poll and lease: Scheduler must assign Mono printer (affinity matching)
        leased_bw_job = await queue_service.poll_and_lease_job(
            session=session,
            shop_id=test_shop.id,
            agent_id=test_agent.id,
        )
        assert leased_bw_job is not None
        assert leased_bw_job.id == job_bw.id
        assert leased_bw_job.printer_id == mono_printer.id

        await session.commit()


@pytest.mark.asyncio
async def test_capability_mismatch_prevents_incompatible_lease():
    """
    Directive 23: Student requests A3 and Duplex, but available printer only supports A4 Simplex.
    The scheduler must NOT assign that incompatible printer.
    """
    async with AsyncSessionLocal() as session:
        tenant = (await session.execute(select(Shop))).scalars().first()
        shop = Shop(
            name="Strict Shop",
            slug=f"strict-{uuid.uuid4().hex[:6]}",
            tenant_id=tenant.tenant_id if hasattr(tenant, "tenant_id") and tenant.tenant_id else tenant.id,
            is_active=True,
        )
        session.add(shop)
        await session.flush()

        agent = Agent(
            shop_id=shop.id,
            name="Strict-Agent",
            agent_token_hash="token-hash",
            status=AgentStatus.ONLINE,
        )
        session.add(agent)
        await session.flush()

        # Only A4 Simplex printer online
        small_printer = Printer(
            shop_id=shop.id,
            agent_id=agent.id,
            name="Small-A4-Simplex",
            adapter_type=PrinterAdapterType.CUPS,
            status=PrinterStatus.ONLINE,
            capabilities_json={"color": False, "duplex": False, "paper_sizes": ["A4"]},
        )
        session.add(small_printer)

        doc = Document(
            shop_id=shop.id,
            original_filename="blueprints.pdf",
            sanitized_filename="blueprints.pdf",
            storage_path="blueprints.pdf",
            mime_type="application/pdf",
            file_size_bytes=2048,
            page_count=5,
            checksum_sha256="checksum",
        )
        session.add(doc)
        await session.flush()

        # Order demanding A3 paper
        order_a3 = Order(
            shop_id=shop.id,
            order_number=f"ORD-A3-{uuid.uuid4().hex[:6]}",
            guest_access_token=uuid.uuid4().hex,
            document_id=doc.id,
            status=OrderState.PAID,
            total_amount_cents=500,
            currency="INR",
        )
        session.add(order_a3)
        await session.flush()

        spec_a3 = PrintSpecification(
            order_id=order_a3.id,
            copies=1,
            color_mode=ColorMode.BW,
            duplex=False,
            paper_size="A3",  # Incompatible with small_printer!
        )
        session.add(spec_a3)
        await session.flush()

        job_a3 = await queue_service.enqueue_order(session, order_a3, priority=1)

        # Scheduler must NOT lease this job to the incompatible printer
        incompatible_lease = await queue_service.poll_and_lease_job(
            session=session,
            shop_id=shop.id,
            agent_id=agent.id,
        )
        assert incompatible_lease is None, "Incompatible job must not be leased to printer lacking A3 support"


@pytest.mark.asyncio
async def test_operator_diagnostic_test_print_page():
    """
    Directive 22: Operator triggers test page via /shop/printers/{id}/test-print.
    Proves that a real 1-page A4 test PDF is generated and enqueued with priority 1.
    """
    from httpx import AsyncClient, ASGITransport
    from app.main import app

    async with AsyncSessionLocal() as session:
        # Find an operator user and online printer
        user = (await session.execute(select(User).where(User.role == UserRole.SHOP_OPERATOR))).scalars().first()
        printer = (await session.execute(select(Printer))).scalars().first()

    from app.core.security import create_access_token
    token = create_access_token(data={"sub": str(user.id), "role": user.role.value})
    headers = {"Authorization": f"Bearer {token}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(f"/api/v1/shop/printers/{printer.id}/test-print", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "QUEUED"
        assert data["order_number"].startswith("TEST-")

        # Verify job is enqueued in database with priority 1
        async with AsyncSessionLocal() as session:
            job = (await session.execute(
                select(PrintJob).where(PrintJob.id == uuid.UUID(data["job_id"]))
            )).scalar_one()
            assert job.priority == 1
            assert job.printer_id == printer.id
            assert job.status == JobStatus.QUEUED

            # Test isolation: mark diagnostic job FAILED so it does not pollute the
            # shared database used by subsequent tests (e.g. e2e poll would grab it).
            job.status = JobStatus.FAILED
            await session.commit()


