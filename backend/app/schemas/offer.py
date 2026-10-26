from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class OfferCreate(BaseModel):
    listing_id: UUID

    quantity_kg: float = Field(
        ...,
        gt=0,
    )

    offer_price_per_kg: float = Field(
        ...,
        gt=0,
    )

    message: str | None = Field(
        default=None,
        max_length=500,
    )


class OfferCounter(BaseModel):
    counter_price_per_kg: float = Field(
        ...,
        gt=0,
    )

    message: str | None = Field(
        default=None,
        max_length=500,
    )


class OfferResponse(BaseModel):
    id: UUID
    listing_id: UUID
    buyer_id: UUID

    buyer_business_name: str
    crop: str
    listing_location: str | None = None

    quantity_kg: float

    listing_expected_price_per_kg: float
    offer_price_per_kg: float
    counter_price_per_kg: float | None = None
    effective_price_per_kg: float

    total_amount: float
    price_difference_per_kg: float

    status: str

    message: str | None = None
    counter_message: str | None = None

    order_id: UUID | None = None

    created_at: datetime
    updated_at: datetime


class OfferHealthResponse(BaseModel):
    status: str
    module: str
    phase: str
    inventory_reserved_on_offer: bool
    order_created_only_on_accept: bool
