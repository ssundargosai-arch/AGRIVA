from datetime import datetime
from uuid import UUID

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
)


class StorageFacilityResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True
    )

    id: UUID
    name: str
    facility_type: str
    district: str
    state: str
    address: str
    total_capacity_quintal: float
    available_capacity_quintal: float
    rate_per_quintal_day: float
    supports_cold_chain: bool
    contact_phone: str | None
    status: str
    data_mode: str
    verification_note: str


class StorageCostEstimateResponse(BaseModel):
    facility_id: UUID
    quantity_quintal: float
    storage_days: int
    rate_per_quintal_day: float
    estimated_cost: float
    capacity_available: bool
    note: str


class StorageRequestCreate(BaseModel):
    facility_id: UUID

    crop_name: str = Field(
        min_length=2,
        max_length=100,
    )

    quantity_quintal: float = Field(
        gt=0,
        le=100000,
    )

    storage_days: int = Field(
        ge=1,
        le=365,
    )

    listing_id: UUID | None = None

    notes: str | None = Field(
        default=None,
        max_length=1000,
    )


class StorageRequestResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True
    )

    id: UUID
    facility_id: UUID
    farmer_user_id: UUID
    listing_id: UUID | None

    crop_name: str
    quantity_quintal: float
    storage_days: int
    rate_per_quintal_day: float
    estimated_cost: float
    status: str
    notes: str | None

    created_at: datetime
    updated_at: datetime


class StorageMessageResponse(BaseModel):
    message: str
