from fastapi import APIRouter, Depends

from app.api.dependencies import require_farmer
from app.models.user import User


router = APIRouter(
    prefix="/api/farmer",
    tags=["Farmer"],
)


@router.get("/dashboard")
def farmer_dashboard(
    current_user: User = Depends(require_farmer),
):
    return {
        "success": True,
        "data": {
            "farmer": {
                "id": str(current_user.id),
                "name": current_user.full_name,
                "email": current_user.email,
                "phone": current_user.phone,
                "role": current_user.role,
            },

            "stats": {
                "total_farms": 0,
                "total_crops": 0,
                "active_listings": 0,
                "pending_orders": 0,
                "total_income": 0,
            },

            "weather": {
                "temperature": 0,
                "condition": "No data",
                "humidity": 0,
                "rain_probability": 0,
            },

            "recent_crops": [],

            "recent_orders": [],

            "alerts": [],
        },
    }