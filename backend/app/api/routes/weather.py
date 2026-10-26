from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
)

from app.core.dependencies import require_farmer
from app.models.user import User
from app.services.weather_service import (
    LiveWeatherService,
    WeatherResponse,
    WeatherServiceError,
)


router = APIRouter(
    prefix="/api/weather",
    tags=["Weather"],
)


def _build_alerts(
    weather: WeatherResponse,
) -> list[dict[str, str]]:
    alerts: list[
        dict[str, str]
    ] = []

    current = weather.current
    today = weather.forecast[0]

    if current.temperature_c >= 35:
        alerts.append(
            {
                "alert_type": "heat",
                "severity": "warning",
                "title": "Heat Alert",
                "message": (
                    "High temperature detected. "
                    "Prefer irrigation during cooler hours."
                ),
            }
        )

    if (
        today.rain_probability_percent
        >= 60
    ):
        alerts.append(
            {
                "alert_type": "rain",
                "severity": "warning",
                "title": "Rain Alert",
                "message": (
                    "High chance of rain. "
                    "Avoid pesticide spraying before rainfall."
                ),
            }
        )

    if current.wind_speed_kmh >= 25:
        alerts.append(
            {
                "alert_type": "wind",
                "severity": "warning",
                "title": "Wind Alert",
                "message": (
                    "Strong winds detected. "
                    "Avoid spraying operations."
                ),
            }
        )

    if not alerts:
        alerts.append(
            {
                "alert_type": "general",
                "severity": "info",
                "title": "Farm Weather",
                "message": (
                    "Current live weather conditions are "
                    "suitable for normal farm activities."
                ),
            }
        )

    return alerts


def _load_live_weather(
    *,
    location: str | None,
    latitude: float | None,
    longitude: float | None,
    language: str,
) -> WeatherResponse:
    try:
        return (
            LiveWeatherService()
            .get_weather(
                location=location,
                latitude=latitude,
                longitude=longitude,
                language=language,
            )
        )
    except WeatherServiceError as exc:
        # LIVE ONLY:
        # no demo fallback is returned.
        raise HTTPException(
            status_code=503,
            detail=str(exc),
        ) from exc


def _serialize_current(
    weather: WeatherResponse,
) -> dict:
    current = weather.current

    return {
        "temperature_c": (
            current.temperature_c
        ),
        "humidity_percent": (
            current.humidity_percent
        ),
        "rainfall_mm": (
            current.rainfall_mm
        ),
        "wind_kph": (
            current.wind_speed_kmh
        ),
        "wind_speed_kmh": (
            current.wind_speed_kmh
        ),
        "condition": (
            current.condition
        ),
    }


def _serialize_forecast(
    weather: WeatherResponse,
) -> list[dict]:
    return [
        {
            "date": (
                item.date.isoformat()
            ),
            "min_temperature_c": (
                item.min_temperature_c
            ),
            "max_temperature_c": (
                item.max_temperature_c
            ),
            "humidity_percent": (
                item.humidity_percent
            ),
            "rainfall_mm": (
                item.rainfall_mm
            ),
            "rain_probability_percent": (
                item.rain_probability_percent
            ),
            "wind_kph": (
                item.wind_speed_kmh
            ),
            "wind_speed_kmh": (
                item.wind_speed_kmh
            ),
            "condition": (
                item.condition
            ),
        }
        for item
        in weather.forecast
    ]


@router.get("/search")
def search_weather_locations(
    q: str = Query(
        min_length=2,
        max_length=150,
    ),
    language: str = Query(
        default="en",
        pattern="^(en|hi)$",
    ),
    current_user: User = Depends(
        require_farmer
    ),
):
    del current_user

    try:
        results = (
            LiveWeatherService()
            .search_locations(
                q,
                language=language,
                count=7,
            )
        )
    except WeatherServiceError as exc:
        raise HTTPException(
            status_code=503,
            detail=str(exc),
        ) from exc

    return {
        "query": q,
        "source": "live-geocoding",
        "results": results,
    }


@router.get("/current")
def get_current_weather(
    location: str | None = Query(
        default=None,
        max_length=200,
    ),
    latitude: float | None = Query(
        default=None,
        ge=-90,
        le=90,
    ),
    longitude: float | None = Query(
        default=None,
        ge=-180,
        le=180,
    ),
    language: str = Query(
        default="en",
        pattern="^(en|hi)$",
    ),
    current_user: User = Depends(
        require_farmer
    ),
):
    del current_user

    weather = _load_live_weather(
        location=location,
        latitude=latitude,
        longitude=longitude,
        language=language,
    )

    return {
        "location": weather.location,
        "source": weather.source,
        "latitude": weather.latitude,
        "longitude": weather.longitude,
        "current": (
            _serialize_current(
                weather
            )
        ),
    }


@router.get("/forecast")
def get_weather_forecast(
    location: str | None = Query(
        default=None,
        max_length=200,
    ),
    latitude: float | None = Query(
        default=None,
        ge=-90,
        le=90,
    ),
    longitude: float | None = Query(
        default=None,
        ge=-180,
        le=180,
    ),
    language: str = Query(
        default="en",
        pattern="^(en|hi)$",
    ),
    current_user: User = Depends(
        require_farmer
    ),
):
    del current_user

    weather = _load_live_weather(
        location=location,
        latitude=latitude,
        longitude=longitude,
        language=language,
    )

    return {
        "location": weather.location,
        "source": weather.source,
        "latitude": weather.latitude,
        "longitude": weather.longitude,
        "forecast": (
            _serialize_forecast(
                weather
            )
        ),
    }


@router.get("/alerts")
def get_weather_alerts(
    location: str | None = Query(
        default=None,
        max_length=200,
    ),
    latitude: float | None = Query(
        default=None,
        ge=-90,
        le=90,
    ),
    longitude: float | None = Query(
        default=None,
        ge=-180,
        le=180,
    ),
    language: str = Query(
        default="en",
        pattern="^(en|hi)$",
    ),
    current_user: User = Depends(
        require_farmer
    ),
):
    del current_user

    weather = _load_live_weather(
        location=location,
        latitude=latitude,
        longitude=longitude,
        language=language,
    )

    return {
        "location": weather.location,
        "source": weather.source,
        "alerts": (
            _build_alerts(
                weather
            )
        ),
    }


@router.get("/farmer")
def get_farmer_weather(
    location: str | None = Query(
        default=None,
        max_length=200,
    ),
    latitude: float | None = Query(
        default=None,
        ge=-90,
        le=90,
    ),
    longitude: float | None = Query(
        default=None,
        ge=-180,
        le=180,
    ),
    language: str = Query(
        default="en",
        pattern="^(en|hi)$",
    ),
    current_user: User = Depends(
        require_farmer
    ),
):
    del current_user

    weather = _load_live_weather(
        location=location,
        latitude=latitude,
        longitude=longitude,
        language=language,
    )

    return {
        "location": weather.location,
        "source": weather.source,
        "latitude": weather.latitude,
        "longitude": weather.longitude,
        "current": (
            _serialize_current(
                weather
            )
        ),
        "forecast": (
            _serialize_forecast(
                weather
            )
        ),
        "alerts": (
            _build_alerts(
                weather
            )
        ),
    }
