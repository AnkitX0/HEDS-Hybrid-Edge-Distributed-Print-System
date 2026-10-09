import uuid
from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class JobStatus(str, Enum):
    QUEUED = "QUEUED"
    DISPATCHED = "DISPATCHED"
    PRINTING = "PRINTING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    RECONCILING = "RECONCILING"
    CANCELLED = "CANCELLED"


class PrintJob(Base):
    __tablename__ = "print_jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id", ondelete="SET NULL"), nullable=True, index=True)
    order_document_id = Column(UUID(as_uuid=True), ForeignKey("order_documents.id", ondelete="SET NULL"), nullable=True, index=True)
    sequence = Column(Integer, default=1, nullable=False)
    shop_id = Column(UUID(as_uuid=True), ForeignKey("shops.id", ondelete="CASCADE"), nullable=False, index=True)
    printer_id = Column(UUID(as_uuid=True), ForeignKey("printers.id", ondelete="SET NULL"), nullable=True, index=True)
    agent_id = Column(UUID(as_uuid=True), ForeignKey("agents.id", ondelete="SET NULL"), nullable=True, index=True)
    priority = Column(Integer, default=10, nullable=False, index=True)  # Lower number = higher priority
    status = Column(SQLEnum(JobStatus), default=JobStatus.QUEUED, nullable=False, index=True)
    attempt_count = Column(Integer, default=0, nullable=False)
    max_attempts = Column(Integer, default=3, nullable=False)

    # Job Leasing fields
    lease_id = Column(String(64), nullable=True, index=True)
    lease_expires_at = Column(DateTime(timezone=True), nullable=True, index=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    queued_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    dispatched_at = Column(DateTime(timezone=True), nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    error_message = Column(String(500), nullable=True)

    order = relationship("Order", back_populates="print_jobs")
    order_document = relationship("OrderDocument", back_populates="print_job")
    document = relationship("Document")
    printer = relationship("Printer", back_populates="jobs")
    agent = relationship("Agent", back_populates="jobs")
