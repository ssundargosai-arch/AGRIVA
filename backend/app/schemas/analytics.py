from pydantic import BaseModel


class AnalyticsSummary(BaseModel):
    total_revenue: float
    total_expenses: float
    net_profit: float
    profit_margin: float
    roi: float

    total_orders: int
    completed_orders: int
    active_listings: int
    total_quantity_sold_kg: float
    total_farm_area_acres: float
    total_crops: int


class FinancialPoint(BaseModel):
    label: str
    revenue: float
    expenses: float
    profit: float


class CropPerformanceItem(BaseModel):
    crop_name: str
    revenue: float
    quantity_sold_kg: float
    orders: int


class MonthlySalesItem(BaseModel):
    month: str
    revenue: float
    orders: int


class BuyerDistributionItem(BaseModel):
    buyer_id: str
    buyer_name: str
    revenue: float
    orders: int


class FarmHealthItem(BaseModel):
    status: str
    count: int


class FarmerAnalyticsResponse(BaseModel):
    period: str

    summary: AnalyticsSummary

    financial_series: list[FinancialPoint]

    crop_performance: list[
        CropPerformanceItem
    ]

    monthly_sales: list[
        MonthlySalesItem
    ]

    buyer_distribution: list[
        BuyerDistributionItem
    ]

    farm_health: list[
        FarmHealthItem
    ]