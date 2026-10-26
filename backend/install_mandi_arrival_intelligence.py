from pathlib import Path
import shutil

ROOT = Path(r"D:\AGRIVA\backend")

FILES = {}

# =========================================================
# MODEL
# =========================================================

FILES["app/models/mandi_arrival.py"] = r'''import uuid
from datetime import date, datetime

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    Float,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class MandiArrivalRecord(Base):
    __tablename__ = "mandi_arrival_records"

    __table_args__ = (
        CheckConstraint(
            "arrival_quantity_mt >= 0",
            name="ck_mandi_arrival_quantity_positive",
        ),
        CheckConstraint(
            "data_mode IN ("
            "'HISTORICAL', "
            "'DEMO_DATASET', "
            "'LIVE_VERIFIED'"
            ")",
            name="ck_mandi_arrival_data_mode",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    commodity: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )

    state: Mapped[str] = mapped_column(
        String(120),
        nullable=False,
        index=True,
    )

    district: Mapped[str] = mapped_column(
        String(120),
        nullable=False,
        index=True,
    )

    market: Mapped[str] = mapped_column(
        String(180),
        nullable=False,
        index=True,
    )

    arrival_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        index=True,
    )

    arrival_quantity_mt: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    source_name: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )

    data_mode: Mapped[str] = mapped_column(
        String(40),
        nullable=False,
        default="DEMO_DATASET",
    )

    source_note: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
'''

# =========================================================
# SCHEMA
# =========================================================

FILES["app/schemas/mandi_arrival.py"] = r'''from datetime import date

from pydantic import BaseModel


class ArrivalTrendPoint(BaseModel):
    date: date
    arrival_quantity_mt: float


class ArrivalIntelligenceResponse(BaseModel):
    crop: str
    district: str
    state: str

    arrival_scope: str
    arrival_source: str
    arrival_data_mode: str

    latest_arrival_date: date
    latest_arrival_mt: float
    seven_day_average_mt: float
    change_vs_average_percent: float

    arrival_level: str
    supply_pressure: str

    price_market: str | None = None
    current_modal_price_per_quintal: float | None = None
    price_arrival_date: str | None = None
    price_source: str | None = None
    price_data_mode: str

    insight: str
    disclaimer: str

    trend: list[ArrivalTrendPoint]
'''

# =========================================================
# SERVICE
# =========================================================

FILES["app/services/mandi_arrival_service.py"] = r'''import os
from datetime import datetime

from sqlalchemy.orm import Session

from app.models.mandi_arrival import (
    MandiArrivalRecord,
)
from app.services.mandi_price import (
    request_records,
)


ARRIVAL_DISCLAIMER = (
    "Arrival quantity shown by this prototype is "
    "from AGRIVA's labelled historical/demo arrival "
    "dataset unless LIVE_VERIFIED is explicitly shown. "
    "The current Government price resource used by "
    "AGRIVA does not expose arrival quantity in the "
    "records currently returned to the application. "
    "Market arrivals and prices can change and should "
    "be confirmed before a sale decision."
)


def classify_arrival_level(
    *,
    latest: float,
    average: float,
) -> str:
    if average <= 0:
        return "NORMAL"

    ratio = latest / average

    if ratio >= 1.15:
        return "HIGH"

    if ratio <= 0.85:
        return "LOW"

    return "NORMAL"


def calculate_change_percent(
    *,
    latest: float,
    average: float,
) -> float:
    if average <= 0:
        return 0.0

    return round(
        (
            (latest - average)
            / average
        )
        * 100,
        2,
    )


def pressure_from_level(
    level: str,
) -> str:
    if level == "HIGH":
        return (
            "POSSIBLE_DOWNWARD_PRICE_PRESSURE"
        )

    if level == "LOW":
        return (
            "POSSIBLE_UPWARD_PRICE_SUPPORT"
        )

    return "BALANCED_SUPPLY"


def build_market_insight(
    *,
    crop: str,
    level: str,
    change_percent: float,
) -> str:
    if level == "HIGH":
        return (
            f"{crop} arrivals are above the recent "
            f"average by about "
            f"{abs(change_percent):.1f}%. "
            "Higher supply can create downward price "
            "pressure, but this is not a guaranteed "
            "price movement. Compare mandi prices and "
            "buyer offers before selling."
        )

    if level == "LOW":
        return (
            f"{crop} arrivals are below the recent "
            f"average by about "
            f"{abs(change_percent):.1f}%. "
            "Lower supply may support prices, but this "
            "does not guarantee a price increase. "
            "Check current mandi prices and buyer "
            "demand before deciding."
        )

    return (
        f"{crop} arrivals are close to the recent "
        "average. Supply conditions appear relatively "
        "balanced. Use current mandi prices, buyer "
        "offers, storage cost and quality together "
        "before making a sale decision."
    )


def _parse_date(
    value: str | None,
) -> datetime:
    if not value:
        return datetime.min

    for fmt in (
        "%d/%m/%Y",
        "%Y-%m-%d",
    ):
        try:
            return datetime.strptime(
                value,
                fmt,
            )
        except ValueError:
            pass

    return datetime.min


def get_live_price_context(
    *,
    crop: str,
    district: str,
) -> dict:
    api_key = os.getenv(
        "DATA_GOV_API_KEY"
    )

    if not api_key:
        return {
            "price_market": None,
            "current_modal_price_per_quintal": None,
            "price_arrival_date": None,
            "price_source": None,
            "price_data_mode": "UNAVAILABLE",
        }

    try:
        records = request_records(
            api_key=api_key,
            commodity=crop,
            location=district,
            location_field="district",
            limit=20,
        )

        if not records:
            return {
                "price_market": None,
                "current_modal_price_per_quintal": None,
                "price_arrival_date": None,
                "price_source": (
                    "AGMARKNET / data.gov.in"
                ),
                "price_data_mode": "UNAVAILABLE",
            }

        usable = [
            record
            for record in records
            if record.get(
                "modal_price"
            ) is not None
        ]

        if not usable:
            return {
                "price_market": None,
                "current_modal_price_per_quintal": None,
                "price_arrival_date": None,
                "price_source": (
                    "AGMARKNET / data.gov.in"
                ),
                "price_data_mode": "UNAVAILABLE",
            }

        usable.sort(
            key=lambda item: _parse_date(
                item.get("arrival_date")
            ),
            reverse=True,
        )

        latest_date = usable[0].get(
            "arrival_date"
        )

        same_day = [
            item
            for item in usable
            if item.get(
                "arrival_date"
            ) == latest_date
        ]

        modal_values = [
            float(
                item["modal_price"]
            )
            for item in same_day
            if item.get(
                "modal_price"
            ) is not None
        ]

        if not modal_values:
            return {
                "price_market": None,
                "current_modal_price_per_quintal": None,
                "price_arrival_date": latest_date,
                "price_source": (
                    "AGMARKNET / data.gov.in"
                ),
                "price_data_mode": "UNAVAILABLE",
            }

        district_average = round(
            sum(modal_values)
            / len(modal_values),
            2,
        )

        return {
            "price_market": (
                f"{district} district market average"
            ),
            "current_modal_price_per_quintal": (
                district_average
            ),
            "price_arrival_date": latest_date,
            "price_source": (
                "AGMARKNET / data.gov.in"
            ),
            "price_data_mode": "LIVE",
        }

    except Exception:
        return {
            "price_market": None,
            "current_modal_price_per_quintal": None,
            "price_arrival_date": None,
            "price_source": (
                "AGMARKNET / data.gov.in"
            ),
            "price_data_mode": "UNAVAILABLE",
        }


def get_arrival_intelligence(
    *,
    db: Session,
    crop: str,
    district: str,
    state: str,
) -> dict:
    normalized_crop = crop.strip()
    normalized_district = (
        district.strip()
    )
    normalized_state = state.strip()

    records = (
        db.query(MandiArrivalRecord)
        .filter(
            MandiArrivalRecord
            .commodity.ilike(
                normalized_crop
            ),
            MandiArrivalRecord
            .district.ilike(
                normalized_district
            ),
            MandiArrivalRecord
            .state.ilike(
                normalized_state
            ),
        )
        .order_by(
            MandiArrivalRecord
            .arrival_date.desc()
        )
        .limit(7)
        .all()
    )

    if not records:
        raise LookupError(
            "No labelled arrival-volume data is "
            "available for this crop and location."
        )

    chronological = list(
        reversed(records)
    )

    latest = records[0]

    quantities = [
        float(
            record.arrival_quantity_mt
        )
        for record in records
    ]

    seven_day_average = round(
        sum(quantities)
        / len(quantities),
        2,
    )

    latest_quantity = float(
        latest.arrival_quantity_mt
    )

    change_percent = (
        calculate_change_percent(
            latest=latest_quantity,
            average=seven_day_average,
        )
    )

    level = classify_arrival_level(
        latest=latest_quantity,
        average=seven_day_average,
    )

    price_context = (
        get_live_price_context(
            crop=latest.commodity,
            district=latest.district,
        )
    )

    return {
        "crop": latest.commodity,
        "district": latest.district,
        "state": latest.state,

        "arrival_scope": (
            f"{latest.district} district "
            "prototype arrival series"
        ),
        "arrival_source": (
            latest.source_name
        ),
        "arrival_data_mode": (
            latest.data_mode
        ),

        "latest_arrival_date": (
            latest.arrival_date
        ),
        "latest_arrival_mt": round(
            latest_quantity,
            2,
        ),
        "seven_day_average_mt": (
            seven_day_average
        ),
        "change_vs_average_percent": (
            change_percent
        ),

        "arrival_level": level,
        "supply_pressure": (
            pressure_from_level(
                level
            )
        ),

        **price_context,

        "insight": build_market_insight(
            crop=latest.commodity,
            level=level,
            change_percent=(
                change_percent
            ),
        ),

        "disclaimer": (
            ARRIVAL_DISCLAIMER
        ),

        "trend": [
            {
                "date": (
                    record.arrival_date
                ),
                "arrival_quantity_mt": (
                    round(
                        float(
                            record
                            .arrival_quantity_mt
                        ),
                        2,
                    )
                ),
            }
            for record
            in chronological
        ],
    }
'''

# =========================================================
# ROUTER
# =========================================================

FILES["app/api/routes/mandi_arrivals.py"] = r'''from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    status,
)
from sqlalchemy.orm import Session

from app.api.dependencies import (
    require_farmer,
)
from app.db.session import get_db
from app.models.user import User
from app.schemas.mandi_arrival import (
    ArrivalIntelligenceResponse,
)
from app.services.mandi_arrival_service import (
    get_arrival_intelligence,
)


router = APIRouter(
    prefix="/api/market-intelligence",
    tags=["Market Arrival Intelligence"],
)


@router.get("/arrivals/health")
def arrivals_health():
    return {
        "status": "ok",
        "module": (
            "AGRIVA Mandi Arrival Intelligence"
        ),
        "live_price_supported": True,
        "live_arrival_quantity_supported": False,
        "arrival_fallback": (
            "labelled historical/demo dataset"
        ),
    }


@router.get(
    "/arrivals",
    response_model=(
        ArrivalIntelligenceResponse
    ),
)
def mandi_arrival_intelligence(
    crop: str = Query(
        min_length=2,
        max_length=100,
    ),
    district: str = Query(
        min_length=2,
        max_length=120,
    ),
    state_name: str = Query(
        default="Maharashtra",
        alias="state",
        min_length=2,
        max_length=120,
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_farmer
    ),
):
    del current_user

    try:
        return get_arrival_intelligence(
            db=db,
            crop=crop,
            district=district,
            state=state_name,
        )

    except LookupError as exc:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=str(exc),
        ) from exc
'''

# =========================================================
# MIGRATION
# =========================================================

FILES["alembic/versions/6f01_mandi_arrival_intelligence.py"] = r'''"""add mandi arrival intelligence

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
'''

# =========================================================
# TESTS
# =========================================================

FILES["tests/test_mandi_arrival_intelligence.py"] = r'''from app.main import app
from app.services.mandi_arrival_service import (
    build_market_insight,
    calculate_change_percent,
    classify_arrival_level,
    pressure_from_level,
)


def test_arrival_level_high():
    assert classify_arrival_level(
        latest=120,
        average=100,
    ) == "HIGH"


def test_arrival_level_low():
    assert classify_arrival_level(
        latest=80,
        average=100,
    ) == "LOW"


def test_arrival_level_normal():
    assert classify_arrival_level(
        latest=105,
        average=100,
    ) == "NORMAL"


def test_arrival_change_percent():
    assert calculate_change_percent(
        latest=120,
        average=100,
    ) == 20.0


def test_supply_pressure():
    assert pressure_from_level(
        "HIGH"
    ) == (
        "POSSIBLE_DOWNWARD_PRICE_PRESSURE"
    )

    assert pressure_from_level(
        "LOW"
    ) == (
        "POSSIBLE_UPWARD_PRICE_SUPPORT"
    )


def test_market_insight_is_not_guarantee():
    insight = build_market_insight(
        crop="Onion",
        level="HIGH",
        change_percent=20,
    )

    assert "not a guaranteed" in insight


def test_arrival_routes_registered():
    paths = {
        route.path
        for route in app.routes
    }

    assert (
        "/api/market-intelligence/"
        "arrivals"
        in paths
    )

    assert (
        "/api/market-intelligence/"
        "arrivals/health"
        in paths
    )
'''


# =========================================================
# BACKUP
# =========================================================

backup_root = (
    ROOT /
    "backup-before-arrival-intelligence"
)

backup_root.mkdir(
    parents=True,
    exist_ok=True,
)

for rel in [
    "app/main.py",
    "app/models/__init__.py",
]:
    src = ROOT / rel

    if src.exists():
        dst = backup_root / rel

        dst.parent.mkdir(
            parents=True,
            exist_ok=True,
        )

        shutil.copy2(
            src,
            dst,
        )


# =========================================================
# WRITE FILES
# =========================================================

for rel, content in FILES.items():
    path = ROOT / rel

    if path.exists():
        raise RuntimeError(
            f"Refusing to overwrite existing file: {path}"
        )

    path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    path.write_text(
        content,
        encoding="utf-8",
        newline="\n",
    )

    print(
        "CREATED:",
        rel,
    )


# =========================================================
# MODEL EXPORT
# =========================================================

models_init = (
    ROOT /
    "app/models/__init__.py"
)

text = models_init.read_text(
    encoding="utf-8-sig"
)

line = (
    "\nfrom .mandi_arrival "
    "import MandiArrivalRecord\n"
)

if (
    "from .mandi_arrival import"
    not in text
):
    text = (
        text.rstrip()
        + line
    )

    models_init.write_text(
        text,
        encoding="utf-8",
        newline="\n",
    )

    print(
        "UPDATED: app/models/__init__.py"
    )


# =========================================================
# ROUTER REGISTRATION
# =========================================================

main_path = ROOT / "app/main.py"

main_text = main_path.read_text(
    encoding="utf-8-sig"
)

import_line = (
    "from app.api.routes.mandi_arrivals "
    "import router as mandi_arrivals_router"
)

if import_line not in main_text:
    marker = "app = FastAPI"

    index = main_text.find(
        marker
    )

    if index == -1:
        raise RuntimeError(
            "FastAPI app marker not found."
        )

    main_text = (
        main_text[:index]
        + import_line
        + "\n\n"
        + main_text[index:]
    )

include_line = (
    "app.include_router("
    "mandi_arrivals_router)"
)

if include_line not in main_text:
    main_text = (
        main_text.rstrip()
        + "\n\n"
        + include_line
        + "\n"
    )

main_path.write_text(
    main_text,
    encoding="utf-8",
    newline="\n",
)

print(
    "UPDATED: app/main.py"
)

print()
print(
    "AGRIVA MANDI ARRIVAL "
    "INTELLIGENCE BACKEND INSTALLED"
)
print(
    "Backup:",
    backup_root,
)
