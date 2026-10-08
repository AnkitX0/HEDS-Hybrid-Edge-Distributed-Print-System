import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.modules.pickups.service import pickup_service
from app.api.deps import require_shop_operator
from app.api.v1.schemas import PickupConfirmRequest

router = APIRouter(prefix="/pickups", tags=["Pickups"])


@router.post("/confirm")
async def confirm_order_pickup(
    payload: PickupConfirmRequest,
    current_user=Depends(require_shop_operator),
    db: AsyncSession = Depends(get_db),
):
    """
    Shop Operator verifies student OTP code:
    Validates salted hash, sets order state to COMPLETED, records audit event.
    """
    order_uuid = None
    if payload.order_id:
        try:
            order_uuid = uuid.UUID(payload.order_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid order_id UUID")
    elif payload.order_number or payload.token:
        from sqlalchemy import select, or_
        from app.modules.orders.models import Order
        token_str = (payload.order_number or payload.token).strip().upper()
        clean_num = token_str.lstrip("#")
        stmt = (
            select(Order)
            .where(
                or_(
                    Order.order_number == token_str,
                    Order.order_number == clean_num,
                    Order.order_number == f"ORD-{clean_num}",
                    Order.order_number.ilike(f"%{clean_num}"),
                )
            )
            .order_by(Order.created_at.desc())
        )
        res = await db.execute(stmt)
        found_order = res.scalars().first()
        if not found_order:
            raise HTTPException(status_code=404, detail=f"Order '{token_str}' not found")
        order_uuid = found_order.id

    else:
        raise HTTPException(status_code=400, detail="Either order_id or order_number must be provided")

    try:
        order = await pickup_service.verify_and_complete_pickup(
            session=db,
            order_id=order_uuid,
            provided_otp=payload.otp,
            operator_user_id=current_user.id,
        )
        await db.commit()
        return {
            "status": "COMPLETED",
            "order_id": str(order.id),
            "order_number": order.order_number,
            "message": "Pickup successfully verified. Order is now COMPLETED.",
        }
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
