import pytest

from app.services.buyer_matching import (
    calculate_buyer_match,
    get_match_label,
)


def test_perfect_buyer_match():
    result = calculate_buyer_match(
        listing_crop="Wheat",
        listing_quantity=1000,
        listing_price=28,
        listing_quality="A",
        buyer_crop="Wheat",
        buyer_quantity=1000,
        buyer_price=30,
        buyer_quality="A",
        distance_km=5,
        buyer_rating=5,
    )

    assert result.crop_score == 30.0
    assert result.quantity_score == 20.0
    assert result.price_score == 20.0
    assert result.quality_score == 15.0
    assert result.distance_score == 10.0
    assert result.rating_score == 5.0

    assert result.total_score == 100.0
    assert result.label == "BEST_MATCH"


def test_partial_quantity_match():
    result = calculate_buyer_match(
        listing_crop="Wheat",
        listing_quantity=1000,
        listing_price=28,
        listing_quality="A",
        buyer_crop="Wheat",
        buyer_quantity=500,
        buyer_price=28,
        buyer_quality="A",
        distance_km=20,
        buyer_rating=4,
    )

    assert result.quantity_score == 10.0

    assert result.total_score == pytest.approx(
        87.0,
    )

    assert result.label == "EXCELLENT"


def test_lower_buyer_offer_reduces_price_score():
    result = calculate_buyer_match(
        listing_crop="Wheat",
        listing_quantity=1000,
        listing_price=30,
        listing_quality="A",
        buyer_crop="Wheat",
        buyer_quantity=1000,
        buyer_price=24,
        buyer_quality="A",
        distance_km=5,
        buyer_rating=5,
    )

    assert result.price_score == pytest.approx(
        16.0,
    )

    assert result.total_score == pytest.approx(
        96.0,
    )


def test_different_crop_does_not_get_crop_points():
    result = calculate_buyer_match(
        listing_crop="Wheat",
        listing_quantity=1000,
        listing_price=30,
        listing_quality="A",
        buyer_crop="Rice",
        buyer_quantity=1000,
        buyer_price=30,
        buyer_quality="A",
        distance_km=5,
        buyer_rating=5,
    )

    assert result.crop_score == 0.0

    assert result.total_score == pytest.approx(
        70.0,
    )


def test_missing_distance_gets_zero_distance_score():
    result = calculate_buyer_match(
        listing_crop="Wheat",
        listing_quantity=1000,
        listing_price=28,
        listing_quality="A",
        buyer_crop="Wheat",
        buyer_quantity=1000,
        buyer_price=28,
        buyer_quality="A",
        distance_km=None,
        buyer_rating=5,
    )

    assert result.distance_score == 0.0
    assert result.total_score == 90.0


def test_rating_is_clamped_to_five():
    result = calculate_buyer_match(
        listing_crop="Wheat",
        listing_quantity=1000,
        listing_price=28,
        listing_quality="A",
        buyer_crop="Wheat",
        buyer_quantity=1000,
        buyer_price=28,
        buyer_quality="A",
        distance_km=5,
        buyer_rating=10,
    )

    assert result.rating_score == 5.0
    assert result.total_score == 100.0


@pytest.mark.parametrize(
    ("score", "expected"),
    [
        (100, "BEST_MATCH"),
        (90, "BEST_MATCH"),
        (89.99, "EXCELLENT"),
        (75, "EXCELLENT"),
        (74.99, "GOOD"),
        (60, "GOOD"),
        (59.99, "FAIR"),
        (40, "FAIR"),
        (39.99, "LOW"),
        (0, "LOW"),
    ],
)
def test_match_labels(
    score,
    expected,
):
    assert (
        get_match_label(score)
        == expected
    )