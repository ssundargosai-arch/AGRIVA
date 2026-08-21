import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class SoilReport(Base):
    __tablename__ = "soil_reports"

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

    ph: Mapped[float] = mapped_column(Float, nullable=False)
    nitrogen: Mapped[float] = mapped_column(Float, nullable=False)
    phosphorus: Mapped[float] = mapped_column(Float, nullable=False)
    potassium: Mapped[float] = mapped_column(Float, nullable=False)

    organic_carbon: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    report_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    field = relationship(
        "FarmField",
        back_populates="soil_reports",
    )

    


class SoilAnalysis(Base):
    __tablename__ = "soil_analyses"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    farmer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    soil_type: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    ph: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    nitrogen: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    phosphorus: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    potassium: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    organic_carbon: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    moisture: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    temperature: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    soil_health_score: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    recommendations: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    source_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="manual",
    )

    demo_mode: Mapped[bool] = mapped_column(
        nullable=False,
        default=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )