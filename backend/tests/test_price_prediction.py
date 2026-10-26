from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.api.dependencies import require_farmer
from app.db.session import get_db
from app.main import app
from app.models.crop import Crop, CropQualityPrediction
from app.services.price_prediction import calculate_price_prediction
import pytest

from app.services.price_prediction import (
    calculate_price_prediction,
)

class FakeQuery:
    def __init__(
        self,
        *,
        first_result=None,
        all_result=None,
    ):
        self.first_result = first_result
        self.all_result = (
            all_result
            if all_result is not None
            else []
        )

    def join(self, *args, **kwargs):
        return self

    def filter(self, *args, **kwargs):
        return self

    def first(self):
        return self.first_result

    def all(self):
        return self.all_result


class FakeDB:
    def __init__(self):
        self.added = []
        self.crop = None
        self.quality_rows = []

        self.commit_called = False
        self.rollback_called = False
        self.fail_commit = False

    def query(self, model):
        if model is Crop:
            return FakeQuery(
                first_result=self.crop,
            )

        if model is CropQualityPrediction:
            return FakeQuery(
                all_result=self.quality_rows,
            )

        return FakeQuery()

    def add(self, obj):
        self.added.append(obj)

    def commit(self):
        self.commit_called = True

        if self.fail_commit:
            raise RuntimeError(
                "Simulated database failure"
            )

    def refresh(self, obj):
        if obj.id is None:
            obj.id = uuid4()

    def rollback(self):
        self.rollback_called = True


@pytest.fixture
def api_context():
    db = FakeDB()

    user = SimpleNamespace(
        id=uuid4(),
    )

    def override_db():
        yield db

    def override_farmer():
        return user

    app.dependency_overrides[get_db] = (
        override_db
    )

    app.dependency_overrides[require_farmer] = (
        override_farmer
    )

    with TestClient(app) as client:
        yield client, db, user

    app.dependency_overrides.pop(
        get_db,
        None,
    )

    app.dependency_overrides.pop(
        require_farmer,
        None,
    )


def test_price_service_with_history():
    result = calculate_price_prediction(
        crop="Wheat",
        location="Prayagraj",
        quality="A",
        quantity=25,
        season="Rabi",
        historical_prices=[
            2200,
            2250,
            2300,
        ],
    )

    assert result["current_price"] == 2300.0

    assert (
        result["predicted_price"]
        > result["current_price"]
    )

    assert result["confidence"] == 80.0

    assert result["trend"] == "UP"

    assert result["historical_prices"] == [
        2200.0,
        2250.0,
        2300.0,
    ]

    assert (
        result["expected_range_min"]
        < result["predicted_price"]
        < result["expected_range_max"]
    )


def test_price_service_demo_without_history():
    result = calculate_price_prediction(
        crop="Wheat",
        location="Prayagraj",
        quality="Standard",
        quantity=20,
        season="Normal",
        historical_prices=[],
    )

    assert result["current_price"] == 2450.0

    assert result["predicted_price"] == 2499.0

    assert result["confidence"] == 65.0

    assert result["trend"] == "STABLE"

    assert result["historical_prices"] == []

    assert result["demo_mode"] is True


def test_manual_price_prediction_success(
    api_context,
):
    client, db, user = api_context

    response = client.post(
        "/api/ai/price-prediction",
        json={
            "crop": "Wheat",
            "location": "Prayagraj",
            "quality": "A",
            "quantity": 25,
            "season": "Rabi",
            "historical_prices": [
                2200,
                2250,
                2300,
            ],
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["crop"] == "Wheat"
    assert data["location"] == "Prayagraj"
    assert data["quality"] == "A"
    assert data["quantity"] == 25
    assert data["season"] == "Rabi"

    assert data["current_price"] == 2300.0

    assert data["predicted_price"] > 0

    assert (
        data["expected_range_min"]
        < data["predicted_price"]
        < data["expected_range_max"]
    )

    assert data["confidence"] == 80.0
    assert data["trend"] == "UP"

    assert len(data["chart_data"]) == 5

    assert (
        data["chart_data"][-2]["label"]
        == "Current"
    )

    assert (
        data["chart_data"][-1]["label"]
        == "Predicted"
    )

    assert db.commit_called is True

    assert len(db.added) == 1

    prediction = db.added[0]

    assert prediction.user_id == user.id
    assert prediction.crop_name == "Wheat"
    assert prediction.market_name == "Prayagraj"
    assert prediction.quality == "A"


def test_manual_prediction_without_crop(
    api_context,
):
    client, _, _ = api_context

    response = client.post(
        "/api/ai/price-prediction",
        json={
            "location": "Prayagraj",
            "quality": "A",
            "quantity": 20,
            "season": "Rabi",
            "historical_prices": [],
        },
    )

    assert response.status_code == 422

    assert (
        response.json()["detail"]
        == "Either crop_id or crop must be provided."
    )


def test_manual_prediction_without_quality(
    api_context,
):
    client, _, _ = api_context

    response = client.post(
        "/api/ai/price-prediction",
        json={
            "crop": "Wheat",
            "location": "Prayagraj",
            "quantity": 20,
            "season": "Rabi",
            "historical_prices": [],
        },
    )

    assert response.status_code == 422

    assert (
        response.json()["detail"]
        == (
            "Quality is required when "
            "crop_id is not provided."
        )
    )


@pytest.mark.parametrize(
    "quantity",
    [
        0,
        -1,
        -100,
    ],
)
def test_invalid_quantity(
    api_context,
    quantity,
):
    client, _, _ = api_context

    response = client.post(
        "/api/ai/price-prediction",
        json={
            "crop": "Wheat",
            "location": "Prayagraj",
            "quality": "A",
            "quantity": quantity,
            "season": "Rabi",
        },
    )

    assert response.status_code == 422


def test_invalid_quality_grade(
    api_context,
):
    client, _, _ = api_context

    response = client.post(
        "/api/ai/price-prediction",
        json={
            "crop": "Wheat",
            "location": "Prayagraj",
            "quality": "Excellent",
            "quantity": 25,
            "season": "Rabi",
        },
    )

    assert response.status_code == 422


def test_registered_crop_prediction(
    api_context,
):
    client, db, _ = api_context

    crop_id = uuid4()

    db.crop = SimpleNamespace(
        id=crop_id,
        name="Wheat",
    )

    db.quality_rows = [
        SimpleNamespace(
            grade="A+",
        )
    ]

    response = client.post(
        "/api/ai/price-prediction",
        json={
            "crop_id": str(crop_id),
            "location": "Prayagraj",
            "quantity": 30,
            "season": "Rabi",
            "historical_prices": [
                2200,
                2250,
                2300,
            ],
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["crop_id"] == str(crop_id)
    assert data["crop"] == "Wheat"
    assert data["quality"] == "A+"

    assert len(db.added) == 1

    prediction = db.added[0]

    assert prediction.crop_id == crop_id


def test_registered_crop_not_found(
    api_context,
):
    client, db, _ = api_context

    db.crop = None

    response = client.post(
        "/api/ai/price-prediction",
        json={
            "crop_id": str(uuid4()),
            "location": "Prayagraj",
            "quantity": 30,
            "season": "Rabi",
        },
    )

    assert response.status_code == 404

    assert "does not belong" in (
        response.json()["detail"]
    )


def test_registered_crop_without_quality(
    api_context,
):
    client, db, _ = api_context

    crop_id = uuid4()

    db.crop = SimpleNamespace(
        id=crop_id,
        name="Wheat",
    )

    db.quality_rows = []

    response = client.post(
        "/api/ai/price-prediction",
        json={
            "crop_id": str(crop_id),
            "location": "Prayagraj",
            "quantity": 30,
            "season": "Rabi",
        },
    )

    assert response.status_code == 404

    assert "Crop Quality analysis" in (
        response.json()["detail"]
    )


def test_database_failure_rolls_back(
    api_context,
):
    client, db, _ = api_context

    db.fail_commit = True

    response = client.post(
        "/api/ai/price-prediction",
        json={
            "crop": "Wheat",
            "location": "Prayagraj",
            "quality": "A",
            "quantity": 25,
            "season": "Rabi",
            "historical_prices": [
                2200,
                2250,
                2300,
            ],
        },
    )

    assert response.status_code == 500

    assert response.json()["detail"] == (
        "Unable to store price prediction."
    )

    assert db.rollback_called is True

def test_price_service_with_live_mandi(
    monkeypatch,
):
    from app.services.mandi_price import (
        MandiPriceResult,
    )

    monkeypatch.setenv(
        "MANDI_API_ENABLED",
        "true",
    )

    def fake_mandi_price(
        *,
        crop: str,
        location: str,
    ) -> MandiPriceResult:
        return MandiPriceResult(
            commodity="Wheat",
            state="Uttar Pradesh",
            district="Jaunpur",
            market="Shahganj APMC",
            variety="Dara",
            grade="FAQ",
            arrival_date="02/09/2026",
            min_price=2400.0,
            max_price=2700.0,
            modal_price=2555.14,
        )

    monkeypatch.setattr(
        "app.services.price_prediction."
        "fetch_latest_mandi_price",
        fake_mandi_price,
    )

    result = calculate_price_prediction(
        crop="Wheat",
        location="Jaunpur",
        quality="A",
        quantity=25,
        season="Rabi",
        historical_prices=[],
    )

    assert result["current_price"] == 2555.14
    assert result["demo_mode"] is False
    assert result["confidence"] == 78.0
    assert result["trend"] == "UP"

def test_mandi_failure_uses_demo_fallback(
    monkeypatch,
):
    from app.services.mandi_price import (
        MandiPriceError,
    )

    monkeypatch.setenv(
        "MANDI_API_ENABLED",
        "true",
    )

    monkeypatch.setenv(
        "DEMO_MODE",
        "true",
    )

    def fake_mandi_failure(
        *,
        crop: str,
        location: str,
    ):
        raise MandiPriceError(
            "Government API unavailable."
        )

    monkeypatch.setattr(
        "app.services.price_prediction."
        "fetch_latest_mandi_price",
        fake_mandi_failure,
    )

    result = calculate_price_prediction(
        crop="Wheat",
        location="Jaunpur",
        quality="Standard",
        quantity=20,
        season="Normal",
        historical_prices=[],
    )

    assert result["current_price"] == 2450.0
    assert result["demo_mode"] is True