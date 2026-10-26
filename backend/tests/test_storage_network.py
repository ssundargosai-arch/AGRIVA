import pytest

from app.main import app
from app.services.storage_service import (
    StorageValidationError,
    calculate_storage_cost,
    capacity_available,
)


def test_storage_cost_calculation():
    assert calculate_storage_cost(
        quantity_quintal=25,
        storage_days=10,
        rate_per_quintal_day=2.5,
    ) == 625.0


def test_storage_cost_invalid_quantity():
    with pytest.raises(
        StorageValidationError
    ):
        calculate_storage_cost(
            quantity_quintal=0,
            storage_days=10,
            rate_per_quintal_day=2.5,
        )


def test_storage_cost_invalid_days():
    with pytest.raises(
        StorageValidationError
    ):
        calculate_storage_cost(
            quantity_quintal=25,
            storage_days=0,
            rate_per_quintal_day=2.5,
        )


def test_storage_capacity_check():
    assert capacity_available(
        requested_quantity=25,
        available_quantity=100,
    )

    assert not capacity_available(
        requested_quantity=125,
        available_quantity=100,
    )


def test_storage_routes_registered():
    paths = {
        route.path
        for route in app.routes
    }

    assert "/api/storage/health" in paths
    assert "/api/storage/facilities" in paths
    assert "/api/storage/cost-estimate" in paths
    assert "/api/storage/requests" in paths
    assert "/api/storage/requests/my" in paths
