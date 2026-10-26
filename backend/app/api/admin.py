from enum import Enum
from datetime import date, datetime
from collections import Counter

from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.inspection import inspect
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.dependencies import require_admin

# Correct model imports according to your existing AGRIVA project
from app.models.user import (
    User,
    FarmerProfile,
    BuyerProfile,
)

from app.models.market import (
    CropListing,
    Order,
)

from app.models.finance import Payment
from app.models.store import Product
from app.models.support import Notification

from app.models.crop import (
    PricePrediction,
    CropQualityPrediction,
)


router = APIRouter(
    prefix="/api/admin",
    tags=["Admin"],
)


def json_value(value):
    if isinstance(value, Enum):
        return value.value

    if isinstance(value, (datetime, date)):
        return value.isoformat()

    return value


def model_to_dict(obj):
    return {
        column.key: json_value(getattr(obj, column.key))
        for column in inspect(obj).mapper.column_attrs
    }


def count_model(db: Session, model):
    return (
        db.scalar(
            select(func.count()).select_from(model)
        )
        or 0
    )


def calculate_revenue(db: Session):
    payments = db.execute(
        select(Payment)
    ).scalars().all()

    total = 0.0

    for payment in payments:
        amount = (
            getattr(payment, "amount", None)
            or getattr(payment, "total_amount", None)
            or getattr(payment, "payment_amount", None)
            or 0
        )

        try:
            total += float(amount)
        except (TypeError, ValueError):
            pass

    return round(total, 2)


def regional_activity(db: Session):
    profiles = db.execute(
        select(FarmerProfile)
    ).scalars().all()

    regions = []

    for profile in profiles:
        region = (
            getattr(profile, "district", None)
            or getattr(profile, "state", None)
            or getattr(profile, "location", None)
            or getattr(profile, "city", None)
            or "Unknown"
        )

        regions.append(str(region))

    counts = Counter(regions)

    return [
        {
            "region": region,
            "farmers": count,
        }
        for region, count in counts.most_common(10)
    ]


@router.get("/dashboard")
def admin_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    total_farmers = count_model(
        db,
        FarmerProfile,
    )

    total_buyers = count_model(
        db,
        BuyerProfile,
    )

    total_listings = count_model(
        db,
        CropListing,
    )

    total_orders = count_model(
        db,
        Order,
    )

    price_predictions = count_model(
        db,
        PricePrediction,
    )

    quality_predictions = count_model(
        db,
        CropQualityPrediction,
    )

    ai_predictions = (
        price_predictions
        + quality_predictions
    )

    return {
        "message": "Admin dashboard loaded successfully",
        "admin": {
            "id": current_user.id,
            "email": getattr(
                current_user,
                "email",
                None,
            ),
        },
        "statistics": {
            "total_farmers": total_farmers,
            "total_buyers": total_buyers,
            "listings": total_listings,
            "orders": total_orders,
            "revenue": calculate_revenue(db),
            "ai_predictions": ai_predictions,
        },
        "regional_activity": regional_activity(db),
    }


@router.get("/users")
def get_users(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    records = db.execute(
        select(User).order_by(User.id.desc())
    ).scalars().all()

    return [
        model_to_dict(item)
        for item in records
    ]


@router.get("/farmers")
def get_farmers(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    records = db.execute(
        select(FarmerProfile)
        .order_by(FarmerProfile.id.desc())
    ).scalars().all()

    return [
        model_to_dict(item)
        for item in records
    ]


@router.get("/buyers")
def get_buyers(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    records = db.execute(
        select(BuyerProfile)
        .order_by(BuyerProfile.id.desc())
    ).scalars().all()

    return [
        model_to_dict(item)
        for item in records
    ]


@router.get("/products")
def get_products(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    records = db.execute(
        select(Product)
        .order_by(Product.id.desc())
    ).scalars().all()

    return [
        model_to_dict(item)
        for item in records
    ]


@router.get("/orders")
def get_orders(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    records = db.execute(
        select(Order)
        .order_by(Order.id.desc())
    ).scalars().all()

    return [
        model_to_dict(item)
        for item in records
    ]


@router.get("/payments")
def get_payments(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    records = db.execute(
        select(Payment)
        .order_by(Payment.id.desc())
    ).scalars().all()

    return [
        model_to_dict(item)
        for item in records
    ]


@router.get("/listings")
def get_listings(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    records = db.execute(
        select(CropListing)
        .order_by(CropListing.id.desc())
    ).scalars().all()

    return [
        model_to_dict(item)
        for item in records
    ]


@router.get("/notifications")
def get_notifications(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    records = db.execute(
        select(Notification)
        .order_by(Notification.id.desc())
    ).scalars().all()

    return [
        model_to_dict(item)
        for item in records
    ]