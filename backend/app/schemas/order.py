from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class OrderCreate(BaseModel):
    listing_id: UUID
    quantity_kg: float = Field(gt=0)


class OrderItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    crop_id: UUID
    quantity_kg: float
    price_per_kg: float


class OrderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    listing_id: UUID
    buyer_id: UUID
    total_amount: float
    status: str
    created_at: datetime
    items: list[OrderItemResponse] = []


class OrderStatusUpdate(BaseModel):
    status: str


class MessageResponse(BaseModel):
    message: str