from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from sqlalchemy.orm import Session

from app.api.dependencies import require_farmer
from app.db.session import get_db
from app.models.crop import Crop
from app.models.farm import FarmField
from app.models.user import User
from app.schemas.crop import (
    CropCreate,
    CropResponse,
)


router = APIRouter(
    prefix="/api/crops",
    tags=["Crops"],
)


def get_owned_field(
    db: Session,
    field_id: UUID,
    current_user: User,
) -> FarmField:
    farmer_profile = (
        current_user.farmer_profile
    )

    if not farmer_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Farmer profile not found",
        )

    field = (
        db.query(FarmField)
        .join(FarmField.farm)
        .filter(
            FarmField.id == field_id,
        )
        .first()
    )

    if not field:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Field not found",
        )

    if (
        field.farm.farmer_id
        != farmer_profile.id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "This field does not belong "
                "to the logged-in farmer"
            ),
        )

    return field


@router.post(
    "",
    response_model=CropResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_crop(
    payload: CropCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_farmer
    ),
):
    field = get_owned_field(
        db,
        payload.field_id,
        current_user,
    )

    crop = Crop(
        field_id=field.id,
        name=payload.name.strip(),
        variety=(
            payload.variety.strip()
            if payload.variety
            else None
        ),
        sowing_date=payload.sowing_date,
        expected_harvest_date=(
            payload.expected_harvest_date
        ),
        expected_yield_kg=(
            payload.expected_yield_kg
        ),
        status=payload.status.strip(),
    )

    db.add(crop)
    db.commit()
    db.refresh(crop)

    return crop


@router.get(
    "",
    response_model=list[CropResponse],
)
def list_crops(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_farmer
    ),
):
    farmer_profile = (
        current_user.farmer_profile
    )

    if not farmer_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Farmer profile not found",
        )

    crops = (
        db.query(Crop)
        .join(Crop.field)
        .join(FarmField.farm)
        .filter(
            FarmField.farm.has(
                farmer_id=farmer_profile.id
            )
        )
        .order_by(
            Crop.created_at.desc()
        )
        .all()
    )

    return crops


@router.get(
    "/field/{field_id}",
    response_model=list[CropResponse],
)
def list_field_crops(
    field_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_farmer
    ),
):
    field = get_owned_field(
        db,
        field_id,
        current_user,
    )

    crops = (
        db.query(Crop)
        .filter(
            Crop.field_id == field.id
        )
        .order_by(
            Crop.created_at.desc()
        )
        .all()
    )

    return crops