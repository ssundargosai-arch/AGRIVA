import uuid
from datetime import datetime

from sqlalchemy import (
    DateTime,
    Float,
    ForeignKey,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class MarketOffer(Base):
    """
    Buyer offer / farmer counter-offer for an existing CropListing.

    Inventory is NOT reserved when an offer is created.
    Inventory is reduced only when an offer is accepted and an Order is created.
    """

    __tablename__ = "market_offers"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    listing_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "crop_listings.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    buyer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "buyers.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    quantity_kg: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    offer_price_per_kg: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    counter_price_per_kg: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    message: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    counter_message: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    status: Mapped[str] = mapped_column(
        String(40),
        default="pending",
        nullable=False,
        index=True,
    )

    order_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "orders.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
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
