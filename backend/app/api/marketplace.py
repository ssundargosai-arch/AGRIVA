from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    status,
)
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.dependencies import (
    get_current_user,
    require_farmer,
)
from app.db.session import get_db
from app.models.crop import Crop
from app.models.market import (
    Buyer,
    BuyerMatch,
    CropListing,
    Favorite,
)
from app.models.user import User
from app.schemas.marketplace import (
    BuyerMatchItem,
    BuyerMatchResponse,
    CropListingCreate,
    CropListingResponse,
    FavoriteResponse,
    MessageResponse,
)


router = APIRouter(
    prefix="/api/marketplace",
    tags=["Marketplace"],
)


# =========================================================
# HELPER: SERIALIZE MARKETPLACE LISTING
# =========================================================

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
        expected_price_per_kg=listing.expected_price_per_kg,
        location=listing.location,
        harvest_date=listing.harvest_date,
        images=listing.images or [],
        status=listing.status,
        created_at=listing.created_at,
    )


# =========================================================
# HELPER: BUYER MATCH SCORE
# =========================================================

def calculate_buyer_match(
    listing_crop: str,
    listing_quantity: float,
    listing_price: float,
    listing_quality: str,
    buyer_crop: str,
    buyer_quantity: float,
    buyer_price: float,
    buyer_quality: str,
    distance_km: float,
    buyer_rating: float,
) -> float:
    """
    Calculate buyer match percentage.

    Score:
        Crop match       = 30
        Quantity match   = 20
        Price match      = 20
        Quality match    = 15
        Distance         = 10
        Buyer rating     = 5

    Maximum score = 100
    """

    score = 0.0

    # -----------------------------------------------------
    # 1. Crop match - 30 points
    # -----------------------------------------------------

    listing_crop_clean = (listing_crop or "").strip().lower()
    buyer_crop_clean = (buyer_crop or "").strip().lower()

    if (
        listing_crop_clean
        and buyer_crop_clean
        and listing_crop_clean == buyer_crop_clean
    ):
        score += 30.0

    elif (
        listing_crop_clean
        and buyer_crop_clean
        and (
            listing_crop_clean in buyer_crop_clean
            or buyer_crop_clean in listing_crop_clean
        )
    ):
        score += 20.0

    # -----------------------------------------------------
    # 2. Quantity match - 20 points
    # -----------------------------------------------------

    listing_quantity = float(listing_quantity or 0)
    buyer_quantity = float(buyer_quantity or 0)

    if listing_quantity > 0 and buyer_quantity > 0:
        quantity_ratio = min(
            listing_quantity,
            buyer_quantity,
        ) / max(
            listing_quantity,
            buyer_quantity,
        )

        score += quantity_ratio * 20.0

    # -----------------------------------------------------
    # 3. Price match - 20 points
    # -----------------------------------------------------

    listing_price = float(listing_price or 0)
    buyer_price = float(buyer_price or 0)

    if listing_price > 0 and buyer_price > 0:

        # Buyer offer is equal to or greater than
        # farmer expected price.
        if buyer_price >= listing_price:
            score += 20.0

        else:
            price_ratio = buyer_price / listing_price
            score += price_ratio * 20.0

    # -----------------------------------------------------
    # 4. Quality match - 15 points
    # -----------------------------------------------------

    listing_quality_clean = (
        listing_quality or ""
    ).strip().lower()

    buyer_quality_clean = (
        buyer_quality or ""
    ).strip().lower()

    if (
        listing_quality_clean
        and buyer_quality_clean
        and listing_quality_clean == buyer_quality_clean
    ):
        score += 15.0

    elif (
        listing_quality_clean
        and buyer_quality_clean
        and (
            listing_quality_clean in buyer_quality_clean
            or buyer_quality_clean in listing_quality_clean
        )
    ):
        score += 10.0

    # -----------------------------------------------------
    # 5. Distance score - 10 points
    # -----------------------------------------------------

    distance_km = float(distance_km or 0)

    if distance_km <= 10:
        score += 10.0

    elif distance_km <= 25:
        score += 8.0

    elif distance_km <= 50:
        score += 6.0

    elif distance_km <= 100:
        score += 4.0

    elif distance_km <= 200:
        score += 2.0

    # -----------------------------------------------------
    # 6. Buyer rating - 5 points
    # -----------------------------------------------------

    buyer_rating = float(buyer_rating or 0)

    buyer_rating = max(
        0.0,
        min(buyer_rating, 5.0),
    )

    score += buyer_rating

    # Never allow score above 100
    score = min(score, 100.0)

    return round(score, 2)


# =========================================================
# HEALTH CHECK
# =========================================================

@router.get("/health")
def marketplace_health():
    return {
        "status": "ok",
        "module": "AGRIVA Marketplace",
        "phase": 10,
    }


# =========================================================
# CREATE LISTING
# FARMER ONLY
# =========================================================

@router.post(
    "/listings",
    response_model=CropListingResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_listing(
    payload: CropListingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_farmer),
):
    crop = (
        db.query(Crop)
        .filter(Crop.id == payload.crop_id)
        .first()
    )

    if crop is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Crop not found",
        )

    listing = CropListing(
        crop_id=crop.id,
        quantity_kg=payload.quantity_kg,
        expected_price_per_kg=(
            payload.expected_price_per_kg
        ),
        quality_grade=payload.quality_grade.strip(),
        location=payload.location.strip(),
        harvest_date=payload.harvest_date,
        images=payload.images or [],
        status="active",
    )

    try:
        db.add(listing)
        db.commit()
        db.refresh(listing)

    except Exception as exc:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to create marketplace listing.",
        ) from exc

    return serialize_listing(
        listing,
        crop,
    )


# =========================================================
# SEARCH / FILTER LISTINGS
# =========================================================

@router.get(
    "/listings",
    response_model=list[CropListingResponse],
)
def get_listings(
    crop: str | None = Query(default=None),
    location: str | None = Query(default=None),
    quality: str | None = Query(default=None),

    min_quantity: float | None = Query(
        default=None,
        ge=0,
    ),

    max_quantity: float | None = Query(
        default=None,
        ge=0,
    ),

    min_price: float | None = Query(
        default=None,
        ge=0,
    ),

    max_price: float | None = Query(
        default=None,
        ge=0,
    ),

    db: Session = Depends(get_db),
):
    # Validate ranges
    if (
        min_quantity is not None
        and max_quantity is not None
        and min_quantity > max_quantity
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "min_quantity cannot be greater "
                "than max_quantity"
            ),
        )

    if (
        min_price is not None
        and max_price is not None
        and min_price > max_price
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "min_price cannot be greater "
                "than max_price"
            ),
        )

    query = (
        db.query(
            CropListing,
            Crop,
        )
        .join(
            Crop,
            Crop.id == CropListing.crop_id,
        )
        .filter(
            CropListing.status == "active"
        )
    )

    # Crop search
    if crop:
        crop_value = crop.strip().lower()

        query = query.filter(
            func.lower(Crop.name).contains(
                crop_value
            )
        )

    # Location search
    if location:
        location_value = location.strip().lower()

        query = query.filter(
            func.lower(
                CropListing.location
            ).contains(
                location_value
            )
        )

    # Quality filter
    if quality:
        quality_value = quality.strip().lower()

        query = query.filter(
            func.lower(
                CropListing.quality_grade
            )
            == quality_value
        )

    # Minimum quantity
    if min_quantity is not None:
        query = query.filter(
            CropListing.quantity_kg
            >= min_quantity
        )

    # Maximum quantity
    if max_quantity is not None:
        query = query.filter(
            CropListing.quantity_kg
            <= max_quantity
        )

    # Minimum price
    if min_price is not None:
        query = query.filter(
            CropListing.expected_price_per_kg
            >= min_price
        )

    # Maximum price
    if max_price is not None:
        query = query.filter(
            CropListing.expected_price_per_kg
            <= max_price
        )

    rows = (
        query
        .order_by(
            CropListing.created_at.desc()
        )
        .all()
    )

    return [
        serialize_listing(
            listing,
            crop_model,
        )
        for listing, crop_model in rows
    ]


# =========================================================
# GET SINGLE LISTING
# =========================================================

@router.get(
    "/listings/{listing_id}",
    response_model=CropListingResponse,
)
def get_listing(
    listing_id: UUID,
    db: Session = Depends(get_db),
):
    row = (
        db.query(
            CropListing,
            Crop,
        )
        .join(
            Crop,
            Crop.id == CropListing.crop_id,
        )
        .filter(
            CropListing.id == listing_id
        )
        .first()
    )

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found",
        )

    listing, crop = row

    return serialize_listing(
        listing,
        crop,
    )


# =========================================================
# ADD FAVORITE
# =========================================================

@router.post(
    "/favorites/{listing_id}",
    response_model=FavoriteResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_favorite(
    listing_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    listing = (
        db.query(CropListing)
        .filter(
            CropListing.id == listing_id
        )
        .first()
    )

    if listing is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found",
        )

    existing = (
        db.query(Favorite)
        .filter(
            Favorite.user_id == current_user.id,
            Favorite.listing_id == listing_id,
        )
        .first()
    )

    # Already favorited
    if existing:
        return FavoriteResponse(
            id=existing.id,
            listing_id=existing.listing_id,
            created_at=existing.created_at,
        )

    favorite = Favorite(
        user_id=current_user.id,
        listing_id=listing_id,
    )

    try:
        db.add(favorite)
        db.commit()
        db.refresh(favorite)

    except Exception as exc:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to add favorite",
        ) from exc

    return FavoriteResponse(
        id=favorite.id,
        listing_id=favorite.listing_id,
        created_at=favorite.created_at,
    )


# =========================================================
# GET FAVORITES
# =========================================================

@router.get(
    "/favorites",
    response_model=list[CropListingResponse],
)
def get_favorites(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = (
        db.query(
            Favorite,
            CropListing,
            Crop,
        )
        .join(
            CropListing,
            CropListing.id == Favorite.listing_id,
        )
        .join(
            Crop,
            Crop.id == CropListing.crop_id,
        )
        .filter(
            Favorite.user_id == current_user.id
        )
        .order_by(
            Favorite.created_at.desc()
        )
        .all()
    )

    return [
        serialize_listing(
            listing,
            crop,
        )
        for _, listing, crop in rows
    ]


# =========================================================
# REMOVE FAVORITE
# =========================================================

@router.delete(
    "/favorites/{listing_id}",
    response_model=MessageResponse,
)
def remove_favorite(
    listing_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    favorite = (
        db.query(Favorite)
        .filter(
            Favorite.user_id == current_user.id,
            Favorite.listing_id == listing_id,
        )
        .first()
    )

    if favorite is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Favorite not found",
        )

    try:
        db.delete(favorite)
        db.commit()

    except Exception as exc:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to remove favorite",
        ) from exc

    return MessageResponse(
        message="Favorite removed"
    )


# =========================================================
# GENERATE BUYER MATCHES
# FARMER ONLY
# =========================================================

@router.post(
    "/listings/{listing_id}/matches",
    response_model=BuyerMatchResponse,
)
def generate_buyer_matches(
    listing_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_farmer),
):
    row = (
        db.query(
            CropListing,
            Crop,
        )
        .join(
            Crop,
            Crop.id == CropListing.crop_id,
        )
        .filter(
            CropListing.id == listing_id
        )
        .first()
    )

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found",
        )

    listing, crop = row

    buyers = db.query(Buyer).all()

    matches: list[BuyerMatchItem] = []

    try:
        for buyer in buyers:

            score = calculate_buyer_match(
                listing_crop=crop.name,

                listing_quantity=(
                    listing.quantity_kg or 0
                ),

                listing_price=(
                    listing.expected_price_per_kg or 0
                ),

                listing_quality=(
                    listing.quality_grade or ""
                ),

                buyer_crop=(
                    buyer.preferred_crop or ""
                ),

                buyer_quantity=(
                    buyer.demand_quantity_kg or 0
                ),

                buyer_price=(
                    buyer.offer_price_per_kg or 0
                ),

                buyer_quality=(
                    buyer.preferred_quality or ""
                ),

                distance_km=(
                    buyer.distance_km
                    if buyer.distance_km is not None
                    else 9999
                ),

                buyer_rating=(
                    buyer.rating
                    if buyer.rating is not None
                    else 0
                ),
            )

            # ---------------------------------------------
            # Check existing buyer match
            # ---------------------------------------------

            existing = (
                db.query(BuyerMatch)
                .filter(
                    BuyerMatch.listing_id
                    == listing.id,

                    BuyerMatch.buyer_id
                    == buyer.id,
                )
                .first()
            )

            if existing:
                existing.match_score = score
                existing.status = "suggested"

            else:
                existing = BuyerMatch(
                    listing_id=listing.id,
                    buyer_id=buyer.id,
                    match_score=score,
                    status="suggested",
                )

                db.add(existing)

            # ---------------------------------------------
            # Buyer name
            # ---------------------------------------------

            buyer_name = "Buyer"

            buyer_profile = getattr(
                buyer,
                "buyer_profile",
                None,
            )

            if buyer_profile:
                business_name = getattr(
                    buyer_profile,
                    "business_name",
                    None,
                )

                if business_name:
                    buyer_name = business_name

            # ---------------------------------------------
            # Response item
            # ---------------------------------------------

            matches.append(
                BuyerMatchItem(
                    buyer_id=buyer.id,
                    buyer_name=buyer_name,
                    match_percentage=score,

                    offer_price=(
                        buyer.offer_price_per_kg
                    ),

                    demand_quantity=(
                        buyer.demand_quantity_kg
                    ),

                    distance_km=(
                        buyer.distance_km
                    ),

                    buyer_rating=(
                        buyer.rating
                    ),
                )
            )

        db.commit()

    except Exception as exc:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to generate buyer matches",
        ) from exc

    # Highest match first
    matches.sort(
        key=lambda item: item.match_percentage,
        reverse=True,
    )

    return BuyerMatchResponse(
        listing_id=listing.id,
        matches=matches,
    )