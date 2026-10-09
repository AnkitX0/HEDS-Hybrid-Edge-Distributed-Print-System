import hmac
import hashlib
import pytest
from app.modules.payments.gateway import MockPaymentGateway, RazorpayPaymentGateway


@pytest.mark.asyncio
async def test_mock_payment_gateway_lifecycle():
    gateway = MockPaymentGateway()
    intent = await gateway.create_payment_intent(
        amount_cents=1500,
        currency="INR",
        order_id="test_ord_1",
    )
    assert intent["gateway"] == "MOCK"
    assert intent["amount_cents"] == 1500
    assert intent["gateway_order_id"].startswith("mock_order_")

    is_valid = await gateway.verify_payment(payment_id="pay_mock_12345")
    assert is_valid is True

    is_invalid = await gateway.verify_payment(payment_id="mock_fail_99999")
    assert is_invalid is False

    refund = await gateway.refund_payment(payment_id="pay_mock_12345", amount_cents=1500)
    assert refund["status"] == "refunded"
    assert refund["payment_id"] == "pay_mock_12345"


@pytest.mark.asyncio
async def test_razorpay_payment_gateway_hmac_verification():
    key_id = "rzp_test_mock_samplekey123"
    key_secret = "secret_test_key_xyz789"
    webhook_secret = "whsec_test_secret_abc"


    gateway = RazorpayPaymentGateway(
        key_id=key_id,
        key_secret=key_secret,
        webhook_secret=webhook_secret,
    )

    # 1. Create intent
    intent = await gateway.create_payment_intent(
        amount_cents=2500,
        currency="INR",
        order_id="test_ord_rzp",
    )
    assert intent["gateway"] == "RAZORPAY"
    assert intent["amount_cents"] == 2500

    # 2. Authoritative HMAC signature calculation
    order_id = "order_rzp_mock123"
    payment_id = "pay_rzp_mock456"
    msg = f"{order_id}|{payment_id}"
    valid_sig = hmac.new(key_secret.encode("utf-8"), msg.encode("utf-8"), hashlib.sha256).hexdigest()

    # Positive verification
    verified = await gateway.verify_payment(
        payment_id=payment_id,
        signature=valid_sig,
        gateway_order_id=order_id,
    )
    assert verified is True

    # Tampered signature verification
    tampered_sig = valid_sig[:-4] + "0000"
    verified_tampered = await gateway.verify_payment(
        payment_id=payment_id,
        signature=tampered_sig,
        gateway_order_id=order_id,
    )
    assert verified_tampered is False

    # 3. Webhook signature verification
    payload_body = b'{"event":"payment.captured","payload":{"payment":{"entity":{"id":"pay_1"}}}}'
    valid_webhook_sig = hmac.new(webhook_secret.encode("utf-8"), payload_body, hashlib.sha256).hexdigest()

    wh_verified = await gateway.verify_webhook_signature(
        payload=payload_body,
        signature=valid_webhook_sig,
        secret=webhook_secret,
    )
    assert wh_verified is True

    wh_rejected = await gateway.verify_webhook_signature(
        payload=payload_body,
        signature="invalid_tampered_signature",
        secret=webhook_secret,
    )
    assert wh_rejected is False


@pytest.mark.asyncio
async def test_client_payment_verification_endpoint():
    """
    Verifies that the /orders/{guest_token}/payment/verify endpoint cryptographically
    validates the Razorpay HMAC signature before transitioning to PAID and enqueuing.
    """
    import secrets
    from httpx import AsyncClient, ASGITransport
    from sqlalchemy import select
    from app.main import app
    from app.core.database import AsyncSessionLocal
    from app.models import Shop, Document, Order, OrderState, PrintJob, Payment
    from app.core.config import settings

    async with AsyncSessionLocal() as session:
        shop = (await session.execute(select(Shop).where(Shop.slug == "campus-xerox"))).scalar_one()
        doc = Document(
            shop_id=shop.id,
            original_filename="verify_test.pdf",
            sanitized_filename="verify_test.pdf",
            storage_path="storage_data/verify.pdf",
            mime_type="application/pdf",
            file_size_bytes=20000,
            page_count=2,
            checksum_sha256=secrets.token_hex(32),
        )
        session.add(doc)
        await session.flush()

        order = Order(
            shop_id=shop.id,
            order_number=f"ORD-VERIFY-{secrets.token_hex(4)}",
            guest_access_token=f"tok_{secrets.token_hex(16)}",
            document_id=doc.id,
            status=OrderState.PAYMENT_PENDING,
            total_amount_cents=500,
            currency="INR",
            pricing_breakdown_json={"pages": 2},
        )
        session.add(order)
        await session.commit()
        guest_token = order.guest_access_token
        order_id_str = str(order.id)

    # Calculate HMAC signature using secret
    rzp_order_id = f"order_{secrets.token_hex(8)}"
    rzp_pay_id = f"pay_{secrets.token_hex(8)}"
    msg = f"{rzp_order_id}|{rzp_pay_id}"
    secret = settings.RAZORPAY_KEY_SECRET or "secret_test_key_xyz789"
    # Ensure gateway has secret for test
    from app.modules.payments.gateway import RazorpayPaymentGateway
    import app.modules.payments.gateway as gw_module
    orig_fn = gw_module.get_payment_gateway
    gw_module.get_payment_gateway = lambda: RazorpayPaymentGateway(
        key_id="rzp_test_123",
        key_secret=secret,
        webhook_secret="wh_secret_123",
    )

    try:
        valid_sig = hmac.new(secret.encode("utf-8"), msg.encode("utf-8"), hashlib.sha256).hexdigest()

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # 1. Tampered signature must fail with 400
            bad_resp = await client.post(
                f"/api/v1/orders/{guest_token}/payment/verify",
                json={
                    "razorpay_payment_id": rzp_pay_id,
                    "razorpay_order_id": rzp_order_id,
                    "razorpay_signature": "tampered_signature_abc_1234567890",
                },
            )
            assert bad_resp.status_code == 400

            # 2. Valid signature must succeed (200), mark order PAID, and enqueue
            good_resp = await client.post(
                f"/api/v1/orders/{guest_token}/payment/verify",
                json={
                    "razorpay_payment_id": rzp_pay_id,
                    "razorpay_order_id": rzp_order_id,
                    "razorpay_signature": valid_sig,
                },
            )
            assert good_resp.status_code == 200
            assert good_resp.json()["status"] == "SUCCESS"

        async with AsyncSessionLocal() as session:
            import uuid
            refreshed = (await session.execute(select(Order).where(Order.id == uuid.UUID(order_id_str)))).scalar_one()
            assert refreshed.status == OrderState.QUEUED
    finally:
        gw_module.get_payment_gateway = orig_fn


@pytest.mark.asyncio
async def test_pickup_token_collection_and_idempotent_duplicate_protection():
    """
    Verifies token-based counter pickup flow:
    - Order is prepared for pickup
    - Operator marks collected via token
    - Order transitions to COMPLETED
    - Duplicate collection is idempotent and protected
    - Nonexistent order lookup is rejected cleanly
    """
    import secrets
    import uuid
    from sqlalchemy import select
    from app.core.database import AsyncSessionLocal
    from app.models import Shop, Document, Order, OrderState
    from app.modules.pickups.service import pickup_service
    from app.core.exceptions import HEDSException

    async with AsyncSessionLocal() as session:
        shop = (await session.execute(select(Shop).where(Shop.slug == "campus-xerox"))).scalar_one()
        doc = Document(
            shop_id=shop.id,
            original_filename="pickup_test.pdf",
            sanitized_filename="pickup_test.pdf",
            storage_path="storage_data/pickup_test.pdf",
            mime_type="application/pdf",
            file_size_bytes=10000,
            page_count=1,
            checksum_sha256=secrets.token_hex(32),
        )
        session.add(doc)
        await session.flush()

        order = Order(
            shop_id=shop.id,
            order_number=f"ORD-TOKEN-{secrets.token_hex(4)}",
            guest_access_token=f"tok_{secrets.token_hex(16)}",
            document_id=doc.id,
            status=OrderState.PRINT_COMPLETED,
            total_amount_cents=200,
            currency="INR",
            pricing_breakdown_json={"pages": 1},
        )
        session.add(order)
        await session.flush()

        # Prepare for counter pickup
        await pickup_service.prepare_for_pickup(session, order)
        await session.commit()
        order_id = order.id

    # Confirm collection
    async with AsyncSessionLocal() as session:
        completed_order = await pickup_service.confirm_pickup(
            session=session,
            order_id=order_id,
        )
        assert completed_order.status == OrderState.COMPLETED

        # Duplicate collection protection (must be idempotent)
        dup_completed = await pickup_service.confirm_pickup(
            session=session,
            order_id=order_id,
        )
        assert dup_completed.status == OrderState.COMPLETED

        # Nonexistent order rejection
        with pytest.raises(HEDSException) as exc_info:
            await pickup_service.confirm_pickup(
                session=session,
                order_id=uuid.uuid4(),
            )
        assert exc_info.value.code == "PICKUP_NOT_FOUND"
