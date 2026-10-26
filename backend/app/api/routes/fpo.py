from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, require_farmer
from app.db.session import get_db
from app.models.crop import Crop
from app.models.farm import Farm, FarmField
from app.models.fpo import FPOAggregationLot, FPOContribution, FPOGroup, FPOMembership
from app.models.market import CropListing
from app.models.user import FarmerProfile, User
from app.schemas.fpo import (
    FPOContributionCreate,
    FPOContributionResponse,
    FPOGroupCreate,
    FPOGroupResponse,
    FPOLotCreate,
    FPOLotResponse,
    FPOMemberResponse,
)

router = APIRouter(prefix="/api/fpo", tags=["FPO Aggregation"])
OPEN_LOT_STATUSES = ("open", "published")


def get_farmer_profile(db: Session, current_user: User) -> FarmerProfile:
    farmer = db.query(FarmerProfile).filter(FarmerProfile.user_id == current_user.id).first()
    if farmer is None:
        raise HTTPException(status_code=404, detail="Farmer profile not found")
    return farmer


def get_group_or_404(db: Session, group_id: UUID) -> FPOGroup:
    group = db.query(FPOGroup).filter(FPOGroup.id == group_id).first()
    if group is None:
        raise HTTPException(status_code=404, detail="FPO group not found")
    return group


def get_lot_or_404(db: Session, lot_id: UUID) -> FPOAggregationLot:
    lot = db.query(FPOAggregationLot).filter(FPOAggregationLot.id == lot_id).first()
    if lot is None:
        raise HTTPException(status_code=404, detail="FPO aggregation lot not found")
    return lot


def get_active_membership(
    db: Session, group_id: UUID, farmer_profile_id: UUID
) -> FPOMembership | None:
    return (
        db.query(FPOMembership)
        .filter(
            FPOMembership.group_id == group_id,
            FPOMembership.farmer_profile_id == farmer_profile_id,
            FPOMembership.status == "active",
        )
        .first()
    )


def require_group_member(
    db: Session, group_id: UUID, farmer_profile_id: UUID
) -> FPOMembership:
    membership = get_active_membership(db, group_id, farmer_profile_id)
    if membership is None:
        raise HTTPException(status_code=403, detail="Active FPO membership required")
    return membership


def member_count(db: Session, group_id: UUID) -> int:
    return int(
        db.query(func.count(FPOMembership.id))
        .filter(
            FPOMembership.group_id == group_id,
            FPOMembership.status == "active",
        )
        .scalar()
        or 0
    )


def group_response(db: Session, group: FPOGroup) -> FPOGroupResponse:
    return FPOGroupResponse(
        id=group.id,
        name=group.name,
        district=group.district,
        state=group.state,
        description=group.description,
        status=group.status,
        member_count=member_count(db, group.id),
        created_at=group.created_at,
    )


def contribution_rows(db: Session, lot_id: UUID) -> list[FPOContribution]:
    return (
        db.query(FPOContribution)
        .filter(
            FPOContribution.lot_id == lot_id,
            FPOContribution.status == "pledged",
        )
        .order_by(FPOContribution.created_at.asc())
        .all()
    )


def pledged_quantity_for_listing(db: Session, listing_id: UUID) -> float:
    value = (
        db.query(func.coalesce(func.sum(FPOContribution.quantity_kg), 0.0))
        .join(FPOAggregationLot, FPOAggregationLot.id == FPOContribution.lot_id)
        .filter(
            FPOContribution.listing_id == listing_id,
            FPOContribution.status == "pledged",
            FPOAggregationLot.status.in_(OPEN_LOT_STATUSES),
        )
        .scalar()
    )
    return float(value or 0.0)


def get_owned_listing(
    db: Session,
    listing_id: UUID,
    farmer_profile_id: UUID,
    *,
    lock: bool = False,
) -> CropListing:
    query = (
        db.query(CropListing)
        .join(Crop, Crop.id == CropListing.crop_id)
        .join(FarmField, FarmField.id == Crop.field_id)
        .join(Farm, Farm.id == FarmField.farm_id)
        .filter(
            CropListing.id == listing_id,
            Farm.farmer_id == farmer_profile_id,
        )
    )
    if lock:
        query = query.with_for_update()

    listing = query.first()
    if listing is None:
        raise HTTPException(
            status_code=404,
            detail="Crop listing not found or it does not belong to the current farmer",
        )
    return listing


def listing_crop(db: Session, listing: CropListing) -> Crop:
    crop = db.query(Crop).filter(Crop.id == listing.crop_id).first()
    if crop is None:
        raise HTTPException(status_code=409, detail="Listing crop record is unavailable")
    return crop


def validate_listing_for_lot(
    db: Session, lot: FPOAggregationLot, listing: CropListing
) -> None:
    crop = listing_crop(db, listing)

    if listing.status != "active":
        raise HTTPException(status_code=409, detail="Only active crop listings can be pledged")
    if float(listing.quantity_kg) <= 0:
        raise HTTPException(status_code=409, detail="Listing has no available quantity")
    if crop.name.strip().casefold() != lot.crop_name.strip().casefold():
        raise HTTPException(status_code=409, detail="Listing crop does not match the aggregation lot crop")

    if lot.quality_grade:
        listing_grade = listing.quality_grade.strip().casefold() if listing.quality_grade else None
        lot_grade = lot.quality_grade.strip().casefold()
        if listing_grade != lot_grade:
            raise HTTPException(
                status_code=409,
                detail="Listing quality grade does not match the aggregation lot",
            )


def contribution_response(db: Session, row: FPOContribution) -> FPOContributionResponse:
    farmer = db.query(FarmerProfile).filter(FarmerProfile.id == row.farmer_profile_id).first()
    user = db.query(User).filter(User.id == farmer.user_id).first() if farmer else None
    listing = db.query(CropListing).filter(CropListing.id == row.listing_id).first()

    return FPOContributionResponse(
        id=row.id,
        farmer_profile_id=row.farmer_profile_id,
        farmer_name=user.full_name if user else "Farmer",
        listing_id=row.listing_id,
        quantity_kg=float(row.quantity_kg),
        listing_available_quantity_kg=float(listing.quantity_kg) if listing else 0.0,
        status=row.status,
        created_at=row.created_at,
    )


def lot_response(db: Session, lot: FPOAggregationLot) -> FPOLotResponse:
    group = get_group_or_404(db, lot.group_id)
    rows = contribution_rows(db, lot.id)
    total = sum(float(row.quantity_kg) for row in rows)

    return FPOLotResponse(
        id=lot.id,
        group_id=lot.group_id,
        group_name=group.name,
        crop_name=lot.crop_name,
        quality_grade=lot.quality_grade,
        target_price_per_kg=float(lot.target_price_per_kg),
        location=lot.location,
        notes=lot.notes,
        status=lot.status,
        aggregated_quantity_kg=round(total, 2),
        contribution_count=len(rows),
        inventory_reserved=False,
        created_at=lot.created_at,
        published_at=lot.published_at,
        contributions=[contribution_response(db, row) for row in rows],
    )


def ensure_lot_visible(
    db: Session, lot: FPOAggregationLot, current_user: User
) -> None:
    if current_user.role == "ADMIN":
        return

    if current_user.role == "BUYER":
        if lot.status != "published":
            raise HTTPException(status_code=404, detail="FPO aggregation lot not found")
        return

    if current_user.role == "FARMER":
        if lot.status == "published":
            return
        farmer = get_farmer_profile(db, current_user)
        if get_active_membership(db, lot.group_id, farmer.id):
            return

    raise HTTPException(status_code=404, detail="FPO aggregation lot not found")


@router.get("/health")
def fpo_health():
    return {
        "status": "ok",
        "module": "AGRIVA FPO Aggregation",
        "phase": "SIH-6B",
        "inventory_reserved_on_contribution": False,
        "buyer_transaction_enabled": False,
    }


@router.post("/groups", response_model=FPOGroupResponse, status_code=status.HTTP_201_CREATED)
def create_group(
    payload: FPOGroupCreate,
    current_user: User = Depends(require_farmer),
    db: Session = Depends(get_db),
):
    farmer = get_farmer_profile(db, current_user)
    group = FPOGroup(
        name=payload.name.strip(),
        district=payload.district.strip(),
        state=payload.state.strip(),
        description=payload.description.strip() if payload.description else None,
        created_by_user_id=current_user.id,
        status="active",
    )
    db.add(group)
    db.flush()
    db.add(
        FPOMembership(
            group_id=group.id,
            farmer_profile_id=farmer.id,
            role="coordinator",
            status="active",
        )
    )
    db.commit()
    db.refresh(group)
    return group_response(db, group)


@router.get("/groups", response_model=list[FPOGroupResponse])
def list_groups(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    del current_user
    groups = (
        db.query(FPOGroup)
        .filter(FPOGroup.status == "active")
        .order_by(FPOGroup.created_at.desc())
        .all()
    )
    return [group_response(db, group) for group in groups]


@router.get("/groups/{group_id}", response_model=FPOGroupResponse)
def get_group(
    group_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    del current_user
    return group_response(db, get_group_or_404(db, group_id))


@router.post(
    "/groups/{group_id}/join",
    response_model=FPOMemberResponse,
    status_code=status.HTTP_201_CREATED,
)
def join_group(
    group_id: UUID,
    current_user: User = Depends(require_farmer),
    db: Session = Depends(get_db),
):
    farmer = get_farmer_profile(db, current_user)
    group = get_group_or_404(db, group_id)
    if group.status != "active":
        raise HTTPException(status_code=409, detail="FPO group is not active")

    existing = (
        db.query(FPOMembership)
        .filter(
            FPOMembership.group_id == group_id,
            FPOMembership.farmer_profile_id == farmer.id,
        )
        .first()
    )
    if existing and existing.status == "active":
        raise HTTPException(status_code=409, detail="Farmer is already an active member")

    if existing:
        existing.status = "active"
        existing.role = "member"
        membership = existing
    else:
        membership = FPOMembership(
            group_id=group_id,
            farmer_profile_id=farmer.id,
            role="member",
            status="active",
        )
        db.add(membership)

    db.commit()
    db.refresh(membership)
    return FPOMemberResponse(
        id=membership.id,
        farmer_profile_id=farmer.id,
        farmer_name=current_user.full_name,
        village=farmer.village,
        district=farmer.district,
        role=membership.role,
        status=membership.status,
        joined_at=membership.joined_at,
    )


@router.get("/groups/{group_id}/members", response_model=list[FPOMemberResponse])
def list_members(
    group_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_group_or_404(db, group_id)

    if current_user.role == "FARMER":
        farmer = get_farmer_profile(db, current_user)
        require_group_member(db, group_id, farmer.id)
    elif current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only FPO members or admins can view the member list")

    rows = (
        db.query(FPOMembership)
        .filter(
            FPOMembership.group_id == group_id,
            FPOMembership.status == "active",
        )
        .order_by(FPOMembership.joined_at.asc())
        .all()
    )

    result = []
    for row in rows:
        farmer = db.query(FarmerProfile).filter(FarmerProfile.id == row.farmer_profile_id).first()
        if farmer is None:
            continue
        user = db.query(User).filter(User.id == farmer.user_id).first()
        result.append(
            FPOMemberResponse(
                id=row.id,
                farmer_profile_id=farmer.id,
                farmer_name=user.full_name if user else "Farmer",
                village=farmer.village,
                district=farmer.district,
                role=row.role,
                status=row.status,
                joined_at=row.joined_at,
            )
        )
    return result


@router.post("/lots", response_model=FPOLotResponse, status_code=status.HTTP_201_CREATED)
def create_lot(
    payload: FPOLotCreate,
    current_user: User = Depends(require_farmer),
    db: Session = Depends(get_db),
):
    farmer = get_farmer_profile(db, current_user)
    group = get_group_or_404(db, payload.group_id)
    if group.status != "active":
        raise HTTPException(status_code=409, detail="FPO group is not active")
    require_group_member(db, group.id, farmer.id)

    lot = FPOAggregationLot(
        group_id=group.id,
        created_by_farmer_id=farmer.id,
        crop_name=payload.crop_name.strip(),
        quality_grade=payload.quality_grade.strip() if payload.quality_grade else None,
        target_price_per_kg=round(float(payload.target_price_per_kg), 2),
        location=payload.location.strip() if payload.location else None,
        notes=payload.notes.strip() if payload.notes else None,
        status="open",
    )
    db.add(lot)
    db.commit()
    db.refresh(lot)
    return lot_response(db, lot)


@router.get("/lots", response_model=list[FPOLotResponse])
def list_lots(
    group_id: UUID | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(FPOAggregationLot)
    if group_id is not None:
        query = query.filter(FPOAggregationLot.group_id == group_id)

    if current_user.role == "BUYER":
        query = query.filter(FPOAggregationLot.status == "published")
    elif current_user.role == "FARMER":
        farmer = get_farmer_profile(db, current_user)
        membership_group_ids = db.query(FPOMembership.group_id).filter(
            FPOMembership.farmer_profile_id == farmer.id,
            FPOMembership.status == "active",
        )
        query = query.filter(
            or_(
                FPOAggregationLot.status == "published",
                FPOAggregationLot.group_id.in_(membership_group_ids),
            )
        )
    elif current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Unsupported account role")

    lots = query.order_by(FPOAggregationLot.created_at.desc()).all()
    return [lot_response(db, lot) for lot in lots]


@router.get("/lots/{lot_id}", response_model=FPOLotResponse)
def get_lot(
    lot_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    lot = get_lot_or_404(db, lot_id)
    ensure_lot_visible(db, lot, current_user)
    return lot_response(db, lot)


@router.post(
    "/lots/{lot_id}/contribute",
    response_model=FPOLotResponse,
    status_code=status.HTTP_201_CREATED,
)
def contribute_to_lot(
    lot_id: UUID,
    payload: FPOContributionCreate,
    current_user: User = Depends(require_farmer),
    db: Session = Depends(get_db),
):
    farmer = get_farmer_profile(db, current_user)
    lot = (
        db.query(FPOAggregationLot)
        .filter(FPOAggregationLot.id == lot_id)
        .with_for_update()
        .first()
    )
    if lot is None:
        raise HTTPException(status_code=404, detail="FPO aggregation lot not found")
    if lot.status != "open":
        raise HTTPException(status_code=409, detail="Contributions can only be changed while the lot is open")

    require_group_member(db, lot.group_id, farmer.id)

    duplicate = (
        db.query(FPOContribution)
        .filter(
            FPOContribution.lot_id == lot.id,
            FPOContribution.listing_id == payload.listing_id,
            FPOContribution.status == "pledged",
        )
        .first()
    )
    if duplicate:
        raise HTTPException(status_code=409, detail="This listing is already pledged to the aggregation lot")

    listing = get_owned_listing(db, payload.listing_id, farmer.id, lock=True)
    validate_listing_for_lot(db, lot, listing)

    already_pledged = pledged_quantity_for_listing(db, listing.id)
    available = max(float(listing.quantity_kg) - already_pledged, 0.0)
    requested = round(float(payload.quantity_kg), 2)

    if requested > available:
        raise HTTPException(
            status_code=409,
            detail={
                "message": "Contribution exceeds quantity available for FPO pledging",
                "listing_quantity_kg": float(listing.quantity_kg),
                "already_pledged_kg": round(already_pledged, 2),
                "available_to_pledge_kg": round(available, 2),
            },
        )

    db.add(
        FPOContribution(
            lot_id=lot.id,
            farmer_profile_id=farmer.id,
            listing_id=listing.id,
            quantity_kg=requested,
            status="pledged",
        )
    )
    db.commit()
    db.refresh(lot)
    return lot_response(db, lot)


@router.delete(
    "/lots/{lot_id}/contributions/{contribution_id}",
    response_model=FPOLotResponse,
)
def remove_contribution(
    lot_id: UUID,
    contribution_id: UUID,
    current_user: User = Depends(require_farmer),
    db: Session = Depends(get_db),
):
    farmer = get_farmer_profile(db, current_user)
    lot = get_lot_or_404(db, lot_id)
    if lot.status != "open":
        raise HTTPException(status_code=409, detail="Published/closed lots cannot be edited")

    row = (
        db.query(FPOContribution)
        .filter(
            FPOContribution.id == contribution_id,
            FPOContribution.lot_id == lot.id,
            FPOContribution.status == "pledged",
        )
        .first()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="FPO contribution not found")

    membership = require_group_member(db, lot.group_id, farmer.id)
    if row.farmer_profile_id != farmer.id and membership.role != "coordinator":
        raise HTTPException(
            status_code=403,
            detail="Only the contributing farmer or group coordinator can remove it",
        )

    row.status = "withdrawn"
    db.commit()
    db.refresh(lot)
    return lot_response(db, lot)


@router.post("/lots/{lot_id}/publish", response_model=FPOLotResponse)
def publish_lot(
    lot_id: UUID,
    current_user: User = Depends(require_farmer),
    db: Session = Depends(get_db),
):
    farmer = get_farmer_profile(db, current_user)
    lot = (
        db.query(FPOAggregationLot)
        .filter(FPOAggregationLot.id == lot_id)
        .with_for_update()
        .first()
    )
    if lot is None:
        raise HTTPException(status_code=404, detail="FPO aggregation lot not found")
    if lot.status != "open":
        raise HTTPException(status_code=409, detail="Only open lots can be published")

    membership = require_group_member(db, lot.group_id, farmer.id)
    if membership.role != "coordinator" and lot.created_by_farmer_id != farmer.id:
        raise HTTPException(
            status_code=403,
            detail="Only the lot creator or FPO coordinator can publish it",
        )

    rows = contribution_rows(db, lot.id)
    if not rows:
        raise HTTPException(status_code=409, detail="At least one valid farmer contribution is required")

    # Soft pledge: no stock is deducted/reserved here. Revalidate live inventory.
    for row in rows:
        listing = (
            db.query(CropListing)
            .filter(CropListing.id == row.listing_id)
            .with_for_update()
            .first()
        )
        if listing is None:
            raise HTTPException(status_code=409, detail="A contributed listing no longer exists")

        validate_listing_for_lot(db, lot, listing)
        total_pledged = pledged_quantity_for_listing(db, listing.id)
        if total_pledged > float(listing.quantity_kg) + 1e-9:
            raise HTTPException(
                status_code=409,
                detail={
                    "message": "A pledged listing no longer has enough live inventory",
                    "listing_id": str(listing.id),
                    "listing_quantity_kg": float(listing.quantity_kg),
                    "pledged_quantity_kg": round(total_pledged, 2),
                },
            )

    lot.status = "published"
    lot.published_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(lot)
    return lot_response(db, lot)
