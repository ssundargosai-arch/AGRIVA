from uuid import UUID

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
