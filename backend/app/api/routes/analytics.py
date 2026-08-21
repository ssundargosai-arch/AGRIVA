from typing import Literal

from fastapi import (
    APIRouter,
    Depends,
    Query,
)
from sqlalchemy.orm import Session

from app.api.dependencies import (
    require_farmer,
)
from app.db.session import get_db
from app.models.user import User
from app.schemas.analytics import (
    FarmerAnalyticsResponse,
)
from app.services.analytics_service import (
    get_farmer_analytics,
)


router = APIRouter(
    prefix="/api/analytics",
    tags=["Analytics"],
)


@router.get(
    "/farmer",
    response_model=FarmerAnalyticsResponse,
)
def farmer_analytics(
    period: Literal[
        "daily",
        "weekly",
        "monthly",
        "yearly",
    ] = Query(
        default="monthly"
    ),
    db: Session = Depends(
        get_db
    ),
    current_user: User = Depends(
        require_farmer
    ),
):
    return get_farmer_analytics(
        db=db,
        user_id=current_user.id,
        period=period,
    )