from app.models.store import Product


def calculate_seed_score(
    product: Product,
    crop: str,
    soil_type: str,
    season: str,
    location: str,
) -> tuple[float, str]:

    score = 60.0
    reasons = []

    text = " ".join(
        [
            product.name or "",
            product.description or "",
            getattr(product, "brand", "") or "",
        ]
    ).lower()

    crop_lower = crop.lower()
    soil_lower = soil_type.lower()
    season_lower = season.lower()
    location_lower = location.lower()

    if crop_lower in text:
        score += 20
        reasons.append(
            f"Designed or suitable for {crop}."
        )

    if soil_lower in text:
        score += 8
        reasons.append(
            f"Suitable for {soil_type} soil."
        )

    if season_lower in text:
        score += 7
        reasons.append(
            f"Suitable for {season} season."
        )

    if location_lower in text:
        score += 5
        reasons.append(
            f"Suitable for conditions around {location}."
        )

    if not reasons:
        reasons.append(
            "Recommended based on general crop suitability "
            "and current AGRIVA Store availability."
        )

    score = min(score, 99.0)

    return round(score, 1), " ".join(reasons)