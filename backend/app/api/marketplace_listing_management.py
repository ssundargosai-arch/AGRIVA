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
from app.models.market import CropListing
from app.models.user import User
from app.schemas.marketplace import (
    CropListingResponse,
    MessageResponse,
)
from app.services.marketplace_listing_management import (
    FarmerProfileNotFoundError,
    ListingNotOwnedError,
    get_farmer_listings,
    remove_listing_from_market,
)


router = APIRouter(
    prefix="/api/marketplace",
    tags=["Marketplace Listing Management"],
)


def serialize_listing(
    listing: CropListing,
    crop: Crop,
) -> CropListingResponse:
    return CropListingResponse(
        id=listing.id,
        crop_id=listing.crop_id,
        crop=crop.name,
        quantity_kg=listing.quantity_kg,
        quality_grade=listing.quality_grade,
        expected_price_per_kg=(
            listing.expected_price_per_kg
        ),
        location=listing.location,
        harvest_date=listing.harvest_date,
        images=listing.images or [],
        status=listing.status,
        created_at=listing.created_at,
    )


@router.get(
    "/my-listings",
    response_model=list[CropListingResponse],
)
def my_marketplace_listings(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_farmer
    ),
):
    try:
        rows = get_farmer_listings(
            db,
            current_user,
        )

    except FarmerProfileNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc

    return [
        serialize_listing(listing, crop)
        for listing, crop in rows
    ]


@router.delete(
    "/listings/{listing_id}",
    response_model=MessageResponse,
)
def remove_marketplace_listing(
    listing_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_farmer
    ),
):
    try:
        listing, crop, changed = (
            remove_listing_from_market(
                db,
                current_user,
                listing_id,
            )
        )

    except FarmerProfileNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc

    except ListingNotOwnedError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=(
                "Unable to remove listing "
                "from marketplace."
            ),
        ) from exc

    if changed:
        return MessageResponse(
            message=(
                f"{crop.name} removed from "
                "AGRIVA Market. New orders "
                "are now blocked."
            )
        )

    return MessageResponse(
        message=(
            f"{crop.name} listing is already "
            f"{listing.status}."
        )
    )

