from app.main import app
from app.services.mandi_arrival_service import (
    build_market_insight,
    calculate_change_percent,
    classify_arrival_level,
    pressure_from_level,
)


def test_arrival_level_high():
    assert classify_arrival_level(
        latest=120,
        average=100,
    ) == "HIGH"


def test_arrival_level_low():
    assert classify_arrival_level(
        latest=80,
        average=100,
    ) == "LOW"


def test_arrival_level_normal():
    assert classify_arrival_level(
        latest=105,
        average=100,
    ) == "NORMAL"


def test_arrival_change_percent():
    assert calculate_change_percent(
        latest=120,
        average=100,
    ) == 20.0


def test_supply_pressure():
    assert pressure_from_level(
        "HIGH"
    ) == (
        "POSSIBLE_DOWNWARD_PRICE_PRESSURE"
    )

    assert pressure_from_level(
        "LOW"
    ) == (
        "POSSIBLE_UPWARD_PRICE_SUPPORT"
    )


def test_market_insight_is_not_guarantee():
    insight = build_market_insight(
        crop="Onion",
        level="HIGH",
        change_percent=20,
    )

    assert "not a guaranteed" in insight


def test_arrival_routes_registered():
    paths = {
        route.path
        for route in app.routes
    }

    assert (
        "/api/market-intelligence/"
        "arrivals"
        in paths
    )

    assert (
        "/api/market-intelligence/"
        "arrivals/health"
        in paths
    )
