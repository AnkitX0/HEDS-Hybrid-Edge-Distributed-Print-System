import uuid
import secrets
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from datetime import datetime, timezone

from app.core.logging import logger
from app.modules.payments.models import Payment, PaymentStatus, PaymentGatewayType


class PaymentGateway(ABC):
    @abstractmethod
    async def create_payment_intent(
        self,
        amount_cents: int,
        currency: str,
        order_id: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Create a payment intent / checkout session"""
        pass

    @abstractmethod
    async def verify_payment(
        self,
        payment_id: str,
        signature: Optional[str] = None,
    ) -> bool:
        """Verify payment confirmation with gateway"""
        pass

    @abstractmethod
    async def refund_payment(
        self,
        payment_id: str,
        amount_cents: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Process refund with gateway"""
        pass

    @abstractmethod
    async def verify_webhook_signature(
        self,
        payload: bytes,
        signature: str,
        secret: str,
    ) -> bool:
        """Verify webhook payload authenticity"""
        pass


class MockPaymentGateway(PaymentGateway):
    """
    Mock payment gateway simulating real card/UPI checkouts and webhooks.
    Allows deterministic testing and local development.
    """
    async def create_payment_intent(
        self,
        amount_cents: int,
        currency: str,
        order_id: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        gateway_order_id = f"mock_order_{uuid.uuid4().hex[:12]}"
        return {
            "gateway": PaymentGatewayType.MOCK.value,
            "gateway_order_id": gateway_order_id,
            "amount_cents": amount_cents,
            "currency": currency,
            "status": "created",
            "checkout_url": f"/mock-checkout/{gateway_order_id}",
        }

    async def verify_payment(
        self,
        payment_id: str,
        signature: Optional[str] = None,
    ) -> bool:
        # For mock, payments are valid unless explicitly marked failing
        return not payment_id.startswith("mock_fail_")

    async def refund_payment(
        self,
        payment_id: str,
        amount_cents: Optional[int] = None,
    ) -> Dict[str, Any]:
        return {
            "refund_id": f"mock_ref_{uuid.uuid4().hex[:12]}",
            "payment_id": payment_id,
            "status": "refunded",
        }

    async def verify_webhook_signature(
        self,
        payload: bytes,
        signature: str,
        secret: str,
    ) -> bool:
        # Mock gateway accepts signature if non-empty or default mock signature
        return bool(signature)


class RazorpayPaymentGateway(PaymentGateway):
    """
    Production boundary for Razorpay integration.
    """
    def __init__(self, key_id: str, key_secret: str, webhook_secret: str):
        self.key_id = key_id
        self.key_secret = key_secret
        self.webhook_secret = webhook_secret

    async def create_payment_intent(
        self,
        amount_cents: int,
        currency: str,
        order_id: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        # Interface boundary ready for razorpay client
        raise NotImplementedError("Razorpay credentials not configured in local environment.")

    async def verify_payment(
        self,
        payment_id: str,
        signature: Optional[str] = None,
    ) -> bool:
        raise NotImplementedError("Razorpay credentials not configured in local environment.")

    async def refund_payment(
        self,
        payment_id: str,
        amount_cents: Optional[int] = None,
    ) -> Dict[str, Any]:
        raise NotImplementedError("Razorpay credentials not configured in local environment.")

    async def verify_webhook_signature(
        self,
        payload: bytes,
        signature: str,
        secret: str,
    ) -> bool:
        import hmac
        import hashlib
        expected = hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected, signature)


def get_payment_gateway() -> PaymentGateway:
    return MockPaymentGateway()
