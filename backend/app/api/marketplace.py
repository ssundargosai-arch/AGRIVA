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
from app.models.farm import (
    Farm,
    FarmField,
)
from app.models.market import (
    Buyer,
    BuyerMatch,
    CropListing,
    Favorite,
)
from app.models.user import (
    BuyerProfile,
    FarmerProfile,
    User,
)

from app.schemas.marketplace import (
    BuyerMatchBreakdownResponse,
    BuyerMatchItem,
    BuyerMatchResponse,
    CropListingCreate,
    CropListingResponse,
    FavoriteResponse,
    MessageResponse,
)

from app.services.buyer_matching import (
    calculate_buyer_match,
)
from app.services.buyer_verification import (
    verification_snapshot_for_profile,
)


router = APIRouter(
    prefix="/api/marketplace",
    tags=["Marketplace"],
)


# =========================================================
# LISTING SERIALIZER
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
        expected_price_per_kg=(
            listing.expected_price_per_kg
        ),
        location=listing.location,
        harvest_date=listing.harvest_date,
        images=listing.images or [],
        status=listing.status,
        created_at=listing.created_at,
    )


# =========================================================
# FARMER OWNERSHIP HELPERS
# =========================================================


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
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail="Farmer profile not found",
        )

    return farmer_profile


def get_owned_crop(
    db: Session,
    current_user: User,
    crop_id: UUID,
) -> Crop:
    farmer_profile = get_farmer_profile(
        db,
        current_user,
    )

    crop = (
        db.query(Crop)
        .join(
            FarmField,
            Crop.field_id
            == FarmField.id,
        )
        .join(
            Farm,
            FarmField.farm_id
            == Farm.id,
        )
        .filter(
            Crop.id == crop_id,
            Farm.farmer_id
            == farmer_profile.id,
        )
        .first()
    )

    if crop is None:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=(
                "Crop not found or does not "
                "belong to the current farmer"
            ),
        )

    return crop


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
            Crop.id
            == CropListing.crop_id,
        )
        .join(
            FarmField,
            Crop.field_id
            == FarmField.id,
        )
        .join(
            Farm,
            FarmField.farm_id
            == Farm.id,
        )
        .filter(
            CropListing.id
            == listing_id,
            Farm.farmer_id
            == farmer_profile.id,
        )
        .first()
    )

    if row is None:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=(
                "Listing not found or does not "
                "belong to the current farmer"
            ),
        )

    listing, crop = row

    return listing, crop


# =========================================================
# HEALTH CHECK
# =========================================================


@router.get("/health")
def marketplace_health():
    return {
        "status": "ok",
        "module": "AGRIVA Marketplace",
        "phase": 10,
        "buyer_matching": True,
        "explainable_matching": True,
        "farmer_ownership_security": True,
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
    current_user: User = Depends(
        require_farmer,
    ),
):
    crop = get_owned_crop(
        db,
        current_user,
        payload.crop_id,
    )

    validated_price = validate_market_price(
        crop_name=crop.name,
        price_per_kg=(
            payload.expected_price_per_kg
        ),
    )

    listing = CropListing(
        crop_id=crop.id,
        quantity_kg=(
            payload.quantity_kg
        ),
        expected_price_per_kg=(
            validated_price
        ),
        quality_grade=(
            payload.quality_grade.strip()
        ),
        location=(
            payload.location.strip()
        ),
        harvest_date=(
            payload.harvest_date
        ),
        images=(
            payload.images or []
        ),
        status="active",
    )

    try:
        db.add(listing)
        db.commit()
        db.refresh(listing)

    except Exception as exc:
        db.rollback()

        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=(
                "Unable to create "
                "marketplace listing."
            ),
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
    response_model=list[
        CropListingResponse
    ],
)
def get_listings(
    crop: str | None = Query(
        default=None,
    ),
    location: str | None = Query(
        default=None,
    ),
    quality: str | None = Query(
        default=None,
    ),
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
    if (
        min_quantity is not None
        and max_quantity is not None
        and min_quantity > max_quantity
    ):
        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=(
                "min_quantity cannot be "
                "greater than max_quantity"
            ),
        )

    if (
        min_price is not None
        and max_price is not None
        and min_price > max_price
    ):
        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=(
                "min_price cannot be "
                "greater than max_price"
            ),
        )

    query = (
        db.query(
            CropListing,
            Crop,
        )
        .join(
            Crop,
            Crop.id
            == CropListing.crop_id,
        )
        .filter(
            CropListing.status
            == "active"
        )
    )

    if crop:
        crop_value = (
            crop.strip().lower()
        )

        query = query.filter(
            func.lower(
                Crop.name
            ).contains(
                crop_value
            )
        )

    if location:
        location_value = (
            location.strip().lower()
        )

        query = query.filter(
            func.lower(
                CropListing.location
            ).contains(
                location_value
            )
        )

    if quality:
        quality_value = (
            quality.strip().lower()
        )

        query = query.filter(
            func.lower(
                CropListing.quality_grade
            )
            == quality_value
        )

    if min_quantity is not None:
        query = query.filter(
            CropListing.quantity_kg
            >= min_quantity
        )

    if max_quantity is not None:
        query = query.filter(
            CropListing.quantity_kg
            <= max_quantity
        )

    if min_price is not None:
        query = query.filter(
            CropListing.expected_price_per_kg
            >= min_price
        )

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
        for (
            listing,
            crop_model,
        ) in rows
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
            Crop.id
            == CropListing.crop_id,
        )
        .filter(
            CropListing.id
            == listing_id
        )
        .first()
    )

    if row is None:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
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
    current_user: User = Depends(
        get_current_user,
    ),
):
    listing = (
        db.query(CropListing)
        .filter(
            CropListing.id
            == listing_id
        )
        .first()
    )

    if listing is None:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail="Listing not found",
        )

    existing = (
        db.query(Favorite)
        .filter(
            Favorite.user_id
            == current_user.id,
            Favorite.listing_id
            == listing_id,
        )
        .first()
    )

    if existing:
        return FavoriteResponse(
            id=existing.id,
            listing_id=(
                existing.listing_id
            ),
            created_at=(
                existing.created_at
            ),
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
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail="Unable to add favorite",
        ) from exc

    return FavoriteResponse(
        id=favorite.id,
        listing_id=(
            favorite.listing_id
        ),
        created_at=(
            favorite.created_at
        ),
    )


# =========================================================
# GET FAVORITES
# =========================================================


@router.get(
    "/favorites",
    response_model=list[
        CropListingResponse
    ],
)
def get_favorites(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user,
    ),
):
    rows = (
        db.query(
            Favorite,
            CropListing,
            Crop,
        )
        .join(
            CropListing,
            CropListing.id
            == Favorite.listing_id,
        )
        .join(
            Crop,
            Crop.id
            == CropListing.crop_id,
        )
        .filter(
            Favorite.user_id
            == current_user.id
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
        for (
            _,
            listing,
            crop,
        ) in rows
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
    current_user: User = Depends(
        get_current_user,
    ),
):
    favorite = (
        db.query(Favorite)
        .filter(
            Favorite.user_id
            == current_user.id,
            Favorite.listing_id
            == listing_id,
        )
        .first()
    )

    if favorite is None:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail="Favorite not found",
        )

    try:
        db.delete(favorite)
        db.commit()

    except Exception as exc:
        db.rollback()

        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail="Unable to remove favorite",
        ) from exc

    return MessageResponse(
        message="Favorite removed",
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
    current_user: User = Depends(
        require_farmer,
    ),
):
    listing, crop = get_owned_listing(
        db,
        current_user,
        listing_id,
    )

    buyer_rows = (
        db.query(
            Buyer,
            BuyerProfile,
        )
        .join(
            BuyerProfile,
            Buyer.buyer_profile_id
            == BuyerProfile.id,
        )
        .all()
    )

    matches: list[
        BuyerMatchItem
    ] = []

    try:
        for (
            buyer,
            buyer_profile,
        ) in buyer_rows:
            breakdown = (
                calculate_buyer_match(
                    listing_crop=(
                        crop.name
                    ),
                    listing_quantity=(
                        listing.quantity_kg
                        or 0
                    ),
                    listing_price=(
                        listing
                        .expected_price_per_kg
                        or 0
                    ),
                    listing_quality=(
                        listing.quality_grade
                        or ""
                    ),
                    buyer_crop=(
                        buyer.preferred_crop
                        or ""
                    ),
                    buyer_quantity=(
                        buyer.demand_quantity_kg
                        or 0
                    ),
                    buyer_price=(
                        buyer.offer_price_per_kg
                        or 0
                    ),
                    buyer_quality=(
                        buyer.preferred_quality
                        or ""
                    ),
                    distance_km=(
                        buyer.distance_km
                    ),
                    buyer_rating=(
                        buyer.rating
                    ),
                )
            )

            # Do not recommend buyers who
            # are looking for another crop.
            if (
                breakdown.crop_score
                <= 0
            ):
                continue

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
                existing.match_score = (
                    breakdown.total_score
                )

                existing.status = (
                    "suggested"
                )

            else:
                existing = BuyerMatch(
                    listing_id=(
                        listing.id
                    ),
                    buyer_id=(
                        buyer.id
                    ),
                    match_score=(
                        breakdown.total_score
                    ),
                    status="suggested",
                )

                db.add(existing)

            buyer_name = (
                buyer_profile.business_name
                or "Buyer"
            )

            buyer_city = (
                buyer.city
                or buyer_profile.city
            )

            verification = (
                verification_snapshot_for_profile(
                    db=db,
                    buyer_profile_id=(
                        buyer_profile.id
                    ),
                )
            )

            matches.append(
                BuyerMatchItem(
                    buyer_id=buyer.id,

                    buyer_name=(
                        buyer_name
                    ),

                    buyer_city=(
                        buyer_city
                    ),

                    buyer_state=(
                        buyer.state
                    ),

                    preferred_crop=(
                        buyer.preferred_crop
                    ),

                    preferred_quality=(
                        buyer.preferred_quality
                    ),

                    match_percentage=(
                        breakdown.total_score
                    ),

                    match_label=(
                        breakdown.label
                    ),

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

                    verification_status=(
                        verification["status"]
                    ),

                    verification_label=(
                        verification[
                            "status_label"
                        ]
                    ),

                    verification_note=(
                        verification[
                            "verification_note"
                        ]
                    ),

                    agriva_verified=(
                        verification["status"]
                        == "AGRIVA_VERIFIED"
                    ),

                    breakdown=(
                        BuyerMatchBreakdownResponse(
                            crop_score=(
                                breakdown.crop_score
                            ),
                            quantity_score=(
                                breakdown.quantity_score
                            ),
                            price_score=(
                                breakdown.price_score
                            ),
                            quality_score=(
                                breakdown.quality_score
                            ),
                            distance_score=(
                                breakdown.distance_score
                            ),
                            rating_score=(
                                breakdown.rating_score
                            ),
                        )
                    ),
                )
            )

        db.commit()

    except HTTPException:
        db.rollback()
        raise

    except Exception as exc:
        db.rollback()

        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=(
                "Unable to generate "
                "buyer matches"
            ),
        ) from exc

    matches.sort(
        key=lambda item: (
            item.match_percentage
        ),
        reverse=True,
    )

    return BuyerMatchResponse(
        listing_id=listing.id,
        matches=matches,
    )


# =========================================================
# DEMO MARKET PRICE VALIDATION
# =========================================================


DEMO_PRICE_RANGES_PER_KG = {
    "WHEAT": (
        24.0,
        32.0,
    ),
    "MAIZE": (
        24.0,
        27.0,
    ),
    "RICE": (
        28.0,
        40.0,
    ),
    "POTATO": (
        15.0,
        35.0,
    ),
}


def normalize_market_crop_name(
    crop_name: str,
) -> str:
    normalized = (
        crop_name
        .strip()
        .upper()
    )

    if (
        "MAIZE" in normalized
        or "CORN" in normalized
    ):
        return "MAIZE"

    if "WHEAT" in normalized:
        return "WHEAT"

    if (
        "RICE" in normalized
        or "PADDY" in normalized
    ):
        return "RICE"

    if "POTATO" in normalized:
        return "POTATO"

    return normalized


def validate_market_price(
    crop_name: str,
    price_per_kg: float,
) -> float:
    crop_key = (
        normalize_market_crop_name(
            crop_name,
        )
    )

    price = round(
        float(price_per_kg),
        2,
    )

    price_range = (
        DEMO_PRICE_RANGES_PER_KG
        .get(crop_key)
    )

    if price_range is None:
        return price

    (
        minimum_price,
        maximum_price,
    ) = price_range

    if not (
        minimum_price
        <= price
        <= maximum_price
    ):
        raise HTTPException(
            status_code=(
                status.HTTP_422_UNPROCESSABLE_ENTITY
            ),
            detail=(
                "Invalid demo market price "
                f"for {crop_name}. "
                "Expected price must be "
                f"between INR "
                f"{minimum_price:.2f} "
                f"and INR "
                f"{maximum_price:.2f} "
                "per kg."
            ),
        )

    return price