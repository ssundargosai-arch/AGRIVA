from __future__ import annotations

from app.schemas.price_prediction import (
    PricePredictionRequest,
)
from app.services import mandi_price


def _record(
    *,
    commodity: str,
    state: str,
    district: str,
    market: str,
    date: str,
    modal: float,
):
    return {
        "commodity": commodity,
        "state": state,
        "district": district,
        "market": market,
        "variety": "Local",
        "grade": "FAQ",
        "arrival_date": date,
        "min_price": str(modal - 100),
        "max_price": str(modal + 100),
        "modal_price": str(modal),
    }


def _enable_test_service(
    monkeypatch,
):
    monkeypatch.setenv(
        "DATA_GOV_API_KEY",
        "AGRIVA_TEST_KEY",
    )
    monkeypatch.setenv(
        "MANDI_API_ENABLED",
        "true",
    )
    monkeypatch.setenv(
        "MANDI_CACHE_ENABLED",
        "false",
    )


def test_unregistered_crop_request_is_valid():
    payload = PricePredictionRequest(
        crop="Dragon Fruit",
        location="Nashik",
        quality="A",
        quantity=100,
        season="Kharif",
        historical_prices=[],
    )

    assert payload.crop == "Dragon Fruit"
    assert payload.crop_id is None


def test_unknown_crop_name_is_not_rejected():
    assert (
        mandi_price.normalize_commodity(
            "Dragon Fruit"
        )
        == "Dragon Fruit"
    )


def test_farmer_language_crop_aliases():
    assert (
        mandi_price.normalize_commodity(
            "कांदा"
        )
        == "Onion"
    )
    assert (
        mandi_price.normalize_commodity(
            "हळद"
        )
        == "Turmeric"
    )
    assert (
        mandi_price.normalize_commodity(
            "गेहूं"
        )
        == "Wheat"
    )


def test_geocoder_payload_resolves_district_and_state():
    result = (
        mandi_price._location_from_geocoder_payload(
            [
                {
                    "display_name": (
                        "Sinnar, Nashik, "
                        "Maharashtra, India"
                    ),
                    "address": {
                        "town": "Sinnar",
                        "state_district": (
                            "Nashik District"
                        ),
                        "state": "Maharashtra",
                        "country": "India",
                    },
                }
            ],
            query="Sinnar",
        )
    )

    assert result is not None
    assert result.district == "Nashik"
    assert result.state == "Maharashtra"


def test_village_resolves_to_live_district_quote(
    monkeypatch,
):
    _enable_test_service(
        monkeypatch
    )

    monkeypatch.setattr(
        mandi_price,
        "resolve_india_location",
        lambda location: (
            mandi_price.ResolvedIndiaLocation(
                query=location,
                district="Nashik",
                state="Maharashtra",
            )
        ),
    )

    def fake_request_records(
        *,
        api_key,
        commodity,
        location,
        location_field,
        limit=50,
    ):
        if (
            commodity == "Wheat"
            and location == "Nashik"
            and location_field == "district"
        ):
            return [
                _record(
                    commodity="Wheat",
                    state="Maharashtra",
                    district="Nashik",
                    market="Lasalgaon",
                    date="05/09/2026",
                    modal=2925,
                )
            ]

        return []

    monkeypatch.setattr(
        mandi_price,
        "request_records",
        fake_request_records,
    )

    result = (
        mandi_price.fetch_latest_mandi_price(
            crop="Wheat",
            location="Sinnar",
        )
    )

    assert result.data_mode == "LIVE"
    assert result.match_level == "DISTRICT"
    assert result.state == "Maharashtra"
    assert result.district == "Nashik"
    assert result.market == "Lasalgaon"
    assert result.modal_price == 2925


def test_pin_code_can_fall_back_to_live_state_data(
    monkeypatch,
):
    _enable_test_service(
        monkeypatch
    )

    monkeypatch.setattr(
        mandi_price,
        "resolve_india_location",
        lambda location: (
            mandi_price.ResolvedIndiaLocation(
                query=location,
                district="Nashik",
                state="Maharashtra",
            )
        ),
    )

    def fake_request_records(
        *,
        api_key,
        commodity,
        location,
        location_field,
        limit=50,
    ):
        if (
            commodity == "Turmeric"
            and location == "Maharashtra"
            and location_field == "state"
        ):
            return [
                _record(
                    commodity="Turmeric",
                    state="Maharashtra",
                    district="Sangli",
                    market="Sangli",
                    date="05/09/2026",
                    modal=12000,
                ),
                _record(
                    commodity="Turmeric",
                    state="Maharashtra",
                    district="Nanded",
                    market="Nanded",
                    date="05/09/2026",
                    modal=12400,
                ),
            ]

        return []

    monkeypatch.setattr(
        mandi_price,
        "request_records",
        fake_request_records,
    )

    result = (
        mandi_price.fetch_latest_mandi_price(
            crop="Turmeric",
            location="422001",
        )
    )

    assert result.data_mode == "LIVE"
    assert result.match_level == "STATE"
    assert result.state == "Maharashtra"
    assert result.modal_price == 12200


def test_location_geocoder_failure_is_nonfatal(
    monkeypatch,
):
    monkeypatch.setenv(
        "LOCATION_GEOCODER_ENABLED",
        "false",
    )

    mandi_price.resolve_india_location.cache_clear()

    assert (
        mandi_price.resolve_india_location(
            "some village"
        )
        is None
    )

    mandi_price.resolve_india_location.cache_clear()
