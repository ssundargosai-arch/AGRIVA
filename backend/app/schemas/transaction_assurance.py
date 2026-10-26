from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class BuyerPlatformHistory(BaseModel):
    orders_recorded: int = 0
    completed_orders_recorded: int = 0
    payments_recorded: int = 0
    paid_payment_records: int = 0
    open_grievances_recorded: int = 0


class BuyerTrustSnapshot(BaseModel):
    buyer_id: UUID
    business_name: str | None = None
    business_type: str | None = None
    city: str | None = None
    state: str | None = None
    verification_status: str
    verification_note: str
    platform_history: BuyerPlatformHistory
    history_note: str


class PaymentAssuranceSnapshot(BaseModel):
    payment_exists: bool
    payment_id: UUID | None = None
    amount: float | None = None
    payment_method: str | None = None
    status: str | None = None
    transaction_reference: str | None = None
    transaction_status: str | None = None
    evidence_level: str
    evidence_note: str


class TransportAssuranceSnapshot(BaseModel):
    booking_exists: bool
    booking_id: UUID | None = None
    vehicle_type: str | None = None
    pickup_location: str | None = None
    delivery_location: str | None = None
    estimated_cost: float | None = None
    status: str | None = None


class TrackingEventSnapshot(BaseModel):
    id: UUID
    status: str
    message: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TransactionSafetyFlags(BaseModel):
    buyer_identity_verified_by_agriva: bool = False
    bank_payment_verified: bool = False
    payment_guaranteed: bool = False
    delivery_guaranteed: bool = False
    mutates_order: bool = False
    mutates_payment: bool = False
    mutates_transport: bool = False


class GrievanceCreate(BaseModel):
    order_id: UUID
    category: str = Field(min_length=2, max_length=40)
    subject: str = Field(min_length=3, max_length=180)
    description: str = Field(min_length=10, max_length=3000)


class GrievanceAdminUpdate(BaseModel):
    status: str = Field(min_length=2, max_length=30)
    resolution_note: str | None = Field(
        default=None,
        max_length=3000,
    )


class GrievanceResponse(BaseModel):
    id: UUID
    order_id: UUID
    farmer_user_id: UUID
    category: str
    subject: str
    description: str
    status: str
    resolution_note: str | None = None
    resolved_by_user_id: UUID | None = None
    resolved_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TransactionAssuranceOrderResponse(BaseModel):
    order_id: UUID
    listing_id: UUID
    order_status: str
    order_created_at: datetime
    total_amount: float
    crop: str | None = None
    quantity_kg: float
    price_per_kg: float | None = None
    buyer: BuyerTrustSnapshot
    payment: PaymentAssuranceSnapshot
    transport: TransportAssuranceSnapshot
    tracking: list[TrackingEventSnapshot]
    grievances: list[GrievanceResponse]
    safety: TransactionSafetyFlags
