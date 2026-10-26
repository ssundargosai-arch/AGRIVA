from datetime import date

from pydantic import BaseModel


class ArrivalTrendPoint(BaseModel):
    date: date
    arrival_quantity_mt: float


class ArrivalIntelligenceResponse(BaseModel):
    crop: str
    district: str
    state: str

    arrival_scope: str
    arrival_source: str
    arrival_data_mode: str

    latest_arrival_date: date
    latest_arrival_mt: float
    seven_day_average_mt: float
    change_vs_average_percent: float

    arrival_level: str
    supply_pressure: str

    price_market: str | None = None
    current_modal_price_per_quintal: float | None = None
    price_arrival_date: str | None = None
    price_source: str | None = None
    price_data_mode: str

    insight: str
    disclaimer: str

    trend: list[ArrivalTrendPoint]
