import uuid
from datetime import date, datetime

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    Float,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class MandiArrivalRecord(Base):
    __tablename__ = "mandi_arrival_records"

    __table_args__ = (
        CheckConstraint(
            "arrival_quantity_mt >= 0",
            name="ck_mandi_arrival_quantity_positive",
        ),
        CheckConstraint(
            "data_mode IN ("
            "'HISTORICAL', "
            "'DEMO_DATASET', "
            "'LIVE_VERIFIED'"
            ")",
            name="ck_mandi_arrival_data_mode",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    commodity: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )

    state: Mapped[str] = mapped_column(
        String(120),
        nullable=False,
        index=True,
    )

    district: Mapped[str] = mapped_column(
        String(120),
        nullable=False,
        index=True,
    )

    market: Mapped[str] = mapped_column(
        String(180),
        nullable=False,
        index=True,
    )

    arrival_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        index=True,
    )

    arrival_quantity_mt: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    source_name: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )

    data_mode: Mapped[str] = mapped_column(
        String(40),
        nullable=False,
        default="DEMO_DATASET",
    )

    source_note: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
