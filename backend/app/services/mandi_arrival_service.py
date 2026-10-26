import os
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
