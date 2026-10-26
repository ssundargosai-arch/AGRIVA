from __future__ import annotations

from uuid import UUID

from sqlalchemy.orm import Session

from app.models.crop import Crop
from app.models.farm import Farm, FarmField
from app.models.market import CropListing, Favorite
from app.models.user import FarmerProfile, User


class FarmerProfileNotFoundError(LookupError):
    pass


class ListingNotOwnedError(LookupError):
    pass


def get_farmer_profile(
    db: Session,
    current_user: User,
) -> FarmerProfile:
    farmer_profile = (
        db.query(FarmerProfile)
        .filter(
            FarmerProfile.user_id
            == current_user.id
        )
        .first()
    )

    if farmer_profile is None:
        raise FarmerProfileNotFoundError(
            "Farmer profile not found"
        )

    return farmer_profile


def get_owned_listing(
    db: Session,
    current_user: User,
    listing_id: UUID,
) -> tuple[CropListing, Crop]:
    farmer_profile = get_farmer_profile(
        db,
        current_user,
    )

    row = (
        db.query(
            CropListing,
            Crop,
        )
        .join(
            Crop,
            Crop.id == CropListing.crop_id,
        )
        .join(
            FarmField,
            Crop.field_id == FarmField.id,
        )
        .join(
            Farm,
            FarmField.farm_id == Farm.id,
        )
        .filter(
            CropListing.id == listing_id,
            Farm.farmer_id == farmer_profile.id,
        )
        .first()
    )

    if row is None:
        raise ListingNotOwnedError(
            "Listing not found or does not belong "
            "to the current farmer"
        )

    listing, crop = row
    return listing, crop


def get_farmer_listings(
    db: Session,
    current_user: User,
) -> list[tuple[CropListing, Crop]]:
    farmer_profile = get_farmer_profile(
        db,
        current_user,
    )

    rows = (
        db.query(
            CropListing,
            Crop,
        )
        .join(
            Crop,
            Crop.id == CropListing.crop_id,
        )
        .join(
            FarmField,
            Crop.field_id == FarmField.id,
        )
        .join(
            Farm,
            FarmField.farm_id == Farm.id,
        )
        .filter(
            Farm.farmer_id == farmer_profile.id,
        )
        .order_by(
            CropListing.created_at.desc()
        )
        .all()
    )

    return list(rows)


def remove_listing_from_market(
    db: Session,
    current_user: User,
    listing_id: UUID,
) -> tuple[CropListing, Crop, bool]:
    """
    Soft-remove a farmer-owned listing.

    The database row and order history are preserved.
    Once status is no longer "active":
    - the public marketplace query no longer returns it;
    - the order API rejects new orders for it.

    Existing orders are intentionally not cancelled.
    """

    listing, crop = get_owned_listing(
        db,
        current_user,
        listing_id,
    )

    current_status = str(
        listing.status or ""
    ).strip().lower()

    if current_status != "active":
        return listing, crop, False

    try:
        listing.status = "removed"

        # Removed listings should no longer remain in
        # buyer favorite collections.
        (
            db.query(Favorite)
            .filter(
                Favorite.listing_id == listing.id
            )
            .delete(
                synchronize_session=False
            )
        )

        db.commit()
        db.refresh(listing)

    except Exception:
        db.rollback()
        raise

    return listing, crop, True
