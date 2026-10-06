import uuid
from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import Column, String, DateTime, ForeignKey, Enum as SQLEnum, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class PrinterStatus(str, Enum):
    ONLINE = "ONLINE"
    OFFLINE = "OFFLINE"
    BUSY = "BUSY"
    ERROR = "ERROR"
    UNKNOWN = "UNKNOWN"


class PrinterAdapterType(str, Enum):
    MOCK = "MOCK"
    CUPS = "CUPS"


class Printer(Base):
    __tablename__ = "printers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    shop_id = Column(UUID(as_uuid=True), ForeignKey("shops.id", ondelete="CASCADE"), nullable=False, index=True)
    agent_id = Column(UUID(as_uuid=True), ForeignKey("agents.id", ondelete="SET NULL"), nullable=True, index=True)
    name = Column(String(100), nullable=False)
    adapter_type = Column(SQLEnum(PrinterAdapterType), default=PrinterAdapterType.MOCK, nullable=False)
    status = Column(SQLEnum(PrinterStatus), default=PrinterStatus.OFFLINE, nullable=False)
    capabilities_json = Column(JSON, default=dict, nullable=False)  # {"color": True, "duplex": True, "paper_sizes": ["A4", "A3"]}
    current_job_id = Column(UUID(as_uuid=True), nullable=True)
    last_error = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    shop = relationship("Shop", back_populates="printers")
    agent = relationship("Agent", back_populates="printers")
    jobs = relationship("PrintJob", back_populates="printer")
