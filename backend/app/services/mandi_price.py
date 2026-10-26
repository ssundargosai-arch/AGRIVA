from __future__ import annotations

import json
import os
import time
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path
from statistics import median
from threading import Lock
from typing import Any

import httpx
from dotenv import load_dotenv


# =========================================================
# PATHS / ENVIRONMENT
# =========================================================

BACKEND_ROOT = (
    Path(__file__)
    .resolve()
    .parents[2]
)

ENV_FILE = BACKEND_ROOT / ".env"

load_dotenv(
    dotenv_path=ENV_FILE,
    override=False,
)


DATA_GOV_API_URL = (
    "https://api.data.gov.in/resource/"
    "9ef84268-d588-465a-a308-a864a43d0070"
)


LOCATION_GEOCODER_URL = os.getenv(
    "LOCATION_GEOCODER_URL",
    "https://nominatim.openstreetmap.org/search",
).strip()


# =========================================================
# ERRORS
# =========================================================

class MandiPriceError(Exception):
    """Base error for mandi-price integration."""


class MandiAuthError(MandiPriceError):
    """Raised for invalid/rejected Government API credentials."""


class MandiServiceUnavailableError(
    MandiPriceError
):
    """Raised when the Government service is temporarily unavailable."""


# =========================================================
# RESULT
# =========================================================

@dataclass(slots=True)
class MandiPriceResult:
    commodity: str

    state: str | None
    district: str | None
    market: str | None

    variety: str | None
    grade: str | None

    arrival_date: str | None

    min_price: float | None
    max_price: float | None

    modal_price: float

    source: str = (
        "AGMARKNET / data.gov.in"
    )

    unit: str = "INR/quintal"

    # LIVE or CACHED
    data_mode: str = "LIVE"

    # DISTRICT / MARKET / STATE
    match_level: str = "DISTRICT"

    # ISO timestamp when cached data was saved.
    cached_at: str | None = None


@dataclass(frozen=True, slots=True)
class ResolvedIndiaLocation:
    """
    Best-effort India location resolution result.

    This object only resolves farmer-entered location text
    to district/state context. It is never used as a market
    price source.
    """

    query: str
    district: str | None
    state: str | None
    display_name: str | None = None
    source: str = "OpenStreetMap Nominatim"


# =========================================================
# COMMODITY NORMALIZATION
# =========================================================

COMMODITY_NAMES = {
    "wheat": "Wheat",
    "rice": "Rice",
    "paddy": "Paddy(Dhan)(Common)",
    "maize": "Maize",
    "corn": "Maize",
    "potato": "Potato",
    "tomato": "Tomato",
    "onion": "Onion",
    "soybean": "Soyabean",
    "soyabean": "Soyabean",
    "mustard": "Mustard",
    "cotton": "Cotton",
    "sugarcane": "Sugarcane",
}


FARMER_COMMODITY_ALIASES = {
    # English aliases / common spelling variants
    "turmeric": "Turmeric",
    "haldi": "Turmeric",
    "chilli": "Chilly Capsicum",
    "chili": "Chilly Capsicum",
    "green chilli": "Green Chilli",
    "red chilli": "Dry Chillies",
    "dry chilli": "Dry Chillies",
    "chickpea": "Bengal Gram(Gram)(Whole)",
    "gram": "Bengal Gram(Gram)(Whole)",
    "chana": "Bengal Gram(Gram)(Whole)",
    "groundnut": "Ground Nut Seed",
    "peanut": "Ground Nut Seed",
    "bajra": "Bajra(Pearl Millet/Cumbu)",
    "pearl millet": "Bajra(Pearl Millet/Cumbu)",
    "jowar": "Jowar(Sorghum)",
    "sorghum": "Jowar(Sorghum)",

    # Hindi / Marathi farmer-entered aliases
    "गेहूं": "Wheat",
    "गहू": "Wheat",
    "धान": "Paddy(Dhan)(Common)",
    "चावल": "Rice",
    "तांदूळ": "Rice",
    "मक्का": "Maize",
    "मका": "Maize",
    "आलू": "Potato",
    "बटाटा": "Potato",
    "टमाटर": "Tomato",
    "टोमॅटो": "Tomato",
    "प्याज": "Onion",
    "प्याज़": "Onion",
    "कांदा": "Onion",
    "सोयाबीन": "Soyabean",
    "सरसों": "Mustard",
    "मोहरी": "Mustard",
    "कपास": "Cotton",
    "कापूस": "Cotton",
    "गन्ना": "Sugarcane",
    "ऊस": "Sugarcane",
    "हल्दी": "Turmeric",
    "हळद": "Turmeric",
}


# =========================================================
# CACHE
# =========================================================

_CACHE_LOCK = Lock()


def _env_flag(
    name: str,
    default: str,
) -> bool:
    return (
        os.getenv(
            name,
            default,
        )
        .strip()
        .lower()
        in {
            "1",
            "true",
            "yes",
            "on",
        }
    )


def _env_float(
    name: str,
    default: float,
    *,
    minimum: float,
) -> float:
    raw = os.getenv(
        name,
        str(default),
    ).strip()

    try:
        value = float(raw)

    except ValueError:
        return default

    return max(
        value,
        minimum,
    )


def _env_int(
    name: str,
    default: int,
    *,
    minimum: int,
    maximum: int,
) -> int:
    raw = os.getenv(
        name,
        str(default),
    ).strip()

    try:
        value = int(raw)

    except ValueError:
        return default

    return max(
        minimum,
        min(
            value,
            maximum,
        ),
    )


def _cache_path() -> Path:
    configured = os.getenv(
        "MANDI_CACHE_FILE",
        "",
    ).strip()

    if configured:
        return Path(configured)

    return (
        BACKEND_ROOT
        / ".cache"
        / "mandi_price_cache.json"
    )


def _cache_max_age() -> float:
    # Default: 3 days
    return _env_float(
        "MANDI_CACHE_MAX_AGE_SECONDS",
        259200.0,
        minimum=60.0,
    )


def _cache_enabled() -> bool:
    return _env_flag(
        "MANDI_CACHE_ENABLED",
        "true",
    )


def _cache_key(
    *,
    commodity: str,
    location: str,
    state: str | None,
) -> str:
    values = [
        commodity.strip().casefold(),
        location.strip().casefold(),
        (
            state.strip().casefold()
            if state
            else ""
        ),
    ]

    return "|".join(values)


def _read_cache_payload() -> dict[str, Any]:
    path = _cache_path()

    if not path.exists():
        return {
            "version": 1,
            "entries": {},
        }

    try:
        with path.open(
            "r",
            encoding="utf-8",
        ) as file:
            payload = json.load(file)

    except (
        OSError,
        ValueError,
        TypeError,
    ):
        return {
            "version": 1,
            "entries": {},
        }

    if not isinstance(
        payload,
        dict,
    ):
        return {
            "version": 1,
            "entries": {},
        }

    entries = payload.get(
        "entries"
    )

    if not isinstance(
        entries,
        dict,
    ):
        payload["entries"] = {}

    return payload


def _save_cached_result(
    *,
    commodity: str,
    location: str,
    state: str | None,
    result: MandiPriceResult,
) -> None:
    if not _cache_enabled():
        return

    key = _cache_key(
        commodity=commodity,
        location=location,
        state=state,
    )

    path = _cache_path()

    try:
        path.parent.mkdir(
            parents=True,
            exist_ok=True,
        )

        with _CACHE_LOCK:
            payload = (
                _read_cache_payload()
            )

            entries = payload.setdefault(
                "entries",
                {},
            )

            entries[key] = {
                "saved_at": time.time(),
                "result": asdict(
                    result
                ),
            }

            temporary = (
                path.with_suffix(
                    path.suffix
                    + ".tmp"
                )
            )

            with temporary.open(
                "w",
                encoding="utf-8",
            ) as file:
                json.dump(
                    payload,
                    file,
                    ensure_ascii=False,
                    indent=2,
                )

            os.replace(
                temporary,
                path,
            )

    except OSError:
        # Cache failure must never break
        # the main price prediction.
        return


def _load_cached_result(
    *,
    commodity: str,
    location: str,
    state: str | None,
) -> MandiPriceResult | None:
    if not _cache_enabled():
        return None

    key = _cache_key(
        commodity=commodity,
        location=location,
        state=state,
    )

    payload = _read_cache_payload()

    entries = payload.get(
        "entries",
        {},
    )

    if not isinstance(
        entries,
        dict,
    ):
        return None

    entry = entries.get(key)

    if not isinstance(
        entry,
        dict,
    ):
        return None

    saved_at_raw = entry.get(
        "saved_at"
    )

    try:
        saved_at = float(
            saved_at_raw
        )

    except (
        TypeError,
        ValueError,
    ):
        return None

    age = (
        time.time()
        - saved_at
    )

    if age < 0:
        age = 0

    if age > _cache_max_age():
        return None

    raw_result = entry.get(
        "result"
    )

    if not isinstance(
        raw_result,
        dict,
    ):
        return None

    modal_price = parse_price(
        raw_result.get(
            "modal_price"
        )
    )

    if modal_price is None:
        return None

    cached_at = (
        datetime.fromtimestamp(
            saved_at,
            tz=timezone.utc,
        )
        .isoformat()
    )

    return MandiPriceResult(
        commodity=str(
            raw_result.get(
                "commodity",
                commodity,
            )
        ),

        state=_optional_text(
            raw_result.get(
                "state"
            )
        ),

        district=_optional_text(
            raw_result.get(
                "district"
            )
        ),

        market=_optional_text(
            raw_result.get(
                "market"
            )
        ),

        variety=_optional_text(
            raw_result.get(
                "variety"
            )
        ),

        grade=_optional_text(
            raw_result.get(
                "grade"
            )
        ),

        arrival_date=(
            _optional_text(
                raw_result.get(
                    "arrival_date"
                )
            )
        ),

        min_price=parse_price(
            raw_result.get(
                "min_price"
            )
        ),

        max_price=parse_price(
            raw_result.get(
                "max_price"
            )
        ),

        modal_price=modal_price,

        source=str(
            raw_result.get(
                "source",
                (
                    "AGMARKNET / "
                    "data.gov.in"
                ),
            )
        ),

        unit=str(
            raw_result.get(
                "unit",
                "INR/quintal",
            )
        ),

        data_mode="CACHED",

        match_level=str(
            raw_result.get(
                "match_level",
                "DISTRICT",
            )
        ),

        cached_at=cached_at,
    )


# =========================================================
# NORMALIZATION
# =========================================================

def normalize_commodity(
    crop: str,
) -> str:
    cleaned = crop.strip()

    if not cleaned:
        raise MandiPriceError(
            "Crop name is required."
        )

    key = cleaned.casefold()

    return (
        COMMODITY_NAMES.get(key)
        or FARMER_COMMODITY_ALIASES.get(key)
        or cleaned.title()
    )


def normalize_location(
    location: str,
) -> str:
    cleaned = " ".join(
        location.strip().split()
    )

    if not cleaned:
        raise MandiPriceError(
            "Market or location is required."
        )

    return cleaned.title()


MAHARASHTRA_DISTRICTS = {
    "ahilyanagar",
    "akola",
    "amravati",
    "beed",
    "bhandara",
    "buldhana",
    "chandrapur",
    "chhatrapati sambhajinagar",
    "dharashiv",
    "dhule",
    "gadchiroli",
    "gondia",
    "hingoli",
    "jalgaon",
    "jalna",
    "kolhapur",
    "latur",
    "mumbai city",
    "mumbai suburban",
    "nagpur",
    "nanded",
    "nandurbar",
    "nashik",
    "palghar",
    "parbhani",
    "pune",
    "raigad",
    "ratnagiri",
    "sangli",
    "satara",
    "sindhudurg",
    "solapur",
    "thane",
    "wardha",
    "washim",
    "yavatmal",
}

MAHARASHTRA_MARKET_DISTRICT = {
    "lasalgaon": "Nashik",
    "yeola": "Nashik",
    "pimpalgaon": "Nashik",
    "pimpalgaon baswant": "Nashik",
    "malegaon": "Nashik",

    "baramati": "Pune",
    "indapur": "Pune",
    "manchar": "Pune",

    "kopargaon": "Ahilyanagar",
    "rahuri": "Ahilyanagar",
    "sangamner": "Ahilyanagar",

    "akluj": "Solapur",
    "pandharpur": "Solapur",

    "ichalkaranji": "Kolhapur",
    "jaysingpur": "Kolhapur",

    "tasgaon": "Sangli",
    "islampur": "Sangli",
}


def resolve_maharashtra_location(
    location: str,
) -> tuple[str | None, str | None]:
    normalized = " ".join(
        location.strip().split()
    )

    key = normalized.casefold()

    if key in MAHARASHTRA_DISTRICTS:
        return (
            normalized.title(),
            "Maharashtra",
        )

    district = MAHARASHTRA_MARKET_DISTRICT.get(
        key
    )

    if district:
        return (
            district,
            "Maharashtra",
        )

    return (
        None,
        None,
    )


def split_location_state(
    location: str,
) -> tuple[str, str | None]:
    raw_parts = [
        part.strip()
        for part in location.split(",")
        if part.strip()
    ]

    if not raw_parts:
        raise MandiPriceError(
            "Market or location is required."
        )

    location_name = normalize_location(
        raw_parts[0]
    )

    # Explicit state always wins.
    if len(raw_parts) >= 2:
        explicit_state = " ".join(
            raw_parts[1:]
        ).title()

        return (
            location_name,
            explicit_state,
        )

    # Maharashtra-focused AGRIVA resolver.
    _, detected_state = (
        resolve_maharashtra_location(
            location_name
        )
    )

    return (
        location_name,
        detected_state,
    )


def _geocoder_enabled() -> bool:
    return _env_flag(
        "LOCATION_GEOCODER_ENABLED",
        "true",
    )


def _clean_district_name(
    value: Any,
) -> str | None:
    if value is None:
        return None

    text = str(value).strip()

    if not text:
        return None

    suffixes = (
        " district",
        " ज़िला",
        " जिल्हा",
    )

    lowered = text.casefold()

    for suffix in suffixes:
        if lowered.endswith(
            suffix.casefold()
        ):
            text = text[
                : -len(suffix)
            ].strip()
            break

    return text or None


def _location_from_geocoder_payload(
    payload: Any,
    *,
    query: str,
) -> ResolvedIndiaLocation | None:
    if (
        not isinstance(payload, list)
        or not payload
        or not isinstance(payload[0], dict)
    ):
        return None

    first = payload[0]

    address = first.get(
        "address",
        {},
    )

    if not isinstance(
        address,
        dict,
    ):
        address = {}

    district = (
        address.get("state_district")
        or address.get("district")
        or address.get("county")
    )

    state = (
        address.get("state")
        or address.get("region")
    )

    cleaned_district = (
        _clean_district_name(
            district
        )
    )

    cleaned_state = (
        str(state).strip()
        if state is not None
        else None
    )

    if not cleaned_state:
        cleaned_state = None

    if (
        cleaned_district is None
        and cleaned_state is None
    ):
        return None

    display_name = first.get(
        "display_name"
    )

    if display_name is not None:
        display_name = str(
            display_name
        ).strip() or None

    return ResolvedIndiaLocation(
        query=query,
        district=cleaned_district,
        state=cleaned_state,
        display_name=display_name,
    )


@lru_cache(maxsize=256)
def resolve_india_location(
    location: str,
) -> ResolvedIndiaLocation | None:
    """
    Resolve village/city/PIN/free-text India locations to
    district/state context.

    The geocoder is used ONLY for location resolution.
    Market prices still come only from AGMARKNET/data.gov.in.
    """

    if not _geocoder_enabled():
        return None

    query = " ".join(
        location.strip().split()
    )

    if not query:
        return None

    if not LOCATION_GEOCODER_URL:
        return None

    timeout = httpx.Timeout(
        connect=_env_float(
            "LOCATION_GEOCODER_CONNECT_TIMEOUT",
            3.0,
            minimum=1.0,
        ),
        read=_env_float(
            "LOCATION_GEOCODER_READ_TIMEOUT",
            5.0,
            minimum=2.0,
        ),
        write=5.0,
        pool=5.0,
    )

    params = {
        "q": query,
        "format": "jsonv2",
        "addressdetails": 1,
        "limit": 1,
        "countrycodes": "in",
    }

    try:
        with httpx.Client(
            timeout=timeout,
            follow_redirects=True,
            headers={
                "Accept": "application/json",
                "User-Agent": (
                    "AGRIVA/1.0 "
                    "(India agricultural price intelligence)"
                ),
            },
        ) as client:
            response = client.get(
                LOCATION_GEOCODER_URL,
                params=params,
            )

            response.raise_for_status()

            payload = response.json()

    except (
        httpx.HTTPError,
        ValueError,
        TypeError,
    ):
        # Location resolution is best-effort and must
        # never make price prediction unavailable.
        return None

    return _location_from_geocoder_payload(
        payload,
        query=query,
    )


def _optional_text(
    value: Any,
) -> str | None:
    if value is None:
        return None

    cleaned = str(
        value
    ).strip()

    return (
        cleaned
        if cleaned
        else None
    )


# =========================================================
# PARSING
# =========================================================

def parse_price(
    value: Any,
) -> float | None:
    if value is None:
        return None

    text = str(
        value
    ).strip()

    if not text:
        return None

    try:
        number = float(text)

    except (
        TypeError,
        ValueError,
    ):
        return None

    if number <= 0:
        return None

    return number


def parse_date(
    value: str | None,
) -> datetime:
    if not value:
        return datetime.min

    value = value.strip()

    formats = (
        "%d/%m/%Y",
        "%d-%m-%Y",
        "%Y-%m-%d",
        "%Y/%m/%d",
    )

    for date_format in formats:
        try:
            return datetime.strptime(
                value,
                date_format,
            )

        except ValueError:
            continue

    return datetime.min


# =========================================================
# RECORD MATCHING
# =========================================================

def record_matches_location(
    record: dict[str, Any],
    location: str,
) -> bool:
    expected = (
        location
        .strip()
        .casefold()
    )

    market = str(
        record.get(
            "market",
            "",
        )
    ).strip().casefold()

    district = str(
        record.get(
            "district",
            "",
        )
    ).strip().casefold()

    return (
        expected == market
        or expected == district
        or expected in market
        or expected in district
    )


def choose_latest_record(
    records: list[
        dict[str, Any]
    ],
    location: str,
) -> dict[str, Any] | None:
    if not records:
        return None

    matching_records = [
        record
        for record in records
        if record_matches_location(
            record,
            location,
        )
    ]

    valid_records = [
        record
        for record in matching_records
        if parse_price(
            record.get(
                "modal_price"
            )
        )
        is not None
    ]

    if not valid_records:
        return None

    return max(
        valid_records,
        key=lambda record: (
            parse_date(
                _optional_text(
                    record.get(
                        "arrival_date"
                    )
                )
            )
        ),
    )


# =========================================================
# GOVERNMENT API
# =========================================================

def request_records(
    *,
    api_key: str,
    commodity: str | None,
    location: str,
    location_field: str,
    limit: int = 50,
) -> list[dict[str, Any]]:

    params = {
        "api-key": api_key,
        "format": "json",
        "offset": 0,
        "limit": limit,
    }

    if commodity:
        params["filters[commodity]"] = (
            commodity
        )

    params[
        f"filters[{location_field}]"
    ] = location

    timeout = httpx.Timeout(
        connect=_env_float(
            "MANDI_API_CONNECT_TIMEOUT",
            4.0,
            minimum=1.0,
        ),

        read=_env_float(
            "MANDI_API_READ_TIMEOUT",
            6.0,
            minimum=2.0,
        ),

        write=5.0,
        pool=5.0,
    )

    attempts = _env_int(
        "MANDI_API_MAX_ATTEMPTS",
        2,
        minimum=1,
        maximum=3,
    )

    last_exception: (
        Exception | None
    ) = None

    with httpx.Client(
        timeout=timeout,
        follow_redirects=True,
        headers={
            "Accept":
                "application/json",

            "User-Agent":
                "AGRIVA/1.0",
        },
    ) as client:

        for attempt in range(
            attempts
        ):
            try:
                response = client.get(
                    DATA_GOV_API_URL,
                    params=params,
                )

                response.raise_for_status()

                try:
                    payload = (
                        response.json()
                    )

                except ValueError as exc:
                    raise MandiPriceError(
                        "Government mandi-price "
                        "service returned invalid "
                        "JSON data."
                    ) from exc

                if not isinstance(
                    payload,
                    dict,
                ):
                    raise MandiPriceError(
                        "Government mandi-price "
                        "service returned an "
                        "unexpected response."
                    )

                records = payload.get(
                    "records",
                    [],
                )

                if not isinstance(
                    records,
                    list,
                ):
                    return []

                return [
                    record
                    for record
                    in records
                    if isinstance(
                        record,
                        dict,
                    )
                ]

            except (
                httpx.TimeoutException
            ) as exc:
                last_exception = exc

            except (
                httpx.HTTPStatusError
            ) as exc:
                status_code = (
                    exc
                    .response
                    .status_code
                )

                if status_code in {
                    401,
                    403,
                }:
                    raise MandiAuthError(
                        "Government mandi API "
                        "rejected the API key."
                    ) from exc

                if (
                    status_code == 429
                    or status_code >= 500
                ):
                    last_exception = exc

                else:
                    raise MandiPriceError(
                        "Government mandi-price "
                        "service returned HTTP "
                        f"{status_code}."
                    ) from exc

            except (
                httpx.RequestError
            ) as exc:
                last_exception = exc

            # Short controlled backoff.
            if (
                attempt
                < attempts - 1
            ):
                time.sleep(
                    0.5
                    * (
                        2 ** attempt
                    )
                )

    raise (
        MandiServiceUnavailableError(
            "Government mandi-price "
            "service is temporarily "
            "unavailable."
        )
    ) from last_exception


def _resolve_location_record(
    *,
    api_key: str,
    location: str,
) -> dict[str, Any] | None:
    """
    Resolve a farmer-entered district or
    market using Government mandi data.

    Commodity is intentionally omitted
    so location detection does not fail
    just because the selected crop has
    no current record at that location.
    """

    for location_field in (
        "district",
        "market",
    ):
        records = request_records(
            api_key=api_key,
            commodity=None,
            location=location,
            location_field=location_field,
            limit=100,
        )

        record = choose_latest_record(
            records,
            location,
        )

        if record is not None:
            return record

    return None


# =========================================================
# RESULT BUILDERS
# =========================================================

def _result_from_record(
    *,
    record: dict[str, Any],
    commodity: str,
    match_level: str,
) -> MandiPriceResult:

    modal_price = parse_price(
        record.get(
            "modal_price"
        )
    )

    if modal_price is None:
        raise MandiPriceError(
            "The mandi record does not "
            "contain a valid modal price."
        )

    return MandiPriceResult(
        commodity=(
            _optional_text(
                record.get(
                    "commodity"
                )
            )
            or commodity
        ),

        state=_optional_text(
            record.get(
                "state"
            )
        ),

        district=_optional_text(
            record.get(
                "district"
            )
        ),

        market=_optional_text(
            record.get(
                "market"
            )
        ),

        variety=_optional_text(
            record.get(
                "variety"
            )
        ),

        grade=_optional_text(
            record.get(
                "grade"
            )
        ),

        arrival_date=(
            _optional_text(
                record.get(
                    "arrival_date"
                )
            )
        ),

        min_price=parse_price(
            record.get(
                "min_price"
            )
        ),

        max_price=parse_price(
            record.get(
                "max_price"
            )
        ),

        modal_price=modal_price,

        data_mode="LIVE",

        match_level=(
            match_level
        ),
    )


def _state_market_aggregate(
    *,
    records: list[
        dict[str, Any]
    ],
    commodity: str,
    state: str,
) -> MandiPriceResult | None:
    valid_records = [
        record
        for record in records
        if parse_price(
            record.get(
                "modal_price"
            )
        )
        is not None
    ]

    if not valid_records:
        return None

    latest_date = max(
        parse_date(
            _optional_text(
                record.get(
                    "arrival_date"
                )
            )
        )
        for record
        in valid_records
    )

    latest_records = [
        record
        for record
        in valid_records
        if parse_date(
            _optional_text(
                record.get(
                    "arrival_date"
                )
            )
        )
        == latest_date
    ]

    if not latest_records:
        latest_records = (
            valid_records
        )

    modal_prices = [
        price
        for record
        in latest_records
        if (
            price := parse_price(
                record.get(
                    "modal_price"
                )
            )
        )
        is not None
    ]

    if not modal_prices:
        return None

    min_prices = [
        price
        for record
        in latest_records
        if (
            price := parse_price(
                record.get(
                    "min_price"
                )
            )
        )
        is not None
    ]

    max_prices = [
        price
        for record
        in latest_records
        if (
            price := parse_price(
                record.get(
                    "max_price"
                )
            )
        )
        is not None
    ]

    arrival_date = (
        _optional_text(
            latest_records[0].get(
                "arrival_date"
            )
        )
    )

    return MandiPriceResult(
        commodity=commodity,

        state=state,

        district=None,

        market=(
            f"{state} market aggregate"
        ),

        variety=None,

        grade=None,

        arrival_date=arrival_date,

        min_price=(
            min(min_prices)
            if min_prices
            else None
        ),

        max_price=(
            max(max_prices)
            if max_prices
            else None
        ),

        modal_price=float(
            median(
                modal_prices
            )
        ),

        data_mode="LIVE",

        match_level="STATE",
    )


# =========================================================
# MAIN SERVICE
# =========================================================

def fetch_latest_mandi_price(
    *,
    crop: str,
    location: str,
) -> MandiPriceResult:

    api_key = (
        os.getenv(
            "DATA_GOV_API_KEY",
            "",
        )
        .strip()
    )

    enabled = _env_flag(
        "MANDI_API_ENABLED",
        "true",
    )

    if not enabled:
        raise MandiPriceError(
            "Government mandi-price "
            "integration is disabled."
        )

    if not api_key:
        raise MandiPriceError(
            "DATA_GOV_API_KEY is "
            "not configured."
        )

    placeholder_keys = {
        "YOUR_DATA_GOV_IN_API_KEY",
        "YOUR_ACTUAL_DATA_GOV_API_KEY",
        "YOUR_REAL_API_KEY",
        "YOUR_GENERATED_KEY",
    }

    if (
        api_key.upper()
        in placeholder_keys
    ):
        raise MandiPriceError(
            "DATA_GOV_API_KEY still "
            "contains a placeholder "
            "value."
        )

    commodity = normalize_commodity(
        crop
    )

    (
        normalized_location,
        state_hint,
    ) = split_location_state(
        location
    )

    # -----------------------------------------------------
    # Cached fallback helper
    # -----------------------------------------------------

    def cached_fallback():
        return _load_cached_result(
            commodity=commodity,
            location=(
                normalized_location
            ),
            state=state_hint,
        )

    # -----------------------------------------------------
    # 1. EXACT DISTRICT
    # -----------------------------------------------------

    try:
        records = request_records(
            api_key=api_key,
            commodity=commodity,
            location=(
                normalized_location
            ),
            location_field=(
                "district"
            ),
            limit=50,
        )

    except (
        MandiServiceUnavailableError
    ):
        cached = cached_fallback()

        if cached is not None:
            return cached

        raise

    record = choose_latest_record(
        records,
        normalized_location,
    )

    if record is not None:
        result = _result_from_record(
            record=record,
            commodity=commodity,
            match_level="DISTRICT",
        )

        _save_cached_result(
            commodity=commodity,
            location=(
                normalized_location
            ),
            state=state_hint,
            result=result,
        )

        return result

    # -----------------------------------------------------
    # 2. EXACT / PARTIAL MARKET NAME
    # -----------------------------------------------------

    try:
        records = request_records(
            api_key=api_key,
            commodity=commodity,
            location=(
                normalized_location
            ),
            location_field=(
                "market"
            ),
            limit=50,
        )

    except (
        MandiServiceUnavailableError
    ):
        cached = cached_fallback()

        if cached is not None:
            return cached

        raise

    record = choose_latest_record(
        records,
        normalized_location,
    )

    if record is not None:
        result = _result_from_record(
            record=record,
            commodity=commodity,
            match_level="MARKET",
        )

        _save_cached_result(
            commodity=commodity,
            location=(
                normalized_location
            ),
            state=state_hint,
            result=result,
        )

        return result

    # -----------------------------------------------------
    # AUTO-RESOLVE LOCATION
    #
    # If farmer entered only "Nashik" or a mandi name,
    # resolve State + District from Government data.
    # -----------------------------------------------------

    mapped_district, mapped_state = (
        resolve_maharashtra_location(
            normalized_location
        )
    )

    resolved_district: str | None = (
        mapped_district
    )

    if not state_hint and mapped_state:
        state_hint = mapped_state

    if not state_hint:
        try:
            location_record = (
                _resolve_location_record(
                    api_key=api_key,
                    location=normalized_location,
                )
            )

        except MandiServiceUnavailableError:
            location_record = None

        if location_record is not None:
            state_hint = _optional_text(
                location_record.get(
                    "state"
                )
            )

            resolved_district = (
                _optional_text(
                    location_record.get(
                        "district"
                    )
                )
            )

    # -----------------------------------------------------
    # GENERAL INDIA LOCATION RESOLUTION
    #
    # For village / town / PIN / free-text inputs that
    # AGMARKNET does not directly recognize, resolve only
    # district/state. The geocoder is never a price source.
    # -----------------------------------------------------

    if (
        resolved_district is None
        or state_hint is None
    ):
        geocoded = resolve_india_location(
            location
        )

        if geocoded is not None:
            if (
                resolved_district is None
                and geocoded.district
            ):
                resolved_district = (
                    geocoded.district
                )

            if (
                state_hint is None
                and geocoded.state
            ):
                state_hint = (
                    geocoded.state
                )

    # -----------------------------------------------------
    # 3. RESOLVED DISTRICT FALLBACK
    #
    # Example:
    # village / PIN -> district -> Government crop quote
    # from that district when one is available.
    # -----------------------------------------------------

    if (
        resolved_district
        and (
            resolved_district.casefold()
            != normalized_location.casefold()
        )
    ):
        try:
            district_records = (
                request_records(
                    api_key=api_key,
                    commodity=commodity,
                    location=resolved_district,
                    location_field="district",
                    limit=100,
                )
            )

        except (
            MandiServiceUnavailableError
        ):
            cached = cached_fallback()

            if cached is not None:
                return cached

            raise

        district_record = (
            choose_latest_record(
                district_records,
                resolved_district,
            )
        )

        if district_record is not None:
            result = _result_from_record(
                record=district_record,
                commodity=commodity,
                match_level="DISTRICT",
            )

            _save_cached_result(
                commodity=commodity,
                location=(
                    normalized_location
                ),
                state=state_hint,
                result=result,
            )

            return result

    # -----------------------------------------------------
    # 4. STATE FALLBACK
    #
    # Runs only when the state is known.
    # This is not a broad nationwide query.
    # -----------------------------------------------------

    if state_hint:
        try:
            state_records = (
                request_records(
                    api_key=api_key,
                    commodity=(
                        commodity
                    ),
                    location=state_hint,
                    location_field=(
                        "state"
                    ),
                    limit=100,
                )
            )

        except (
            MandiServiceUnavailableError
        ):
            cached = (
                cached_fallback()
            )

            if cached is not None:
                return cached

            raise

        state_result = (
            _state_market_aggregate(
                records=(
                    state_records
                ),
                commodity=commodity,
                state=state_hint,
            )
        )

        if state_result is not None:
            if resolved_district:
                state_result.district = (
                    resolved_district
                )

            _save_cached_result(
                commodity=commodity,
                location=(
                    normalized_location
                ),
                state=state_hint,
                result=state_result,
            )

            return state_result

    # -----------------------------------------------------
    # 5. LAST SUCCESS CACHE
    # -----------------------------------------------------

    cached = cached_fallback()

    if cached is not None:
        return cached

    # -----------------------------------------------------
    # 6. NOTHING AVAILABLE
    # -----------------------------------------------------

    location_label = (
        normalized_location
    )

    if state_hint:
        location_label += (
            f", {state_hint}"
        )

    raise MandiPriceError(
        "No mandi price was found "
        f"for {commodity} in "
        f"{location_label}."
    )
