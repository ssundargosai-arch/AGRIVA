from __future__ import annotations

from dataclasses import dataclass
from datetime import date
import json
import os
import subprocess
from typing import Any
from urllib.parse import urlencode

import httpx


OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
OPEN_METEO_GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search"
NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse"
NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search"


@dataclass
class CurrentWeather:
    temperature_c: float
    humidity_percent: float
    condition: str
    wind_speed_kmh: float
    rainfall_mm: float = 0.0


@dataclass
class WeatherForecast:
    date: date
    min_temperature_c: float
    max_temperature_c: float
    rain_probability_percent: float
    condition: str
    humidity_percent: float = 0.0
    rainfall_mm: float = 0.0
    wind_speed_kmh: float = 0.0


@dataclass
class WeatherResponse:
    location: str
    current: CurrentWeather
    forecast: list[WeatherForecast]
    source: str = "open-meteo"
    latitude: float | None = None
    longitude: float | None = None


class WeatherServiceError(RuntimeError):
    """Raised when live weather/geocoding data cannot be loaded."""


def weather_code_to_condition(
    code: int | float | None,
) -> str:
    if code is None:
        return "Unknown"

    value = int(code)

    if value == 0:
        return "Clear"
    if value in {1, 2}:
        return "Partly Cloudy"
    if value == 3:
        return "Cloudy"
    if value in {45, 48}:
        return "Fog"
    if value in {
        51, 53, 55, 56, 57,
        61, 66, 80,
    }:
        return "Light Rain"
    if value in {63, 67, 81}:
        return "Rain"
    if value in {65, 82}:
        return "Heavy Rain"
    if value in {
        71, 73, 75, 77, 85, 86,
    }:
        return "Snow"
    if value in {95, 96, 99}:
        return "Thunderstorm"

    return "Cloudy"


class LiveWeatherService:
    """
    AGRIVA live-only weather provider.

    Data sources:
    - Open-Meteo geocoding: city/location search
    - Open-Meteo forecast: current weather + 7-day forecast
    - Nominatim: fallback geocoding for smaller places and reverse geocoding

    IMPORTANT:
    No demo weather values are returned by this service.
    If live services cannot be reached, WeatherServiceError is raised.
    """

    def __init__(
        self,
        timeout_seconds: float = 45.0,
    ) -> None:
        self.timeout_seconds = timeout_seconds

    @staticmethod
    def _url(
        base_url: str,
        params: dict[str, Any],
    ) -> str:
        cleaned = {
            key: value
            for key, value in params.items()
            if value is not None
        }

        return (
            f"{base_url}?"
            f"{urlencode(cleaned, doseq=True)}"
        )

    def _httpx_json(
        self,
        url: str,
        *,
        params: dict[str, Any],
        headers: dict[str, str] | None,
    ) -> Any:
        timeout = httpx.Timeout(
            self.timeout_seconds,
            connect=self.timeout_seconds,
            read=self.timeout_seconds,
            write=30.0,
            pool=30.0,
        )

        transport = httpx.HTTPTransport(
            retries=3,
        )

        with httpx.Client(
            timeout=timeout,
            transport=transport,
            trust_env=False,
            follow_redirects=True,
        ) as client:
            response = client.get(
                url,
                params=params,
                headers=headers,
            )
            response.raise_for_status()
            return response.json()

    def _powershell_json(
        self,
        url: str,
        *,
        params: dict[str, Any],
        headers: dict[str, str] | None,
    ) -> Any:
        """
        Windows live-network fallback.

        On some Windows/Python installations OpenSSL used by httpx may
        time out during TLS negotiation while Windows Schannel works.
        PowerShell Invoke-RestMethod uses the Windows networking stack.
        This fallback still fetches LIVE data; it never returns demo data.
        """
        if os.name != "nt":
            raise WeatherServiceError(
                "Live weather network request failed."
            )

        full_url = self._url(
            url,
            params,
        )

        escaped_url = full_url.replace(
            "'",
            "''",
        )

        header_entries: list[str] = []

        for key, value in (
            headers or {}
        ).items():
            escaped_key = str(key).replace(
                "'",
                "''",
            )
            escaped_value = str(
                value
            ).replace(
                "'",
                "''",
            )

            header_entries.append(
                f"'{escaped_key}'="
                f"'{escaped_value}'"
            )

        header_literal = (
            "@{"
            + ";".join(header_entries)
            + "}"
        )

        command = (
            "$ProgressPreference="
            "'SilentlyContinue'; "
            f"$headers={header_literal}; "
            "$data=Invoke-RestMethod "
            f"-Uri '{escaped_url}' "
            "-Method Get "
            "-Headers $headers "
            f"-TimeoutSec {int(self.timeout_seconds)}; "
            "$data | ConvertTo-Json "
            "-Depth 30 -Compress"
        )

        try:
            completed = subprocess.run(
                [
                    "powershell.exe",
                    "-NoProfile",
                    "-NonInteractive",
                    "-Command",
                    command,
                ],
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
                timeout=self.timeout_seconds + 15,
                check=False,
            )
        except (
            OSError,
            subprocess.SubprocessError,
        ) as exc:
            raise WeatherServiceError(
                "Live weather network request failed."
            ) from exc

        if completed.returncode != 0:
            detail = (
                completed.stderr.strip()
                or completed.stdout.strip()
                or "PowerShell live request failed."
            )

            raise WeatherServiceError(
                f"Live weather request failed: {detail}"
            )

        payload = completed.stdout.strip()

        if not payload:
            raise WeatherServiceError(
                "Live weather service returned an empty response."
            )

        try:
            return json.loads(payload)
        except json.JSONDecodeError as exc:
            raise WeatherServiceError(
                "Unable to parse live weather response."
            ) from exc

    def _request_json(
        self,
        url: str,
        *,
        params: dict[str, Any],
        headers: dict[str, str] | None = None,
    ) -> Any:
        try:
            return self._httpx_json(
                url,
                params=params,
                headers=headers,
            )
        except (
            httpx.RequestError,
            httpx.HTTPStatusError,
            ValueError,
        ) as first_error:
            # Windows Schannel fallback for the TLS issue observed
            # on the AGRIVA development machine.
            try:
                return self._powershell_json(
                    url,
                    params=params,
                    headers=headers,
                )
            except WeatherServiceError as second_error:
                raise WeatherServiceError(
                    "Unable to load live weather data. "
                    "Check internet access and Open-Meteo availability."
                ) from second_error

    @staticmethod
    def _deduplicate_locations(
        locations: list[dict],
    ) -> list[dict]:
        seen: set[
            tuple[float, float]
        ] = set()

        unique: list[dict] = []

        for item in locations:
            try:
                key = (
                    round(
                        float(
                            item["latitude"]
                        ),
                        4,
                    ),
                    round(
                        float(
                            item["longitude"]
                        ),
                        4,
                    ),
                )
            except (
                KeyError,
                TypeError,
                ValueError,
            ):
                continue

            if key in seen:
                continue

            seen.add(key)
            unique.append(item)

        return unique

    def _search_open_meteo(
        self,
        query: str,
        *,
        language: str,
        count: int,
    ) -> list[dict]:
        try:
            data = self._request_json(
                OPEN_METEO_GEOCODING_URL,
                params={
                    "name": query,
                    "count": max(
                        1,
                        min(count, 10),
                    ),
                    "language": (
                        "hi"
                        if language == "hi"
                        else "en"
                    ),
                    "format": "json",
                },
            )
        except WeatherServiceError:
            return []

        if not isinstance(data, dict):
            return []

        results = (
            data.get("results")
            or []
        )

        locations: list[dict] = []

        for item in results:
            if not isinstance(
                item,
                dict,
            ):
                continue

            latitude = item.get(
                "latitude"
            )
            longitude = item.get(
                "longitude"
            )

            if (
                latitude is None
                or longitude is None
            ):
                continue

            parts = [
                item.get("name"),
                item.get("admin2"),
                item.get("admin1"),
                item.get("country"),
            ]

            display_name = ", ".join(
                str(part)
                for part in parts
                if part
            )

            locations.append(
                {
                    "id": item.get("id"),
                    "name": (
                        item.get("name")
                        or display_name
                    ),
                    "display_name": (
                        display_name
                    ),
                    "latitude": float(
                        latitude
                    ),
                    "longitude": float(
                        longitude
                    ),
                    "admin1": item.get(
                        "admin1"
                    ),
                    "country": item.get(
                        "country"
                    ),
                    "country_code": (
                        item.get(
                            "country_code"
                        )
                    ),
                    "timezone": (
                        item.get(
                            "timezone"
                        )
                    ),
                    "provider": (
                        "open-meteo"
                    ),
                }
            )

        return locations

    def _search_nominatim(
        self,
        query: str,
        *,
        language: str,
        count: int,
    ) -> list[dict]:
        try:
            data = self._request_json(
                NOMINATIM_SEARCH_URL,
                params={
                    "q": query,
                    "format": "jsonv2",
                    "addressdetails": 1,
                    "limit": max(
                        1,
                        min(count, 10),
                    ),
                },
                headers={
                    "User-Agent": (
                        "AGRIVA-Student-Project/1.0"
                    ),
                    "Accept-Language": (
                        "hi"
                        if language == "hi"
                        else "en"
                    ),
                },
            )
        except WeatherServiceError:
            return []

        if not isinstance(
            data,
            list,
        ):
            return []

        locations: list[dict] = []

        for index, item in enumerate(
            data
        ):
            if not isinstance(
                item,
                dict,
            ):
                continue

            try:
                latitude = float(
                    item["lat"]
                )
                longitude = float(
                    item["lon"]
                )
            except (
                KeyError,
                TypeError,
                ValueError,
            ):
                continue

            address = (
                item.get("address")
                or {}
            )

            if not isinstance(
                address,
                dict,
            ):
                address = {}

            name = (
                address.get("city")
                or address.get("town")
                or address.get("village")
                or address.get(
                    "municipality"
                )
                or address.get("suburb")
                or address.get("county")
                or item.get("name")
                or query
            )

            display_name = (
                item.get(
                    "display_name"
                )
                or str(name)
            )

            locations.append(
                {
                    "id": (
                        item.get(
                            "place_id"
                        )
                        or index
                    ),
                    "name": str(name),
                    "display_name": str(
                        display_name
                    ),
                    "latitude": latitude,
                    "longitude": longitude,
                    "admin1": (
                        address.get(
                            "state"
                        )
                    ),
                    "country": (
                        address.get(
                            "country"
                        )
                    ),
                    "country_code": (
                        address.get(
                            "country_code"
                        )
                    ),
                    "timezone": None,
                    "provider": (
                        "nominatim"
                    ),
                }
            )

        return locations

    def search_locations(
        self,
        query: str,
        *,
        language: str = "en",
        count: int = 7,
    ) -> list[dict]:
        query = query.strip()

        if len(query) < 2:
            return []

        # Open-Meteo first.
        results = self._search_open_meteo(
            query,
            language=language,
            count=count,
        )

        # Nominatim expands coverage to smaller towns,
        # villages, districts and global localities.
        if len(results) < count:
            results.extend(
                self._search_nominatim(
                    query,
                    language=language,
                    count=count,
                )
            )

        return (
            self._deduplicate_locations(
                results
            )[:count]
        )

    def _geocode_one(
        self,
        location: str,
        *,
        language: str = "en",
    ) -> tuple[
        float,
        float,
        str,
    ]:
        results = self.search_locations(
            location,
            language=language,
            count=5,
        )

        if not results:
            raise WeatherServiceError(
                f'Location "{location}" was not found.'
            )

        first = results[0]

        return (
            float(first["latitude"]),
            float(first["longitude"]),
            str(first["display_name"]),
        )

    def _reverse_geocode(
        self,
        latitude: float,
        longitude: float,
        *,
        language: str = "en",
    ) -> str:
        try:
            data = self._request_json(
                NOMINATIM_REVERSE_URL,
                params={
                    "lat": latitude,
                    "lon": longitude,
                    "format": "jsonv2",
                    "addressdetails": 1,
                    "zoom": 10,
                },
                headers={
                    "User-Agent": (
                        "AGRIVA-Student-Project/1.0"
                    ),
                    "Accept-Language": (
                        "hi"
                        if language == "hi"
                        else "en"
                    ),
                },
            )

            if isinstance(
                data,
                dict,
            ):
                address = (
                    data.get("address")
                    or {}
                )

                if not isinstance(
                    address,
                    dict,
                ):
                    address = {}

                city = (
                    address.get("city")
                    or address.get("town")
                    or address.get(
                        "village"
                    )
                    or address.get(
                        "municipality"
                    )
                    or address.get(
                        "county"
                    )
                )

                state = address.get(
                    "state"
                )
                country = address.get(
                    "country"
                )

                label = ", ".join(
                    str(part)
                    for part in (
                        city,
                        state,
                        country,
                    )
                    if part
                )

                if label:
                    return label

                display_name = data.get(
                    "display_name"
                )

                if (
                    isinstance(
                        display_name,
                        str,
                    )
                    and display_name.strip()
                ):
                    return (
                        display_name.strip()
                    )

        except WeatherServiceError:
            # Weather itself can still be live even if
            # reverse geocoding fails.
            pass

        return (
            "Current Location "
            f"({latitude:.4f}, "
            f"{longitude:.4f})"
        )

    def get_weather(
        self,
        location: str | None = None,
        *,
        latitude: float | None = None,
        longitude: float | None = None,
        language: str = "en",
    ) -> WeatherResponse:
        if (
            latitude is None
        ) != (
            longitude is None
        ):
            raise WeatherServiceError(
                "Both latitude and longitude are required."
            )

        if (
            latitude is not None
            and longitude is not None
        ):
            lat = float(latitude)
            lon = float(longitude)

            if (
                location
                and location.strip()
            ):
                location_label = (
                    location.strip()
                )
            else:
                location_label = (
                    self._reverse_geocode(
                        lat,
                        lon,
                        language=language,
                    )
                )

        else:
            requested = (
                location
                or (
                    "Prayagraj, "
                    "Uttar Pradesh"
                )
            ).strip()

            (
                lat,
                lon,
                location_label,
            ) = self._geocode_one(
                requested,
                language=language,
            )

        data = self._request_json(
            OPEN_METEO_FORECAST_URL,
            params={
                "latitude": lat,
                "longitude": lon,
                "current": (
                    "temperature_2m,"
                    "relative_humidity_2m,"
                    "precipitation,"
                    "weather_code,"
                    "wind_speed_10m"
                ),
                "daily": (
                    "weather_code,"
                    "temperature_2m_max,"
                    "temperature_2m_min,"
                    "relative_humidity_2m_mean,"
                    "precipitation_sum,"
                    "precipitation_probability_max,"
                    "wind_speed_10m_max"
                ),
                "timezone": "auto",
                "forecast_days": 7,
            },
        )

        if not isinstance(
            data,
            dict,
        ):
            raise WeatherServiceError(
                "Unexpected live weather response."
            )

        current_data = (
            data.get("current")
            or {}
        )

        daily = (
            data.get("daily")
            or {}
        )

        if not current_data:
            raise WeatherServiceError(
                "Live weather service returned no current weather."
            )

        current = CurrentWeather(
            temperature_c=float(
                current_data.get(
                    "temperature_2m"
                )
                or 0.0
            ),
            humidity_percent=float(
                current_data.get(
                    "relative_humidity_2m"
                )
                or 0.0
            ),
            condition=(
                weather_code_to_condition(
                    current_data.get(
                        "weather_code"
                    )
                )
            ),
            wind_speed_kmh=float(
                current_data.get(
                    "wind_speed_10m"
                )
                or 0.0
            ),
            rainfall_mm=float(
                current_data.get(
                    "precipitation"
                )
                or 0.0
            ),
        )

        dates = (
            daily.get("time")
            or []
        )

        min_temps = (
            daily.get(
                "temperature_2m_min"
            )
            or []
        )

        max_temps = (
            daily.get(
                "temperature_2m_max"
            )
            or []
        )

        humidities = (
            daily.get(
                "relative_humidity_2m_mean"
            )
            or []
        )

        rainfall = (
            daily.get(
                "precipitation_sum"
            )
            or []
        )

        rain_probabilities = (
            daily.get(
                "precipitation_probability_max"
            )
            or []
        )

        wind_speeds = (
            daily.get(
                "wind_speed_10m_max"
            )
            or []
        )

        weather_codes = (
            daily.get(
                "weather_code"
            )
            or []
        )

        forecast: list[WeatherForecast] = []

        for (
            index,
            day_text,
        ) in enumerate(dates):
            try:
                day_date = (
                    date.fromisoformat(
                        str(day_text)
                    )
                )
            except ValueError:
                continue

            def value_at(
                values: list,
                default: float = 0.0,
            ) -> float:
                if (
                    index >= len(values)
                    or values[index]
                    is None
                ):
                    return default

                return float(
                    values[index]
                )

            code = (
                weather_codes[index]
                if (
                    index
                    < len(
                        weather_codes
                    )
                )
                else None
            )

            forecast.append(
                WeatherForecast(
                    date=day_date,
                    min_temperature_c=(
                        value_at(
                            min_temps
                        )
                    ),
                    max_temperature_c=(
                        value_at(
                            max_temps
                        )
                    ),
                    humidity_percent=(
                        value_at(
                            humidities
                        )
                    ),
                    rainfall_mm=(
                        value_at(
                            rainfall
                        )
                    ),
                    rain_probability_percent=(
                        value_at(
                            rain_probabilities
                        )
                    ),
                    wind_speed_kmh=(
                        value_at(
                            wind_speeds
                        )
                    ),
                    condition=(
                        weather_code_to_condition(
                            code
                        )
                    ),
                )
            )

        if not forecast:
            raise WeatherServiceError(
                "Live weather service returned no forecast."
            )

        return WeatherResponse(
            location=location_label,
            current=current,
            forecast=forecast,
            source="open-meteo",
            latitude=lat,
            longitude=lon,
        )


class DemoWeatherService:
    """
    Backward-compatible class name only.

    Older AGRIVA modules may import DemoWeatherService.
    It now returns LIVE weather through LiveWeatherService.
    No hard-coded demo weather is used.
    """

    def get_weather(
        self,
        location: str,
    ) -> WeatherResponse:
        return LiveWeatherService().get_weather(
            location=location
        )
