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
