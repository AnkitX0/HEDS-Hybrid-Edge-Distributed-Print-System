import pytest
import uuid
import secrets
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select, func
from app.main import app
from app.core.database import AsyncSessionLocal
from app.models import Shop, Document, Order, OrderState, PrintJob, Payment


@pytest.mark.asyncio
async def test_duplicate_payment_webhook_never_creates_duplicate_jobs():
    """
    RELIABILITY TEST #1:
    Fire the exact same payment webhook multiple times concurrently or sequentially.
    Verifies:
      - Exactly 1 print job created
      - Order status transitions correctly
      - No duplicate jobs in queue
    """
    async with AsyncSessionLocal() as session:
        res_base = await session.execute(select(Shop).where(Shop.slug == "campus-xerox"))
        base_shop = res_base.scalar_one()

        # Isolated test shop so running edge agent does not poll this job
        shop = Shop(
            tenant_id=base_shop.tenant_id,
            name="Webhook Test Shop",
            slug=f"webhook-shop-{secrets.token_hex(4)}",
            is_active=True,
        )
        session.add(shop)
        await session.flush()

        # Create a fresh document and order in CREATED state
        doc = Document(
            shop_id=shop.id,
            original_filename="thesis_test.pdf",
            sanitized_filename="thesis_test.pdf",
            storage_path="storage_data/thesis.pdf",
            mime_type="application/pdf",
            file_size_bytes=100000,
            page_count=5,
            checksum_sha256=secrets.token_hex(32),
        )
        session.add(doc)
        await session.flush()

        order = Order(
            shop_id=shop.id,
            order_number=f"ORD-TEST-{secrets.token_hex(4)}",
            guest_access_token=f"tok_{secrets.token_hex(16)}",
            document_id=doc.id,
            status=OrderState.CREATED,
            total_amount_cents=1000,
            currency="INR",
            pricing_breakdown_json={"pages": 5, "total": 1000},
        )
        session.add(order)
        await session.commit()
        order_id_str = str(order.id)

    # Prepare webhook payload
    webhook_event_id = f"evt_{secrets.token_hex(8)}"
    payload = {
        "event_id": webhook_event_id,
        "event": "payment.captured",
        "gateway_order_id": order_id_str,
        "amount_cents": 1000,
    }

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Fire 5 duplicate webhooks
        responses = []
        for _ in range(5):
            resp = await client.post(
                "/api/v1/payments/webhook",
                json=payload,
                headers={"Idempotency-Key": webhook_event_id},
            )
            responses.append(resp)

    # All webhook calls must succeed (HTTP 200)
    for r in responses:
        assert r.status_code == 200

    # Inspect database invariants
    async with AsyncSessionLocal() as session:
        # Verify job count
        jobs_stmt = select(func.count(PrintJob.id)).where(PrintJob.order_id == uuid.UUID(order_id_str))
        count = (await session.execute(jobs_stmt)).scalar_one()

        assert count == 1, f"Expected exactly 1 print job, but found {count}!"

        # Verify order state (may be QUEUED or already DISPATCHED if background agent leased it)
        order_stmt = select(Order).where(Order.id == uuid.UUID(order_id_str))
        refreshed_order = (await session.execute(order_stmt)).scalar_one()
        assert refreshed_order.status in [OrderState.QUEUED, OrderState.DISPATCHED]
