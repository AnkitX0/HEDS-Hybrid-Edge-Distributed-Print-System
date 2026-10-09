import uuid
from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Enum as SQLEnum, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class OrderState(str, Enum):
    CREATED = "CREATED"
    PAYMENT_PENDING = "PAYMENT_PENDING"
    PAID = "PAID"
    QUEUED = "QUEUED"
    DISPATCHED = "DISPATCHED"
    PRINTING = "PRINTING"
    PRINT_COMPLETED = "PRINT_COMPLETED"
    PICKUP_READY = "PICKUP_READY"
    COMPLETED = "COMPLETED"

    # Failure / recovery states
    PAYMENT_FAILED = "PAYMENT_FAILED"
    VALIDATION_FAILED = "VALIDATION_FAILED"
    DISPATCH_FAILED = "DISPATCH_FAILED"
    PRINT_FAILED = "PRINT_FAILED"
    RECONCILING = "RECONCILING"
    CANCELLED = "CANCELLED"
    EXPIRED = "EXPIRED"
    REFUND_PENDING = "REFUND_PENDING"
    REFUNDED = "REFUNDED"


class ColorMode(str, Enum):
    BW = "BW"
    COLOR = "COLOR"


class Orientation(str, Enum):
    PORTRAIT = "PORTRAIT"
    LANDSCAPE = "LANDSCAPE"


class Scaling(str, Enum):
    FIT = "FIT"
    ACTUAL = "ACTUAL"


class Order(Base):
    __tablename__ = "orders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    shop_id = Column(UUID(as_uuid=True), ForeignKey("shops.id", ondelete="CASCADE"), nullable=False, index=True)
    order_number = Column(String(32), unique=True, index=True, nullable=False)  # e.g. ORD-10294
    guest_access_token = Column(String(64), unique=True, index=True, nullable=False)  # High entropy guest URL token
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id", ondelete="RESTRICT"), nullable=False, index=True)
    status = Column(SQLEnum(OrderState), default=OrderState.CREATED, nullable=False, index=True)
    total_amount_cents = Column(Integer, default=0, nullable=False)  # minor units (paise)
    currency = Column(String(10), default="INR", nullable=False)
    pricing_breakdown_json = Column(JSON, default=dict, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    shop = relationship("Shop", back_populates="orders")
    document = relationship("Document", back_populates="orders")
    order_documents = relationship("OrderDocument", back_populates="order", cascade="all, delete-orphan", order_by="OrderDocument.sequence")
    print_specifications = relationship("PrintSpecification", back_populates="order", foreign_keys="PrintSpecification.order_id", cascade="all, delete-orphan", order_by="PrintSpecification.created_at")

    @property
    def print_specification(self):
        return self.print_specifications[0] if self.print_specifications else None
    payment = relationship("Payment", uselist=False, back_populates="order", cascade="all, delete-orphan")
    print_job = relationship("PrintJob", uselist=False, viewonly=True, foreign_keys="PrintJob.order_id", overlaps="print_jobs,order")
    print_jobs = relationship("PrintJob", back_populates="order", foreign_keys="PrintJob.order_id", cascade="all, delete-orphan", order_by="PrintJob.sequence", overlaps="print_job,order")
    pickup = relationship("Pickup", uselist=False, back_populates="order", cascade="all, delete-orphan")


class PrintSpecification(Base):
    __tablename__ = "print_specifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"), nullable=True, index=True)
    order_document_id = Column(UUID(as_uuid=True), ForeignKey("order_documents.id", ondelete="CASCADE"), nullable=True, index=True)
    copies = Column(Integer, default=1, nullable=False)
    color_mode = Column(SQLEnum(ColorMode), default=ColorMode.BW, nullable=False)
    duplex = Column(Boolean, default=False, nullable=False)
    paper_size = Column(String(20), default="A4", nullable=False)
    page_range = Column(String(50), default="all", nullable=False)  # e.g. "all", "1-5", "2,4,6"
    orientation = Column(SQLEnum(Orientation), default=Orientation.PORTRAIT, nullable=False)
    scaling = Column(SQLEnum(Scaling), default=Scaling.FIT, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    order = relationship("Order", back_populates="print_specifications", foreign_keys=[order_id])


class OrderDocument(Base):
    __tablename__ = "order_documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id", ondelete="RESTRICT"), nullable=False, index=True)
    print_specification_id = Column(UUID(as_uuid=True), ForeignKey("print_specifications.id", ondelete="SET NULL"), nullable=True, index=True)
    sequence = Column(Integer, default=1, nullable=False)
    page_count = Column(Integer, default=1, nullable=False)
    copies = Column(Integer, default=1, nullable=False)
    calculated_price_cents = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    order = relationship("Order", back_populates="order_documents")
    document = relationship("Document")
    print_specification = relationship("PrintSpecification", foreign_keys=[print_specification_id], post_update=True)
    print_job = relationship("PrintJob", uselist=False, back_populates="order_document")
