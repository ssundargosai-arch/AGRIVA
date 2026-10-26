import pytest

from app.api.routes.transaction_assurance import (
    transaction_assurance_health,
)
from app.services.transaction_assurance import (
    AssuranceValidationError,
    normalize_grievance_category,
    normalize_grievance_status,
    payment_evidence,
    validate_grievance_transition,
)


def test_phase6d_health_safety_flags():
    result = transaction_assurance_health()

    assert result["status"] == "ok"
    assert result["phase"] == "SIH-6D"
    assert result["bank_payment_verification"] is False
    assert result["payment_guarantee"] is False
    assert result["delivery_guarantee"] is False
    assert result["grievance_mutates_order"] is False
    assert result["grievance_mutates_payment"] is False
    assert result["grievance_mutates_transport"] is False


def test_grievance_category_normalization():
    assert normalize_grievance_category(" payment ") == "PAYMENT"
    assert normalize_grievance_category("buyer_communication") == (
        "BUYER_COMMUNICATION"
    )


def test_invalid_grievance_category_fails_closed():
    with pytest.raises(AssuranceValidationError):
        normalize_grievance_category("bank_verified")


def test_grievance_status_normalization():
    assert normalize_grievance_status(" in_review ") == "IN_REVIEW"


def test_open_to_in_review_transition():
    assert validate_grievance_transition(
        "OPEN",
        "IN_REVIEW",
        None,
    ) == "IN_REVIEW"


def test_terminal_transition_requires_resolution_note():
    with pytest.raises(AssuranceValidationError):
        validate_grievance_transition(
            "IN_REVIEW",
            "RESOLVED",
            None,
        )


def test_terminal_grievance_cannot_reopen():
    with pytest.raises(AssuranceValidationError):
        validate_grievance_transition(
            "RESOLVED",
            "OPEN",
            "Already resolved",
        )


def test_payment_evidence_no_record():
    level, note = payment_evidence(
        payment_exists=False,
        transaction_reference=None,
    )

    assert level == "NO_PAYMENT_RECORD"
    assert "No payment record" in note


def test_payment_evidence_record_only():
    level, note = payment_evidence(
        payment_exists=True,
        transaction_reference=None,
    )

    assert level == "PAYMENT_RECORD_ONLY"
    assert "not bank verification" in note


def test_transaction_reference_is_not_bank_verification():
    level, note = payment_evidence(
        payment_exists=True,
        transaction_reference="AGRIVA-ABC123",
    )

    assert level == "AGRIVA_TRANSACTION_REFERENCE_RECORDED"
    assert "not independent bank confirmation" in note
