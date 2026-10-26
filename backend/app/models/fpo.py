import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class FPOGroup(Base):
    """AGRIVA coordination group. This model does not imply official verification."""

    __tablename__ = "fpo_groups"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    district: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    state: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    status: Mapped[str] = mapped_column(String(30), default="active", nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    memberships = relationship("FPOMembership", back_populates="group", cascade="all, delete-orphan")
    lots = relationship("FPOAggregationLot", back_populates="group", cascade="all, delete-orphan")


class FPOMembership(Base):
    __tablename__ = "fpo_memberships"
    __table_args__ = (
        UniqueConstraint("group_id", "farmer_profile_id", name="uq_fpo_membership_group_farmer"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    group_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("fpo_groups.id", ondelete="CASCADE"), nullable=False, index=True
    )
    farmer_profile_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("farmer_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role: Mapped[str] = mapped_column(String(30), default="member", nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="active", nullable=False, index=True)
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    group = relationship("FPOGroup", back_populates="memberships")
    farmer = relationship("FarmerProfile")


class FPOAggregationLot(Base):
    __tablename__ = "fpo_aggregation_lots"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    group_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("fpo_groups.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_by_farmer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("farmer_profiles.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    crop_name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    quality_grade: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    target_price_per_kg: Mapped[float] = mapped_column(Float, nullable=False)
    location: Mapped[str | None] = mapped_column(String(200), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="open", nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    group = relationship("FPOGroup", back_populates="lots")
    creator = relationship("FarmerProfile")
    contributions = relationship(
        "FPOContribution", back_populates="lot", cascade="all, delete-orphan"
    )


class FPOContribution(Base):
    __tablename__ = "fpo_contributions"
    __table_args__ = (
        UniqueConstraint("lot_id", "listing_id", name="uq_fpo_contribution_lot_listing"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lot_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("fpo_aggregation_lots.id", ondelete="CASCADE"), nullable=False, index=True
    )
    farmer_profile_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("farmer_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    listing_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("crop_listings.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    quantity_kg: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="pledged", nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    lot = relationship("FPOAggregationLot", back_populates="contributions")
    farmer = relationship("FarmerProfile")
    listing = relationship("CropListing")
