from collections import defaultdict
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models.crop import (
    Crop,
    CropHealth,
)
from app.models.farm import (
    Farm,
    FarmField,
)
from app.models.market import (
    Buyer,
    CropListing,
    Order,
)
from app.models.support import Analytics
from app.models.user import (
    BuyerProfile,
    FarmerProfile,
)


EXPENSE_METRICS = {
    "expense",
    "expenses",
    "total_expenses",
    "farm_expense",
    "operating_expense",
    "input_expense",
    "seed_expense",
    "fertilizer_expense",
    "transport_expense",
}


def get_period_start(
    period: str,
) -> datetime:
    now = datetime.now(timezone.utc)

    if period == "daily":
        return now.replace(
            hour=0,
            minute=0,
            second=0,
            microsecond=0,
        )

    if period == "weekly":
        return now - timedelta(days=7)

    if period == "monthly":
        return now.replace(
            day=1,
            hour=0,
            minute=0,
            second=0,
            microsecond=0,
        )

    if period == "yearly":
        return now.replace(
            month=1,
            day=1,
            hour=0,
            minute=0,
            second=0,
            microsecond=0,
        )

    raise ValueError(
        "Invalid analytics period"
    )


def get_bucket_label(
    value: datetime,
    period: str,
) -> str:
    if period == "daily":
        return value.strftime("%H:00")

    if period in {
        "weekly",
        "monthly",
    }:
        return value.strftime("%d %b")

    return value.strftime("%b")


def empty_analytics(
    period: str,
    total_area: float = 0.0,
) -> dict:
    return {
        "period": period,

        "summary": {
            "total_revenue": 0.0,
            "total_expenses": 0.0,
            "net_profit": 0.0,
            "profit_margin": 0.0,
            "roi": 0.0,
            "total_orders": 0,
            "completed_orders": 0,
            "active_listings": 0,
            "total_quantity_sold_kg": 0.0,
            "total_farm_area_acres":
                round(total_area, 2),
            "total_crops": 0,
        },

        "financial_series": [],

        "crop_performance": [],

        "monthly_sales": [],

        "buyer_distribution": [],

        "farm_health": [],
    }


def get_farmer_analytics(
    db: Session,
    user_id,
    period: str = "monthly",
) -> dict:
    start_date = get_period_start(
        period
    )

    # =====================================================
    # FARMER
    # =====================================================

    farmer = (
        db.query(FarmerProfile)
        .filter(
            FarmerProfile.user_id
            == user_id
        )
        .first()
    )

    if farmer is None:
        return empty_analytics(
            period
        )

    # =====================================================
    # FARMS
    # =====================================================

    farms = (
        db.query(Farm)
        .filter(
            Farm.farmer_id
            == farmer.id
        )
        .all()
    )

    total_farm_area = sum(
        float(
            farm.total_area_acres
            or 0
        )
        for farm in farms
    )

    farm_ids = [
        farm.id
        for farm in farms
    ]

    if not farm_ids:
        return empty_analytics(
            period,
            total_farm_area,
        )

    # =====================================================
    # FIELDS
    # =====================================================

    fields = (
        db.query(FarmField)
        .filter(
            FarmField.farm_id.in_(
                farm_ids
            )
        )
        .all()
    )

    field_ids = [
        field.id
        for field in fields
    ]

    if not field_ids:
        return empty_analytics(
            period,
            total_farm_area,
        )

    # =====================================================
    # CROPS
    # =====================================================

    crops = (
        db.query(Crop)
        .filter(
            Crop.field_id.in_(
                field_ids
            )
        )
        .all()
    )

    crop_ids = [
        crop.id
        for crop in crops
    ]

    crop_names = {
        crop.id: crop.name
        for crop in crops
    }

    if not crop_ids:
        result = empty_analytics(
            period,
            total_farm_area,
        )

        result["summary"][
            "total_crops"
        ] = 0

        return result

    # =====================================================
    # LISTINGS
    # =====================================================

    listings = (
        db.query(CropListing)
        .filter(
            CropListing.crop_id.in_(
                crop_ids
            )
        )
        .all()
    )

    listing_ids = [
        listing.id
        for listing in listings
    ]

    listing_by_id = {
        listing.id: listing
        for listing in listings
    }

    active_listings = sum(
        1
        for listing in listings
        if str(
            listing.status
        ).lower()
        == "active"
    )

    # =====================================================
    # ORDERS FOR SELECTED PERIOD
    # =====================================================

    if listing_ids:
        all_period_orders = (
            db.query(Order)
            .filter(
                Order.listing_id.in_(
                    listing_ids
                ),
                Order.created_at
                >= start_date,
            )
            .all()
        )
    else:
        all_period_orders = []

    # Revenue/sales only come from COMPLETED orders.

    completed_orders = [
        order
        for order
        in all_period_orders
        if str(
            order.status
        ).strip().lower()
        == "completed"
    ]

    # =====================================================
    # EXPENSES FROM DATABASE ANALYTICS TABLE
    # =====================================================

    expense_rows = (
        db.query(Analytics)
        .filter(
            Analytics.user_id
            == user_id,
            Analytics.recorded_at
            >= start_date,
        )
        .all()
    )

    expense_rows = [
        row
        for row in expense_rows
        if str(
            row.metric_name
        ).strip().lower()
        in EXPENSE_METRICS
    ]

    total_expenses = sum(
        float(
            row.metric_value
            or 0
        )
        for row in expense_rows
    )

    # =====================================================
    # AGGREGATION BUCKETS
    # =====================================================

    financial = defaultdict(
        lambda: {
            "revenue": 0.0,
            "expenses": 0.0,
        }
    )

    crop_stats = defaultdict(
        lambda: {
            "revenue": 0.0,
            "quantity": 0.0,
            "orders": 0,
        }
    )

    monthly_stats = defaultdict(
        lambda: {
            "revenue": 0.0,
            "orders": 0,
        }
    )

    buyer_stats = defaultdict(
        lambda: {
            "revenue": 0.0,
            "orders": 0,
        }
    )

    total_revenue = 0.0
    total_quantity = 0.0

    # =====================================================
    # COMPLETED SALES
    # =====================================================

    for order in completed_orders:
        revenue = float(
            order.total_amount
            or 0
        )

        total_revenue += revenue

        financial_label = (
            get_bucket_label(
                order.created_at,
                period,
            )
        )

        financial[
            financial_label
        ]["revenue"] += revenue

        month_label = (
            order.created_at.strftime(
                "%Y-%m"
            )
        )

        monthly_stats[
            month_label
        ]["revenue"] += revenue

        monthly_stats[
            month_label
        ]["orders"] += 1

        listing = listing_by_id.get(
            order.listing_id
        )

        crop_name = "Unknown"

        if listing is not None:
            crop_name = crop_names.get(
                listing.crop_id,
                "Unknown",
            )

        # IMPORTANT:
        # sold quantity comes from OrderItem,
        # NOT remaining listing quantity.

        order_quantity = sum(
            float(
                item.quantity_kg
                or 0
            )
            for item in order.items
        )

        total_quantity += (
            order_quantity
        )

        crop_stats[
            crop_name
        ]["revenue"] += revenue

        crop_stats[
            crop_name
        ]["quantity"] += (
            order_quantity
        )

        crop_stats[
            crop_name
        ]["orders"] += 1

        buyer_stats[
            order.buyer_id
        ]["revenue"] += revenue

        buyer_stats[
            order.buyer_id
        ]["orders"] += 1

    # =====================================================
    # EXPENSE TIME SERIES
    # =====================================================

    for row in expense_rows:
        label = get_bucket_label(
            row.recorded_at,
            period,
        )

        financial[
            label
        ]["expenses"] += float(
            row.metric_value
            or 0
        )

    # =====================================================
    # SUMMARY
    # =====================================================

    net_profit = (
        total_revenue
        - total_expenses
    )

    if total_revenue > 0:
        profit_margin = (
            net_profit
            / total_revenue
        ) * 100
    else:
        profit_margin = 0.0

    if total_expenses > 0:
        roi = (
            net_profit
            / total_expenses
        ) * 100
    else:
        roi = 0.0

    # =====================================================
    # FINANCIAL SERIES
    # =====================================================

    financial_series = []

    for label, values in (
        financial.items()
    ):
        revenue = float(
            values["revenue"]
        )

        expenses = float(
            values["expenses"]
        )

        financial_series.append(
            {
                "label": label,
                "revenue": round(
                    revenue,
                    2,
                ),
                "expenses": round(
                    expenses,
                    2,
                ),
                "profit": round(
                    revenue
                    - expenses,
                    2,
                ),
            }
        )

    # =====================================================
    # CROP PERFORMANCE
    # =====================================================

    crop_performance = [
        {
            "crop_name":
                crop_name,

            "revenue": round(
                values["revenue"],
                2,
            ),

            "quantity_sold_kg":
                round(
                    values[
                        "quantity"
                    ],
                    2,
                ),

            "orders":
                values["orders"],
        }
        for crop_name, values
        in crop_stats.items()
    ]

    crop_performance.sort(
        key=lambda item:
            item["revenue"],
        reverse=True,
    )

    # =====================================================
    # MONTHLY SALES
    # =====================================================

    monthly_sales = [
        {
            "month": month,

            "revenue": round(
                values["revenue"],
                2,
            ),

            "orders":
                values["orders"],
        }
        for month, values
        in sorted(
            monthly_stats.items()
        )
    ]

    # =====================================================
    # BUYER DISTRIBUTION
    # =====================================================

    buyer_distribution = []

    for (
        buyer_id,
        values,
    ) in buyer_stats.items():

        buyer = (
            db.query(Buyer)
            .filter(
                Buyer.id
                == buyer_id
            )
            .first()
        )

        buyer_name = "Buyer"

        if buyer is not None:
            profile = (
                db.query(
                    BuyerProfile
                )
                .filter(
                    BuyerProfile.id
                    == buyer
                    .buyer_profile_id
                )
                .first()
            )

            if (
                profile is not None
                and profile.user
                is not None
            ):
                buyer_name = (
                    profile.user
                    .full_name
                    or "Buyer"
                )

        buyer_distribution.append(
            {
                "buyer_id":
                    str(buyer_id),

                "buyer_name":
                    buyer_name,

                "revenue":
                    round(
                        values[
                            "revenue"
                        ],
                        2,
                    ),

                "orders":
                    values[
                        "orders"
                    ],
            }
        )

    buyer_distribution.sort(
        key=lambda item:
            item["revenue"],
        reverse=True,
    )

    # =====================================================
    # FARM HEALTH
    # =====================================================

    health_counts = defaultdict(int)

    health_records = (
        db.query(CropHealth)
        .filter(
            CropHealth.crop_id.in_(
                crop_ids
            )
        )
        .all()
    )

    for record in health_records:
        status = str(
            record.health_status
            or "Unknown"
        ).strip()

        health_counts[
            status
        ] += 1

    farm_health = [
        {
            "status": status,
            "count": count,
        }
        for status, count
        in health_counts.items()
    ]

    # =====================================================
    # FINAL RESPONSE
    # =====================================================

    return {
        "period": period,

        "summary": {
            "total_revenue":
                round(
                    total_revenue,
                    2,
                ),

            "total_expenses":
                round(
                    total_expenses,
                    2,
                ),

            "net_profit":
                round(
                    net_profit,
                    2,
                ),

            "profit_margin":
                round(
                    profit_margin,
                    2,
                ),

            "roi":
                round(
                    roi,
                    2,
                ),

            "total_orders":
                len(
                    all_period_orders
                ),

            "completed_orders":
                len(
                    completed_orders
                ),

            "active_listings":
                active_listings,

            "total_quantity_sold_kg":
                round(
                    total_quantity,
                    2,
                ),

            "total_farm_area_acres":
                round(
                    total_farm_area,
                    2,
                ),

            "total_crops":
                len(crops),
        },

        "financial_series":
            financial_series,

        "crop_performance":
            crop_performance,

        "monthly_sales":
            monthly_sales,

        "buyer_distribution":
            buyer_distribution,

        "farm_health":
            farm_health,
    }