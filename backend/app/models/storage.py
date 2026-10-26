import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class StorageFacility(Base):
    __tablename__ = "storage_facilities"
    __table_args__ = (
        CheckConstraint(
            "facility_type IN ('WAREHOUSE', 'COLD_STORAGE')",
            name="ck_storage_facility_type",
        ),
        CheckConstraint(
            "status IN ('ACTIVE', 'INACTIVE')",
            name="ck_storage_facility_status",
        ),
        CheckConstraint(
            "total_capacity_quintal >= 0",
            name="ck_storage_total_capacity",
        ),
        CheckConstraint(
            "available_capacity_quintal >= 0",
            name="ck_storage_available_capacity_positive",
        ),
        CheckConstraint(
            "available_capacity_quintal <= total_capacity_quintal",
            name="ck_storage_available_capacity_limit",
        ),
        CheckConstraint(
            "rate_per_quintal_day >= 0",
            name="ck_storage_rate_positive",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    name: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
        index=True,
    )

    facility_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        index=True,
    )

    district: Mapped[str] = mapped_column(
        String(120),
        nullable=False,
        index=True,
    )

    state: Mapped[str] = mapped_column(
        String(120),
        nullable=False,
        index=True,
    )

    address: Mapped[str] = mapped_column(
        String(300),
        nullable=False,
    )

    total_capacity_quintal: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    available_capacity_quintal: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    rate_per_quintal_day: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    supports_cold_chain: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    contact_phone: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True,
    )

    status: Mapped[str] = mapped_column(
        String(20),
        default="ACTIVE",
        nullable=False,
        index=True,
    )

    data_mode: Mapped[str] = mapped_column(
        String(40),
        default="DEMO_DIRECTORY",
        nullable=False,
    )

    verification_note: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default=(
            "Prototype storage-directory record. "
            "Provider credentials and real-time capacity "
            "are not independently verified by AGRIVA."
        ),
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class StorageRequest(Base):
    __tablename__ = "storage_requests"
    __table_args__ = (
        CheckConstraint(
            "status IN ("
            "'REQUESTED', 'APPROVED', 'REJECTED', "
            "'CANCELLED', 'COMPLETED'"
            ")",
            name="ck_storage_request_status",
        ),
        CheckConstraint(
            "quantity_quintal > 0",
            name="ck_storage_request_quantity",
        ),
        CheckConstraint(
            "storage_days > 0",
            name="ck_storage_request_days",
        ),
        CheckConstraint(
            "estimated_cost >= 0",
            name="ck_storage_request_cost",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    facility_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "storage_facilities.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    farmer_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "users.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    listing_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "crop_listings.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    crop_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    quantity_quintal: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    storage_days: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    rate_per_quintal_day: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    estimated_cost: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(30),
        default="REQUESTED",
        nullable=False,
        index=True,
    )

    notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
