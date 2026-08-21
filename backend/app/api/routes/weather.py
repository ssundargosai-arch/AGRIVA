from fastapi import (
    APIRouter,
    Depends,
)

from app.core.dependencies import (
    require_farmer,
)
from app.models.user import User
from app.schemas.weather import (
    FarmerWeatherResponse,
)
from app.services.weather_service import (
    DemoWeatherService,
)


router = APIRouter(
    prefix="/api/weather",
    tags=["Weather"],
)


@router.get(
    "/farmer",
    response_model=FarmerWeatherResponse,
)
def get_farmer_weather(
    current_user: User = Depends(
        require_farmer
    ),
):
    service = DemoWeatherService()

    return service.get_weather(
        location="Prayagraj, Uttar Pradesh"
    )