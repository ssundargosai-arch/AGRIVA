from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.dependencies import require_roles
from app.db.session import get_db
from app.models.user import User

router = APIRouter(
    prefix="/api/farmer",
    tags=["Farmer Dashboard"],
)


@router.get("/dashboard")
def get_farmer_dashboard(
    current_user: User = Depends(
        require_roles("FARMER")
    ),
    db: Session = Depends(get_db),
):
    """
    Farmer dashboard API.

    Replace the query sections below with your existing
    Farm, Crop, Order, Transaction, WeatherAlert and
    Notification models.
    """

    # ---------------------------------------------------------
    # TODO:
    # Connect these values to your existing AGRIVA models.
    # ---------------------------------------------------------

    return {
        "stats": {
            "farm_health": 0,
            "expected_revenue": 0,
            "active_crops": 0,
            "pending_orders": 0,
        },

        "weather": {
            "temperature": 0,
            "humidity": 0,
            "rainfall": 0,
            "condition": "Unavailable",
            "location": "Your location",
        },

        "recommendation": None,

        "farm_health": {
            "score": 0,
            "status": "Unavailable",
            "soil_health": 0,
            "crop_health": 0,
            "irrigation": 0,
        },

        "recent_orders": [],

        "revenue": [],

        "crop_performance": [],

        "notifications": [],
    }