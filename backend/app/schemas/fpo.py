from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class FPOGroupCreate(BaseModel):
    name: str = Field(min_length=3, max_length=200)
    district: str = Field(min_length=2, max_length=150)
    state: str = Field(min_length=2, max_length=100)
    description: str | None = Field(default=None, max_length=1000)


class FPOGroupResponse(BaseModel):
    id: UUID
    name: str
    district: str
    state: str
    description: str | None = None
    status: str
    member_count: int
    created_at: datetime


class FPOMemberResponse(BaseModel):
    id: UUID
    farmer_profile_id: UUID
    farmer_name: str
    village: str
    district: str
    role: str
    status: str
    joined_at: datetime


class FPOLotCreate(BaseModel):
    group_id: UUID
    crop_name: str = Field(min_length=2, max_length=100)
    quality_grade: str | None = Field(default=None, max_length=50)
    target_price_per_kg: float = Field(gt=0, le=1_000_000)
    location: str | None = Field(default=None, max_length=200)
    notes: str | None = Field(default=None, max_length=1000)


class FPOContributionCreate(BaseModel):
    listing_id: UUID
    quantity_kg: float = Field(gt=0, le=100_000_000)


class FPOContributionResponse(BaseModel):
    id: UUID
    farmer_profile_id: UUID
    farmer_name: str
    listing_id: UUID
    quantity_kg: float
    listing_available_quantity_kg: float
    status: str
    created_at: datetime


class FPOLotResponse(BaseModel):
    id: UUID
    group_id: UUID
    group_name: str
    crop_name: str
    quality_grade: str | None = None
    target_price_per_kg: float
    location: str | None = None
    notes: str | None = None
    status: str
    aggregated_quantity_kg: float
    contribution_count: int
    inventory_reserved: bool = False
    created_at: datetime
    published_at: datetime | None = None
    contributions: list[FPOContributionResponse] = Field(default_factory=list)
