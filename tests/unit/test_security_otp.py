import pytest
import uuid
import secrets
from app.core.security import (
    generate_guest_order_token,
    hash_password,
    verify_password,
    create_access_token,
)
from app.core.exceptions import HEDSException
from app.modules.pickups.service import pickup_service
from app.core.database import AsyncSessionLocal
from app.models import Shop, Document, Order, OrderState, User


def test_guest_token_randomness():
    """Verify student guest order tokens are cryptographically secure and unique"""
    tokens = {generate_guest_order_token() for _ in range(100)}
    assert len(tokens) == 100
    for tok in tokens:
        assert len(tok) >= 32


def test_password_hashing():
    """Verify operator/admin password hashing uses salted bcrypt"""
    pw = "supersecret123"
    hashed = hash_password(pw)
    assert hashed != pw
    assert verify_password(pw, hashed) is True
    assert verify_password("wrongpass", hashed) is False


@pytest.mark.asyncio
async def test_token_pickup_authorization_and_duplicate_protection():
    """
    Verifies that pickup collection:
    - requires order to be in PICKUP_READY
    - transitions to COMPLETED
    - already-completed orders cannot be double-collected (idempotent 200)
    - invalid order IDs are rejected cleanly
    """
    async with AsyncSessionLocal() as session:
        from sqlalchemy import select
        shop = (await session.execute(select(Shop).where(Shop.slug == "campus-xerox"))).scalar_one()
        doc = Document(
            shop_id=shop.id,
            original_filename="token_auth_test.pdf",
            sanitized_filename="token_auth_test.pdf",
            storage_path="storage_data/token_auth_test.pdf",
            mime_type="application/pdf",
            file_size_bytes=5000,
            page_count=1,
            checksum_sha256=secrets.token_hex(32),
        )
        session.add(doc)
        await session.flush()

        order = Order(
            shop_id=shop.id,
            order_number=f"TKN-{secrets.token_hex(3)}",
            guest_access_token=generate_guest_order_token(),
            document_id=doc.id,
            status=OrderState.PRINT_COMPLETED,
            total_amount_cents=100,
            currency="INR",
            pricing_breakdown_json={"pages": 1},
        )
        session.add(order)
        await session.flush()

        await pickup_service.prepare_for_pickup(session, order)
        await session.commit()
        order_id = order.id

    async with AsyncSessionLocal() as session:
        # 1. Mark Collected
        completed_order = await pickup_service.confirm_pickup(session, order_id=order_id)
        assert completed_order.status == OrderState.COMPLETED

        # 2. Duplicate collection protection: returns existing completed order without error
        second_collection = await pickup_service.confirm_pickup(session, order_id=order_id)
        assert second_collection.status == OrderState.COMPLETED

        # 3. Invalid order ID rejection
        with pytest.raises(HEDSException) as exc:
            await pickup_service.confirm_pickup(session, order_id=uuid.uuid4())
        assert exc.value.code == "PICKUP_NOT_FOUND"


@pytest.mark.asyncio
async def test_unauthorized_operator_pickup_access():
    """
    Verifies that counter pickup confirmation:
    - Rejects unauthenticated requests with HTTP 401
    - Rejects invalid/forged tokens with HTTP 401
    - Rejects nonexistent token strings with HTTP 404 for authorized operators
    """
    from httpx import AsyncClient, ASGITransport
    from sqlalchemy import select
    from app.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Unauthenticated request
        resp_unauth = await client.post(
            "/api/v1/pickups/confirm",
            json={"token": "#9999"},
        )
        assert resp_unauth.status_code == 401

        # 2. Forged / non-existent user token
        bogus_jwt = create_access_token({"sub": str(uuid.uuid4()), "role": "SHOP_OPERATOR"})
        resp_bogus = await client.post(
            "/api/v1/pickups/confirm",
            headers={"Authorization": f"Bearer {bogus_jwt}"},
            json={"token": "#9999"},
        )
        assert resp_bogus.status_code == 401

        # 3. Valid authenticated operator, but nonexistent order token
        async with AsyncSessionLocal() as session:
            op = (await session.execute(select(User).where(User.email == "operator@campus-xerox.local"))).scalar_one()
            op_jwt = create_access_token({"sub": str(op.id), "role": "SHOP_OPERATOR"})

        resp_notfound = await client.post(
            "/api/v1/pickups/confirm",
            headers={"Authorization": f"Bearer {op_jwt}"},
            json={"token": "#NONEXISTENT-9999"},
        )
        assert resp_notfound.status_code == 404

