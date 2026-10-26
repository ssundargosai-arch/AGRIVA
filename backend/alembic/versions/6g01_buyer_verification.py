"""add buyer verification

Revision ID: 6g01_buyer_verification
Revises: 6f01_mandi_arrivals
"""

from typing import (
    Sequence,
    Union,
)

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = (
    "6g01_buyer_verification"
)

down_revision: Union[
    str,
    None,
] = "6f01_mandi_arrivals"

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
        "buyer_verifications",

        sa.Column(
            "id",
            postgresql.UUID(
                as_uuid=True
            ),
            nullable=False,
        ),

        sa.Column(
            "buyer_profile_id",
            postgresql.UUID(
                as_uuid=True
            ),
            nullable=False,
        ),

        sa.Column(
            "status",
            sa.String(length=40),
            nullable=False,
        ),

        sa.Column(
            "document_type",
            sa.String(length=60),
            nullable=False,
        ),

        sa.Column(
            "business_name_snapshot",
            sa.String(length=200),
            nullable=False,
        ),

        sa.Column(
            "business_type_snapshot",
            sa.String(length=100),
            nullable=False,
        ),

        sa.Column(
            "gstin",
            sa.String(length=15),
            nullable=True,
        ),

        sa.Column(
            "business_registration_number",
            sa.String(length=80),
            nullable=True,
        ),

        sa.Column(
            "document_original_name",
            sa.String(length=255),
            nullable=False,
        ),

        sa.Column(
            "document_stored_name",
            sa.String(length=400),
            nullable=False,
        ),

        sa.Column(
            "document_content_type",
            sa.String(length=100),
            nullable=False,
        ),

        sa.Column(
            "document_size_bytes",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "document_sha256",
            sa.String(length=64),
            nullable=False,
        ),

        sa.Column(
            "declaration_accepted",
            sa.Boolean(),
            nullable=False,
        ),

        sa.Column(
            "review_note",
            sa.Text(),
            nullable=True,
        ),

        sa.Column(
            "reviewed_by_admin_user_id",
            postgresql.UUID(
                as_uuid=True
            ),
            nullable=True,
        ),

        sa.Column(
            "submitted_at",
            sa.DateTime(
                timezone=True
            ),
            server_default=(
                sa.text("now()")
            ),
            nullable=False,
        ),

        sa.Column(
            "reviewed_at",
            sa.DateTime(
                timezone=True
            ),
            nullable=True,
        ),

        sa.Column(
            "updated_at",
            sa.DateTime(
                timezone=True
            ),
            server_default=(
                sa.text("now()")
            ),
            nullable=False,
        ),

        sa.CheckConstraint(
            "status IN ("
            "'PENDING', "
            "'AGRIVA_VERIFIED', "
            "'REJECTED'"
            ")",
            name=(
                "ck_buyer_verification_status"
            ),
        ),

        sa.ForeignKeyConstraint(
            ["buyer_profile_id"],
            ["buyer_profiles.id"],
            ondelete="CASCADE",
        ),

        sa.ForeignKeyConstraint(
            [
                "reviewed_by_admin_user_id"
            ],
            ["users.id"],
            ondelete="SET NULL",
        ),

        sa.PrimaryKeyConstraint(
            "id"
        ),

        sa.UniqueConstraint(
            "buyer_profile_id",
            name=(
                "uq_buyer_verification_"
                "buyer_profile"
            ),
        ),
    )

    op.create_index(
        "ix_buyer_verifications_"
        "buyer_profile_id",
        "buyer_verifications",
        ["buyer_profile_id"],
        unique=True,
    )

    op.create_index(
        "ix_buyer_verifications_status",
        "buyer_verifications",
        ["status"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_buyer_verifications_status",
        table_name=(
            "buyer_verifications"
        ),
    )

    op.drop_index(
        "ix_buyer_verifications_"
        "buyer_profile_id",
        table_name=(
            "buyer_verifications"
        ),
    )

    op.drop_table(
        "buyer_verifications"
    )
