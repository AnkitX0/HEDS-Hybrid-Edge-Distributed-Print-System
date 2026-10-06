import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import HEDSException, InvalidStateTransitionException
from app.core.security import generate_pickup_otp, hash_pickup_otp, verify_pickup_otp
from app.modules.pickups.models import Pickup
from app.modules.orders.models import Order, OrderState
from app.modules.orders.state_machine import OrderStateMachine


class PickupService:
    @staticmethod
    async def create_privacy_hold(
        session: AsyncSession,
        order: Order,
    ) -> str:
        """
        Generates a secure 6-digit OTP, hashes it with a random salt,
        saves the Pickup record, and transitions order to PICKUP_READY.
        Returns the plaintext OTP for student display.
        """
        plain_otp = generate_pickup_otp()
        otp_hash, salt = hash_pickup_otp(plain_otp)
        expires_at = datetime.now(timezone.utc) + timedelta(hours=24)

        # Check existing pickup
        res = await session.execute(select(Pickup).where(Pickup.order_id == order.id))
        existing_pickup = res.scalar_one_or_none()

        if existing_pickup:
            existing_pickup.otp_hash = otp_hash
            existing_pickup.otp_salt = salt
            existing_pickup.expires_at = expires_at
        else:
            pickup = Pickup(
                order_id=order.id,
                shop_id=order.shop_id,
                otp_hash=otp_hash,
                otp_salt=salt,
                expires_at=expires_at,
            )
            session.add(pickup)

        await OrderStateMachine.transition(
            session=session,
            order=order,
            target_state=OrderState.PICKUP_READY,
            actor_type="SYSTEM",
            reason="Print completed; privacy hold engaged pending student pickup verification",
        )

        return plain_otp

    @staticmethod
    async def verify_and_complete_pickup(
        session: AsyncSession,
        order_id: uuid.UUID,
        provided_otp: str,
        operator_user_id: Optional[uuid.UUID] = None,
    ) -> Order:
        """
        Verifies student OTP against stored salted hash and marks order COMPLETED.
        """
        stmt = (
            select(Pickup)
            .options(selectinload(Pickup.order))
            .where(Pickup.order_id == order_id)
        )
        res = await session.execute(stmt)
        pickup = res.scalar_one_or_none()

        if not pickup:
            raise HEDSException(code="PICKUP_NOT_FOUND", message="Pickup record not found for this order")

        if pickup.order.status != OrderState.PICKUP_READY:
            raise InvalidStateTransitionException(
                from_state=pickup.order.status.value,
                to_state=OrderState.COMPLETED.value,
                message=f"Order is in '{pickup.order.status.value}', must be 'PICKUP_READY' to confirm pickup.",
            )

        if datetime.now(timezone.utc) > pickup.expires_at:
            raise HEDSException(code="OTP_EXPIRED", message="Pickup OTP has expired.")

        is_valid = verify_pickup_otp(
            otp=provided_otp.strip(),
            hashed_otp=pickup.otp_hash,
            salt=pickup.otp_salt,
        )

        if not is_valid:
            raise HEDSException(code="INVALID_OTP", message="Incorrect pickup code provided.")

        pickup.confirmed_at = datetime.now(timezone.utc)
        pickup.confirmed_by_user_id = operator_user_id

        await OrderStateMachine.transition(
            session=session,
            order=pickup.order,
            target_state=OrderState.COMPLETED,
            actor_type="USER",
            actor_id=str(operator_user_id) if operator_user_id else None,
            reason="Pickup verified with student OTP; order completed",
        )

        return pickup.order


pickup_service = PickupService()
