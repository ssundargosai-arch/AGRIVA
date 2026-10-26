import os
from statistics import mean
from typing import Any

from app.services.mandi_price import (
    MandiPriceError,
    MandiPriceResult,
    fetch_latest_mandi_price,
)


# =========================================================
# DEMO MARKET PRICES
# Unit: INR / quintal
# =========================================================

DEMO_PRICES = {
    "wheat": 2450.0,
    "rice": 3100.0,
    "maize": 2250.0,
    "corn": 2250.0,
    "potato": 1800.0,
    "tomato": 2400.0,
    "onion": 2100.0,
    "soybean": 4700.0,
    "soyabean": 4700.0,
    "mustard": 5600.0,
    "cotton": 7200.0,
    "sugarcane": 350.0,
}


# =========================================================
# PRICE ADJUSTMENT RULES
# =========================================================

QUALITY_MULTIPLIERS = {
    "premium": 1.10,
    "a+": 1.10,
    "a": 1.07,
    "standard": 1.00,
    "b": 0.97,
    "c": 0.90,
}


SEASON_MULTIPLIERS = {
    "peak": 0.96,
    "harvest": 0.95,
    "normal": 1.00,
    "off-season": 1.08,
    "off season": 1.08,
    "winter": 1.03,
    "summer": 1.02,
    "monsoon": 1.01,
    "kharif": 1.01,
    "rabi": 1.03,
    "zaid": 1.02,
}


# =========================================================
# HELPERS
# =========================================================

def _env_flag(
    name: str,
    default: str = "false",
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


def _round_price(
    value: float,
) -> float:
    return round(
        float(value),
        2,
    )


def _round_percentage(
    value: float,
) -> float:
    return round(
        float(value),
        2,
    )


def _clean_historical_prices(
    prices: list[float],
) -> list[float]:
    cleaned: list[float] = []

    for value in prices or []:
        try:
            price = float(value)

        except (
            TypeError,
            ValueError,
        ):
            continue

        if price > 0:
            cleaned.append(
                price
            )

    return cleaned


# =========================================================
# TREND
# =========================================================

def _calculate_trend(
    historical_prices: list[float],
    current_price: float,
    predicted_price: float,
) -> str:
    if len(
        historical_prices
    ) >= 2:
        old_price = (
            historical_prices[0]
        )

        latest_price = (
            historical_prices[-1]
        )

        if (
            latest_price
            > old_price * 1.02
        ):
            return "UP"

        if (
            latest_price
            < old_price * 0.98
        ):
            return "DOWN"

    difference = (
        predicted_price
        - current_price
    ) / max(
        current_price,
        1.0,
    )

    if difference > 0.02:
        return "UP"

    if difference < -0.02:
        return "DOWN"

    return "STABLE"


# =========================================================
# CONFIDENCE
# =========================================================

def _base_confidence(
    historical_prices: list[float],
) -> float:
    count = len(
        historical_prices
    )

    if count >= 10:
        return 92.0

    if count >= 6:
        return 87.0

    if count >= 3:
        return 80.0

    if count >= 1:
        return 72.0

    return 65.0


def _confidence(
    historical_prices: list[float],
    *,
    data_mode: str,
) -> float:
    confidence = (
        _base_confidence(
            historical_prices
        )
    )

    normalized_mode = (
        data_mode
        .strip()
        .upper()
    )

    # Fresh Government mandi data.
    if normalized_mode == "LIVE":
        confidence = max(
            confidence,
            78.0,
        )

    # Last successful Government data.
    elif normalized_mode == "CACHED":
        confidence = max(
            confidence,
            72.0,
        )

    return confidence


# =========================================================
# HISTORICAL PREDICTION
# =========================================================

def _historical_base_prediction(
    historical_prices: list[float],
) -> float:
    recent = (
        historical_prices[-5:]
    )

    if not recent:
        raise ValueError(
            "Historical prices are empty."
        )

    weighted_sum = 0.0
    total_weight = 0.0

    for index, price in enumerate(
        recent,
        start=1,
    ):
        weighted_sum += (
            price * index
        )

        total_weight += index

    weighted_average = (
        weighted_sum
        / total_weight
    )

    average_price = mean(
        recent
    )

    return (
        weighted_average * 0.75
        + average_price * 0.25
    )


# =========================================================
# MANDI METADATA
# =========================================================

def _market_data(
    mandi_result: (
        MandiPriceResult | None
    ),
) -> dict[str, Any] | None:
    if mandi_result is None:
        return None

    return {
        "commodity": (
            mandi_result.commodity
        ),

        "state": (
            mandi_result.state
        ),

        "district": (
            mandi_result.district
        ),

        "market": (
            mandi_result.market
        ),

        "variety": (
            mandi_result.variety
        ),

        "grade": (
            mandi_result.grade
        ),

        "arrival_date": (
            mandi_result.arrival_date
        ),

        "min_price": (
            mandi_result.min_price
        ),

        "max_price": (
            mandi_result.max_price
        ),

        "modal_price": (
            mandi_result.modal_price
        ),

        "source": (
            mandi_result.source
        ),

        "unit": (
            mandi_result.unit
        ),

        # New provenance fields.
        "data_mode": getattr(
            mandi_result,
            "data_mode",
            "LIVE",
        ),

        "match_level": getattr(
            mandi_result,
            "match_level",
            "DISTRICT",
        ),

        "cached_at": getattr(
            mandi_result,
            "cached_at",
            None,
        ),
    }


# =========================================================
# MAIN PRICE PREDICTION SERVICE
# =========================================================

def calculate_price_prediction(
    *,
    crop: str,
    location: str,
    quality: str,
    quantity: float,
    season: str,
    historical_prices: list[float],
) -> dict[str, Any]:

    # -----------------------------------------------------
    # Validate / normalize input
    # -----------------------------------------------------

    crop_name = (
        crop.strip()
    )

    if not crop_name:
        raise ValueError(
            "Crop name is required."
        )

    location_name = (
        location.strip()
    )

    if not location_name:
        raise ValueError(
            "Location is required."
        )

    quality_name = (
        quality.strip()
        if quality
        else "Standard"
    )

    season_name = (
        season.strip()
        if season
        else "Normal"
    )

    if quantity <= 0:
        raise ValueError(
            "Quantity must be greater "
            "than zero."
        )

    clean_prices = (
        _clean_historical_prices(
            historical_prices
        )
    )

    crop_key = (
        crop_name.lower()
    )

    # -----------------------------------------------------
    # Mandi state
    # -----------------------------------------------------

    mandi_result: (
        MandiPriceResult | None
    ) = None

    mandi_current_price: (
        float | None
    ) = None

    mandi_data_mode: str | None = (
        None
    )

    mandi_price_used = False

    fallback_demo_used = False

    # -----------------------------------------------------
    # 1. GOVERNMENT MANDI PRICE
    # -----------------------------------------------------

    if _env_flag(
        "MANDI_API_ENABLED",
        "true",
    ):
        try:
            mandi_result = (
                fetch_latest_mandi_price(
                    crop=crop_name,
                    location=(
                        location_name
                    ),
                )
            )

            mandi_current_price = (
                float(
                    mandi_result.modal_price
                )
            )

            mandi_data_mode = str(
                getattr(
                    mandi_result,
                    "data_mode",
                    "LIVE",
                )
            ).upper()

            # Accepted Government-backed modes.
            if (
                mandi_data_mode
                not in {
                    "LIVE",
                    "CACHED",
                }
            ):
                mandi_data_mode = (
                    "LIVE"
                )

            mandi_price_used = True

        except MandiPriceError:
            mandi_result = None

            mandi_current_price = (
                None
            )

            mandi_data_mode = None

            mandi_price_used = False

    # -----------------------------------------------------
    # 2. SELECT CURRENT PRICE SOURCE
    #
    # Government mandi
    #       ↓
    # Historical
    #       ↓
    # DEMO
    # -----------------------------------------------------

    if (
        mandi_current_price
        is not None
    ):
        current_price = (
            mandi_current_price
        )

        data_mode = (
            mandi_data_mode
            or "LIVE"
        )

    elif clean_prices:
        current_price = (
            clean_prices[-1]
        )

        data_mode = (
            "HISTORICAL"
        )

    else:
        demo_enabled = (
            _env_flag(
                "DEMO_MODE",
                "true",
            )
        )

        if not demo_enabled:
            raise ValueError(
                "Unable to retrieve mandi "
                "price and no historical "
                "prices were supplied."
            )

        current_price = float(
            DEMO_PRICES.get(
                crop_key,
                2500.0,
            )
        )

        fallback_demo_used = True

        data_mode = "DEMO"

    # -----------------------------------------------------
    # 3. BASE PREDICTION
    # -----------------------------------------------------

    if clean_prices:
        historical_prediction = (
            _historical_base_prediction(
                clean_prices
            )
        )

        # Government market price +
        # farmer historical data.
        if mandi_price_used:
            base_prediction = (
                current_price * 0.60
                + historical_prediction
                * 0.40
            )

        else:
            base_prediction = (
                historical_prediction
            )

    else:
        # Small near-term movement when
        # no historical series exists.
        base_prediction = (
            current_price * 1.02
        )

    # -----------------------------------------------------
    # 4. QUALITY ADJUSTMENT
    # -----------------------------------------------------

    quality_multiplier = (
        QUALITY_MULTIPLIERS.get(
            quality_name.lower(),
            1.0,
        )
    )

    # -----------------------------------------------------
    # 5. SEASON ADJUSTMENT
    # -----------------------------------------------------

    season_multiplier = (
        SEASON_MULTIPLIERS.get(
            season_name.lower(),
            1.0,
        )
    )

    # -----------------------------------------------------
    # 6. QUANTITY ADJUSTMENT
    # -----------------------------------------------------

    if quantity >= 100:
        quantity_multiplier = (
            0.97
        )

    elif quantity >= 50:
        quantity_multiplier = (
            0.985
        )

    else:
        quantity_multiplier = (
            1.0
        )

    # -----------------------------------------------------
    # 7. FINAL PREDICTED PRICE
    # -----------------------------------------------------

    predicted_price = (
        base_prediction
        * quality_multiplier
        * season_multiplier
        * quantity_multiplier
    )

    # Protect heuristic model against
    # unrealistic extreme predictions.
    min_allowed = (
        current_price * 0.75
    )

    max_allowed = (
        current_price * 1.35
    )

    predicted_price = max(
        min_allowed,
        min(
            predicted_price,
            max_allowed,
        ),
    )

    # -----------------------------------------------------
    # 8. CONFIDENCE
    # -----------------------------------------------------

    confidence = _confidence(
        clean_prices,
        data_mode=data_mode,
    )

    # Prediction range depends on
    # confidence.
    if confidence >= 85:
        range_percentage = (
            0.06
        )

    elif confidence >= 75:
        range_percentage = (
            0.08
        )

    else:
        range_percentage = (
            0.10
        )

    expected_min = (
        predicted_price
        * (
            1
            - range_percentage
        )
    )

    expected_max = (
        predicted_price
        * (
            1
            + range_percentage
        )
    )

    # -----------------------------------------------------
    # 9. TREND
    # -----------------------------------------------------

    trend = _calculate_trend(
        clean_prices,
        current_price,
        predicted_price,
    )

    # -----------------------------------------------------
    # 10. EXPLAINABLE FACTORS
    # -----------------------------------------------------

    base_adjustment_pct = (
        (
            base_prediction
            / max(
                current_price,
                1.0,
            )
        )
        - 1
    ) * 100

    quality_adjustment_pct = (
        quality_multiplier - 1
    ) * 100

    season_adjustment_pct = (
        season_multiplier - 1
    ) * 100

    quantity_adjustment_pct = (
        quantity_multiplier - 1
    ) * 100

    price_change_percentage = (
        (
            predicted_price
            - current_price
        )
        / max(
            current_price,
            1.0,
        )
        * 100
    )

    prediction_factors = {
        "base_price": (
            _round_price(
                current_price
            )
        ),

        "base_adjustment_percent": (
            _round_percentage(
                base_adjustment_pct
            )
        ),

        "quality_adjustment_percent": (
            _round_percentage(
                quality_adjustment_pct
            )
        ),

        "season_adjustment_percent": (
            _round_percentage(
                season_adjustment_pct
            )
        ),

        "quantity_adjustment_percent": (
            _round_percentage(
                quantity_adjustment_pct
            )
        ),
    }

    # -----------------------------------------------------
    # 11. UNIT
    # -----------------------------------------------------

    unit = (
        mandi_result.unit
        if mandi_result
        else "INR/quintal"
    )

    # -----------------------------------------------------
    # 12. RESPONSE
    # -----------------------------------------------------

    return {
        "current_price": (
            _round_price(
                current_price
            )
        ),

        "predicted_price": (
            _round_price(
                predicted_price
            )
        ),

        "expected_range_min": (
            _round_price(
                expected_min
            )
        ),

        "expected_range_max": (
            _round_price(
                expected_max
            )
        ),

        "confidence": (
            float(confidence)
        ),

        "trend": trend,

        "historical_prices": (
            clean_prices
        ),

        # True only when AGRIVA demo
        # fallback prices were actually used.
        "demo_mode": (
            fallback_demo_used
        ),

        # LIVE
        # CACHED
        # HISTORICAL
        # DEMO
        "data_mode": data_mode,

        "unit": unit,

        "market_data": (
            _market_data(
                mandi_result
            )
        ),

        "prediction_factors": (
            prediction_factors
        ),

        "price_change_percentage": (
            _round_percentage(
                price_change_percentage
            )
        ),
    }