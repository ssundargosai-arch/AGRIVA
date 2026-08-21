from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CategoryResponse(BaseModel):
    id: UUID
    name: str

    model_config = ConfigDict(from_attributes=True)


class ProductResponse(BaseModel):
    id: UUID
    category_id: UUID
    name: str
    description: str | None = None
    price: Decimal
    stock_quantity: int
    brand: str | None = None
    image_url: str | None = None
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class CartItemCreate(BaseModel):
    product_id: UUID
    quantity: int = Field(default=1, ge=1)


class CartItemUpdate(BaseModel):
    quantity: int = Field(..., ge=1)


class CartItemResponse(BaseModel):
    id: UUID
    product_id: UUID
    quantity: int
    product_name: str
    unit_price: Decimal
    subtotal: Decimal


class CartResponse(BaseModel):
    id: UUID
    items: list[CartItemResponse]
    total_items: int
    total_amount: Decimal


class SeedRecommendationRequest(BaseModel):
    crop: str
    soil_type: str
    season: str
    location: str


class SeedRecommendationItem(BaseModel):
    product_id: UUID
    seed_name: str
    brand: str | None = None
    suitability_percentage: float
    reason: str
    price: Decimal


class SeedRecommendationResponse(BaseModel):
    recommendations: list[SeedRecommendationItem]