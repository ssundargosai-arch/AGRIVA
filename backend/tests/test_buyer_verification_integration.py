import inspect
from uuid import uuid4

from app.api.marketplace import (
    generate_buyer_matches,
)
from app.api.routes.transaction_assurance import (
    _buyer_snapshot,
    transaction_assurance_health,
)
from app.schemas.marketplace import (
    BuyerMatchBreakdownResponse,
    BuyerMatchItem,
)


def sample_breakdown():
    return BuyerMatchBreakdownResponse(
        crop_score=30,
        quantity_score=20,
        price_score=20,
        quality_score=15,
        distance_score=8,
        rating_score=4.5,
    )


def test_marketplace_schema_contains_verification():
    item = BuyerMatchItem(
        buyer_id=uuid4(),
        buyer_name="Demo Buyer",
        match_percentage=97.5,
        match_label="EXCELLENT",
        verification_status=(
            "AGRIVA_VERIFIED"
        ),
        verification_label=(
            "AGRIVA Verified"
        ),
        verification_note=(
            "AGRIVA platform review."
        ),
        agriva_verified=True,
        breakdown=sample_breakdown(),
    )

    assert item.agriva_verified is True
    assert (
        item.verification_status
        == "AGRIVA_VERIFIED"
    )


def test_marketplace_match_score_shape_unchanged():
    breakdown = sample_breakdown()

    assert breakdown.crop_score == 30
    assert breakdown.quantity_score == 20
    assert breakdown.price_score == 20
    assert breakdown.quality_score == 15
    assert breakdown.distance_score == 8
    assert breakdown.rating_score == 4.5


def test_marketplace_route_uses_verification_snapshot():
    source = inspect.getsource(
        generate_buyer_matches
    )

    assert (
        "verification_snapshot_for_profile"
        in source
    )

    assert (
        "agriva_verified"
        in source
    )


def test_transaction_assurance_uses_real_snapshot():
    source = inspect.getsource(
        _buyer_snapshot
    )

    assert (
        "verification_snapshot_for_profile"
        in source
    )

    assert (
        "BUYER_VERIFICATION_STATUS"
        not in source
    )


def test_transaction_assurance_health_reports_review_source():
    payload = (
        transaction_assurance_health()
    )

    assert (
        payload[
            "buyer_verification_source"
        ]
        == (
            "AGRIVA_ADMIN_DOCUMENT_REVIEW_"
            "AND_PLATFORM_HISTORY"
        )
    )

    assert (
        payload["bank_payment_verification"]
        is False
    )
