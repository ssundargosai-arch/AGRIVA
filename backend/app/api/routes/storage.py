from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    status,
)
from sqlalchemy.orm import Session

from app.api.dependencies import (
    require_farmer,
)
from app.db.session import get_db
from app.models.user import User
from app.schemas.storage import (
    StorageCostEstimateResponse,
    StorageFacilityResponse,
    StorageRequestCreate,
    StorageRequestResponse,
)
from app.services.storage_service import (
    StorageNotFoundError,
    StorageValidationError,
    cancel_storage_request,
    create_storage_request,
    estimate_storage_cost,
    get_farmer_storage_requests,
    get_storage_facility,
    list_storage_facilities,
)


router = APIRouter(
    prefix="/api/storage",
    tags=["Storage Network"],
)


def _http_error(exc: Exception):
    if isinstance(
        exc,
        StorageNotFoundError,
    ):
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=str(exc),
        ) from exc

    raise HTTPException(
        status_code=(
            status.HTTP_422_UNPROCESSABLE_ENTITY
        ),
        detail=str(exc),
    ) from exc


@router.get("/health")
def storage_health():
    return {
        "status": "ok",
        "module": "AGRIVA Storage Network",
        "directory_mode": True,
        "real_time_provider_verification": False,
    }


@router.get(
    "/facilities",
    response_model=list[
        StorageFacilityResponse
    ],
)
def storage_facilities(
    district: str | None = None,
    state_name: str | None = Query(
        default=None,
        alias="state",
    ),
    facility_type: str | None = None,
    min_available_quintal: float | None = Query(
        default=None,
        ge=0,
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_farmer
    ),
):
    del current_user

    try:
        return list_storage_facilities(
            db=db,
            district=district,
            state=state_name,
            facility_type=facility_type,
            min_available_quintal=(
                min_available_quintal
            ),
        )

    except StorageValidationError as exc:
        _http_error(exc)


@router.get(
    "/facilities/{facility_id}",
    response_model=StorageFacilityResponse,
)
def storage_facility_detail(
    facility_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_farmer
    ),
):
    del current_user

    try:
        return get_storage_facility(
            db=db,
            facility_id=facility_id,
        )

    except (
        StorageNotFoundError,
        StorageValidationError,
    ) as exc:
        _http_error(exc)


@router.get(
    "/cost-estimate",
    response_model=(
        StorageCostEstimateResponse
    ),
)
def storage_cost_estimate(
    facility_id: UUID,
    quantity_quintal: float = Query(
        gt=0
    ),
    storage_days: int = Query(
        ge=1,
        le=365,
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_farmer
    ),
):
    del current_user

    try:
        return estimate_storage_cost(
            db=db,
            facility_id=facility_id,
            quantity_quintal=(
                quantity_quintal
            ),
            storage_days=storage_days,
        )

    except (
        StorageNotFoundError,
        StorageValidationError,
    ) as exc:
        _http_error(exc)


@router.post(
    "/requests",
    response_model=StorageRequestResponse,
    status_code=status.HTTP_201_CREATED,
)
def request_storage(
    payload: StorageRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_farmer
    ),
):
    try:
        return create_storage_request(
            db=db,
            farmer_user_id=current_user.id,
            facility_id=payload.facility_id,
            crop_name=payload.crop_name,
            quantity_quintal=(
                payload.quantity_quintal
            ),
            storage_days=(
                payload.storage_days
            ),
            listing_id=payload.listing_id,
            notes=payload.notes,
        )

    except (
        StorageNotFoundError,
        StorageValidationError,
    ) as exc:
        _http_error(exc)


@router.get(
    "/requests/my",
    response_model=list[
        StorageRequestResponse
    ],
)
def my_storage_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_farmer
    ),
):
    return get_farmer_storage_requests(
        db=db,
        farmer_user_id=current_user.id,
    )


@router.patch(
    "/requests/{request_id}/cancel",
    response_model=StorageRequestResponse,
)
def cancel_my_storage_request(
    request_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_farmer
    ),
):
    try:
        return cancel_storage_request(
            db=db,
            request_id=request_id,
            farmer_user_id=current_user.id,
        )

    except (
        StorageNotFoundError,
        StorageValidationError,
    ) as exc:
        _http_error(exc)
