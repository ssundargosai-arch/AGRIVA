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
from app.models.farm import Farm, FarmField
from app.models.user import FarmerProfile, User
from app.schemas.farm import (
    FarmCreate,
    FarmResponse,
    FieldCreate,
    FieldResponse,
)


router = APIRouter(
    prefix="/api/farms",
    tags=["Farm Management"],
)


def get_farmer_profile(
    db: Session,
    current_user: User,
) -> FarmerProfile:
    profile = (
        db.query(FarmerProfile)
        .filter(
            FarmerProfile.user_id
            == current_user.id
        )
        .first()
    )

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "Farmer profile not found"
            ),
        )

    return profile


def get_owned_farm(
    db: Session,
    farm_id: UUID,
    farmer_profile: FarmerProfile,
) -> Farm:
    farm = (
        db.query(Farm)
        .filter(
            Farm.id == farm_id,
            Farm.farmer_id
            == farmer_profile.id,
        )
        .first()
    )

    if not farm:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "Farm not found"
            ),
        )

    return farm


@router.post(
    "",
    response_model=FarmResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_farm(
    payload: FarmCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_farmer
    ),
):
    farmer_profile = (
        get_farmer_profile(
            db,
            current_user,
        )
    )

    farm = Farm(
        farmer_id=farmer_profile.id,
        name=payload.name.strip(),
        village=payload.village.strip(),
        district=payload.district.strip(),
        state=payload.state.strip(),
        total_area_acres=(
            payload.total_area_acres
        ),
    )

    db.add(farm)
    db.commit()
    db.refresh(farm)

    return farm


@router.get(
    "",
    response_model=list[FarmResponse],
)
def list_farms(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_farmer
    ),
):
    farmer_profile = (
        get_farmer_profile(
            db,
            current_user,
        )
    )

    farms = (
        db.query(Farm)
        .filter(
            Farm.farmer_id
            == farmer_profile.id
        )
        .order_by(
            Farm.created_at.desc()
        )
        .all()
    )

    return farms


@router.post(
    "/{farm_id}/fields",
    response_model=FieldResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_field(
    farm_id: UUID,
    payload: FieldCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_farmer
    ),
):
    farmer_profile = (
        get_farmer_profile(
            db,
            current_user,
        )
    )

    farm = get_owned_farm(
        db,
        farm_id,
        farmer_profile,
    )

    field = FarmField(
        farm_id=farm.id,
        field_name=(
            payload.field_name.strip()
        ),
        area_acres=payload.area_acres,
        soil_type=(
            payload.soil_type.strip()
            if payload.soil_type
            else None
        ),
        latitude=payload.latitude,
        longitude=payload.longitude,
    )

    db.add(field)
    db.commit()
    db.refresh(field)

    return field


@router.get(
    "/{farm_id}/fields",
    response_model=list[FieldResponse],
)
def list_fields(
    farm_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_farmer
    ),
):
    farmer_profile = (
        get_farmer_profile(
            db,
            current_user,
        )
    )

    farm = get_owned_farm(
        db,
        farm_id,
        farmer_profile,
    )

    fields = (
        db.query(FarmField)
        .filter(
            FarmField.farm_id
            == farm.id
        )
        .order_by(
            FarmField.field_name.asc()
        )
        .all()
    )

    return fields