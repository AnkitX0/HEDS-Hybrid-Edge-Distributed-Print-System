import pytest
import uuid
import secrets
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select
from app.main import app
from app.core.database import AsyncSessionLocal
from app.core.security import create_access_token
from app.models import Shop, Document, Order, OrderState, PrintJob, JobStatus, Agent, User


@pytest.mark.asyncio
async def test_printer_failure_and_operator_retry():
    """
    RELIABILITY TEST #3:
    Simulate a printer error (e.g., Paper Jam, Ink Depleted).
    1. Agent reports failure -> job transitions to PRINT_FAILED.
    2. Physical job does not auto-respool into a duplicate.
    3. Operator inspects physical printer and triggers controlled Retry.
    4. Order transitions back to QUEUED safely.
    """
    async with AsyncSessionLocal() as session:
        shop = (await session.execute(select(Shop).where(Shop.slug == "campus-xerox"))).scalar_one()
        agent = (await session.execute(select(Agent).where(Agent.name == "campus-agent-01"))).scalar_one()
        operator = (await session.execute(select(User).where(User.email == "operator@campus-xerox.local"))).scalar_one()

        doc = Document(
            shop_id=shop.id,
            original_filename="fail_test.pdf",
            sanitized_filename="fail_test.pdf",
            storage_path="storage_data/fail.pdf",
            mime_type="application/pdf",
            file_size_bytes=50000,
            page_count=2,
            checksum_sha256=secrets.token_hex(32),
        )
        session.add(doc)
        await session.flush()

        order = Order(
            shop_id=shop.id,
            order_number=f"ORD-FAIL-{secrets.token_hex(4)}",
            guest_access_token=f"tok_{secrets.token_hex(16)}",
            document_id=doc.id,
            status=OrderState.PRINTING,
            total_amount_cents=400,
            currency="INR",
            pricing_breakdown_json={"pages": 2},
        )
        session.add(order)
        await session.flush()

        job = PrintJob(
            order_id=order.id,
            shop_id=shop.id,
            agent_id=agent.id,
            status=JobStatus.PRINTING,
            lease_id="active_lease_123",
        )
        session.add(job)
        await session.commit()
        job_id_str = str(job.id)
        order_id_str = str(order.id)
        operator_id = operator.id

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Agent reports failure
        agent_headers = {
            "X-Agent-ID": str(agent.id),
            "X-Agent-Key": "agent-dev-key-12345",
        }
        fail_resp = await client.post(
            f"/api/v1/agents/jobs/{job_id_str}/status",
            headers=agent_headers,
            json={"status": "FAILED", "error_message": "Paper jam in tray 1"},
        )
        assert fail_resp.status_code == 200

        # Verify state is PRINT_FAILED
        async with AsyncSessionLocal() as session:
            refreshed_order = (await session.execute(select(Order).where(Order.id == uuid.UUID(order_id_str)))).scalar_one()
            assert refreshed_order.status == OrderState.PRINT_FAILED

        # 2. Operator performs controlled retry
        token = create_access_token({"sub": str(operator_id), "email": "operator@campus-xerox.local", "role": "SHOP_OPERATOR"})
        retry_resp = await client.post(
            f"/api/v1/jobs/{job_id_str}/retry",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert retry_resp.status_code == 200

        # Verify order transitioned back to QUEUED for clean re-leasing
        async with AsyncSessionLocal() as session:
            refreshed_order = (await session.execute(select(Order).where(Order.id == uuid.UUID(order_id_str)))).scalar_one()
            assert refreshed_order.status == OrderState.QUEUED
            refreshed_job = (await session.execute(select(PrintJob).where(PrintJob.id == uuid.UUID(job_id_str)))).scalar_one()
            assert refreshed_job.status == JobStatus.QUEUED
