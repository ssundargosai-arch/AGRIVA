import os
from statistics import mean


DEMO_MODE = os.getenv(
    "DEMO_MODE",
    "true",
).lower() in {
    "1",
    "true",
    "yes",
    "on",
}


DEMO_PRICES = {
    "wheat": 2450.0,
    "rice": 3100.0,
    "maize": 2250.0,
    "corn": 2250.0,
    "potato": 1800.0,
    "tomato": 2400.0,
    "onion": 2100.0,
    "soybean": 4700.0,
    "mustard": 5600.0,
    "cotton": 7200.0,
    "sugarcane": 350.0,
}


QUALITY_MULTIPLIERS = {
    "premium": 1.10,
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


def _round_price(value: float) -> float:
    return round(value, 2)


def _calculate_trend(
    historical_prices: list[float],
    current_price: float,
    predicted_price: float,
) -> str:
    if len(historical_prices) >= 2:
        old_price = historical_prices[0]
        latest_price = historical_prices[-1]

        if latest_price > old_price * 1.02:
            return "UP"

        if latest_price < old_price * 0.98:
            return "DOWN"

    difference = (
        predicted_price - current_price
    ) / max(current_price, 1)

    if difference > 0.02:
        return "UP"

    if difference < -0.02:
        return "DOWN"

    return "STABLE"


def _confidence(
    historical_prices: list[float],
) -> float:
    count = len(historical_prices)

    if count >= 10:
        return 92.0

    if count >= 6:
        return 87.0

    if count >= 3:
        return 80.0

    if count >= 1:
        return 72.0

    return 65.0


def calculate_price_prediction(
    *,
    crop: str,
    location: str,
    quality: str,
    quantity: float,
    season: str,
    historical_prices: list[float],
) -> dict:
    clean_prices = [
        float(price)
        for price in historical_prices
        if price > 0
    ]

    crop_key = crop.strip().lower()

    if clean_prices:
        current_price = clean_prices[-1]

        recent = clean_prices[-5:]

        weighted_sum = 0.0
        total_weight = 0.0

        for index, price in enumerate(
            recent,
            start=1,
        ):
            weighted_sum += price * index
            total_weight += index

        base_prediction = (
            weighted_sum / total_weight
        )

        average_price = mean(recent)

        base_prediction = (
            base_prediction * 0.75
            + average_price * 0.25
        )

    else:
        if not DEMO_MODE:
            raise ValueError(
                "Historical prices are required "
                "when DEMO_MODE is disabled."
            )

        current_price = DEMO_PRICES.get(
            crop_key,
            2500.0,
        )

        base_prediction = current_price * 1.02

    quality_multiplier = (
        QUALITY_MULTIPLIERS.get(
            quality.strip().lower(),
            1.0,
        )
    )

    season_multiplier = (
        SEASON_MULTIPLIERS.get(
            season.strip().lower(),
            1.0,
        )
    )

    # A very large quantity can receive
    # a slight bulk-price adjustment.
    if quantity >= 100:
        quantity_multiplier = 0.97
    elif quantity >= 50:
        quantity_multiplier = 0.985
    else:
        quantity_multiplier = 1.0

    predicted_price = (
        base_prediction
        * quality_multiplier
        * season_multiplier
        * quantity_multiplier
    )

    # Keep demo predictions inside a
    # reasonable heuristic range.
    min_allowed = current_price * 0.75
    max_allowed = current_price * 1.35

    predicted_price = max(
        min_allowed,
        min(predicted_price, max_allowed),
    )

    confidence = _confidence(clean_prices)

    range_percentage = (
        0.06
        if confidence >= 85
        else 0.08
        if confidence >= 75
        else 0.10
    )

    expected_min = (
        predicted_price
        * (1 - range_percentage)
    )

    expected_max = (
        predicted_price
        * (1 + range_percentage)
    )

    trend = _calculate_trend(
        clean_prices,
        current_price,
        predicted_price,
    )

    return {
        "current_price": _round_price(
            current_price
        ),
        "predicted_price": _round_price(
            predicted_price
        ),
        "expected_range_min": _round_price(
            expected_min
        ),
        "expected_range_max": _round_price(
            expected_max
        ),
        "confidence": confidence,
        "trend": trend,
        "historical_prices": clean_prices,
        "demo_mode": DEMO_MODE,
    }