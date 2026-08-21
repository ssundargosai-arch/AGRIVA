from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class TransportBookingCreate(BaseModel):
    order_id: UUID

    vehicle_type: str = Field(
        min_length=2,
        max_length=100,
    )

    pickup_location: str = Field(
        min_length=2,
        max_length=255,
    )

    delivery_location: str = Field(
        min_length=2,
        max_length=255,
    )

    estimated_cost: float = Field(
        ge=0,
    )


class TransportBookingResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True
    )

    id: UUID
    order_id: UUID
    vehicle_type: str
    pickup_location: str
    delivery_location: str
    estimated_cost: float
    status: str


class TransportStatusUpdate(BaseModel):
    status: str