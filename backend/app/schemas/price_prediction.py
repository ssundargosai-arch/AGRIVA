from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


QualityGrade = Literal[
    "A+",
    "A",
    "B",
    "C",
    "Premium",
    "Standard",
]


DataMode = Literal[
    "LIVE",
    "HISTORICAL",
    "DEMO",
]


class PricePredictionRequest(BaseModel):
    crop_id: UUID | None = None

    crop: str | None = Field(
        default=None,
        min_length=2,
        max_length=100,
    )

    location: str = Field(
        min_length=2,
        max_length=150,
    )

    quality: QualityGrade | None = None

    quantity: float = Field(
        gt=0
    )

    season: str = Field(
        min_length=2,
        max_length=50,
    )

    historical_prices: list[float] = (
        Field(
            default_factory=list
        )
    )


class PriceHistoryPoint(BaseModel):
    label: str
    price: float


class MandiMarketData(BaseModel):
    commodity: str

    state: str | None = None
    district: str | None = None
    market: str | None = None

    variety: str | None = None
    grade: str | None = None

    arrival_date: str | None = None

    min_price: float | None = None
    max_price: float | None = None
    modal_price: float

    source: str
    unit: str
    data_mode: Literal[
        "LIVE",
        "CACHED",
    ] = "LIVE"

    match_level: Literal[
        "DISTRICT",
        "MARKET",
        "STATE",
    ] = "DISTRICT"

    cached_at: str | None = None

class PredictionFactors(BaseModel):
    base_price: float

    base_adjustment_percent: float

    quality_adjustment_percent: float

    season_adjustment_percent: float

    quantity_adjustment_percent: float


class PricePredictionResponse(BaseModel):
    id: str

    crop_id: str | None = None

    crop: str
    location: str
    quality: str

    quantity: float
    season: str

    current_price: float
    predicted_price: float

    expected_range_min: float
    expected_range_max: float

    confidence: float

    trend: Literal[
        "UP",
        "DOWN",
        "STABLE",
    ]

    historical_prices: list[float]

    chart_data: list[
        PriceHistoryPoint
    ]

    # Existing compatibility field
    demo_mode: bool

    # New Price Intelligence fields
    data_mode: DataMode

    unit: str

    market_data: (
        MandiMarketData | None
    ) = None

    prediction_factors: (
        PredictionFactors
    )

    price_change_percentage: float

    disclaimer: str