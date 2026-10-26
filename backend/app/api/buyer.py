from enum import Enum
from datetime import date, datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.inspection import inspect
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.dependencies import require_buyer

from app.models.user import User
from app.models.market import CropListing


router = APIRouter(
    prefix="/api/buyer",
    tags=["Buyer"],
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


@router.get("/dashboard")
def buyer_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_buyer),
):
    listings = (
        db.execute(
            select(CropListing)
            .order_by(CropListing.id.desc())
            .limit(6)
        )
        .scalars()
        .all()
    )

    return {
        "message": "Buyer dashboard loaded successfully",
        "buyer": {
            "id": current_user.id,
            "email": getattr(current_user, "email", None),
            "role": getattr(
                getattr(current_user, "role", None),
                "value",
                getattr(current_user, "role", None),
            ),
        },
        "recommended_crops": [
            model_to_dict(item)
            for item in listings
        ],
        "features": [
            {
                "name": "Recommended Crops",
                "route": "/marketplace",
            },
            {
                "name": "Search Farmers",
                "route": "/dashboard/buyer/farmers",
            },
            {
                "name": "Marketplace",
                "route": "/marketplace",
            },
            {
                "name": "Orders",
                "route": "/dashboard/buyer/orders",
            },
            {
                "name": "Payments",
                "route": "/dashboard/buyer/payments",
            },
            {
                "name": "Transport",
                "route": "/dashboard/buyer/transport",
            },
            {
                "name": "Favorites",
                "route": "/dashboard/buyer/favorites",
            },
            {
                "name": "Reviews",
                "route": "/dashboard/buyer/reviews",
            },
            {
                "name": "Profile",
                "route": "/dashboard/buyer/profile",
            },
        ],
    }


@router.get("/farmers")
def search_farmers(
    q: str = Query(default="", max_length=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_buyer),
):
    users = db.execute(
        select(User).order_by(User.id.desc())
    ).scalars().all()

    results = []

    search = q.lower().strip()

    for user in users:
        role = getattr(
            getattr(user, "role", None),
            "value",
            str(getattr(user, "role", "")),
        )

        if role.upper() != "FARMER":
            continue

        name = (
            getattr(user, "name", None)
            or getattr(user, "full_name", None)
            or ""
        )

        email = getattr(user, "email", "") or ""

        if search:
            if (
                search not in name.lower()
                and search not in email.lower()
            ):
                continue

        results.append(
            {
                "id": user.id,
                "name": name,
                "email": email,
            }
        )

    return {
        "query": q,
        "count": len(results),
        "farmers": results,
    }