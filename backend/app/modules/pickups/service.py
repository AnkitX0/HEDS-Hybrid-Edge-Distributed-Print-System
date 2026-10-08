import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import HEDSException, InvalidStateTransitionException
from app.modules.pickups.models import Pickup
from app.modules.orders.models import Order, OrderState
from app.modules.orders.state_machine import OrderStateMachine


class PickupService:
    @staticmethod
    async def prepare_for_pickup(
        session: AsyncSession,
        order: Order,
    ) -> Pickup:
        """
        Creates or refreshes the Pickup record and transitions the order to PICKUP_READY.
        The pickup is token-based using the order's existing human-readable order_number/token.
        """
        expires_at = datetime.now(timezone.utc) + timedelta(hours=24)

        # Check existing pickup record
        res = await session.execute(select(Pickup).where(Pickup.order_id == order.id))
        pickup = res.scalar_one_or_none()

        if pickup:
            pickup.expires_at = expires_at
        else:
            pickup = Pickup(
                order_id=order.id,
                shop_id=order.shop_id,
                expires_at=expires_at,
            )
            session.add(pickup)

        if order.status != OrderState.PICKUP_READY:
            await OrderStateMachine.transition(
                session=session,
                order=order,
                target_state=OrderState.PICKUP_READY,
                actor_type="SYSTEM",
                reason="Physical printing complete; order ready for counter pickup",
            )

        return pickup

    # Backward-compatible alias for agent/dev calls
    create_privacy_hold = prepare_for_pickup

    @staticmethod
    async def confirm_pickup(
        session: AsyncSession,
        order_id: uuid.UUID,
        provided_otp: Optional[str] = None,  # Kept as optional ignored parameter for contract safety
        operator_user_id: Optional[uuid.UUID] = None,
    ) -> Order:
        """
        Operator confirms counter collection: transitions order to COMPLETED.
        Guarantees idempotency (already-collected order returns cleanly).
        """
        stmt = (
            select(Pickup)
            .options(selectinload(Pickup.order))
            .where(Pickup.order_id == order_id)
        )
        res = await session.execute(stmt)
        pickup = res.scalar_one_or_none()

        if not pickup:
            # Check if order exists directly
            stmt_ord = select(Order).where(Order.id == order_id)
            res_ord = await session.execute(stmt_ord)
            ord_obj = res_ord.scalar_one_or_none()
            if not ord_obj:
                raise HEDSException(code="PICKUP_NOT_FOUND", message="Pickup record not found for this order")
            if ord_obj.status == OrderState.COMPLETED:
                return ord_obj
            pickup = await PickupService.prepare_for_pickup(session=session, order=ord_obj)

        if pickup.order.status == OrderState.COMPLETED:
            # Idempotent response: order has already been collected
            return pickup.order

        if pickup.order.status == OrderState.PRINT_COMPLETED:
            await OrderStateMachine.transition(
                session=session,
                order=pickup.order,
                target_state=OrderState.PICKUP_READY,
                actor_type="SYSTEM",
                reason="Auto-transition to PICKUP_READY prior to counter pickup confirmation",
            )

        if pickup.order.status != OrderState.PICKUP_READY:
            raise InvalidStateTransitionException(
                from_state=pickup.order.status.value,
                to_state=OrderState.COMPLETED.value,
                message=f"Order is in '{pickup.order.status.value}', must be 'PICKUP_READY' to confirm pickup.",
            )

        pickup.confirmed_at = datetime.now(timezone.utc)
        pickup.confirmed_by_user_id = operator_user_id

        await OrderStateMachine.transition(
            session=session,
            order=pickup.order,
            target_state=OrderState.COMPLETED,
            actor_type="USER",
            actor_id=str(operator_user_id) if operator_user_id else None,
            reason="Order collected at counter by student; marked COMPLETED by operator",
        )

        return pickup.order

    # Backward-compatible alias
    verify_and_complete_pickup = confirm_pickup


pickup_service = PickupService()
