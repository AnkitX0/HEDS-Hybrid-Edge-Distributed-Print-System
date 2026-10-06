import pytest
import uuid
from unittest.mock import AsyncMock, MagicMock
from app.modules.orders.models import Order, OrderState
from app.modules.orders.state_machine import OrderStateMachine
from app.core.exceptions import InvalidStateTransitionException


@pytest.mark.asyncio
async def test_order_state_machine_valid_transitions():
    mock_session = AsyncMock()
    mock_session.add = MagicMock()
    order = Order(
        id=uuid.uuid4(),
        order_number="ORD-TEST",
        guest_access_token="tok-123",
        status=OrderState.CREATED,
    )

    # Valid: CREATED -> PAYMENT_PENDING
    await OrderStateMachine.transition(mock_session, order, OrderState.PAYMENT_PENDING)
    assert order.status == OrderState.PAYMENT_PENDING

    # Valid: PAYMENT_PENDING -> PAID
    await OrderStateMachine.transition(mock_session, order, OrderState.PAID)
    assert order.status == OrderState.PAID

    # Valid: PAID -> QUEUED
    await OrderStateMachine.transition(mock_session, order, OrderState.QUEUED)
    assert order.status == OrderState.QUEUED

    # Valid: QUEUED -> DISPATCHED
    await OrderStateMachine.transition(mock_session, order, OrderState.DISPATCHED)
    assert order.status == OrderState.DISPATCHED

    # Valid: DISPATCHED -> PRINTING
    await OrderStateMachine.transition(mock_session, order, OrderState.PRINTING)
    assert order.status == OrderState.PRINTING

    # Valid: PRINTING -> PRINT_COMPLETED
    await OrderStateMachine.transition(mock_session, order, OrderState.PRINT_COMPLETED)
    assert order.status == OrderState.PRINT_COMPLETED

    # Valid: PRINT_COMPLETED -> PICKUP_READY
    await OrderStateMachine.transition(mock_session, order, OrderState.PICKUP_READY)
    assert order.status == OrderState.PICKUP_READY

    # Valid: PICKUP_READY -> COMPLETED
    await OrderStateMachine.transition(mock_session, order, OrderState.COMPLETED)
    assert order.status == OrderState.COMPLETED


@pytest.mark.asyncio
async def test_order_state_machine_rejects_illegal_jump():
    mock_session = AsyncMock()
    order = Order(
        id=uuid.uuid4(),
        order_number="ORD-ILLEGAL",
        guest_access_token="tok-999",
        status=OrderState.CREATED,
    )

    # Illegal jump: CREATED -> COMPLETED directly without payment or printing
    with pytest.raises(InvalidStateTransitionException):
        await OrderStateMachine.transition(mock_session, order, OrderState.COMPLETED)

    # Illegal jump: CREATED -> PRINTING
    with pytest.raises(InvalidStateTransitionException):
        await OrderStateMachine.transition(mock_session, order, OrderState.PRINTING)
