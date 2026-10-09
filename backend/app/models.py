# Aggregation of all models for Alembic and SQLAlchemy metadata
from app.core.database import Base

from app.modules.tenants.models import Tenant, TenantStatus, Shop, ShopMember, ShopMemberRole
from app.modules.users.models import User, UserRole
from app.modules.pricing.models import PricingRule
from app.modules.documents.models import Document
from app.modules.orders.models import (
    Order,
    OrderState,
    OrderDocument,
    PrintSpecification,
    ColorMode,
    Orientation,
    Scaling,
)
from app.modules.payments.models import (
    Payment,
    PaymentEvent,
    PaymentStatus,
    PaymentGatewayType,
)
from app.modules.agents.models import Agent, AgentStatus
from app.modules.printers.models import Printer, PrinterStatus, PrinterAdapterType
from app.modules.queue.models import PrintJob, JobStatus
from app.modules.pickups.models import Pickup
from app.modules.audit.models import AuditLog, OutboxEvent, IdempotencyKey

__all__ = [
    "Base",
    "Tenant",
    "TenantStatus",
    "Shop",
    "ShopMember",
    "ShopMemberRole",
    "User",
    "UserRole",
    "PricingRule",
    "Document",
    "Order",
    "OrderState",
    "OrderDocument",
    "PrintSpecification",
    "ColorMode",
    "Orientation",
    "Scaling",
    "Payment",
    "PaymentEvent",
    "PaymentStatus",
    "PaymentGatewayType",
    "Agent",
    "AgentStatus",
    "Printer",
    "PrinterStatus",
    "PrinterAdapterType",
    "PrintJob",
    "JobStatus",
    "Pickup",
    "AuditLog",
    "OutboxEvent",
    "IdempotencyKey",
]
