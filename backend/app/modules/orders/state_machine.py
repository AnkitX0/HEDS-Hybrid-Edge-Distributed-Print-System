from typing import Dict, Set, Optional, Any
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import InvalidStateTransitionException
from app.core.logging import logger
from app.modules.orders.models import Order, OrderState
from app.modules.audit.models import AuditLog


# Valid transition graph
ALLOWED_TRANSITIONS: Dict[OrderState, Set[OrderState]] = {
    OrderState.CREATED: {
        OrderState.PAYMENT_PENDING,
        OrderState.PAID,
        OrderState.VALIDATION_FAILED,
        OrderState.CANCELLED,
    },
    OrderState.PAYMENT_PENDING: {
        OrderState.PAID,
        OrderState.PAYMENT_FAILED,
        OrderState.CANCELLED,
        OrderState.EXPIRED,
    },
    OrderState.PAID: {
        OrderState.QUEUED,
        OrderState.REFUND_PENDING,
        OrderState.CANCELLED,
    },
    OrderState.QUEUED: {
        OrderState.DISPATCHED,
        OrderState.DISPATCH_FAILED,
        OrderState.CANCELLED,
        OrderState.RECONCILING,
    },
    OrderState.DISPATCHED: {
        OrderState.PRINTING,
        OrderState.RECONCILING,
        OrderState.PRINT_FAILED,
        OrderState.CANCELLED,
    },
    OrderState.PRINTING: {
        OrderState.PRINT_COMPLETED,
        OrderState.RECONCILING,
        OrderState.PRINT_FAILED,
    },
    OrderState.PRINT_COMPLETED: {
        OrderState.PICKUP_READY,
    },
    OrderState.PICKUP_READY: {
        OrderState.COMPLETED,
        OrderState.EXPIRED,
    },
    # Recovery & intermediate states
    OrderState.RECONCILING: {
        OrderState.PRINT_COMPLETED,
        OrderState.PRINTING,
        OrderState.QUEUED,
        OrderState.PRINT_FAILED,
        OrderState.CANCELLED,
    },
    OrderState.PRINT_FAILED: {
        OrderState.QUEUED,  # Controlled Operator Retry
        OrderState.CANCELLED,
        OrderState.REFUND_PENDING,
    },
    OrderState.DISPATCH_FAILED: {
        OrderState.QUEUED,  # Re-enqueue
        OrderState.CANCELLED,
    },
    OrderState.REFUND_PENDING: {
        OrderState.REFUNDED,
    },
    OrderState.COMPLETED: set(),  # Terminal state
    OrderState.CANCELLED: set(),  # Terminal state
    OrderState.REFUNDED: set(),   # Terminal state
    OrderState.EXPIRED: set(),    # Terminal state
    OrderState.VALIDATION_FAILED: set(),
}


class OrderStateMachine:
    @staticmethod
    async def transition(
        session: AsyncSession,
        order: Order,
        target_state: OrderState,
        actor_type: str = "SYSTEM",
        actor_id: Optional[str] = None,
        reason: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Order:
        """
        Centrally validates state transitions, mutates order state, and records an audit log.
        """
        current_state = order.status

        # Idempotent no-op if already in target state
        if current_state == target_state:
            return order

        allowed_targets = ALLOWED_TRANSITIONS.get(current_state, set())
        if target_state not in allowed_targets:
            logger.warning(
                f"Illegal state transition attempted for order {order.id}: {current_state} -> {target_state}"
            )
            raise InvalidStateTransitionException(
                from_state=current_state.value,
                to_state=target_state.value,
                message=f"Order cannot transition from {current_state.value} to {target_state.value}",
            )

        # Mutate status
        order.status = target_state

        # Prepare audit record
        audit_meta = metadata.copy() if metadata else {}
        if reason:
            audit_meta["reason"] = reason
        audit_meta["from_state"] = current_state.value
        audit_meta["to_state"] = target_state.value

        audit_entry = AuditLog(
            tenant_id=None,
            shop_id=order.shop_id,
            actor_type=actor_type,
            actor_id=actor_id,
            action=f"ORDER_TRANSITION_{target_state.value}",
            resource_type="Order",
            resource_id=str(order.id),
            metadata_json=audit_meta,
        )
        session.add(audit_entry)

        logger.info(
            f"[FSM] Order {order.order_number} transitioned {current_state.value} -> {target_state.value}"
        )
        return order
