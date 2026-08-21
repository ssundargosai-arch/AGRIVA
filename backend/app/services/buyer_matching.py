def clamp(value: float) -> float:
    return max(0.0, min(100.0, value))


def calculate_buyer_match(
    *,
    listing_crop: str,
    listing_quantity: float,
    listing_price: float,
    listing_quality: str,
    buyer_crop: str,
    buyer_quantity: float,
    buyer_price: float,
    buyer_quality: str,
    distance_km: float,
    buyer_rating: float,
) -> float:

    score = 0.0

    # Crop match: 30%
    if (
        listing_crop.strip().lower()
        == buyer_crop.strip().lower()
    ):
        score += 30.0

    # Quantity compatibility: 15%
    quantity_difference = abs(
        listing_quantity - buyer_quantity
    )

    quantity_ratio = quantity_difference / max(
        listing_quantity,
        buyer_quantity,
        1,
    )

    score += max(
        0,
        15 * (1 - quantity_ratio),
    )

    # Price compatibility: 20%
    price_difference = abs(
        listing_price - buyer_price
    )

    price_ratio = price_difference / max(
        listing_price,
        buyer_price,
        1,
    )

    score += max(
        0,
        20 * (1 - price_ratio),
    )

    # Quality match: 15%
    if (
        listing_quality.strip().lower()
        == buyer_quality.strip().lower()
    ):
        score += 15.0

    # Distance: 10%
    if distance_km <= 25:
        score += 10
    elif distance_km <= 50:
        score += 8
    elif distance_km <= 100:
        score += 5
    elif distance_km <= 200:
        score += 2

    # Buyer rating: 10%
    rating_score = (
        max(0, min(buyer_rating, 5))
        / 5
        * 10
    )

    score += rating_score

    return round(clamp(score), 2)