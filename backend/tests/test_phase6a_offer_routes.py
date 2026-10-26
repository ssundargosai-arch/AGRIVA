from app.main import app
from app.schemas.offer import (
    OfferCounter,
    OfferCreate,
)


def test_phase6a_offer_routes_registered():
    paths = {
        route.path
        for route in app.routes
    }

    expected = {
        "/api/offers/health",
        "/api/offers",
        "/api/offers/my-offers",
        "/api/offers/farmer/received",
        "/api/offers/{offer_id}",
        "/api/offers/{offer_id}/counter",
        "/api/offers/{offer_id}/accept",
        "/api/offers/{offer_id}/reject",
    }

    assert expected.issubset(paths)


def test_offer_create_schema_accepts_positive_values():
    payload = OfferCreate(
        listing_id=(
            "11111111-1111-1111-1111-111111111111"
        ),
        quantity_kg=100,
        offer_price_per_kg=28,
        message="Pickup available.",
    )

    assert payload.quantity_kg == 100
    assert payload.offer_price_per_kg == 28


def test_offer_counter_schema_accepts_positive_value():
    payload = OfferCounter(
        counter_price_per_kg=29,
        message="Counter price.",
    )

    assert payload.counter_price_per_kg == 29
