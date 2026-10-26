"""SIH Phase 6B FPO aggregation

Revision ID: 6b01_fpo_aggregation
Revises: 6a01_offer_engine
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "6b01_fpo_aggregation"
down_revision = "6a01_offer_engine"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "fpo_groups",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("district", sa.String(length=150), nullable=False),
        sa.Column("state", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_fpo_groups_name", "fpo_groups", ["name"])
    op.create_index("ix_fpo_groups_district", "fpo_groups", ["district"])
    op.create_index("ix_fpo_groups_state", "fpo_groups", ["state"])
    op.create_index("ix_fpo_groups_created_by_user_id", "fpo_groups", ["created_by_user_id"])
    op.create_index("ix_fpo_groups_status", "fpo_groups", ["status"])

    op.create_table(
        "fpo_memberships",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("group_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("farmer_profile_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("role", sa.String(length=30), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("joined_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["group_id"], ["fpo_groups.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["farmer_profile_id"], ["farmer_profiles.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("group_id", "farmer_profile_id", name="uq_fpo_membership_group_farmer"),
    )
    op.create_index("ix_fpo_memberships_group_id", "fpo_memberships", ["group_id"])
    op.create_index("ix_fpo_memberships_farmer_profile_id", "fpo_memberships", ["farmer_profile_id"])
    op.create_index("ix_fpo_memberships_status", "fpo_memberships", ["status"])

    op.create_table(
        "fpo_aggregation_lots",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("group_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_by_farmer_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("crop_name", sa.String(length=100), nullable=False),
        sa.Column("quality_grade", sa.String(length=50), nullable=True),
        sa.Column("target_price_per_kg", sa.Float(), nullable=False),
        sa.Column("location", sa.String(length=200), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["group_id"], ["fpo_groups.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by_farmer_id"], ["farmer_profiles.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_fpo_aggregation_lots_group_id", "fpo_aggregation_lots", ["group_id"])
    op.create_index(
        "ix_fpo_aggregation_lots_created_by_farmer_id",
        "fpo_aggregation_lots",
        ["created_by_farmer_id"],
    )
    op.create_index("ix_fpo_aggregation_lots_crop_name", "fpo_aggregation_lots", ["crop_name"])
    op.create_index("ix_fpo_aggregation_lots_quality_grade", "fpo_aggregation_lots", ["quality_grade"])
    op.create_index("ix_fpo_aggregation_lots_status", "fpo_aggregation_lots", ["status"])

    op.create_table(
        "fpo_contributions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("lot_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("farmer_profile_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("listing_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("quantity_kg", sa.Float(), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["lot_id"], ["fpo_aggregation_lots.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["farmer_profile_id"], ["farmer_profiles.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["listing_id"], ["crop_listings.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("lot_id", "listing_id", name="uq_fpo_contribution_lot_listing"),
    )
    op.create_index("ix_fpo_contributions_lot_id", "fpo_contributions", ["lot_id"])
    op.create_index("ix_fpo_contributions_farmer_profile_id", "fpo_contributions", ["farmer_profile_id"])
    op.create_index("ix_fpo_contributions_listing_id", "fpo_contributions", ["listing_id"])
    op.create_index("ix_fpo_contributions_status", "fpo_contributions", ["status"])


def downgrade() -> None:
    op.drop_index("ix_fpo_contributions_status", table_name="fpo_contributions")
    op.drop_index("ix_fpo_contributions_listing_id", table_name="fpo_contributions")
    op.drop_index("ix_fpo_contributions_farmer_profile_id", table_name="fpo_contributions")
    op.drop_index("ix_fpo_contributions_lot_id", table_name="fpo_contributions")
    op.drop_table("fpo_contributions")

    op.drop_index("ix_fpo_aggregation_lots_status", table_name="fpo_aggregation_lots")
    op.drop_index("ix_fpo_aggregation_lots_quality_grade", table_name="fpo_aggregation_lots")
    op.drop_index("ix_fpo_aggregation_lots_crop_name", table_name="fpo_aggregation_lots")
    op.drop_index("ix_fpo_aggregation_lots_created_by_farmer_id", table_name="fpo_aggregation_lots")
    op.drop_index("ix_fpo_aggregation_lots_group_id", table_name="fpo_aggregation_lots")
    op.drop_table("fpo_aggregation_lots")

    op.drop_index("ix_fpo_memberships_status", table_name="fpo_memberships")
    op.drop_index("ix_fpo_memberships_farmer_profile_id", table_name="fpo_memberships")
    op.drop_index("ix_fpo_memberships_group_id", table_name="fpo_memberships")
    op.drop_table("fpo_memberships")

    op.drop_index("ix_fpo_groups_status", table_name="fpo_groups")
    op.drop_index("ix_fpo_groups_created_by_user_id", table_name="fpo_groups")
    op.drop_index("ix_fpo_groups_state", table_name="fpo_groups")
    op.drop_index("ix_fpo_groups_district", table_name="fpo_groups")
    op.drop_index("ix_fpo_groups_name", table_name="fpo_groups")
    op.drop_table("fpo_groups")
