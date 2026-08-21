from fastapi import (
    APIRouter,
    Depends,
)

from sqlalchemy.orm import Session

from app.core.dependencies import (
    require_farmer,
)
from app.db.session import get_db
from app.models.user import User
from app.schemas.agriva_ai import (
    AGRIVAAIRequest,
    AGRIVAAIResponse,
)
from app.services.agriva_ai_service import (
    DemoAIService,
)
from app.services.weather_service import (
    DemoWeatherService,
)


router = APIRouter(
    prefix="/api/agriva-ai",
    tags=["AGRIVA AI"],
)


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
    weather_service = (
        DemoWeatherService()
    )

    weather = (
        weather_service.get_weather(
            location=(
                "Prayagraj, "
                "Uttar Pradesh"
            )
        )
    )

    context = {
        "weather": {
            "temperature_c": (
                weather.current
                .temperature_c
            ),
            "humidity_percent": (
                weather.current
                .humidity_percent
            ),
            "rain_probability": (
                weather.forecast[0]
                .rain_probability_percent
            ),
        },

        # Add richer DB-backed
        # context in later Phase 12 steps.
        "soil": True,
        "crops": True,
        "farm": True,
        "market": True,
        "orders": True,
    }

    service = DemoAIService()

    return service.answer(
        question=payload.question,
        context=context,
    )