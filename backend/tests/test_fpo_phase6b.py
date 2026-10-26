from pydantic import ValidationError
import pytest

from app.schemas.fpo import FPOContributionCreate, FPOLotCreate


def test_fpo_routes_registered():
    from app.main import app

    paths = {route.path for route in app.routes}
    required = {
        "/api/fpo/health",
        "/api/fpo/groups",
        "/api/fpo/groups/{group_id}",
        "/api/fpo/groups/{group_id}/join",
        "/api/fpo/groups/{group_id}/members",
        "/api/fpo/lots",
        "/api/fpo/lots/{lot_id}",
        "/api/fpo/lots/{lot_id}/contribute",
        "/api/fpo/lots/{lot_id}/contributions/{contribution_id}",
        "/api/fpo/lots/{lot_id}/publish",
    }
    assert required.issubset(paths)


def test_fpo_contribution_requires_positive_quantity():
    with pytest.raises(ValidationError):
        FPOContributionCreate(
            listing_id="00000000-0000-0000-0000-000000000001",
            quantity_kg=0,
        )


def test_fpo_lot_requires_positive_target_price():
    with pytest.raises(ValidationError):
        FPOLotCreate(
            group_id="00000000-0000-0000-0000-000000000001",
            crop_name="Wheat",
            target_price_per_kg=0,
        )
