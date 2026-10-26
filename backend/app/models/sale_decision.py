import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class SaleDecisionSnapshot(Base):
    """
    Point-in-time farmer decision-support calculation.

    This record is advisory only. Creating it must never:
    - reserve or deduct crop inventory,
    - create an order,
    - create a payment,
    - guarantee a future price.
    """

    __tablename__ = "sale_decision_snapshots"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    listing_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("crop_listings.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    prediction_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("price_predictions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    quantity_kg: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    holding_days: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    storage_cost_per_kg_per_day: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    transport_cost_now: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    transport_cost_later: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    expected_storage_loss_percent: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    other_holding_cost: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        nullable=False,
    )

    storage_provider_name: Mapped[str | None] = mapped_column(
        String(200),
        nullable=True,
    )

    current_price_per_kg: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    current_price_source: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    future_price_per_kg: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    expected_min_price_per_kg: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    expected_max_price_per_kg: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    prediction_confidence: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    prediction_trend: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True,
    )

    quantity_after_loss_kg: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    storage_cost_total: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    sell_now_gross: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    sell_now_net: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    store_expected_gross: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    store_expected_net: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    store_min_net: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    store_max_net: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    expected_advantage: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    conservative_advantage: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    break_even_future_price_per_kg: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    recommendation: Mapped[str] = mapped_column(
        String(40),
        nullable=False,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )
