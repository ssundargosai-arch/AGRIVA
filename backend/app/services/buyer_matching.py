from dataclasses import dataclass


@dataclass(frozen=True)
class BuyerMatchBreakdown:
    crop_score: float
    quantity_score: float
    price_score: float
    quality_score: float
    distance_score: float
    rating_score: float

    total_score: float

    label: str


def _clean_text(
    value: str | None,
) -> str:
    return (
        value or ""
    ).strip().casefold()


def _crop_score(
    listing_crop: str,
    buyer_crop: str,
) -> float:
    listing = _clean_text(
        listing_crop,
    )

    buyer = _clean_text(
        buyer_crop,
    )

    if not listing or not buyer:
        return 0.0

    if listing == buyer:
        return 30.0

    if (
        listing in buyer
        or buyer in listing
    ):
        return 20.0

    return 0.0


def _quantity_score(
    listing_quantity: float,
    buyer_quantity: float,
) -> float:
    listing = max(
        float(
            listing_quantity or 0,
        ),
        0.0,
    )

    buyer = max(
        float(
            buyer_quantity or 0,
        ),
        0.0,
    )

    if (
        listing <= 0
        or buyer <= 0
    ):
        return 0.0

    ratio = (
        min(listing, buyer)
        / max(listing, buyer)
    )

    return min(
        ratio * 20.0,
        20.0,
    )


def _price_score(
    listing_price: float,
    buyer_price: float,
) -> float:
    expected = max(
        float(
            listing_price or 0,
        ),
        0.0,
    )

    offered = max(
        float(
            buyer_price or 0,
        ),
        0.0,
    )

    if (
        expected <= 0
        or offered <= 0
    ):
        return 0.0

    if offered >= expected:
        return 20.0

    return min(
        (
            offered
            / expected
        )
        * 20.0,
        20.0,
    )


def _quality_score(
    listing_quality: str,
    buyer_quality: str,
) -> float:
    listing = _clean_text(
        listing_quality,
    )

    buyer = _clean_text(
        buyer_quality,
    )

    if not listing or not buyer:
        return 0.0

    if listing == buyer:
        return 15.0

    if (
        listing in buyer
        or buyer in listing
    ):
        return 10.0

    return 0.0


def _distance_score(
    distance_km: float | None,
) -> float:
    if distance_km is None:
        return 0.0

    distance = max(
        float(distance_km),
        0.0,
    )

    if distance <= 10:
        return 10.0

    if distance <= 25:
        return 8.0

    if distance <= 50:
        return 6.0

    if distance <= 100:
        return 4.0

    if distance <= 200:
        return 2.0

    return 0.0


def _rating_score(
    buyer_rating: float | None,
) -> float:
    if buyer_rating is None:
        return 0.0

    return max(
        0.0,
        min(
            float(buyer_rating),
            5.0,
        ),
    )


def get_match_label(
    score: float,
) -> str:
    if score >= 90:
        return "BEST_MATCH"

    if score >= 75:
        return "EXCELLENT"

    if score >= 60:
        return "GOOD"

    if score >= 40:
        return "FAIR"

    return "LOW"


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
    distance_km: float | None,
    buyer_rating: float | None,
) -> BuyerMatchBreakdown:
    crop_score = _crop_score(
        listing_crop,
        buyer_crop,
    )

    quantity_score = _quantity_score(
        listing_quantity,
        buyer_quantity,
    )

    price_score = _price_score(
        listing_price,
        buyer_price,
    )

    quality_score = _quality_score(
        listing_quality,
        buyer_quality,
    )

    distance_score = _distance_score(
        distance_km,
    )

    rating_score = _rating_score(
        buyer_rating,
    )

    total_score = round(
        min(
            crop_score
            + quantity_score
            + price_score
            + quality_score
            + distance_score
            + rating_score,
            100.0,
        ),
        2,
    )

    return BuyerMatchBreakdown(
        crop_score=round(
            crop_score,
            2,
        ),
        quantity_score=round(
            quantity_score,
            2,
        ),
        price_score=round(
            price_score,
            2,
        ),
        quality_score=round(
            quality_score,
            2,
        ),
        distance_score=round(
            distance_score,
            2,
        ),
        rating_score=round(
            rating_score,
            2,
        ),
        total_score=total_score,
        label=get_match_label(
            total_score,
        ),
    )