from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import require_farmer
from app.db.session import get_db
from app.models.crop import Crop
from app.models.farm import Farm, FarmField
from app.models.market import CropListing
from app.models.user import FarmerProfile, User

router = APIRouter(prefix="/api/farmer", tags=["Farmer"])


@router.get("/dashboard")
def farmer_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_farmer),
):
    farmer_profile = (
        db.query(FarmerProfile)
        .filter(FarmerProfile.user_id == current_user.id)
        .first()
    )

    if farmer_profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Farmer profile not found",
        )

    farms = (
        db.query(Farm)
        .filter(Farm.farmer_id == farmer_profile.id)
        .order_by(Farm.created_at.desc())
        .all()
    )

    farm_ids = [farm.id for farm in farms]

    fields = (
        db.query(FarmField)
        .filter(FarmField.farm_id.in_(farm_ids))
        .all()
        if farm_ids
        else []
    )

    field_ids = [field.id for field in fields]

    crops = (
        db.query(Crop)
        .filter(Crop.field_id.in_(field_ids))
        .order_by(Crop.created_at.desc())
        .all()
        if field_ids
        else []
    )

    crop_ids = [crop.id for crop in crops]

    active_crop_statuses = {
        "planned",
        "growing",
        "active",
        "sown",
        "cultivating",
    }

    active_crops = [
        crop
        for crop in crops
        if str(crop.status or "").strip().lower() in active_crop_statuses
    ]

    active_listings = (
        db.query(CropListing)
        .filter(
            CropListing.crop_id.in_(crop_ids),
            CropListing.status == "active",
        )
        .count()
        if crop_ids
        else 0
    )

    recent_crops = [
        {
            "id": str(crop.id),
            "field_id": str(crop.field_id),
            "name": crop.name,
            "variety": crop.variety,
            "status": crop.status,
            "sowing_date": (
                crop.sowing_date.isoformat()
                if crop.sowing_date
                else None
            ),
            "expected_harvest_date": (
                crop.expected_harvest_date.isoformat()
                if crop.expected_harvest_date
                else None
            ),
            "expected_yield_kg": (
                float(crop.expected_yield_kg)
                if crop.expected_yield_kg is not None
                else None
            ),
        }
        for crop in crops[:5]
    ]

    # Mirrors the current AGRIVA demo weather endpoint.
    weather = {
        "temperature": 31.0,
        "condition": "Partly Cloudy",
        "humidity": 68.0,
        "rain_probability": 35.0,
    }

    return {
        "success": True,
        "data": {
            "farmer": {
                "id": str(current_user.id),
                "farmer_profile_id": str(farmer_profile.id),
                "name": current_user.full_name,
                "email": current_user.email,
                "phone": current_user.phone,
                "role": current_user.role,
            },
            "stats": {
                "total_farms": len(farms),
                "total_crops": len(crops),
                "active_crops": len(active_crops),
                "active_listings": active_listings,
                "pending_orders": 0,
                "total_income": 0.0,
            },
            "weather": weather,
            "recent_crops": recent_crops,
            "recent_orders": [],
            "alerts": [],
        },
    }
