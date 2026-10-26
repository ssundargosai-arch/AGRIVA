import hashlib
import os
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy.orm import Session

from app.models.buyer_verification import BuyerVerification
from app.models.user import BuyerProfile, User


MAX_DOCUMENT_BYTES = 5 * 1024 * 1024

ALLOWED_DOCUMENT_TYPES = {
    "GST_CERTIFICATE",
    "BUSINESS_REGISTRATION",
    "FPO_REGISTRATION",
    "OTHER_BUSINESS_DOCUMENT",
}

ALLOWED_CONTENT_TYPES = {
    "application/pdf": ".pdf",
    "image/jpeg": ".jpg",
    "image/png": ".png",
}

ALLOWED_REVIEW_STATUSES = {
    "AGRIVA_VERIFIED",
    "REJECTED",
}


class VerificationValidationError(ValueError):
    pass


class VerificationConflictError(ValueError):
    pass


class VerificationNotFoundError(LookupError):
    pass


def upload_root() -> Path:
    configured = os.getenv(
        "BUYER_VERIFICATION_UPLOAD_DIR"
    )

    if configured:
        root = Path(configured)
    else:
        root = (
            Path(__file__).resolve().parents[2]
            / "data"
            / "buyer_verification"
        )

    root.mkdir(
        parents=True,
        exist_ok=True,
    )

    return root.resolve()


def normalize_document_type(
    value: str,
) -> str:
    normalized = (
        str(value or "")
        .strip()
        .upper()
    )

    if normalized not in ALLOWED_DOCUMENT_TYPES:
        raise VerificationValidationError(
            "Invalid document type. Allowed: "
            + ", ".join(
                sorted(
                    ALLOWED_DOCUMENT_TYPES
                )
            )
        )

    return normalized


def normalize_gstin(
    value: str | None,
) -> str | None:
    if value is None:
        return None

    normalized = value.strip().upper()

    if not normalized:
        return None

    pattern = (
        r"^[0-9]{2}"
        r"[A-Z]{5}"
        r"[0-9]{4}"
        r"[A-Z]"
        r"[1-9A-Z]"
        r"Z"
        r"[0-9A-Z]$"
    )

    if not re.fullmatch(
        pattern,
        normalized,
    ):
        raise VerificationValidationError(
            "GSTIN format is invalid. "
            "AGRIVA only checks format here; "
            "it does not verify GST registration "
            "with a Government portal."
        )

    return normalized


def normalize_registration_number(
    value: str | None,
) -> str | None:
    if value is None:
        return None

    normalized = value.strip()

    if not normalized:
        return None

    if not 4 <= len(normalized) <= 80:
        raise VerificationValidationError(
            "Business registration number must "
            "contain 4 to 80 characters."
        )

    return normalized


def validate_document(
    *,
    filename: str | None,
    content_type: str | None,
    data: bytes,
) -> tuple[str, str]:
    if not filename:
        raise VerificationValidationError(
            "Document filename is required."
        )

    if content_type not in ALLOWED_CONTENT_TYPES:
        raise VerificationValidationError(
            "Only PDF, JPG and PNG documents "
            "are accepted."
        )

    if not data:
        raise VerificationValidationError(
            "Uploaded document is empty."
        )

    if len(data) > MAX_DOCUMENT_BYTES:
        raise VerificationValidationError(
            "Document must be 5 MB or smaller."
        )

    safe_original_name = Path(
        filename
    ).name

    extension = (
        ALLOWED_CONTENT_TYPES[
            content_type
        ]
    )

    return (
        safe_original_name,
        extension,
    )


def verification_note(
    status: str,
) -> str:
    if status == "AGRIVA_VERIFIED":
        return (
            "AGRIVA admin reviewed the buyer's "
            "submitted platform business document. "
            "AGRIVA Verified is an internal platform "
            "review status only. It is not Government "
            "KYC, GST-authority verification, bank "
            "verification, credit scoring, or a "
            "guarantee of future payment or delivery."
        )

    if status == "PENDING":
        return (
            "Buyer documents were submitted to "
            "AGRIVA and are awaiting platform-admin "
            "review. No Government, KYC, bank or "
            "independent identity verification is "
            "claimed."
        )

    if status == "REJECTED":
        return (
            "AGRIVA did not approve the submitted "
            "document review. This status is an "
            "internal platform review result only."
        )

    return (
        "This buyer has not submitted an AGRIVA "
        "platform verification request. No "
        "Government, KYC, bank or independent "
        "identity verification is claimed."
    )


def status_label(
    status: str,
) -> str:
    labels = {
        "UNVERIFIED": "Not verified by AGRIVA",
        "PENDING": "AGRIVA review pending",
        "AGRIVA_VERIFIED": "AGRIVA Verified",
        "REJECTED": "AGRIVA review rejected",
    }

    return labels.get(
        status,
        status,
    )


def get_buyer_profile(
    *,
    db: Session,
    user_id,
) -> BuyerProfile:
    profile = (
        db.query(BuyerProfile)
        .filter(
            BuyerProfile.user_id
            == user_id
        )
        .first()
    )

    if profile is None:
        raise VerificationNotFoundError(
            "Buyer profile not found."
        )

    return profile


def get_verification_for_profile(
    *,
    db: Session,
    buyer_profile_id,
) -> BuyerVerification | None:
    return (
        db.query(BuyerVerification)
        .filter(
            BuyerVerification.buyer_profile_id
            == buyer_profile_id
        )
        .first()
    )


def serialize_verification(
    *,
    profile: BuyerProfile,
    record: BuyerVerification | None,
) -> dict:
    status = (
        record.status
        if record is not None
        else "UNVERIFIED"
    )

    return {
        "verification_id": (
            record.id
            if record is not None
            else None
        ),
        "buyer_profile_id": profile.id,

        "business_name": profile.business_name,
        "business_type": profile.business_type,
        "city": profile.city,
        "state": profile.state,

        "status": status,
        "status_label": (
            status_label(status)
        ),
        "verification_note": (
            verification_note(status)
        ),

        "document_type": (
            record.document_type
            if record is not None
            else None
        ),

        "gstin": (
            record.gstin
            if record is not None
            else None
        ),

        "business_registration_number": (
            record.business_registration_number
            if record is not None
            else None
        ),

        "document_original_name": (
            record.document_original_name
            if record is not None
            else None
        ),

        "submitted_at": (
            record.submitted_at
            if record is not None
            else None
        ),

        "reviewed_at": (
            record.reviewed_at
            if record is not None
            else None
        ),

        "review_note": (
            record.review_note
            if record is not None
            else None
        ),
    }


def public_verification_snapshot(
    *,
    db: Session,
    buyer_profile_id,
) -> dict:
    profile = (
        db.query(BuyerProfile)
        .filter(
            BuyerProfile.id
            == buyer_profile_id
        )
        .first()
    )

    if profile is None:
        raise VerificationNotFoundError(
            "Buyer profile not found."
        )

    record = get_verification_for_profile(
        db=db,
        buyer_profile_id=profile.id,
    )

    status = (
        record.status
        if record is not None
        else "UNVERIFIED"
    )

    return {
        "buyer_profile_id": profile.id,
        "status": status,
        "status_label": (
            status_label(status)
        ),
        "verification_note": (
            verification_note(status)
        ),
        "reviewed_at": (
            record.reviewed_at
            if record is not None
            else None
        ),
    }


def submit_verification(
    *,
    db: Session,
    current_user: User,
    document_type: str,
    gstin: str | None,
    business_registration_number: str | None,
    declaration_accepted: bool,
    filename: str | None,
    content_type: str | None,
    data: bytes,
) -> dict:
    if not declaration_accepted:
        raise VerificationValidationError(
            "Buyer declaration must be accepted."
        )

    profile = get_buyer_profile(
        db=db,
        user_id=current_user.id,
    )

    normalized_document_type = (
        normalize_document_type(
            document_type
        )
    )

    normalized_gstin = (
        normalize_gstin(
            gstin
        )
    )

    normalized_registration = (
        normalize_registration_number(
            business_registration_number
        )
    )

    original_name, extension = (
        validate_document(
            filename=filename,
            content_type=content_type,
            data=data,
        )
    )

    existing = (
        get_verification_for_profile(
            db=db,
            buyer_profile_id=profile.id,
        )
    )

    if existing is not None:
        if existing.status == "PENDING":
            raise VerificationConflictError(
                "Verification is already pending "
                "AGRIVA admin review."
            )

        if (
            existing.status
            == "AGRIVA_VERIFIED"
        ):
            raise VerificationConflictError(
                "Buyer is already AGRIVA Verified."
            )

    root = upload_root()

    buyer_dir = (
        root /
        str(profile.id)
    )

    buyer_dir.mkdir(
        parents=True,
        exist_ok=True,
    )

    stored_basename = (
        f"{uuid.uuid4().hex}"
        f"{extension}"
    )

    stored_path = (
        buyer_dir /
        stored_basename
    )

    stored_path.write_bytes(
        data
    )

    relative_name = str(
        stored_path.relative_to(
            root
        )
    )

    sha256 = hashlib.sha256(
        data
    ).hexdigest()

    old_stored_name = (
        existing.document_stored_name
        if existing is not None
        else None
    )

    if existing is None:
        record = BuyerVerification(
            buyer_profile_id=profile.id,
            status="PENDING",
            document_type=(
                normalized_document_type
            ),
            business_name_snapshot=(
                profile.business_name
            ),
            business_type_snapshot=(
                profile.business_type
            ),
            gstin=normalized_gstin,
            business_registration_number=(
                normalized_registration
            ),
            document_original_name=(
                original_name
            ),
            document_stored_name=(
                relative_name
            ),
            document_content_type=(
                content_type
            ),
            document_size_bytes=(
                len(data)
            ),
            document_sha256=sha256,
            declaration_accepted=True,
        )

        db.add(record)

    else:
        record = existing

        record.status = "PENDING"
        record.document_type = (
            normalized_document_type
        )
        record.business_name_snapshot = (
            profile.business_name
        )
        record.business_type_snapshot = (
            profile.business_type
        )
        record.gstin = normalized_gstin
        record.business_registration_number = (
            normalized_registration
        )
        record.document_original_name = (
            original_name
        )
        record.document_stored_name = (
            relative_name
        )
        record.document_content_type = (
            content_type
        )
        record.document_size_bytes = (
            len(data)
        )
        record.document_sha256 = (
            sha256
        )
        record.declaration_accepted = (
            True
        )
        record.review_note = None
        record.reviewed_by_admin_user_id = (
            None
        )
        record.reviewed_at = None
        record.submitted_at = (
            datetime.now(
                timezone.utc
            )
        )

    try:
        db.commit()
        db.refresh(record)

    except Exception:
        db.rollback()

        try:
            stored_path.unlink(
                missing_ok=True
            )
        except OSError:
            pass

        raise

    if old_stored_name:
        old_path = (
            root /
            old_stored_name
        ).resolve()

        try:
            if (
                old_path != stored_path.resolve()
                and root
                in old_path.parents
            ):
                old_path.unlink(
                    missing_ok=True
                )
        except OSError:
            pass

    return serialize_verification(
        profile=profile,
        record=record,
    )


def normalize_review_status(
    value: str,
) -> str:
    normalized = (
        str(value or "")
        .strip()
        .upper()
    )

    if normalized not in ALLOWED_REVIEW_STATUSES:
        raise VerificationValidationError(
            "Admin review status must be "
            "AGRIVA_VERIFIED or REJECTED."
        )

    return normalized


def validate_review_transition(
    *,
    current_status: str,
    requested_status: str,
    review_note: str | None,
) -> str:
    requested = normalize_review_status(
        requested_status
    )

    if current_status != "PENDING":
        raise VerificationConflictError(
            "Only PENDING verification "
            "requests can be reviewed."
        )

    if (
        requested == "REJECTED"
        and not (
            review_note or ""
        ).strip()
    ):
        raise VerificationValidationError(
            "Review note is required "
            "when rejecting verification."
        )

    return requested


def review_verification(
    *,
    db: Session,
    verification_id,
    admin_user: User,
    requested_status: str,
    review_note: str | None,
) -> dict:
    record = (
        db.query(BuyerVerification)
        .filter(
            BuyerVerification.id
            == verification_id
        )
        .first()
    )

    if record is None:
        raise VerificationNotFoundError(
            "Verification request not found."
        )

    new_status = (
        validate_review_transition(
            current_status=(
                record.status
            ),
            requested_status=(
                requested_status
            ),
            review_note=(
                review_note
            ),
        )
    )

    record.status = new_status

    record.review_note = (
        (review_note or "").strip()
        or None
    )

    record.reviewed_by_admin_user_id = (
        admin_user.id
    )

    record.reviewed_at = (
        datetime.now(
            timezone.utc
        )
    )

    db.commit()
    db.refresh(record)

    profile = (
        db.query(BuyerProfile)
        .filter(
            BuyerProfile.id
            == record.buyer_profile_id
        )
        .first()
    )

    if profile is None:
        raise VerificationNotFoundError(
            "Buyer profile not found."
        )

    return serialize_verification(
        profile=profile,
        record=record,
    )


def document_path(
    record: BuyerVerification,
) -> Path:
    root = upload_root()

    path = (
        root /
        record.document_stored_name
    ).resolve()

    if (
        path != root
        and root not in path.parents
    ):
        raise VerificationValidationError(
            "Invalid stored document path."
        )

    if not path.is_file():
        raise VerificationNotFoundError(
            "Verification document file "
            "was not found."
        )

    return path



def verification_snapshot_for_profile(
    *,
    db: Session,
    buyer_profile_id: uuid.UUID | None,
) -> dict:
    """
    Return AGRIVA platform verification information
    without implying Government/KYC/bank verification.
    """

    if buyer_profile_id is None:
        status = "UNVERIFIED"

        return {
            "status": status,
            "status_label": status_label(
                status
            ),
            "verification_note": (
                verification_note(
                    status
                )
            ),
            "reviewed_at": None,
        }

    record = (
        get_verification_for_profile(
            db=db,
            buyer_profile_id=(
                buyer_profile_id
            ),
        )
    )

    status = (
        record.status
        if record is not None
        else "UNVERIFIED"
    )

    return {
        "status": status,
        "status_label": (
            status_label(status)
        ),
        "verification_note": (
            verification_note(status)
        ),
        "reviewed_at": (
            record.reviewed_at
            if record is not None
            else None
        ),
    }
