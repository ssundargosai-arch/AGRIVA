import uuid
from datetime import datetime

from sqlalchemy import (
    DateTime,
    Float,
    JSON,
    ForeignKey,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Crop(Base):
    __tablename__ = "crops"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    field_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("farm_fields.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )

    variety: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    sowing_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    expected_harvest_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    expected_yield_kg: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    status: Mapped[str] = mapped_column(
        String(50),
        default="planned",
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    field = relationship(
        "FarmField",
        back_populates="crops",
    )

    images = relationship(
        "CropImage",
        back_populates="crop",
        cascade="all, delete-orphan",
    )

    health_records = relationship(
        "CropHealth",
        back_populates="crop",
        cascade="all, delete-orphan",
    )

    quality_predictions = relationship(
        "CropQualityPrediction",
        back_populates="crop",
        cascade="all, delete-orphan",
    )

    price_predictions = relationship(
        "PricePrediction",
        back_populates="crop",
        cascade="all, delete-orphan",
    )


class CropImage(Base):
    __tablename__ = "crop_images"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    crop_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("crops.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    image_url: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    crop = relationship(
        "Crop",
        back_populates="images",
    )


class CropHealth(Base):
    __tablename__ = "crop_health"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    crop_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("crops.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    health_status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    disease_name: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True,
    )

    confidence: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    crop = relationship(
        "Crop",
        back_populates="health_records",
    )


class CropQualityPrediction(Base):
    __tablename__ = "crop_quality_predictions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    crop_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("crops.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    grade: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    confidence: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    crop = relationship(
        "Crop",
        back_populates="quality_predictions",
    )


class PricePrediction(Base):
    __tablename__ = "price_predictions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    crop_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("crops.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    crop_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="Unknown",
    )

    market_name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    quality: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    quantity: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    season: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    historical_prices: Mapped[list | None] = mapped_column(
        JSON,
        nullable=True,
    )

    current_price_per_kg: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    predicted_price_per_kg: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    expected_min_price: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    expected_max_price: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    confidence: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    trend: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
    )

    prediction_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    crop = relationship(
        "Crop",
        back_populates="price_predictions",
    )

class CropRecommendation(Base):
    __tablename__ = "crop_recommendations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    field_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("farm_fields.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    crop_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    suitability_score: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    reason: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    expected_yield: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True,
    )

    expected_profit: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True,
    )

    water_requirement: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    growing_duration: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    market_demand: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    risk: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    selected: Mapped[bool] = mapped_column(
        default=False,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    field = relationship(
        "FarmField",
        back_populates="crop_recommendations",
    )


class CropFarmPlan(Base):
    __tablename__ = "crop_farm_plans"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    field_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("farm_fields.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    crop_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    soil_preparation: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    seed_selection: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    sowing: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    fertilizer: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    irrigation: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    disease_monitoring: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    harvest: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    field = relationship(
        "FarmField",
        back_populates="crop_farm_plans",
    )

    calendar = relationship(
        "CropCalendar",
        back_populates="farm_plan",
        cascade="all, delete-orphan",
    )


class CropCalendar(Base):
    __tablename__ = "crop_calendars"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    farm_plan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("crop_farm_plans.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    stage: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    start_day: Mapped[int] = mapped_column(
        nullable=False,
    )

    end_day: Mapped[int] = mapped_column(
        nullable=False,
    )

    activity: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    farm_plan = relationship(
        "CropFarmPlan",
        back_populates="calendar",
    )