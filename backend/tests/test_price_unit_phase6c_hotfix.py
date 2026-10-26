import pytest

from app.services.price_units import (
    normalize_stored_prediction,
    price_to_per_kg,
)


def test_explicit_quintal_to_kg_conversion():
    assert price_to_per_kg(
        2512.23,
        "INR/quintal",
    ) == 25.1223

    assert price_to_per_kg(
        2824.10,
        "INR/qtl",
    ) == 28.241


def test_explicit_per_kg_is_unchanged():
    assert price_to_per_kg(
        25.1223,
        "INR/kg",
    ) == 25.1223


def test_legacy_prediction_is_converted_using_listing_anchor():
    normalized = normalize_stored_prediction(
        current_price=2512.23,
        predicted_price=2824.10,
        expected_min_price=2598.17,
        expected_max_price=3050.03,
        listing_reference_price_per_kg=28.0,
    )

    assert normalized.compatibility_mode == (
        "legacy_inr_per_quintal_converted"
    )
    assert normalized.current_price_per_kg == 25.1223
    assert normalized.predicted_price_per_kg == 28.241
    assert normalized.expected_min_price_per_kg == 25.9817
    assert normalized.expected_max_price_per_kg == 30.5003


def test_new_per_kg_prediction_is_not_divided_again():
    normalized = normalize_stored_prediction(
        current_price=25.1223,
        predicted_price=28.2410,
        expected_min_price=25.9817,
        expected_max_price=30.5003,
        listing_reference_price_per_kg=28.0,
    )

    assert normalized.compatibility_mode == "stored_per_kg"
    assert normalized.current_price_per_kg == 25.1223
    assert normalized.predicted_price_per_kg == 28.241


def test_ambiguous_or_unrelated_unit_fails_closed():
    with pytest.raises(
        ValueError,
        match="cannot be determined safely",
    ):
        normalize_stored_prediction(
            current_price=500.0,
            predicted_price=550.0,
            expected_min_price=450.0,
            expected_max_price=600.0,
            listing_reference_price_per_kg=100.0,
        )
