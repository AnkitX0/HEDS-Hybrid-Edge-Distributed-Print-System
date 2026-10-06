import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, JSON
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    shop_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    actor_type = Column(String(50), nullable=False)  # USER, AGENT, SYSTEM, GUEST
    actor_id = Column(String(100), nullable=True)
    action = Column(String(100), nullable=False, index=True)  # ORDER_CREATED, PAYMENT_VERIFIED, PRINT_RETRIED, etc.
    resource_type = Column(String(50), nullable=False)  # Order, PrintJob, Payment, etc.
    resource_id = Column(String(100), nullable=True, index=True)
    metadata_json = Column(JSON, default=dict, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)


class OutboxEvent(Base):
    __tablename__ = "outbox_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_type = Column(String(100), nullable=False, index=True)
    aggregate_type = Column(String(50), nullable=False)
    aggregate_id = Column(String(100), nullable=False)
    payload_json = Column(JSON, default=dict, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    processed_at = Column(DateTime(timezone=True), nullable=True, index=True)


class IdempotencyKey(Base):
    __tablename__ = "idempotency_keys"

    key = Column(String(128), primary_key=True)
    scope = Column(String(50), primary_key=True)  # e.g. "payment_webhook", "order_create"
    resource_id = Column(String(100), nullable=True)
    status_code = Column(Integer, nullable=False)
    response_payload_json = Column(JSON, default=dict, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
