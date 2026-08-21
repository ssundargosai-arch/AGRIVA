from typing import Literal

from pydantic import BaseModel, Field


class PricePredictionRequest(BaseModel):
    crop: str = Field(min_length=2, max_length=100)
    location: str = Field(min_length=2, max_length=150)
    quality: Literal["A", "B", "C", "Premium", "Standard"]
    quantity: float = Field(gt=0)
    season: str = Field(min_length=2, max_length=50)
    historical_prices: list[float] = Field(default_factory=list)


class PriceHistoryPoint(BaseModel):
    label: str
    price: float


class PricePredictionResponse(BaseModel):
    id: str
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
    trend: Literal["UP", "DOWN", "STABLE"]

    historical_prices: list[float]
    chart_data: list[PriceHistoryPoint]

    demo_mode: bool
    disclaimer: str