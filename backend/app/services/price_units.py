from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class NormalizedStoredPrediction:
    current_price_per_kg: float
    predicted_price_per_kg: float
    expected_min_price_per_kg: float | None
    expected_max_price_per_kg: float | None
    compatibility_mode: str


def _clean_unit(unit: str | None) -> str:
    if not unit:
        raise ValueError(
            "Price unit is missing; cannot safely convert to INR/kg."
        )

    normalized = (
        str(unit)
        .strip()
        .lower()
        .replace("₹", "inr")
        .replace("rs.", "inr")
        .replace("rs", "inr")
        .replace(" ", "")
        .replace("_", "")
    )
    return normalized


def price_to_per_kg(
    value: float | int,
    unit: str | None,
) -> float:
    price = float(value)
    if price <= 0:
        raise ValueError("Price must be greater than zero.")

    normalized = _clean_unit(unit)

    if "quintal" in normalized or "qtl" in normalized:
        return round(price / 100.0, 4)

    if "/kg" in normalized or "perkg" in normalized:
        return round(price, 4)

    raise ValueError(
        f"Unsupported price unit '{unit}'. "
        "Expected INR/quintal (or qtl) or INR/kg."
    )


def normalize_stored_prediction(
    *,
    current_price: float | None,
    predicted_price: float,
    expected_min_price: float | None,
    expected_max_price: float | None,
    listing_reference_price_per_kg: float,
) -> NormalizedStoredPrediction:
    reference = float(listing_reference_price_per_kg)
    if reference <= 0:
        raise ValueError(
            "Listing reference price must be greater than zero."
        )

    if current_price is None:
        raise ValueError(
            "Stored prediction has no current price. "
            "Create a fresh price prediction before using sale decision."
        )

    current = float(current_price)
    predicted = float(predicted_price)

    if current <= 0 or predicted <= 0:
        raise ValueError(
            "Stored price prediction contains a non-positive price."
        )

    raw_ratio = current / reference
    quintal_ratio = (current / 100.0) / reference

    def plausible(ratio: float) -> bool:
        return 0.20 <= ratio < 5.00

    raw_is_per_kg = plausible(raw_ratio)
    divided_is_per_kg = plausible(quintal_ratio)

    if raw_is_per_kg == divided_is_per_kg:
        raise ValueError(
            "Stored prediction unit cannot be determined safely. "
            "Create a fresh price prediction for this crop/listing."
        )

    factor = 1.0 if raw_is_per_kg else 0.01
    mode = (
        "stored_per_kg"
        if raw_is_per_kg
        else "legacy_inr_per_quintal_converted"
    )

    def converted(value: float | None) -> float | None:
        if value is None:
            return None
        numeric = float(value)
        if numeric <= 0:
            raise ValueError(
                "Stored price prediction contains a non-positive range value."
            )
        return round(numeric * factor, 4)

    return NormalizedStoredPrediction(
        current_price_per_kg=round(current * factor, 4),
        predicted_price_per_kg=round(predicted * factor, 4),
        expected_min_price_per_kg=converted(expected_min_price),
        expected_max_price_per_kg=converted(expected_max_price),
        compatibility_mode=mode,
    )
