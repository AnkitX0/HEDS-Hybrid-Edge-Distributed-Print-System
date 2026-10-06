import uuid
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

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
from app.modules.payments.gateway import get_payment_gateway
from app.modules.queue.service import queue_service
from app.modules.audit.models import IdempotencyKey
from app.api.v1.schemas import PaymentIntentRequest, PaymentResponse

router = APIRouter(tags=["Payments"])


@router.post("/orders/{guest_token}/payment", response_model=PaymentResponse)
async def process_student_payment(
    guest_token: str,
    payload: PaymentIntentRequest,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    db: AsyncSession = Depends(get_db),
):
    """
    Student payment submission:
    Transitions CREATED -> PAYMENT_PENDING -> PAID (via Mock Gateway) -> QUEUED.
    Enforces idempotency.
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
    if order.status in [OrderState.PAID, OrderState.QUEUED, OrderState.DISPATCHED, OrderState.PRINTING, OrderState.PRINT_COMPLETED, OrderState.PICKUP_READY, OrderState.COMPLETED]:
        payment = order.payment
        return PaymentResponse(
            payment_id=str(payment.id) if payment else "existing",
            order_id=str(order.id),
            amount_cents=order.total_amount_cents,
            status="SUCCESS",
            gateway="MOCK",
            message="Payment already processed and order queued.",
        )

    # Transition to PAYMENT_PENDING
    if order.status == OrderState.CREATED:
        await OrderStateMachine.transition(
            session=db,
            order=order,
            target_state=OrderState.PAYMENT_PENDING,
            actor_type="GUEST",
            reason="Student initiated payment checkout",
        )

    # Process via gateway
    gateway = get_payment_gateway()
    intent = await gateway.create_payment_intent(
        amount_cents=order.total_amount_cents,
        currency=order.currency,
        order_id=str(order.id),
    )

    is_success = (payload.simulate_status or "success").lower() == "success"

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
        # Transition to PAID
        await OrderStateMachine.transition(
            session=db,
            order=order,
            target_state=OrderState.PAID,
            actor_type="PAYMENT_GATEWAY",
            reason=f"Payment {payment.gateway_payment_id} captured successfully",
        )

        # Enqueue order into PostgreSQL print queue (idempotent)
        await queue_service.enqueue_order(session=db, order=order)

        await db.commit()
        return PaymentResponse(
            payment_id=str(payment.id),
            order_id=str(order.id),
            amount_cents=order.total_amount_cents,
            status="SUCCESS",
            gateway="MOCK",
            message="Payment confirmed and print job placed in queue.",
        )
    else:
        await OrderStateMachine.transition(
            session=db,
            order=order,
            target_state=OrderState.PAYMENT_FAILED,
            actor_type="PAYMENT_GATEWAY",
            reason="Payment rejected by gateway simulation",
        )
        await db.commit()
        return PaymentResponse(
            payment_id=str(payment.id),
            order_id=str(order.id),
            amount_cents=order.total_amount_cents,
            status="FAILED",
            gateway="MOCK",
            message="Payment declined.",
        )


@router.post("/payments/webhook")
async def handle_payment_webhook(
    payload: Dict[str, Any],
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    db: AsyncSession = Depends(get_db),
):
    """
    Idempotent payment webhook handler.
    Guarantees: duplicate webhooks NEVER create multiple print jobs or duplicate state transitions.
    """
    event_id = payload.get("event_id") or payload.get("id") or idempotency_key or str(uuid.uuid4())
    gateway_order_id = payload.get("gateway_order_id") or payload.get("order_id")

    if not gateway_order_id:
        raise HTTPException(status_code=400, detail="Missing gateway_order_id in webhook payload")

    # 1. Check idempotency record
    idemp_stmt = select(IdempotencyKey).where(
        IdempotencyKey.key == event_id,
        IdempotencyKey.scope == "payment_webhook",
    )
    idemp_res = await db.execute(idemp_stmt)
    existing_idemp = idemp_res.scalar_one_or_none()
    if existing_idemp:
        logger.info(f"[WEBHOOK] Duplicate webhook event {event_id} ignored idempotently.")
        return existing_idemp.response_payload_json

    # 2. Find order and payment
    order_stmt = (
        select(Order)
        .options(selectinload(Order.payment), selectinload(Order.print_job))
        .where(Order.id == uuid.UUID(gateway_order_id))
    )
    order_res = await db.execute(order_stmt)
    order = order_res.scalar_one_or_none()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found for webhook")

    # 3. If already processed, return idempotent response
    if order.status in [OrderState.PAID, OrderState.QUEUED, OrderState.DISPATCHED, OrderState.PRINTING, OrderState.PRINT_COMPLETED, OrderState.PICKUP_READY, OrderState.COMPLETED]:
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

    # 4. Atomic settlement and queueing
    event_type = payload.get("event", "payment.captured")
    if event_type == "payment.captured":
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
