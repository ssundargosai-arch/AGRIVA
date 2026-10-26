from types import SimpleNamespace

import pytest
from pydantic import ValidationError

from app.main import app
from app.schemas.store import (
    CartItemCreate,
    CartItemUpdate,
    SeedRecommendationRequest,
)
from app.services.seed_recommendation import calculate_seed_score


REQUIRED_STORE_ROUTES = {
    "/api/store/health",
    "/api/store/categories",
    "/api/store/products",
    "/api/store/products/{product_id}",
    "/api/store/cart",
    "/api/store/cart/items",
    "/api/store/cart/items/{item_id}",
    "/api/store/checkout",
    "/api/store/orders",
    "/api/store/orders/{order_id}",
    "/api/store/ai/seed-recommendation",
}


def test_phase7_required_store_routes_are_registered():
    paths = {route.path for route in app.routes}

    missing = REQUIRED_STORE_ROUTES - paths

    assert not missing, (
        "Missing AGRIVA Store routes: "
        + ", ".join(sorted(missing))
    )


def test_seed_score_matches_all_farm_inputs_and_caps_at_99():
    product = SimpleNamespace(
        name="Wheat Maharashtra Rabi Loamy Seed",
        description=(
            "Wheat seed suitable for loamy soil "
            "during Rabi season in Maharashtra."
        ),
        brand=None,
    )

    score, reason = calculate_seed_score(
        product=product,
        crop="Wheat",
        soil_type="Loamy",
        season="Rabi",
        location="Maharashtra",
    )

    assert score == 99.0
    assert "Wheat" in reason
    assert "Loamy" in reason
    assert "Rabi" in reason
    assert "Maharashtra" in reason


def test_seed_score_fallback_is_explicit():
    product = SimpleNamespace(
        name="General Farm Seed",
        description="General store seed product.",
        brand=None,
    )

    score, reason = calculate_seed_score(
        product=product,
        crop="Cotton",
        soil_type="Black",
        season="Kharif",
        location="Nagpur",
    )

    assert score == 60.0
    assert "AGRIVA Store availability" in reason


def test_cart_create_rejects_zero_quantity():
    with pytest.raises(ValidationError):
        CartItemCreate(
            product_id="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            quantity=0,
        )


def test_cart_update_rejects_zero_quantity():
    with pytest.raises(ValidationError):
        CartItemUpdate(quantity=0)


def test_seed_recommendation_request_contract():
    payload = SeedRecommendationRequest(
        crop="Wheat",
        soil_type="Loamy",
        season="Rabi",
        location="Nashik",
    )

    assert payload.crop == "Wheat"
    assert payload.soil_type == "Loamy"
    assert payload.season == "Rabi"
    assert payload.location == "Nashik"
