import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

from app.modules.orders.models import OrderState, ColorMode, Orientation, Scaling
from app.modules.printers.models import PrinterStatus, PrinterAdapterType
from app.modules.agents.models import AgentStatus
from app.modules.users.models import UserRole


# Auth Schemas
class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    role: str
    shop_id: Optional[str] = None


# Shop Schemas
class ShopPublicInfo(BaseModel):
    id: str
    name: str
    slug: str
    is_active: bool
    is_queue_paused: bool
    queue_length: int
    estimated_wait_minutes: int
    pricing: Dict[str, Any]


# Document & Upload Schemas
class DocumentUploadResponse(BaseModel):
    document_id: str
    filename: str
    file_size_bytes: int
    page_count: int
    mime_type: str


# Pricing Quote Schemas
class PricingQuoteRequest(BaseModel):
    document_id: Optional[str] = None
    document_page_count: Optional[int] = None
    copies: int = Field(default=1, ge=1, le=100)
    color_mode: ColorMode = ColorMode.BW
    duplex: bool = False
    paper_size: str = "A4"
    page_range: str = "all"


class PricingQuoteResponse(BaseModel):
    document_page_count: int
    active_pages: int
    copies: int
    color_mode: str
    duplex: bool
    paper_size: str
    sheets_count: int
    rate_per_page_cents: int
    raw_total_cents: int
    duplex_discount_cents: int
    subtotal_cents: int
    minimum_order_cents: int
    final_amount_cents: int
    currency: str = "INR"
    formatted_total: str


# Student Order Creation & Settings
class PrintConfigInput(BaseModel):
    copies: int = Field(default=1, ge=1, le=100)
    color_mode: ColorMode = ColorMode.BW
    duplex: bool = False
    paper_size: str = "A4"
    page_range: str = "all"
    orientation: Orientation = Orientation.PORTRAIT
    scaling: Scaling = Scaling.FIT


class OrderResponse(BaseModel):
    id: str
    order_number: str
    guest_access_token: str
    shop_id: str
    status: OrderState
    total_amount_cents: int
    currency: str
    pricing_breakdown: Dict[str, Any]
    queue_position: Optional[int] = None
    estimated_wait_minutes: Optional[int] = None
    document_name: str
    document_pages: int
    pickup_otp: Optional[str] = None  # Populated only if PICKUP_READY
    created_at: datetime


# Payment
class PaymentIntentRequest(BaseModel):
    simulate_status: Optional[str] = "success"  # "success" or "failed" for mock testing


class PaymentResponse(BaseModel):
    payment_id: str
    order_id: str
    amount_cents: int
    status: str
    gateway: str
    message: str
    gateway_order_id: Optional[str] = None
    currency: Optional[str] = "INR"
    key_id: Optional[str] = None


class PaymentVerifyRequest(BaseModel):
    razorpay_payment_id: str
    razorpay_order_id: str
    razorpay_signature: str


# Edge Agent Schemas
class AgentRegisterRequest(BaseModel):
    shop_id: str
    name: str
    token: str
    hostname: Optional[str] = "localhost"
    os_info: Optional[str] = "Linux"
    version: Optional[str] = "0.1.0"


class AgentHeartbeatRequest(BaseModel):
    agent_id: str
    local_queue_length: int = 0
    uptime_seconds: float = 0.0
    printers: List[Dict[str, Any]] = []


class JobLeaseResponse(BaseModel):
    job_id: str
    order_id: str
    order_number: str
    lease_id: str
    lease_expires_at: datetime
    document_id: str
    document_filename: str
    page_count: int
    print_specification: Dict[str, Any]
    printer_id: Optional[str] = None
    printer_name: Optional[str] = None


class JobStatusUpdateRequest(BaseModel):
    status: str  # "PRINTING", "COMPLETED", "FAILED"
    error_message: Optional[str] = None
    progress_page: Optional[int] = None
    native_job_id: Optional[str] = None


# Pickup Verification
class PickupConfirmRequest(BaseModel):
    order_id: Optional[str] = None
    order_number: Optional[str] = None
    otp: str


# Operator Actions
class JobReconcileRequest(BaseModel):
    decision: str  # "MARK_COMPLETED", "RETRY_PRINT", "CANCEL"
    notes: Optional[str] = None
