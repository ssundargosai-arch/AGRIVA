from datetime import date

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from sqlalchemy.orm import Session

from app.core.dependencies import (
    require_farmer,
)
from app.db.session import get_db
from app.models.crop import Crop
from app.models.farm import Farm, FarmField
from app.models.user import (
    FarmerProfile,
    User,
)
from app.schemas.agriva_ai import (
    AGRIVAAIRequest,
    AGRIVAAIResponse,
)
from app.services.agriva_ai_service import (
    AGRIVAAIServiceError,
    get_agriva_ai_service,
)
from app.services.weather_service import (
    DemoWeatherService,
)


router = APIRouter(
    prefix="/api/agriva-ai",
    tags=["AGRIVA AI"],
)


def _status_value(value) -> str | None:
    if value is None:
        return None

    enum_value = getattr(
        value,
        "value",
        value,
    )

    return str(enum_value)


def _build_farmer_context(
    *,
    db: Session,
    current_user: User,
) -> dict:
    farmer_profile = (
        db.query(FarmerProfile)
        .filter(
            FarmerProfile.user_id
            == current_user.id
        )
        .first()
    )

    if farmer_profile:
        location_parts = [
            farmer_profile.district,
            farmer_profile.state,
        ]

        location = ", ".join(
            part
            for part in location_parts
            if part
        )

        if not location:
            location = (
                farmer_profile.village
                or "Prayagraj, Uttar Pradesh"
            )
    else:
        location = "Prayagraj, Uttar Pradesh"

    weather_service = DemoWeatherService()

    weather = weather_service.get_weather(
        location=location
    )

    farms: list[Farm] = []
    fields: list[FarmField] = []
    crops: list[Crop] = []

    if farmer_profile:
        farms = (
            db.query(Farm)
            .filter(
                Farm.farmer_id
                == farmer_profile.id
            )
            .order_by(
                Farm.created_at.desc()
            )
            .limit(10)
            .all()
        )

        farm_ids = [
            farm.id
            for farm in farms
        ]

        if farm_ids:
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

        if field_ids:
            crops = (
                db.query(Crop)
                .filter(
                    Crop.field_id.in_(
                        field_ids
                    )
                )
                .order_by(
                    Crop.created_at.desc()
                )
                .limit(10)
                .all()
            )

    farm_context = [
        {
            "name": farm.name,
            "village": farm.village,
            "district": farm.district,
            "state": farm.state,
            "area_acres": (
                float(farm.total_area_acres)
                if farm.total_area_acres is not None
                else None
            ),
        }
        for farm in farms
    ]

    crop_context = [
        {
            "name": crop.name,
            "variety": crop.variety,
            "status": _status_value(
                crop.status
            ),
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
                float(
                    crop.expected_yield_kg
                )
                if crop.expected_yield_kg is not None
                else None
            ),
        }
        for crop in crops
    ]

    rain_probability = None

    if weather.forecast:
        rain_probability = (
            weather.forecast[0]
            .rain_probability_percent
        )

    return {
        "today": date.today().isoformat(),
        "farmer": {
            "name": current_user.full_name,
            "language": (
                farmer_profile.language
                if farmer_profile
                else None
            ),
        },
        "location": location,
        "weather": {
            "temperature_c": (
                weather.current.temperature_c
            ),
            "humidity_percent": (
                weather.current.humidity_percent
            ),
            "condition": (
                weather.current.condition
            ),
            "wind_speed_kmh": (
                weather.current.wind_speed_kmh
            ),
            "rain_probability": (
                rain_probability
            ),
        },
        "farms": farm_context,
        "registered_crops": crop_context,
    }


@router.post(
    "/ask",
    response_model=AGRIVAAIResponse,
)
def ask_agriva_ai(
    payload: AGRIVAAIRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_farmer
    ),
):
    context = _build_farmer_context(
        db=db,
        current_user=current_user,
    )
    context["response_language"] = (
        "Hindi"
        if payload.language == "hi"
        else "English"
    )
    service = get_agriva_ai_service()

    try:
        return service.answer(
            question=payload.question,
            context=context,
            history=payload.history,
            user_identifier=str(
                current_user.id
            ),
        )

    except AGRIVAAIServiceError as exc:
        raise HTTPException(
            status_code=(
                status.HTTP_503_SERVICE_UNAVAILABLE
            ),
            detail=str(exc),
        ) from exc
