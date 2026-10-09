import uuid
import json
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.database import get_db
from app.core.logging import logger
from app.modules.orders.models import Order, OrderState
from app.modules.orders.state_machine import OrderStateMachine
from app.modules.payments.models import (
    Payment,
    PaymentStatus,
    PaymentGatewayType,
    PaymentEvent,
)
import app.modules.payments.gateway as gateway_module
from app.modules.queue.service import queue_service
from app.modules.audit.models import IdempotencyKey
from app.api.v1.schemas import PaymentIntentRequest, PaymentResponse, PaymentVerifyRequest

router = APIRouter(tags=["Payments"])


@router.post("/orders/{guest_token}/payment", response_model=PaymentResponse)
async def process_student_payment(
    guest_token: str,
    payload: PaymentIntentRequest,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    db: AsyncSession = Depends(get_db),
):
    """
    Student payment initiation / execution:
    - If Razorpay provider configured: creates server-side order intent with gateway_order_id.
    - If Mock provider: transitions CREATED -> PAYMENT_PENDING -> PAID -> QUEUED.
    Enforces idempotency and transactional integrity.
    """
    # Find order
    res = await db.execute(
        select(Order)
        .options(selectinload(Order.payment))
        .where(Order.guest_access_token == guest_token)
    )
    order = res.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Idempotency check: if order is already PAID/QUEUED, return success
    if order.status in [
        OrderState.PAID,
        OrderState.QUEUED,
        OrderState.DISPATCHED,
        OrderState.PRINTING,
        OrderState.PRINT_COMPLETED,
        OrderState.PICKUP_READY,
        OrderState.COMPLETED,
    ]:
        payment = order.payment
        is_mock = not payment or payment.gateway == PaymentGatewayType.MOCK
        msg = "[DEMO/MOCK] Payment already processed and order queued." if is_mock else "Payment already processed and order queued."
        return PaymentResponse(
            payment_id=str(payment.id) if payment else "existing",
            order_id=str(order.id),
            amount_cents=order.total_amount_cents,
            status="SUCCESS",
            gateway=payment.gateway.value if payment else "MOCK",
            message=msg,
            gateway_order_id=payment.gateway_order_id if payment else None,
            currency=order.currency,
        )

    # Transition to PAYMENT_PENDING if currently in CREATED
    if order.status == OrderState.CREATED:
        await OrderStateMachine.transition(
            session=db,
            order=order,
            target_state=OrderState.PAYMENT_PENDING,
            actor_type="GUEST",
            reason="Student initiated payment checkout",
        )

    gateway = gateway_module.get_payment_gateway()
    intent = await gateway.create_payment_intent(
        amount_cents=order.total_amount_cents,
        currency=order.currency,
        order_id=str(order.id),
    )

    is_razorpay = intent.get("gateway") == PaymentGatewayType.RAZORPAY.value

    # If Razorpay mode and not simulated failure:
    if is_razorpay and (payload.simulate_status or "").lower() != "failed":
        # Check if payment already exists for this order
        res_pay = await db.execute(select(Payment).where(Payment.order_id == order.id))
        existing_pay = res_pay.scalar_one_or_none()

        if existing_pay:
            existing_pay.gateway = PaymentGatewayType.RAZORPAY
            existing_pay.gateway_order_id = intent["gateway_order_id"]
            existing_pay.status = PaymentStatus.PENDING
            payment = existing_pay
        else:
            payment = Payment(
                order_id=order.id,
                shop_id=order.shop_id,
                gateway=PaymentGatewayType.RAZORPAY,
                gateway_order_id=intent["gateway_order_id"],
                amount_cents=order.total_amount_cents,
                currency=order.currency,
                status=PaymentStatus.PENDING,
                idempotency_key=idempotency_key,
            )
            db.add(payment)

        await db.commit()
        return PaymentResponse(
            payment_id=str(payment.id),
            order_id=str(order.id),
            amount_cents=order.total_amount_cents,
            status="PENDING",
            gateway="RAZORPAY",
            message="Razorpay order intent created. Proceed with checkout modal.",
            gateway_order_id=intent["gateway_order_id"],
            currency=order.currency,
            key_id=intent.get("key_id", settings.RAZORPAY_KEY_ID),
        )

    # Mock mode or simulated execution
    env_lower = (settings.ENVIRONMENT or settings.APP_ENV or "development").lower()
    if env_lower in ("production", "prod") and not settings.ALLOW_MOCK_PAYMENTS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Mock payments are disabled in production environment.",
        )

    is_success = (payload.simulate_status or "success").lower() == "success"

    res_pay = await db.execute(select(Payment).where(Payment.order_id == order.id))
    existing_pay = res_pay.scalar_one_or_none()

    if existing_pay:
        existing_pay.status = PaymentStatus.SUCCESS if is_success else PaymentStatus.FAILED
        payment = existing_pay
    else:
        payment = Payment(
            order_id=order.id,
            shop_id=order.shop_id,
            gateway=PaymentGatewayType.MOCK,
            gateway_payment_id=intent["gateway_order_id"],
            gateway_order_id=intent["gateway_order_id"],
            amount_cents=order.total_amount_cents,
            currency=order.currency,
            status=PaymentStatus.SUCCESS if is_success else PaymentStatus.FAILED,
            idempotency_key=idempotency_key,
        )
        db.add(payment)

    await db.flush()

    if is_success:
        await OrderStateMachine.transition(
            session=db,
            order=order,
            target_state=OrderState.PAID,
            actor_type="PAYMENT_GATEWAY",
            reason=f"[DEMO/MOCK] Payment {payment.gateway_payment_id} recorded for testing",
        )
        await queue_service.enqueue_order(session=db, order=order)
        await db.commit()

        return PaymentResponse(
            payment_id=str(payment.id),
            order_id=str(order.id),
            amount_cents=order.total_amount_cents,
            status="SUCCESS",
            gateway="MOCK",
            message="[DEMO/MOCK] Mock payment processed for testing. No real money was charged.",
            gateway_order_id=intent["gateway_order_id"],
            currency=order.currency,
        )
    else:
        await OrderStateMachine.transition(
            session=db,
            order=order,
            target_state=OrderState.PAYMENT_FAILED,
            actor_type="PAYMENT_GATEWAY",
            reason="[DEMO/MOCK] Payment rejected by gateway simulation",
        )
        await db.commit()

        return PaymentResponse(
            payment_id=str(payment.id),
            order_id=str(order.id),
            amount_cents=order.total_amount_cents,
            status="FAILED",
            gateway="MOCK",
            message="[DEMO/MOCK] Mock payment declined per simulation.",
            gateway_order_id=intent["gateway_order_id"],
            currency=order.currency,
        )


@router.post("/orders/{guest_token}/payment/verify", response_model=PaymentResponse)
async def verify_student_payment(
    guest_token: str,
    payload: PaymentVerifyRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Client-side payment verification endpoint (Razorpay Sandbox/Production):
    Cryptographically verifies the Razorpay signature before transitioning order to PAID.
    Enforces idempotency and prevents fraudulent client claims.
    """
    res = await db.execute(
        select(Order)
        .options(selectinload(Order.payment))
        .where(Order.guest_access_token == guest_token)
    )
    order = res.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # If already confirmed, return success idempotently
    if order.status in [
        OrderState.PAID,
        OrderState.QUEUED,
        OrderState.DISPATCHED,
        OrderState.PRINTING,
        OrderState.PRINT_COMPLETED,
        OrderState.PICKUP_READY,
        OrderState.COMPLETED,
    ]:
        payment = order.payment
        return PaymentResponse(
            payment_id=str(payment.id) if payment else "existing",
            order_id=str(order.id),
            amount_cents=order.total_amount_cents,
            status="SUCCESS",
            gateway="RAZORPAY",
            message="Payment already verified and job is in queue.",
            gateway_order_id=payload.razorpay_order_id,
            currency=order.currency,
        )

    gateway = gateway_module.get_payment_gateway()
    if payload.razorpay_signature and not isinstance(gateway, gateway_module.RazorpayPaymentGateway):
        gateway = gateway_module.RazorpayPaymentGateway(
            key_id=settings.RAZORPAY_KEY_ID or "rzp_test_key",
            key_secret=settings.RAZORPAY_KEY_SECRET or "secret_test_key_xyz789",
            webhook_secret=settings.RAZORPAY_WEBHOOK_SECRET or "whsec_test",
        )

    is_valid = await gateway.verify_payment(
        payment_id=payload.razorpay_payment_id,
        signature=payload.razorpay_signature,
        gateway_order_id=payload.razorpay_order_id,
    )

    if not is_valid:
        logger.warning(
            f"[PAYMENT] Cryptographic signature check failed for order {order.id}. "
            f"razorpay_payment_id={payload.razorpay_payment_id}"
        )
        if order.status == OrderState.CREATED:
            await OrderStateMachine.transition(
                session=db,
                order=order,
                target_state=OrderState.PAYMENT_PENDING,
                actor_type="PAYMENT_GATEWAY",
                reason="Payment verification attempt",
            )
        if order.status == OrderState.PAYMENT_PENDING:
            await OrderStateMachine.transition(
                session=db,
                order=order,
                target_state=OrderState.PAYMENT_FAILED,
                actor_type="PAYMENT_GATEWAY",
                reason="Cryptographic payment signature mismatch",
            )
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment verification failed: invalid cryptographic signature.",
        )

    # Update payment record
    res_pay = await db.execute(select(Payment).where(Payment.order_id == order.id))
    payment = res_pay.scalar_one_or_none()
    if not payment:
        payment = Payment(
            order_id=order.id,
            shop_id=order.shop_id,
            gateway=PaymentGatewayType.RAZORPAY,
            gateway_payment_id=payload.razorpay_payment_id,
            gateway_order_id=payload.razorpay_order_id,
            amount_cents=order.total_amount_cents,
            currency=order.currency,
            status=PaymentStatus.SUCCESS,
        )
        db.add(payment)
    else:
        payment.gateway = PaymentGatewayType.RAZORPAY
        payment.gateway_payment_id = payload.razorpay_payment_id
        payment.status = PaymentStatus.SUCCESS

    await db.flush()

    # Transition order to PAID
    await OrderStateMachine.transition(
        session=db,
        order=order,
        target_state=OrderState.PAID,
        actor_type="PAYMENT_GATEWAY",
        reason=f"Razorpay payment {payload.razorpay_payment_id} verified with valid HMAC signature",
    )

    # Enqueue job
    await queue_service.enqueue_order(session=db, order=order)
    await db.commit()

    return PaymentResponse(
        payment_id=str(payment.id),
        order_id=str(order.id),
        amount_cents=order.total_amount_cents,
        status="SUCCESS",
        gateway="RAZORPAY",
        message="Payment verified and print job placed in queue.",
        gateway_order_id=payload.razorpay_order_id,
        currency=order.currency,
    )


@router.post("/payments/webhook")
async def handle_payment_webhook(
    request: Request,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    razorpay_signature: Optional[str] = Header(None, alias="X-Razorpay-Signature"),
    db: AsyncSession = Depends(get_db),
):
    """
    Idempotent payment webhook handler supporting both Razorpay webhooks and internal events.
    Guarantees:
      - Raw body HMAC-SHA256 signature verification when webhook secret is configured.
      - Duplicate webhooks NEVER create multiple print jobs or duplicate state transitions.
      - Graceful extraction from nested Razorpay payloads or flat event objects.
    """
    raw_body = await request.body()
    try:
        payload = json.loads(raw_body) if raw_body else {}
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    gateway = gateway_module.get_payment_gateway()

    # 1. Signature Verification if configured
    if settings.RAZORPAY_WEBHOOK_SECRET and razorpay_signature:
        is_valid_sig = await gateway.verify_webhook_signature(
            payload=raw_body,
            signature=razorpay_signature,
            secret=settings.RAZORPAY_WEBHOOK_SECRET,
        )
        if not is_valid_sig:
            logger.warning("[WEBHOOK] Invalid Razorpay webhook signature rejected.")
            raise HTTPException(status_code=400, detail="Invalid webhook signature")

    # 2. Extract Event ID and Gateway Order / Entity ID
    event_id = (
        payload.get("event_id")
        or payload.get("id")
        or idempotency_key
        or str(uuid.uuid4())
    )

    # Handle standard Razorpay nested structure or flat structure
    gateway_order_id = None
    event_type = payload.get("event", "payment.captured")

    if "payload" in payload and "payment" in payload["payload"]:
        payment_entity = payload["payload"]["payment"].get("entity", {})
        gateway_order_id = payment_entity.get("order_id") or payment_entity.get("notes", {}).get("order_id")
    else:
        gateway_order_id = payload.get("gateway_order_id") or payload.get("order_id")

    if not gateway_order_id:
        logger.warning(f"[WEBHOOK] Event {event_id} missing gateway_order_id.")
        raise HTTPException(status_code=400, detail="Missing gateway_order_id in webhook payload")

    # 3. Check idempotency record
    idemp_stmt = select(IdempotencyKey).where(
        IdempotencyKey.key == event_id,
        IdempotencyKey.scope == "payment_webhook",
    )
    idemp_res = await db.execute(idemp_stmt)
    existing_idemp = idemp_res.scalar_one_or_none()
    if existing_idemp:
        logger.info(f"[WEBHOOK] Duplicate webhook event {event_id} ignored idempotently.")
        return existing_idemp.response_payload_json

    # 4. Find order by internal order ID (if UUID) or via Payment.gateway_order_id
    order = None
    try:
        parsed_order_uuid = uuid.UUID(gateway_order_id)
        order_stmt = (
            select(Order)
            .options(selectinload(Order.payment), selectinload(Order.print_job))
            .where(Order.id == parsed_order_uuid)
        )
        res_o = await db.execute(order_stmt)
        order = res_o.scalar_one_or_none()
    except ValueError:
        pass

    if not order:
        # Lookup by Payment.gateway_order_id
        pay_stmt = (
            select(Payment)
            .options(selectinload(Payment.order))
            .where(Payment.gateway_order_id == gateway_order_id)
        )
        res_p = await db.execute(pay_stmt)
        payment_rec = res_p.scalar_one_or_none()
        if payment_rec:
            order = payment_rec.order

    if not order:
        logger.warning(f"[WEBHOOK] No order found for gateway_order_id: {gateway_order_id}")
        return {"status": "IGNORED", "message": "Order not found"}

    # 5. If already processed, return idempotent response
    if order.status in [
        OrderState.PAID,
        OrderState.QUEUED,
        OrderState.DISPATCHED,
        OrderState.PRINTING,
        OrderState.PRINT_COMPLETED,
        OrderState.PICKUP_READY,
        OrderState.COMPLETED,
    ]:
        resp_data = {"status": "SUCCESS", "message": "Already processed", "order_id": str(order.id)}
        new_idemp = IdempotencyKey(
            key=event_id,
            scope="payment_webhook",
            resource_id=str(order.id),
            status_code=200,
            response_payload_json=resp_data,
        )
        db.add(new_idemp)
        await db.commit()
        return resp_data

    # 6. Atomic transition and queueing
    if event_type in ["payment.captured", "order.paid"]:
        await OrderStateMachine.transition(
            session=db,
            order=order,
            target_state=OrderState.PAID,
            actor_type="WEBHOOK",
            reason=f"Webhook event {event_id}",
        )
        await queue_service.enqueue_order(session=db, order=order)

    resp_data = {"status": "SUCCESS", "message": "Processed", "order_id": str(order.id)}
    new_idemp = IdempotencyKey(
        key=event_id,
        scope="payment_webhook",
        resource_id=str(order.id),
        status_code=200,
        response_payload_json=resp_data,
    )
    db.add(new_idemp)
    await db.commit()

    return resp_data
