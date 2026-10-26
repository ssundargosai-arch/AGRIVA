from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CropCreate(BaseModel):
    field_id: UUID

    name: str = Field(
        min_length=2,
        max_length=100,
    )

    variety: str | None = Field(
        default=None,
        max_length=100,
    )

    sowing_date: datetime | None = None

    expected_harvest_date: datetime | None = None

    expected_yield_kg: float | None = Field(
        default=None,
        ge=0,
    )

    status: str = Field(
        default="planned",
        min_length=2,
        max_length=50,
    )


class CropResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True
    )

    id: UUID
    field_id: UUID
    name: str
    variety: str | None
    sowing_date: datetime | None
    expected_harvest_date: datetime | None
    expected_yield_kg: float | None
    status: str
    created_at: datetime