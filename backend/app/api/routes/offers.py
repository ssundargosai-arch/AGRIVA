from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from sqlalchemy.orm import Session

from app.api.dependencies import (
    get_current_user,
    require_farmer,
)
from app.db.session import get_db
from app.models.crop import Crop
from app.models.farm import Farm, FarmField
from app.models.market import (
    Buyer,
    CropListing,
    Order,
    OrderItem,
)
from app.models.offer import MarketOffer
from app.models.order_tracking import OrderTrackingEvent
from app.models.user import (
    BuyerProfile,
    FarmerProfile,
    User,
)
from app.schemas.offer import (
    OfferCounter,
    OfferCreate,
    OfferHealthResponse,
    OfferResponse,
)


router = APIRouter(
    prefix="/api/offers",
    tags=["Market Offers"],
)


OPEN_OFFER_STATUSES = {
    "pending",
    "countered",
}


def get_buyer_for_user(
    db: Session,
    current_user: User,
) -> Buyer:
    if current_user.role != "BUYER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Buyer access required",
        )

    buyer_profile = (
        db.query(BuyerProfile)
        .filter(
            BuyerProfile.user_id
            == current_user.id
        )
        .first()
    )

    if buyer_profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Buyer profile not found",
        )

    buyer = (
        db.query(Buyer)
        .filter(
            Buyer.buyer_profile_id
            == buyer_profile.id
        )
        .first()
    )

    if buyer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "Marketplace buyer record "
                "not found"
            ),
        )

    return buyer


def get_farmer_profile(
    db: Session,
    current_user: User,
) -> FarmerProfile:
    if current_user.role != "FARMER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Farmer access required",
        )

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
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Farmer profile not found",
        )

    return farmer_profile


def farmer_owned_listing_query(
    db: Session,
    current_user: User,
):
    farmer_profile = get_farmer_profile(
        db,
        current_user,
    )

    return (
        db.query(CropListing)
        .join(
            Crop,
            CropListing.crop_id
            == Crop.id,
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
            Farm.farmer_id
            == farmer_profile.id
        )
    )


def get_owned_listing(
    db: Session,
    current_user: User,
    listing_id: UUID,
) -> CropListing:
    listing = (
        farmer_owned_listing_query(
            db,
            current_user,
        )
        .filter(
            CropListing.id
            == listing_id
        )
        .first()
    )

    if listing is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "Listing not found or does not "
                "belong to current farmer"
            ),
        )

    return listing


def get_offer_context(
    db: Session,
    offer_id: UUID,
):
    row = (
        db.query(
            MarketOffer,
            CropListing,
            Crop,
            Buyer,
            BuyerProfile,
        )
        .join(
            CropListing,
            MarketOffer.listing_id
            == CropListing.id,
        )
        .join(
            Crop,
            CropListing.crop_id
            == Crop.id,
        )
        .join(
            Buyer,
            MarketOffer.buyer_id
            == Buyer.id,
        )
        .join(
            BuyerProfile,
            Buyer.buyer_profile_id
            == BuyerProfile.id,
        )
        .filter(
            MarketOffer.id == offer_id
        )
        .first()
    )

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Offer not found",
        )

    return row


def serialize_offer(
    row,
) -> OfferResponse:
    (
        offer,
        listing,
        crop,
        _buyer,
        buyer_profile,
    ) = row

    effective_price = (
        offer.counter_price_per_kg
        if (
            offer.counter_price_per_kg
            is not None
            and offer.status in {
                "countered",
                "accepted",
                "counter_rejected",
            }
        )
        else offer.offer_price_per_kg
    )

    return OfferResponse(
        id=offer.id,
        listing_id=offer.listing_id,
        buyer_id=offer.buyer_id,
        buyer_business_name=(
            buyer_profile.business_name
        ),
        crop=crop.name,
        listing_location=(
            getattr(
                listing,
                "location",
                None,
            )
        ),
        quantity_kg=offer.quantity_kg,
        listing_expected_price_per_kg=(
            listing.expected_price_per_kg
        ),
        offer_price_per_kg=(
            offer.offer_price_per_kg
        ),
        counter_price_per_kg=(
            offer.counter_price_per_kg
        ),
        effective_price_per_kg=(
            effective_price
        ),
        total_amount=round(
            offer.quantity_kg
            * effective_price,
            2,
        ),
        price_difference_per_kg=round(
            effective_price
            - listing.expected_price_per_kg,
            2,
        ),
        status=offer.status,
        message=offer.message,
        counter_message=(
            offer.counter_message
        ),
        order_id=offer.order_id,
        created_at=offer.created_at,
        updated_at=offer.updated_at,
    )


def list_offer_rows_for_buyer(
    db: Session,
    buyer_id: UUID,
):
    return (
        db.query(
            MarketOffer,
            CropListing,
            Crop,
            Buyer,
            BuyerProfile,
        )
        .join(
            CropListing,
            MarketOffer.listing_id
            == CropListing.id,
        )
        .join(
            Crop,
            CropListing.crop_id
            == Crop.id,
        )
        .join(
            Buyer,
            MarketOffer.buyer_id
            == Buyer.id,
        )
        .join(
            BuyerProfile,
            Buyer.buyer_profile_id
            == BuyerProfile.id,
        )
        .filter(
            MarketOffer.buyer_id
            == buyer_id
        )
        .order_by(
            MarketOffer.created_at.desc()
        )
        .all()
    )


def list_offer_rows_for_farmer(
    db: Session,
    current_user: User,
):
    farmer_profile = get_farmer_profile(
        db,
        current_user,
    )

    return (
        db.query(
            MarketOffer,
            CropListing,
            Crop,
            Buyer,
            BuyerProfile,
        )
        .join(
            CropListing,
            MarketOffer.listing_id
            == CropListing.id,
        )
        .join(
            Crop,
            CropListing.crop_id
            == Crop.id,
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
        .join(
            Buyer,
            MarketOffer.buyer_id
            == Buyer.id,
        )
        .join(
            BuyerProfile,
            Buyer.buyer_profile_id
            == BuyerProfile.id,
        )
        .filter(
            Farm.farmer_id
            == farmer_profile.id
        )
        .order_by(
            MarketOffer.created_at.desc()
        )
        .all()
    )


def lock_offer(
    db: Session,
    offer_id: UUID,
) -> MarketOffer:
    offer = (
        db.query(MarketOffer)
        .filter(
            MarketOffer.id == offer_id
        )
        .with_for_update()
        .first()
    )

    if offer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Offer not found",
        )

    return offer


def lock_listing(
    db: Session,
    listing_id: UUID,
) -> CropListing:
    listing = (
        db.query(CropListing)
        .filter(
            CropListing.id == listing_id
        )
        .with_for_update()
        .first()
    )

    if listing is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found",
        )

    return listing


def create_order_from_offer(
    db: Session,
    offer: MarketOffer,
    agreed_price_per_kg: float,
) -> Order:
    listing = lock_listing(
        db,
        offer.listing_id,
    )

    if listing.status != "active":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Listing is no longer active. "
                "Offer cannot be accepted."
            ),
        )

    if (
        offer.quantity_kg
        > listing.quantity_kg
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Only {listing.quantity_kg} kg "
                "is currently available. "
                "Offer quantity can no longer "
                "be fulfilled."
            ),
        )

    total_amount = round(
        offer.quantity_kg
        * agreed_price_per_kg,
        2,
    )

    order = Order(
        listing_id=listing.id,
        buyer_id=offer.buyer_id,
        total_amount=total_amount,
        status="pending",
    )

    db.add(order)
    db.flush()

    order_item = OrderItem(
        order_id=order.id,
        crop_id=listing.crop_id,
        quantity_kg=offer.quantity_kg,
        price_per_kg=(
            agreed_price_per_kg
        ),
    )

    db.add(order_item)

    db.add(
        OrderTrackingEvent(
            order_id=order.id,
            status="pending",
            message=(
                "Order created from "
                "accepted market offer"
            ),
        )
    )

    listing.quantity_kg -= (
        offer.quantity_kg
    )

    if listing.quantity_kg <= 0:
        listing.quantity_kg = 0
        listing.status = "sold"

    offer.status = "accepted"
    offer.order_id = order.id

    return order


@router.get(
    "/health",
    response_model=OfferHealthResponse,
)
def offers_health():
    return {
        "status": "ok",
        "module": (
            "AGRIVA Buyer Offers"
        ),
        "phase": "SIH-6A",
        "inventory_reserved_on_offer": False,
        "order_created_only_on_accept": True,
    }


@router.post(
    "",
    response_model=OfferResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_offer(
    payload: OfferCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    buyer = get_buyer_for_user(
        db,
        current_user,
    )

    listing = (
        db.query(CropListing)
        .filter(
            CropListing.id
            == payload.listing_id
        )
        .first()
    )

    if listing is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found",
        )

    if listing.status != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Listing is not active",
        )

    if (
        payload.quantity_kg
        > listing.quantity_kg
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Only {listing.quantity_kg} kg "
                "is available"
            ),
        )

    existing_open_offer = (
        db.query(MarketOffer)
        .filter(
            MarketOffer.listing_id
            == listing.id,
            MarketOffer.buyer_id
            == buyer.id,
            MarketOffer.status.in_(
                OPEN_OFFER_STATUSES
            ),
        )
        .first()
    )

    if existing_open_offer is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "You already have an active "
                "offer for this listing."
            ),
        )

    try:
        offer = MarketOffer(
            listing_id=listing.id,
            buyer_id=buyer.id,
            quantity_kg=(
                payload.quantity_kg
            ),
            offer_price_per_kg=(
                payload.offer_price_per_kg
            ),
            message=payload.message,
            status="pending",
        )

        db.add(offer)
        db.commit()
        db.refresh(offer)

        return serialize_offer(
            get_offer_context(
                db,
                offer.id,
            )
        )

    except HTTPException:
        db.rollback()
        raise

    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail="Unable to create offer",
        ) from exc


@router.get(
    "/my-offers",
    response_model=list[OfferResponse],
)
def get_buyer_offers(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    buyer = get_buyer_for_user(
        db,
        current_user,
    )

    return [
        serialize_offer(row)
        for row in (
            list_offer_rows_for_buyer(
                db,
                buyer.id,
            )
        )
    ]


@router.get(
    "/farmer/received",
    response_model=list[OfferResponse],
)
def get_farmer_received_offers(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_farmer
    ),
):
    return [
        serialize_offer(row)
        for row in (
            list_offer_rows_for_farmer(
                db,
                current_user,
            )
        )
    ]


@router.get(
    "/{offer_id}",
    response_model=OfferResponse,
)
def get_offer(
    offer_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    row = get_offer_context(
        db,
        offer_id,
    )

    offer = row[0]

    if current_user.role == "BUYER":
        buyer = get_buyer_for_user(
            db,
            current_user,
        )

        if offer.buyer_id != buyer.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Offer not found",
            )

    elif current_user.role == "FARMER":
        get_owned_listing(
            db,
            current_user,
            offer.listing_id,
        )

    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    return serialize_offer(row)


@router.post(
    "/{offer_id}/counter",
    response_model=OfferResponse,
)
def counter_offer(
    offer_id: UUID,
    payload: OfferCounter,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_farmer
    ),
):
    try:
        offer = lock_offer(
            db,
            offer_id,
        )

        get_owned_listing(
            db,
            current_user,
            offer.listing_id,
        )

        if offer.status != "pending":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "Only a pending offer can "
                    "be countered."
                ),
            )

        offer.counter_price_per_kg = (
            payload.counter_price_per_kg
        )
        offer.counter_message = (
            payload.message
        )
        offer.status = "countered"

        db.commit()
        db.refresh(offer)

        return serialize_offer(
            get_offer_context(
                db,
                offer.id,
            )
        )

    except HTTPException:
        db.rollback()
        raise

    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail="Unable to counter offer",
        ) from exc


@router.post(
    "/{offer_id}/accept",
    response_model=OfferResponse,
)
def accept_offer(
    offer_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    try:
        offer = lock_offer(
            db,
            offer_id,
        )

        if offer.order_id is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "This offer has already "
                    "created an order."
                ),
            )

        if current_user.role == "FARMER":
            get_owned_listing(
                db,
                current_user,
                offer.listing_id,
            )

            if offer.status != "pending":
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        "Farmer can accept only "
                        "a pending buyer offer. "
                        "If you countered it, the "
                        "buyer must accept the "
                        "counter-offer."
                    ),
                )

            agreed_price = (
                offer.offer_price_per_kg
            )

        elif current_user.role == "BUYER":
            buyer = get_buyer_for_user(
                db,
                current_user,
            )

            if offer.buyer_id != buyer.id:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Offer not found",
                )

            if (
                offer.status != "countered"
                or offer.counter_price_per_kg
                is None
            ):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        "Buyer can accept only "
                        "a farmer counter-offer."
                    ),
                )

            agreed_price = (
                offer.counter_price_per_kg
            )

        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied",
            )

        create_order_from_offer(
            db,
            offer,
            agreed_price,
        )

        db.commit()
        db.refresh(offer)

        return serialize_offer(
            get_offer_context(
                db,
                offer.id,
            )
        )

    except HTTPException:
        db.rollback()
        raise

    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail="Unable to accept offer",
        ) from exc


@router.post(
    "/{offer_id}/reject",
    response_model=OfferResponse,
)
def reject_offer(
    offer_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    try:
        offer = lock_offer(
            db,
            offer_id,
        )

        if offer.status not in {
            "pending",
            "countered",
        }:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "Only an open offer can "
                    "be rejected."
                ),
            )

        if current_user.role == "FARMER":
            get_owned_listing(
                db,
                current_user,
                offer.listing_id,
            )

            if offer.status != "pending":
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        "Farmer already countered "
                        "this offer. Buyer must "
                        "respond to the counter."
                    ),
                )

            offer.status = "rejected"

        elif current_user.role == "BUYER":
            buyer = get_buyer_for_user(
                db,
                current_user,
            )

            if offer.buyer_id != buyer.id:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Offer not found",
                )

            if offer.status == "pending":
                offer.status = "withdrawn"
            else:
                offer.status = (
                    "counter_rejected"
                )

        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied",
            )

        db.commit()
        db.refresh(offer)

        return serialize_offer(
            get_offer_context(
                db,
                offer.id,
            )
        )

    except HTTPException:
        db.rollback()
        raise

    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail="Unable to reject offer",
        ) from exc
