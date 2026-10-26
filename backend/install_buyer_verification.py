from pathlib import Path
import shutil

ROOT = Path(r"D:\AGRIVA\backend")

FILES = {}

# =========================================================
# MODEL
# =========================================================

FILES["app/models/buyer_verification.py"] = r'''import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class BuyerVerification(Base):
    __tablename__ = "buyer_verifications"

    __table_args__ = (
        CheckConstraint(
            "status IN ("
            "'PENDING', "
            "'AGRIVA_VERIFIED', "
            "'REJECTED'"
            ")",
            name="ck_buyer_verification_status",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    buyer_profile_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "buyer_profiles.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        unique=True,
        index=True,
    )

    status: Mapped[str] = mapped_column(
        String(40),
        nullable=False,
        default="PENDING",
        index=True,
    )

    document_type: Mapped[str] = mapped_column(
        String(60),
        nullable=False,
    )

    business_name_snapshot: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )

    business_type_snapshot: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    gstin: Mapped[str | None] = mapped_column(
        String(15),
        nullable=True,
    )

    business_registration_number: Mapped[str | None] = mapped_column(
        String(80),
        nullable=True,
    )

    document_original_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    document_stored_name: Mapped[str] = mapped_column(
        String(400),
        nullable=False,
    )

    document_content_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    document_size_bytes: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    document_sha256: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
    )

    declaration_accepted: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )

    review_note: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    reviewed_by_admin_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "users.id",
            ondelete="SET NULL",
        ),
        nullable=True,
    )

    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    reviewed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
'''

# =========================================================
# SCHEMAS
# =========================================================

FILES["app/schemas/buyer_verification.py"] = r'''from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class BuyerVerificationResponse(BaseModel):
    verification_id: UUID | None = None
    buyer_profile_id: UUID

    business_name: str
    business_type: str
    city: str
    state: str

    status: str
    status_label: str
    verification_note: str

    document_type: str | None = None
    gstin: str | None = None
    business_registration_number: str | None = None

    document_original_name: str | None = None

    submitted_at: datetime | None = None
    reviewed_at: datetime | None = None
    review_note: str | None = None


class BuyerPublicVerificationResponse(BaseModel):
    buyer_profile_id: UUID
    status: str
    status_label: str
    verification_note: str
    reviewed_at: datetime | None = None


class BuyerVerificationReviewRequest(BaseModel):
    status: str
    review_note: str | None = Field(
        default=None,
        max_length=1000,
    )
'''

# =========================================================
# SERVICE
# =========================================================

FILES["app/services/buyer_verification.py"] = r'''import hashlib
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
'''

# =========================================================
# ROUTER
# =========================================================

FILES["app/api/routes/buyer_verification.py"] = r'''from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.dependencies import (
    get_current_user,
    require_admin,
    require_buyer,
)
from app.db.session import get_db
from app.models.buyer_verification import BuyerVerification
from app.models.user import BuyerProfile, User
from app.schemas.buyer_verification import (
    BuyerPublicVerificationResponse,
    BuyerVerificationResponse,
    BuyerVerificationReviewRequest,
)
from app.services.buyer_verification import (
    VerificationConflictError,
    VerificationNotFoundError,
    VerificationValidationError,
    document_path,
    get_buyer_profile,
    get_verification_for_profile,
    public_verification_snapshot,
    review_verification,
    serialize_verification,
    submit_verification,
)


router = APIRouter(
    prefix="/api/buyer-verification",
    tags=["Buyer Verification"],
)


def handle_verification_error(
    exc: Exception,
):
    if isinstance(
        exc,
        VerificationValidationError,
    ):
        raise HTTPException(
            status_code=(
                status.HTTP_422_UNPROCESSABLE_ENTITY
            ),
            detail=str(exc),
        ) from exc

    if isinstance(
        exc,
        VerificationConflictError,
    ):
        raise HTTPException(
            status_code=(
                status.HTTP_409_CONFLICT
            ),
            detail=str(exc),
        ) from exc

    if isinstance(
        exc,
        VerificationNotFoundError,
    ):
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=str(exc),
        ) from exc

    raise exc


@router.get("/health")
def buyer_verification_health():
    return {
        "status": "ok",
        "module": (
            "AGRIVA Buyer Verification"
        ),
        "verification_scope": (
            "AGRIVA_ADMIN_DOCUMENT_REVIEW"
        ),
        "government_kyc": False,
        "government_gst_verification": False,
        "bank_verification": False,
        "credit_scoring": False,
        "payment_guarantee": False,
        "delivery_guarantee": False,
    }


@router.get(
    "/me",
    response_model=(
        BuyerVerificationResponse
    ),
)
def my_buyer_verification(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_buyer
    ),
):
    try:
        profile = get_buyer_profile(
            db=db,
            user_id=current_user.id,
        )

        record = (
            get_verification_for_profile(
                db=db,
                buyer_profile_id=(
                    profile.id
                ),
            )
        )

        return serialize_verification(
            profile=profile,
            record=record,
        )

    except Exception as exc:
        return handle_verification_error(
            exc
        )


@router.post(
    "/submit",
    response_model=(
        BuyerVerificationResponse
    ),
)
async def submit_buyer_verification(
    document_type: str = Form(...),
    gstin: str | None = Form(
        default=None
    ),
    business_registration_number:
        str | None = Form(
            default=None
        ),
    declaration_accepted: bool = Form(
        ...
    ),
    document: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_buyer
    ),
):
    try:
        data = await document.read()

        return submit_verification(
            db=db,
            current_user=current_user,
            document_type=document_type,
            gstin=gstin,
            business_registration_number=(
                business_registration_number
            ),
            declaration_accepted=(
                declaration_accepted
            ),
            filename=document.filename,
            content_type=(
                document.content_type
            ),
            data=data,
        )

    except Exception as exc:
        return handle_verification_error(
            exc
        )

    finally:
        await document.close()


@router.get(
    "/status/{buyer_profile_id}",
    response_model=(
        BuyerPublicVerificationResponse
    ),
)
def buyer_verification_status(
    buyer_profile_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    del current_user

    try:
        return (
            public_verification_snapshot(
                db=db,
                buyer_profile_id=(
                    buyer_profile_id
                ),
            )
        )

    except Exception as exc:
        return handle_verification_error(
            exc
        )


@router.get(
    "/admin/submissions",
    response_model=list[
        BuyerVerificationResponse
    ],
)
def admin_verification_submissions(
    status_filter: str | None = Query(
        default=None,
        alias="status",
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_admin
    ),
):
    del current_user

    query = (
        db.query(
            BuyerVerification,
            BuyerProfile,
        )
        .join(
            BuyerProfile,
            BuyerVerification
            .buyer_profile_id
            == BuyerProfile.id,
        )
    )

    if status_filter:
        normalized = (
            status_filter
            .strip()
            .upper()
        )

        if normalized not in {
            "PENDING",
            "AGRIVA_VERIFIED",
            "REJECTED",
        }:
            raise HTTPException(
                status_code=422,
                detail=(
                    "Invalid verification "
                    "status filter."
                ),
            )

        query = query.filter(
            BuyerVerification.status
            == normalized
        )

    rows = (
        query
        .order_by(
            BuyerVerification
            .submitted_at
            .desc()
        )
        .all()
    )

    return [
        serialize_verification(
            profile=profile,
            record=record,
        )
        for record, profile
        in rows
    ]


@router.patch(
    "/admin/submissions/{verification_id}",
    response_model=(
        BuyerVerificationResponse
    ),
)
def admin_review_verification(
    verification_id: UUID,
    payload: (
        BuyerVerificationReviewRequest
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_admin
    ),
):
    try:
        return review_verification(
            db=db,
            verification_id=(
                verification_id
            ),
            admin_user=current_user,
            requested_status=(
                payload.status
            ),
            review_note=(
                payload.review_note
            ),
        )

    except Exception as exc:
        return handle_verification_error(
            exc
        )


@router.get(
    "/admin/submissions/"
    "{verification_id}/document"
)
def admin_verification_document(
    verification_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_admin
    ),
):
    del current_user

    record = (
        db.query(BuyerVerification)
        .filter(
            BuyerVerification.id
            == verification_id
        )
        .first()
    )

    if record is None:
        raise HTTPException(
            status_code=404,
            detail=(
                "Verification request "
                "not found."
            ),
        )

    try:
        path = document_path(
            record
        )

    except Exception as exc:
        return handle_verification_error(
            exc
        )

    return FileResponse(
        path=str(path),
        media_type=(
            record.document_content_type
        ),
        filename=(
            record.document_original_name
        ),
    )
'''

# =========================================================
# MIGRATION
# =========================================================

FILES["alembic/versions/6g01_buyer_verification.py"] = r'''"""add buyer verification

Revision ID: 6g01_buyer_verification
Revises: 6f01_mandi_arrivals
"""

from typing import (
    Sequence,
    Union,
)

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = (
    "6g01_buyer_verification"
)

down_revision: Union[
    str,
    None,
] = "6f01_mandi_arrivals"

branch_labels: Union[
    str,
    Sequence[str],
    None,
] = None

depends_on: Union[
    str,
    Sequence[str],
    None,
] = None


def upgrade() -> None:
    op.create_table(
        "buyer_verifications",

        sa.Column(
            "id",
            postgresql.UUID(
                as_uuid=True
            ),
            nullable=False,
        ),

        sa.Column(
            "buyer_profile_id",
            postgresql.UUID(
                as_uuid=True
            ),
            nullable=False,
        ),

        sa.Column(
            "status",
            sa.String(length=40),
            nullable=False,
        ),

        sa.Column(
            "document_type",
            sa.String(length=60),
            nullable=False,
        ),

        sa.Column(
            "business_name_snapshot",
            sa.String(length=200),
            nullable=False,
        ),

        sa.Column(
            "business_type_snapshot",
            sa.String(length=100),
            nullable=False,
        ),

        sa.Column(
            "gstin",
            sa.String(length=15),
            nullable=True,
        ),

        sa.Column(
            "business_registration_number",
            sa.String(length=80),
            nullable=True,
        ),

        sa.Column(
            "document_original_name",
            sa.String(length=255),
            nullable=False,
        ),

        sa.Column(
            "document_stored_name",
            sa.String(length=400),
            nullable=False,
        ),

        sa.Column(
            "document_content_type",
            sa.String(length=100),
            nullable=False,
        ),

        sa.Column(
            "document_size_bytes",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "document_sha256",
            sa.String(length=64),
            nullable=False,
        ),

        sa.Column(
            "declaration_accepted",
            sa.Boolean(),
            nullable=False,
        ),

        sa.Column(
            "review_note",
            sa.Text(),
            nullable=True,
        ),

        sa.Column(
            "reviewed_by_admin_user_id",
            postgresql.UUID(
                as_uuid=True
            ),
            nullable=True,
        ),

        sa.Column(
            "submitted_at",
            sa.DateTime(
                timezone=True
            ),
            server_default=(
                sa.text("now()")
            ),
            nullable=False,
        ),

        sa.Column(
            "reviewed_at",
            sa.DateTime(
                timezone=True
            ),
            nullable=True,
        ),

        sa.Column(
            "updated_at",
            sa.DateTime(
                timezone=True
            ),
            server_default=(
                sa.text("now()")
            ),
            nullable=False,
        ),

        sa.CheckConstraint(
            "status IN ("
            "'PENDING', "
            "'AGRIVA_VERIFIED', "
            "'REJECTED'"
            ")",
            name=(
                "ck_buyer_verification_status"
            ),
        ),

        sa.ForeignKeyConstraint(
            ["buyer_profile_id"],
            ["buyer_profiles.id"],
            ondelete="CASCADE",
        ),

        sa.ForeignKeyConstraint(
            [
                "reviewed_by_admin_user_id"
            ],
            ["users.id"],
            ondelete="SET NULL",
        ),

        sa.PrimaryKeyConstraint(
            "id"
        ),

        sa.UniqueConstraint(
            "buyer_profile_id",
            name=(
                "uq_buyer_verification_"
                "buyer_profile"
            ),
        ),
    )

    op.create_index(
        "ix_buyer_verifications_"
        "buyer_profile_id",
        "buyer_verifications",
        ["buyer_profile_id"],
        unique=True,
    )

    op.create_index(
        "ix_buyer_verifications_status",
        "buyer_verifications",
        ["status"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_buyer_verifications_status",
        table_name=(
            "buyer_verifications"
        ),
    )

    op.drop_index(
        "ix_buyer_verifications_"
        "buyer_profile_id",
        table_name=(
            "buyer_verifications"
        ),
    )

    op.drop_table(
        "buyer_verifications"
    )
'''

# =========================================================
# TESTS
# =========================================================

FILES["tests/test_buyer_verification.py"] = r'''import pytest

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
'''


# =========================================================
# BACKUPS
# =========================================================

backup_root = (
    ROOT /
    "backup-before-buyer-verification"
)

backup_root.mkdir(
    parents=True,
    exist_ok=True,
)

for rel in [
    "app/main.py",
    "app/models/__init__.py",
]:
    src = ROOT / rel

    if src.exists():
        dst = (
            backup_root /
            rel
        )

        dst.parent.mkdir(
            parents=True,
            exist_ok=True,
        )

        shutil.copy2(
            src,
            dst,
        )


# =========================================================
# WRITE NEW FILES
# =========================================================

for rel, content in FILES.items():
    path = ROOT / rel

    if path.exists():
        raise RuntimeError(
            "Refusing to overwrite "
            f"existing file: {path}"
        )

    path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    path.write_text(
        content,
        encoding="utf-8",
        newline="\n",
    )

    print(
        "CREATED:",
        rel,
    )


# =========================================================
# REGISTER MODEL
# =========================================================

models_init = (
    ROOT /
    "app/models/__init__.py"
)

models_text = models_init.read_text(
    encoding="utf-8-sig"
)

model_import = (
    "from .buyer_verification "
    "import BuyerVerification"
)

if model_import not in models_text:
    models_text = (
        models_text.rstrip()
        + "\n"
        + model_import
        + "\n"
    )

models_init.write_text(
    models_text,
    encoding="utf-8",
    newline="\n",
)

print(
    "UPDATED: app/models/__init__.py"
)


# =========================================================
# REGISTER ROUTER
# =========================================================

main = ROOT / "app/main.py"

main_text = main.read_text(
    encoding="utf-8-sig"
)

import_line = (
    "from app.api.routes."
    "buyer_verification "
    "import router as "
    "buyer_verification_router"
)

if import_line not in main_text:
    marker = "app = FastAPI"

    index = main_text.find(
        marker
    )

    if index == -1:
        raise RuntimeError(
            "FastAPI app marker not found."
        )

    main_text = (
        main_text[:index]
        + import_line
        + "\n\n"
        + main_text[index:]
    )

include_line = (
    "app.include_router("
    "buyer_verification_router)"
)

if include_line not in main_text:
    main_text = (
        main_text.rstrip()
        + "\n\n"
        + include_line
        + "\n"
    )

main.write_text(
    main_text,
    encoding="utf-8",
    newline="\n",
)

print(
    "UPDATED: app/main.py"
)

print()
print(
    "AGRIVA BUYER VERIFICATION "
    "BACKEND INSTALLED"
)
print(
    "Status flow: "
    "UNVERIFIED -> PENDING -> "
    "AGRIVA_VERIFIED / REJECTED"
)
print(
    "Government KYC claim: FALSE"
)
print(
    "Backup:",
    backup_root,
)
