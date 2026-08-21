from datetime import date, timedelta
from typing import Protocol

from app.schemas.weather import (
    AgriculturalAlert,
    FarmerWeatherResponse,
    WeatherCurrent,
    WeatherForecastDay,
)


class WeatherService(Protocol):
    def get_weather(
        self,
        *,
        location: str,
    ) -> FarmerWeatherResponse:
        ...


class DemoWeatherService:
    def get_weather(
        self,
        *,
        location: str,
    ) -> FarmerWeatherResponse:
        today = date.today()

        forecast_data = [
            {
                "min": 24,
                "max": 33,
                "humidity": 68,
                "rainfall": 2.5,
                "rain_probability": 35,
                "wind": 11,
                "condition": "Partly Cloudy",
            },
            {
                "min": 23,
                "max": 31,
                "humidity": 78,
                "rainfall": 12.0,
                "rain_probability": 75,
                "wind": 15,
                "condition": "Rain",
            },
            {
                "min": 24,
                "max": 32,
                "humidity": 72,
                "rainfall": 6.0,
                "rain_probability": 55,
                "wind": 18,
                "condition": "Light Rain",
            },
            {
                "min": 25,
                "max": 35,
                "humidity": 59,
                "rainfall": 0.0,
                "rain_probability": 10,
                "wind": 21,
                "condition": "Sunny",
            },
            {
                "min": 24,
                "max": 36,
                "humidity": 52,
                "rainfall": 0.0,
                "rain_probability": 5,
                "wind": 28,
                "condition": "Hot and Windy",
            },
        ]

        forecast: list[WeatherForecastDay] = []

        for index, item in enumerate(
            forecast_data
        ):
            forecast.append(
                WeatherForecastDay(
                    date=(
                        today
                        + timedelta(days=index)
                    ),
                    min_temperature_c=item[
                        "min"
                    ],
                    max_temperature_c=item[
                        "max"
                    ],
                    humidity_percent=item[
                        "humidity"
                    ],
                    rainfall_mm=item[
                        "rainfall"
                    ],
                    rain_probability_percent=item[
                        "rain_probability"
                    ],
                    wind_kph=item["wind"],
                    condition=item[
                        "condition"
                    ],
                )
            )

        current = WeatherCurrent(
            temperature_c=31.0,
            humidity_percent=66.0,
            rainfall_mm=1.2,
            wind_kph=12.0,
            condition="Partly Cloudy",
        )

        alerts = self._build_alerts(
            current=current,
            forecast=forecast,
        )

        return FarmerWeatherResponse(
            location=location,
            source="demo",
            current=current,
            forecast=forecast,
            alerts=alerts,
        )

    def _build_alerts(
        self,
        *,
        current: WeatherCurrent,
        forecast: list[
            WeatherForecastDay
        ],
    ) -> list[AgriculturalAlert]:
        alerts: list[
            AgriculturalAlert
        ] = []

        if any(
            day.rain_probability_percent
            >= 70
            for day in forecast
        ):
            alerts.append(
                AgriculturalAlert(
                    alert_type="rain",
                    severity="medium",
                    title="Rain Alert",
                    message=(
                        "High chance of rain. "
                        "Delay irrigation and "
                        "protect harvested crops."
                    ),
                )
            )

        if any(
            day.max_temperature_c
            >= 35
            for day in forecast
        ):
            alerts.append(
                AgriculturalAlert(
                    alert_type="heat",
                    severity="high",
                    title="Heat Alert",
                    message=(
                        "High temperature expected. "
                        "Irrigate early morning or "
                        "late evening."
                    ),
                )
            )

        if any(
            day.min_temperature_c
            <= 5
            for day in forecast
        ):
            alerts.append(
                AgriculturalAlert(
                    alert_type="frost",
                    severity="high",
                    title="Frost Alert",
                    message=(
                        "Frost risk detected. "
                        "Protect sensitive crops."
                    ),
                )
            )

        if any(
            day.wind_kph >= 25
            for day in forecast
        ):
            alerts.append(
                AgriculturalAlert(
                    alert_type="strong_wind",
                    severity="medium",
                    title="Strong Wind Alert",
                    message=(
                        "Strong winds expected. "
                        "Avoid spraying pesticides "
                        "during windy conditions."
                    ),
                )
            )

        return alerts