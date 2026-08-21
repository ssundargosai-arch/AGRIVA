"""add phase 8 image analysis history

Revision ID: 47b2943862d4
Revises: ffc2c467d7fd
Create Date: 2026-08-20 13:07:44.939091
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision: str = "47b2943862d4"

down_revision: Union[
    str,
    Sequence[str],
    None,
] = "ffc2c467d7fd"

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
    bind = op.get_bind()
    inspector = inspect(bind)

    # The table may already exist in development
    # databases. Create it only when missing.
    if not inspector.has_table(
        "ai_image_analyses"
    ):
        op.create_table(
            "ai_image_analyses",

            sa.Column(
                "id",
                sa.UUID(),
                nullable=False,
            ),

            sa.Column(
                "user_id",
                sa.UUID(),
                nullable=False,
            ),

            sa.Column(
                "analysis_type",
                sa.String(length=30),
                nullable=False,
            ),

            sa.Column(
                "image_name",
                sa.String(length=255),
                nullable=False,
            ),

            sa.Column(
                "result",
                sa.JSON(),
                nullable=False,
            ),

            sa.Column(
                "is_demo",
                sa.Boolean(),
                nullable=False,
            ),

            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),

            sa.ForeignKeyConstraint(
                ["user_id"],
                ["users.id"],
                ondelete="CASCADE",
            ),

            sa.PrimaryKeyConstraint(
                "id"
            ),
        )

        op.create_index(
            "ix_ai_image_analyses_user_id",
            "ai_image_analyses",
            ["user_id"],
            unique=False,
        )

        op.create_index(
            "ix_ai_image_analyses_analysis_type",
            "ai_image_analyses",
            ["analysis_type"],
            unique=False,
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    if inspector.has_table(
        "ai_image_analyses"
    ):
        op.drop_table(
            "ai_image_analyses"
        )