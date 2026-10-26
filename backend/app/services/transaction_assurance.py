ALLOWED_GRIEVANCE_CATEGORIES = {
    "PAYMENT",
    "DELIVERY",
    "QUALITY",
    "BUYER_COMMUNICATION",
    "OTHER",
}

ALLOWED_GRIEVANCE_STATUSES = {
    "OPEN",
    "IN_REVIEW",
    "RESOLVED",
    "REJECTED",
}

TERMINAL_GRIEVANCE_STATUSES = {
    "RESOLVED",
    "REJECTED",
}

BUYER_VERIFICATION_STATUS = "NOT_VERIFIED_BY_AGRIVA"
BUYER_VERIFICATION_NOTE = (
    "AGRIVA has profile and platform-activity records for this buyer, "
    "but Phase 6D does not claim government, KYC, bank, or independent "
    "identity verification."
)

BUYER_HISTORY_NOTE = (
    "Platform history is based only on AGRIVA database records. "
    "It is not a credit score, identity verification, or guarantee "
    "of future payment or delivery."
)

PAYMENT_REFERENCE_NOTE = (
    "The AGRIVA transaction reference is an internal platform record. "
    "It is not independent bank confirmation and does not guarantee "
    "settlement."
)

PAYMENT_RECORD_NOTE = (
    "A payment record exists in AGRIVA, but no transaction reference "
    "is recorded. This is not bank verification."
)

NO_PAYMENT_NOTE = (
    "No payment record is stored for this order in AGRIVA."
)


class AssuranceValidationError(ValueError):
    pass


def normalize_grievance_category(value: str) -> str:
    category = value.strip().upper()

    if category not in ALLOWED_GRIEVANCE_CATEGORIES:
        raise AssuranceValidationError(
            "Invalid grievance category. Allowed: "
            + ", ".join(sorted(ALLOWED_GRIEVANCE_CATEGORIES))
        )

    return category


def normalize_grievance_status(value: str) -> str:
    grievance_status = value.strip().upper()

    if grievance_status not in ALLOWED_GRIEVANCE_STATUSES:
        raise AssuranceValidationError(
            "Invalid grievance status. Allowed: "
            + ", ".join(sorted(ALLOWED_GRIEVANCE_STATUSES))
        )

    return grievance_status


def validate_grievance_transition(
    current_status: str,
    requested_status: str,
    resolution_note: str | None,
) -> str:
    current = normalize_grievance_status(current_status)
    requested = normalize_grievance_status(requested_status)

    if requested == current:
        if requested in TERMINAL_GRIEVANCE_STATUSES:
            if not (resolution_note or "").strip():
                raise AssuranceValidationError(
                    "Resolution note is required for terminal grievance status."
                )
        return requested

    transitions = {
        "OPEN": {"IN_REVIEW", "RESOLVED", "REJECTED"},
        "IN_REVIEW": {"RESOLVED", "REJECTED"},
        "RESOLVED": set(),
        "REJECTED": set(),
    }

    if requested not in transitions[current]:
        raise AssuranceValidationError(
            f"Invalid grievance status transition: {current} -> {requested}"
        )

    if requested in TERMINAL_GRIEVANCE_STATUSES:
        if not (resolution_note or "").strip():
            raise AssuranceValidationError(
                "Resolution note is required when resolving or rejecting a grievance."
            )

    return requested


def payment_evidence(
    *,
    payment_exists: bool,
    transaction_reference: str | None,
) -> tuple[str, str]:
    if not payment_exists:
        return "NO_PAYMENT_RECORD", NO_PAYMENT_NOTE

    if transaction_reference:
        return (
            "AGRIVA_TRANSACTION_REFERENCE_RECORDED",
            PAYMENT_REFERENCE_NOTE,
        )

    return "PAYMENT_RECORD_ONLY", PAYMENT_RECORD_NOTE
