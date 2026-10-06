import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class PricingRule(Base):
    __tablename__ = "pricing_rules"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    shop_id = Column(UUID(as_uuid=True), ForeignKey("shops.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), default="Standard Pricing", nullable=False)
    paper_size = Column(String(20), default="A4", nullable=False)  # A4, A3, Letter
    bw_per_page_cents = Column(Integer, default=200, nullable=False)  # minor units (₹2.00 = 200 paise)
    color_per_page_cents = Column(Integer, default=1000, nullable=False)  # minor units (₹10.00 = 1000 paise)
    duplex_discount_cents = Column(Integer, default=50, nullable=False)  # minor units per duplex sheet
    minimum_order_cents = Column(Integer, default=200, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    shop = relationship("Shop", back_populates="pricing_rules")
