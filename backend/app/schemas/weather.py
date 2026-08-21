from datetime import date

from pydantic import BaseModel


class WeatherCurrent(BaseModel):
    temperature_c: float
    humidity_percent: float
    rainfall_mm: float
    wind_kph: float
    condition: str


class WeatherForecastDay(BaseModel):
    date: date
    min_temperature_c: float
    max_temperature_c: float
    humidity_percent: float
    rainfall_mm: float
    rain_probability_percent: float
    wind_kph: float
    condition: str


class AgriculturalAlert(BaseModel):
    alert_type: str
    severity: str
    title: str
    message: str


class FarmerWeatherResponse(BaseModel):
    location: str
    source: str
    current: WeatherCurrent
    forecast: list[WeatherForecastDay]
    alerts: list[AgriculturalAlert]