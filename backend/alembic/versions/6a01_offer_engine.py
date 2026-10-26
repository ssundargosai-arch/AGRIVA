"""add market offers for SIH buyer negotiation

Revision ID: 6a01_offer_engine
Revises: 0983f609ff7f
Create Date: 2026-09-04
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "6a01_offer_engine"
down_revision: Union[str, None] = "0983f609ff7f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "market_offers",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "listing_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "buyer_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "quantity_kg",
            sa.Float(),
            nullable=False,
        ),
        sa.Column(
            "offer_price_per_kg",
            sa.Float(),
            nullable=False,
        ),
        sa.Column(
            "counter_price_per_kg",
            sa.Float(),
            nullable=True,
        ),
        sa.Column(
            "message",
            sa.Text(),
            nullable=True,
        ),
        sa.Column(
            "counter_message",
            sa.Text(),
            nullable=True,
        ),
        sa.Column(
            "status",
            sa.String(length=40),
            nullable=False,
            server_default="pending",
        ),
        sa.Column(
            "order_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(
            ["buyer_id"],
            ["buyers.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["listing_id"],
            ["crop_listings.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["order_id"],
            ["orders.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        "ix_market_offers_listing_id",
        "market_offers",
        ["listing_id"],
        unique=False,
    )

    op.create_index(
        "ix_market_offers_buyer_id",
        "market_offers",
        ["buyer_id"],
        unique=False,
    )

    op.create_index(
        "ix_market_offers_status",
        "market_offers",
        ["status"],
        unique=False,
    )

    op.create_index(
        "ix_market_offers_order_id",
        "market_offers",
        ["order_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_market_offers_order_id",
        table_name="market_offers",
    )
    op.drop_index(
        "ix_market_offers_status",
        table_name="market_offers",
    )
    op.drop_index(
        "ix_market_offers_buyer_id",
        table_name="market_offers",
    )
    op.drop_index(
        "ix_market_offers_listing_id",
        table_name="market_offers",
    )
    op.drop_table("market_offers")
