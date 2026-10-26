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
from app.schemas.mandi_arrival import (
    ArrivalIntelligenceResponse,
)
from app.services.mandi_arrival_service import (
    get_arrival_intelligence,
)


router = APIRouter(
    prefix="/api/market-intelligence",
    tags=["Market Arrival Intelligence"],
)


@router.get("/arrivals/health")
def arrivals_health():
    return {
        "status": "ok",
        "module": (
            "AGRIVA Mandi Arrival Intelligence"
        ),
        "live_price_supported": True,
        "live_arrival_quantity_supported": False,
        "arrival_fallback": (
            "labelled historical/demo dataset"
        ),
    }


@router.get(
    "/arrivals",
    response_model=(
        ArrivalIntelligenceResponse
    ),
)
def mandi_arrival_intelligence(
    crop: str = Query(
        min_length=2,
        max_length=100,
    ),
    district: str = Query(
        min_length=2,
        max_length=120,
    ),
    state_name: str = Query(
        default="Maharashtra",
        alias="state",
        min_length=2,
        max_length=120,
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_farmer
    ),
):
    del current_user

    try:
        return get_arrival_intelligence(
            db=db,
            crop=crop,
            district=district,
            state=state_name,
        )

    except LookupError as exc:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=str(exc),
        ) from exc
