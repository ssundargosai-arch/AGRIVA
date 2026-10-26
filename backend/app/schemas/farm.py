from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class FarmCreate(BaseModel):
    name: str = Field(
        min_length=2,
        max_length=150,
    )

    village: str = Field(
        min_length=2,
        max_length=150,
    )

    district: str = Field(
        min_length=2,
        max_length=150,
    )

    state: str = Field(
        min_length=2,
        max_length=100,
    )

    total_area_acres: float = Field(
        gt=0,
    )


class FarmResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True
    )

    id: UUID
    farmer_id: UUID

    name: str
    village: str
    district: str
    state: str

    total_area_acres: float

    created_at: datetime


class FieldCreate(BaseModel):
    field_name: str = Field(
        min_length=2,
        max_length=150,
    )

    area_acres: float = Field(
        gt=0,
    )

    soil_type: str | None = Field(
        default=None,
        max_length=100,
    )

    latitude: float | None = Field(
        default=None,
        ge=-90,
        le=90,
    )

    longitude: float | None = Field(
        default=None,
        ge=-180,
        le=180,
    )


class FieldResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True
    )

    id: UUID
    farm_id: UUID

    field_name: str
    area_acres: float

    soil_type: str | None

    latitude: float | None
    longitude: float | None