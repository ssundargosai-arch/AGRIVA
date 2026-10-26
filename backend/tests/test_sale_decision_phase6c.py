from pydantic import ValidationError
import pytest

from app.schemas.sale_decision import SaleDecisionCreate
from app.services.sale_decision import calculate_sale_decision


def test_sale_decision_routes_registered():
    from app.main import app

    paths = {route.path for route in app.routes}

    required = {
        "/api/sale-decision/health",
        "/api/sale-decision/context/{listing_id}",
        "/api/sale-decision/evaluate",
        "/api/sale-decision/history",
        "/api/sale-decision/{decision_id}",
    }

    assert required.issubset(paths)


def test_consider_storage_when_expected_gain_is_positive_but_lower_range_is_not():
    result = calculate_sale_decision(
        quantity_kg=100,
        current_price_per_kg=28,
        future_price_per_kg=31,
        expected_min_price_per_kg=29,
        expected_max_price_per_kg=33,
        holding_days=10,
        storage_cost_per_kg_per_day=0.05,
        transport_cost_now=100,
        transport_cost_later=120,
        expected_storage_loss_percent=2,
        other_holding_cost=0,
    )

    assert result.sell_now_net == 2700.0
    assert result.storage_cost_total == 50.0
    assert result.store_expected_net == 2868.0
    assert result.expected_advantage == 168.0
    assert result.conservative_advantage == -28.0
    assert result.break_even_future_price_per_kg == 29.29
    assert result.recommendation == "CONSIDER_STORAGE"


def test_store_when_lower_expected_price_still_beats_sell_now():
    result = calculate_sale_decision(
        quantity_kg=100,
        current_price_per_kg=28,
        future_price_per_kg=33,
        expected_min_price_per_kg=32,
        expected_max_price_per_kg=35,
        holding_days=10,
        storage_cost_per_kg_per_day=0.05,
        transport_cost_now=100,
        transport_cost_later=120,
        expected_storage_loss_percent=2,
        other_holding_cost=0,
    )

    assert result.conservative_advantage is not None
    assert result.conservative_advantage > 0
    assert result.recommendation == "STORE"


def test_sell_now_when_holding_costs_remove_expected_gain():
    result = calculate_sale_decision(
        quantity_kg=100,
        current_price_per_kg=28,
        future_price_per_kg=28,
        expected_min_price_per_kg=27,
        expected_max_price_per_kg=29,
        holding_days=10,
        storage_cost_per_kg_per_day=0.05,
        transport_cost_now=100,
        transport_cost_later=120,
        expected_storage_loss_percent=2,
        other_holding_cost=0,
    )

    assert result.expected_advantage < 0
    assert result.recommendation == "SELL_NOW"


def test_storage_loss_validation():
    with pytest.raises(ValidationError):
        SaleDecisionCreate(
            listing_id="00000000-0000-0000-0000-000000000001",
            prediction_id="00000000-0000-0000-0000-000000000002",
            holding_days=14,
            storage_cost_per_kg_per_day=0.1,
            expected_storage_loss_percent=51,
        )
