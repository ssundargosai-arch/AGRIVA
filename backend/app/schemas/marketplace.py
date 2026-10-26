from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


# =========================================================
# CROP LISTINGS
# =========================================================


class CropListingCreate(BaseModel):
    crop_id: UUID

    quantity_kg: float = Field(
        gt=0,
    )

    quality_grade: str = Field(
        min_length=1,
        max_length=50,
    )

    expected_price_per_kg: float = Field(
        gt=0,
    )

    location: str = Field(
        min_length=2,
        max_length=200,
    )

    harvest_date: date

    images: list[str] = Field(
        default_factory=list,
    )


class CropListingResponse(BaseModel):
    id: UUID

    crop_id: UUID
    crop: str

    quantity_kg: float

    quality_grade: str | None = None

    expected_price_per_kg: float

    location: str | None = None

    harvest_date: date | None = None

    images: list[str] = Field(
        default_factory=list,
    )

    status: str

    created_at: datetime


class MarketplaceListingSummary(BaseModel):
    id: UUID

    crop_id: UUID
    crop: str

    quantity_kg: float

    quality_grade: str | None = None

    expected_price_per_kg: float

    location: str | None = None

    harvest_date: date | None = None

    images: list[str] = Field(
        default_factory=list,
    )

    status: str


# =========================================================
# BUYER MATCHING
# =========================================================


BuyerMatchLabel = Literal[
    "BEST_MATCH",
    "EXCELLENT",
    "GOOD",
    "FAIR",
    "LOW",
]


class BuyerMatchRequest(BaseModel):
    listing_id: UUID


class BuyerMatchBreakdownResponse(BaseModel):
    crop_score: float = Field(
        ge=0,
        le=30,
    )

    quantity_score: float = Field(
        ge=0,
        le=20,
    )

    price_score: float = Field(
        ge=0,
        le=20,
    )

    quality_score: float = Field(
        ge=0,
        le=15,
    )

    distance_score: float = Field(
        ge=0,
        le=10,
    )

    rating_score: float = Field(
        ge=0,
        le=5,
    )


class BuyerMatchItem(BaseModel):
    buyer_id: UUID

    buyer_name: str

    buyer_city: str | None = None
    buyer_state: str | None = None

    preferred_crop: str | None = None
    preferred_quality: str | None = None

    match_percentage: float = Field(
        ge=0,
        le=100,
    )

    match_label: BuyerMatchLabel

    offer_price: float | None = None

    demand_quantity: float | None = None

    distance_km: float | None = None

    buyer_rating: float | None = None

    verification_status: str = "UNVERIFIED"
    verification_label: str = "Not verified by AGRIVA"
    verification_note: str = ""
    agriva_verified: bool = False

    breakdown: BuyerMatchBreakdownResponse


class BuyerMatchResponse(BaseModel):
    listing_id: UUID

    matches: list[BuyerMatchItem] = Field(
        default_factory=list,
    )


# =========================================================
# FAVORITES
# =========================================================


class FavoriteCreate(BaseModel):
    listing_id: UUID


class FavoriteResponse(BaseModel):
    id: UUID

    listing_id: UUID

    created_at: datetime


# =========================================================
# ORDERS
# =========================================================


class OrderCreate(BaseModel):
    listing_id: UUID

    quantity: float = Field(
        gt=0,
    )

    offer_price: float = Field(
        gt=0,
    )


class MarketplaceOrderResponse(BaseModel):
    id: UUID

    listing_id: UUID

    buyer_id: UUID

    quantity: float

    price: float

    status: str


# =========================================================
# COMMON RESPONSE
# =========================================================


class MessageResponse(BaseModel):
    message: str