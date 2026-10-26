"""add AGRIVA storage network

Revision ID: 6e01_storage_network
Revises: 6d01_transaction_assurance
"""

from typing import Sequence, Union
import uuid

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "6e01_storage_network"
down_revision: Union[str, None] = (
    "6d01_transaction_assurance"
)
branch_labels: Union[
    str,
    Sequence[str],
    None,
] = None
depends_on: Union[
    str,
    Sequence[str],
    None,
] = None


def upgrade() -> None:
    op.create_table(
        "storage_facilities",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "name",
            sa.String(length=200),
            nullable=False,
        ),
        sa.Column(
            "facility_type",
            sa.String(length=30),
            nullable=False,
        ),
        sa.Column(
            "district",
            sa.String(length=120),
            nullable=False,
        ),
        sa.Column(
            "state",
            sa.String(length=120),
            nullable=False,
        ),
        sa.Column(
            "address",
            sa.String(length=300),
            nullable=False,
        ),
        sa.Column(
            "total_capacity_quintal",
            sa.Float(),
            nullable=False,
        ),
        sa.Column(
            "available_capacity_quintal",
            sa.Float(),
            nullable=False,
        ),
        sa.Column(
            "rate_per_quintal_day",
            sa.Float(),
            nullable=False,
        ),
        sa.Column(
            "supports_cold_chain",
            sa.Boolean(),
            server_default=sa.false(),
            nullable=False,
        ),
        sa.Column(
            "contact_phone",
            sa.String(length=30),
            nullable=True,
        ),
        sa.Column(
            "status",
            sa.String(length=20),
            server_default="ACTIVE",
            nullable=False,
        ),
        sa.Column(
            "data_mode",
            sa.String(length=40),
            server_default="DEMO_DIRECTORY",
            nullable=False,
        ),
        sa.Column(
            "verification_note",
            sa.Text(),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "facility_type IN "
            "('WAREHOUSE', 'COLD_STORAGE')",
            name="ck_storage_facility_type",
        ),
        sa.CheckConstraint(
            "status IN ('ACTIVE', 'INACTIVE')",
            name="ck_storage_facility_status",
        ),
        sa.CheckConstraint(
            "total_capacity_quintal >= 0",
            name="ck_storage_total_capacity",
        ),
        sa.CheckConstraint(
            "available_capacity_quintal >= 0",
            name=(
                "ck_storage_available_"
                "capacity_positive"
            ),
        ),
        sa.CheckConstraint(
            "available_capacity_quintal "
            "<= total_capacity_quintal",
            name=(
                "ck_storage_available_"
                "capacity_limit"
            ),
        ),
        sa.CheckConstraint(
            "rate_per_quintal_day >= 0",
            name="ck_storage_rate_positive",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        "ix_storage_facilities_name",
        "storage_facilities",
        ["name"],
    )

    op.create_index(
        "ix_storage_facilities_type",
        "storage_facilities",
        ["facility_type"],
    )

    op.create_index(
        "ix_storage_facilities_district",
        "storage_facilities",
        ["district"],
    )

    op.create_index(
        "ix_storage_facilities_state",
        "storage_facilities",
        ["state"],
    )

    op.create_index(
        "ix_storage_facilities_status",
        "storage_facilities",
        ["status"],
    )

    op.create_table(
        "storage_requests",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "facility_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "farmer_user_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "listing_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
        sa.Column(
            "crop_name",
            sa.String(length=100),
            nullable=False,
        ),
        sa.Column(
            "quantity_quintal",
            sa.Float(),
            nullable=False,
        ),
        sa.Column(
            "storage_days",
            sa.Integer(),
            nullable=False,
        ),
        sa.Column(
            "rate_per_quintal_day",
            sa.Float(),
            nullable=False,
        ),
        sa.Column(
            "estimated_cost",
            sa.Float(),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.String(length=30),
            server_default="REQUESTED",
            nullable=False,
        ),
        sa.Column(
            "notes",
            sa.Text(),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "status IN ("
            "'REQUESTED', 'APPROVED', "
            "'REJECTED', 'CANCELLED', "
            "'COMPLETED'"
            ")",
            name="ck_storage_request_status",
        ),
        sa.CheckConstraint(
            "quantity_quintal > 0",
            name="ck_storage_request_quantity",
        ),
        sa.CheckConstraint(
            "storage_days > 0",
            name="ck_storage_request_days",
        ),
        sa.CheckConstraint(
            "estimated_cost >= 0",
            name="ck_storage_request_cost",
        ),
        sa.ForeignKeyConstraint(
            ["facility_id"],
            ["storage_facilities.id"],
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["farmer_user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["listing_id"],
            ["crop_listings.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        "ix_storage_requests_facility_id",
        "storage_requests",
        ["facility_id"],
    )

    op.create_index(
        "ix_storage_requests_farmer_user_id",
        "storage_requests",
        ["farmer_user_id"],
    )

    op.create_index(
        "ix_storage_requests_listing_id",
        "storage_requests",
        ["listing_id"],
    )

    op.create_index(
        "ix_storage_requests_status",
        "storage_requests",
        ["status"],
    )

    facilities = sa.table(
        "storage_facilities",
        sa.column(
            "id",
            postgresql.UUID(as_uuid=True),
        ),
        sa.column("name", sa.String()),
        sa.column(
            "facility_type",
            sa.String(),
        ),
        sa.column("district", sa.String()),
        sa.column("state", sa.String()),
        sa.column("address", sa.String()),
        sa.column(
            "total_capacity_quintal",
            sa.Float(),
        ),
        sa.column(
            "available_capacity_quintal",
            sa.Float(),
        ),
        sa.column(
            "rate_per_quintal_day",
            sa.Float(),
        ),
        sa.column(
            "supports_cold_chain",
            sa.Boolean(),
        ),
        sa.column(
            "contact_phone",
            sa.String(),
        ),
        sa.column("status", sa.String()),
        sa.column(
            "data_mode",
            sa.String(),
        ),
        sa.column(
            "verification_note",
            sa.Text(),
        ),
    )

    note = (
        "Prototype storage-directory entry. "
        "Provider credentials, pricing and "
        "real-time availability are not "
        "independently verified by AGRIVA."
    )

    op.bulk_insert(
        facilities,
        [
            {
                "id": uuid.uuid4(),
                "name": (
                    "Nashik Agri Storage Hub"
                ),
                "facility_type": "WAREHOUSE",
                "district": "Nashik",
                "state": "Maharashtra",
                "address": (
                    "Nashik District, Maharashtra"
                ),
                "total_capacity_quintal": 8000.0,
                "available_capacity_quintal": 5200.0,
                "rate_per_quintal_day": 2.25,
                "supports_cold_chain": False,
                "contact_phone": None,
                "status": "ACTIVE",
                "data_mode": "DEMO_DIRECTORY",
                "verification_note": note,
            },
            {
                "id": uuid.uuid4(),
                "name": (
                    "Lasalgaon Cold Chain Centre"
                ),
                "facility_type": "COLD_STORAGE",
                "district": "Nashik",
                "state": "Maharashtra",
                "address": (
                    "Lasalgaon, Nashik, Maharashtra"
                ),
                "total_capacity_quintal": 5000.0,
                "available_capacity_quintal": 3100.0,
                "rate_per_quintal_day": 4.75,
                "supports_cold_chain": True,
                "contact_phone": None,
                "status": "ACTIVE",
                "data_mode": "DEMO_DIRECTORY",
                "verification_note": note,
            },
            {
                "id": uuid.uuid4(),
                "name": (
                    "Pune Farmer Warehouse"
                ),
                "facility_type": "WAREHOUSE",
                "district": "Pune",
                "state": "Maharashtra",
                "address": (
                    "Pune District, Maharashtra"
                ),
                "total_capacity_quintal": 10000.0,
                "available_capacity_quintal": 6800.0,
                "rate_per_quintal_day": 2.60,
                "supports_cold_chain": False,
                "contact_phone": None,
                "status": "ACTIVE",
                "data_mode": "DEMO_DIRECTORY",
                "verification_note": note,
            },
        ],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_storage_requests_status",
        table_name="storage_requests",
    )
    op.drop_index(
        "ix_storage_requests_listing_id",
        table_name="storage_requests",
    )
    op.drop_index(
        "ix_storage_requests_farmer_user_id",
        table_name="storage_requests",
    )
    op.drop_index(
        "ix_storage_requests_facility_id",
        table_name="storage_requests",
    )
    op.drop_table("storage_requests")

    op.drop_index(
        "ix_storage_facilities_status",
        table_name="storage_facilities",
    )
    op.drop_index(
        "ix_storage_facilities_state",
        table_name="storage_facilities",
    )
    op.drop_index(
        "ix_storage_facilities_district",
        table_name="storage_facilities",
    )
    op.drop_index(
        "ix_storage_facilities_type",
        table_name="storage_facilities",
    )
    op.drop_index(
        "ix_storage_facilities_name",
        table_name="storage_facilities",
    )
    op.drop_table("storage_facilities")
