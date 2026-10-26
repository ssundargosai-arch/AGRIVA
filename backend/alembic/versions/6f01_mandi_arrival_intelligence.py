"""add mandi arrival intelligence

Revision ID: 6f01_mandi_arrivals
Revises: 6e01_storage_network
"""

from datetime import date
from typing import Sequence, Union
import uuid

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = (
    "6f01_mandi_arrivals"
)

down_revision: Union[
    str,
    None,
] = "6e01_storage_network"

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
        "mandi_arrival_records",

        sa.Column(
            "id",
            postgresql.UUID(
                as_uuid=True
            ),
            nullable=False,
        ),

        sa.Column(
            "commodity",
            sa.String(length=100),
            nullable=False,
        ),

        sa.Column(
            "state",
            sa.String(length=120),
            nullable=False,
        ),

        sa.Column(
            "district",
            sa.String(length=120),
            nullable=False,
        ),

        sa.Column(
            "market",
            sa.String(length=180),
            nullable=False,
        ),

        sa.Column(
            "arrival_date",
            sa.Date(),
            nullable=False,
        ),

        sa.Column(
            "arrival_quantity_mt",
            sa.Float(),
            nullable=False,
        ),

        sa.Column(
            "source_name",
            sa.String(length=200),
            nullable=False,
        ),

        sa.Column(
            "data_mode",
            sa.String(length=40),
            nullable=False,
        ),

        sa.Column(
            "source_note",
            sa.Text(),
            nullable=False,
        ),

        sa.Column(
            "created_at",
            sa.DateTime(
                timezone=True
            ),
            server_default=(
                sa.text("now()")
            ),
            nullable=False,
        ),

        sa.CheckConstraint(
            "arrival_quantity_mt >= 0",
            name=(
                "ck_mandi_arrival_"
                "quantity_positive"
            ),
        ),

        sa.CheckConstraint(
            "data_mode IN ("
            "'HISTORICAL', "
            "'DEMO_DATASET', "
            "'LIVE_VERIFIED'"
            ")",
            name=(
                "ck_mandi_arrival_"
                "data_mode"
            ),
        ),

        sa.PrimaryKeyConstraint(
            "id"
        ),
    )

    for column in (
        "commodity",
        "state",
        "district",
        "market",
        "arrival_date",
    ):
        op.create_index(
            f"ix_mandi_arrival_records_{column}",
            "mandi_arrival_records",
            [column],
        )

    table = sa.table(
        "mandi_arrival_records",

        sa.column(
            "id",
            postgresql.UUID(
                as_uuid=True
            ),
        ),
        sa.column(
            "commodity",
            sa.String(),
        ),
        sa.column(
            "state",
            sa.String(),
        ),
        sa.column(
            "district",
            sa.String(),
        ),
        sa.column(
            "market",
            sa.String(),
        ),
        sa.column(
            "arrival_date",
            sa.Date(),
        ),
        sa.column(
            "arrival_quantity_mt",
            sa.Float(),
        ),
        sa.column(
            "source_name",
            sa.String(),
        ),
        sa.column(
            "data_mode",
            sa.String(),
        ),
        sa.column(
            "source_note",
            sa.Text(),
        ),
    )

    note = (
        "AGRIVA labelled prototype arrival-volume "
        "series. These quantities are not claimed "
        "as live AGMARKNET/data.gov.in arrival "
        "figures. Current live Government price "
        "records are queried separately."
    )

    rows = []

    def add_series(
        commodity,
        district,
        market,
        values,
    ):
        dates = [
            date(2026, 8, 30),
            date(2026, 8, 31),
            date(2026, 9, 1),
            date(2026, 9, 2),
            date(2026, 9, 3),
            date(2026, 9, 4),
            date(2026, 9, 5),
        ]

        for day, value in zip(
            dates,
            values,
        ):
            rows.append(
                {
                    "id": uuid.uuid4(),
                    "commodity": (
                        commodity
                    ),
                    "state": (
                        "Maharashtra"
                    ),
                    "district": (
                        district
                    ),
                    "market": market,
                    "arrival_date": day,
                    "arrival_quantity_mt": (
                        float(value)
                    ),
                    "source_name": (
                        "AGRIVA labelled "
                        "prototype arrival "
                        "dataset"
                    ),
                    "data_mode": (
                        "DEMO_DATASET"
                    ),
                    "source_note": note,
                }
            )

    add_series(
        "Onion",
        "Nashik",
        "Nashik district aggregate",
        [
            920,
            960,
            1010,
            980,
            1040,
            1100,
            1320,
        ],
    )

    add_series(
        "Maize",
        "Nashik",
        "Nashik district aggregate",
        [
            430,
            450,
            455,
            470,
            460,
            475,
            480,
        ],
    )

    add_series(
        "Wheat",
        "Pune",
        "Pune district aggregate",
        [
            760,
            720,
            700,
            680,
            650,
            620,
            590,
        ],
    )

    add_series(
        "Soybean",
        "Latur",
        "Latur district aggregate",
        [
            510,
            530,
            520,
            540,
            545,
            550,
            552,
        ],
    )

    op.bulk_insert(
        table,
        rows,
    )


def downgrade() -> None:
    for column in (
        "arrival_date",
        "market",
        "district",
        "state",
        "commodity",
    ):
        op.drop_index(
            f"ix_mandi_arrival_records_{column}",
            table_name=(
                "mandi_arrival_records"
            ),
        )

    op.drop_table(
        "mandi_arrival_records"
    )
