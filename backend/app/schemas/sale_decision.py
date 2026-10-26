from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class SaleDecisionCreate(BaseModel):
    listing_id: UUID
    prediction_id: UUID

    quantity_kg: float | None = Field(
        default=None,
        gt=0,
        le=100_000_000,
    )

    holding_days: int = Field(
        ge=1,
        le=365,
    )

    storage_cost_per_kg_per_day: float = Field(
        ge=0,
        le=100_000,
    )

    transport_cost_now: float = Field(
        default=0,
        ge=0,
        le=100_000_000,
    )

    transport_cost_later: float = Field(
        default=0,
        ge=0,
        le=100_000_000,
    )

    expected_storage_loss_percent: float = Field(
        default=0,
        ge=0,
        le=50,
    )

    other_holding_cost: float = Field(
        default=0,
        ge=0,
        le=100_000_000,
    )

    storage_provider_name: str | None = Field(
        default=None,
        max_length=200,
    )


class PredictionOption(BaseModel):
    id: UUID
    crop_name: str
    market_name: str
    current_price_per_kg: float | None
    predicted_price_per_kg: float
    expected_min_price: float | None
    expected_max_price: float | None
    confidence: float | None
    trend: str | None
    prediction_date: datetime


class SaleDecisionContextResponse(BaseModel):
    listing_id: UUID
    crop_id: UUID
    crop_name: str
    listing_quantity_kg: float
    listing_expected_price_per_kg: float
    listing_quality_grade: str | None
    listing_location: str | None
    prediction_required: bool = True
    predictions: list[PredictionOption] = Field(
        default_factory=list
    )


class SaleDecisionResponse(BaseModel):
    id: UUID
    listing_id: UUID
    prediction_id: UUID

    crop_name: str
    listing_location: str | None

    quantity_kg: float
    holding_days: int

    storage_cost_per_kg_per_day: float
    storage_cost_total: float
    transport_cost_now: float
    transport_cost_later: float
    expected_storage_loss_percent: float
    other_holding_cost: float
    storage_provider_name: str | None

    current_price_per_kg: float
    current_price_source: str

    future_price_per_kg: float
    expected_min_price_per_kg: float | None
    expected_max_price_per_kg: float | None
    prediction_confidence: float | None
    prediction_trend: str | None

    quantity_after_loss_kg: float

    sell_now_gross: float
    sell_now_net: float

    store_expected_gross: float
    store_expected_net: float
    store_min_net: float | None
    store_max_net: float | None

    expected_advantage: float
    conservative_advantage: float | None
    break_even_future_price_per_kg: float

    recommendation: str
    recommendation_reason: str

    mutates_listing: bool = False
    creates_order: bool = False
    creates_payment: bool = False
    price_guarantee: bool = False

    disclaimer: str

    created_at: datetime
