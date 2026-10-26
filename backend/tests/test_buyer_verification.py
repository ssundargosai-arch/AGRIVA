import pytest

from app.main import app
from app.services.buyer_verification import (
    VerificationValidationError,
    normalize_document_type,
    normalize_gstin,
    validate_review_transition,
    verification_note,
)


def test_buyer_verification_routes_registered():
    paths = {
        route.path
        for route in app.routes
    }

    assert (
        "/api/buyer-verification/health"
        in paths
    )

    assert (
        "/api/buyer-verification/me"
        in paths
    )

    assert (
        "/api/buyer-verification/submit"
        in paths
    )

    assert (
        "/api/buyer-verification/"
        "status/{buyer_profile_id}"
        in paths
    )

    assert (
        "/api/buyer-verification/"
        "admin/submissions"
        in paths
    )


def test_document_type_normalization():
    assert (
        normalize_document_type(
            " gst_certificate "
        )
        == "GST_CERTIFICATE"
    )


def test_invalid_document_type():
    with pytest.raises(
        VerificationValidationError
    ):
        normalize_document_type(
            "passport"
        )


def test_empty_gstin_allowed():
    assert normalize_gstin(
        ""
    ) is None


def test_valid_gstin_format():
    assert (
        normalize_gstin(
            "27ABCDE1234F1Z5"
        )
        == "27ABCDE1234F1Z5"
    )


def test_invalid_gstin_rejected():
    with pytest.raises(
        VerificationValidationError
    ):
        normalize_gstin(
            "INVALID-GST"
        )


def test_pending_can_be_verified():
    assert (
        validate_review_transition(
            current_status="PENDING",
            requested_status=(
                "AGRIVA_VERIFIED"
            ),
            review_note=(
                "Documents reviewed."
            ),
        )
        == "AGRIVA_VERIFIED"
    )


def test_rejection_requires_note():
    with pytest.raises(
        VerificationValidationError
    ):
        validate_review_transition(
            current_status="PENDING",
            requested_status="REJECTED",
            review_note=None,
        )


def test_pending_can_be_rejected_with_note():
    assert (
        validate_review_transition(
            current_status="PENDING",
            requested_status="REJECTED",
            review_note=(
                "Document details "
                "were insufficient."
            ),
        )
        == "REJECTED"
    )


def test_verified_note_does_not_claim_government_kyc():
    note = verification_note(
        "AGRIVA_VERIFIED"
    ).lower()

    assert "internal platform" in note
    assert "not government" in note
    assert "bank verification" in note
