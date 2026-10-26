"""add transaction assurance grievances

Revision ID: 6d01_transaction_assurance
Revises: 6c01_sale_decision
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "6d01_transaction_assurance"
down_revision: Union[str, None] = "6c01_sale_decision"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "transaction_grievances",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "order_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "farmer_user_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column("category", sa.String(length=40), nullable=False),
        sa.Column("subject", sa.String(length=180), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("resolution_note", sa.Text(), nullable=True),
        sa.Column(
            "resolved_by_user_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
        sa.Column(
            "resolved_at",
            sa.DateTime(timezone=True),
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
            "category IN ('PAYMENT', 'DELIVERY', 'QUALITY', "
            "'BUYER_COMMUNICATION', 'OTHER')",
            name="ck_transaction_grievance_category",
        ),
        sa.CheckConstraint(
            "status IN ('OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED')",
            name="ck_transaction_grievance_status",
        ),
        sa.ForeignKeyConstraint(
            ["farmer_user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["order_id"],
            ["orders.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["resolved_by_user_id"],
            ["users.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        "ix_transaction_grievances_order_id",
        "transaction_grievances",
        ["order_id"],
    )
    op.create_index(
        "ix_transaction_grievances_farmer_user_id",
        "transaction_grievances",
        ["farmer_user_id"],
    )
    op.create_index(
        "ix_transaction_grievances_category",
        "transaction_grievances",
        ["category"],
    )
    op.create_index(
        "ix_transaction_grievances_status",
        "transaction_grievances",
        ["status"],
    )
    op.create_index(
        "ix_transaction_grievances_resolved_by_user_id",
        "transaction_grievances",
        ["resolved_by_user_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_transaction_grievances_resolved_by_user_id",
        table_name="transaction_grievances",
    )
    op.drop_index(
        "ix_transaction_grievances_status",
        table_name="transaction_grievances",
    )
    op.drop_index(
        "ix_transaction_grievances_category",
        table_name="transaction_grievances",
    )
    op.drop_index(
        "ix_transaction_grievances_farmer_user_id",
        table_name="transaction_grievances",
    )
    op.drop_index(
        "ix_transaction_grievances_order_id",
        table_name="transaction_grievances",
    )
    op.drop_table("transaction_grievances")
