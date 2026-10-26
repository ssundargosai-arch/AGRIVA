from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.dependencies import require_buyer
from app.db.session import get_db

from app.models.user import (
    User,
    BuyerProfile,
    FarmerProfile,
)

from app.models.market import (
    CropListing,
    Favorite,
    Order,
)

from app.models.finance import Payment

from app.models.support import (
    Review,
    TransportBooking,
)


# =========================================================
# ROUTER
# =========================================================

router = APIRouter(
    prefix="/api/buyer",
    tags=["Buyer"],
)


# =========================================================
# REQUEST SCHEMAS
# =========================================================

class ReviewCreate(BaseModel):
    order_id: UUID
    rating: int = Field(..., ge=1, le=5)
    comment: str | None = None


class BuyerProfileUpdate(BaseModel):
    business_name: str | None = None
    business_type: str | None = None
    city: str | None = None
    state: str | None = None


# =========================================================
# INTERNAL HELPER
# =========================================================

def get_buyer_profile_for_user(
    db: Session,
    current_user: User,
) -> BuyerProfile:

    profile = (
        db.query(BuyerProfile)
        .filter(
            BuyerProfile.user_id
            == current_user.id
        )
        .first()
    )

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Buyer profile not found",
        )

    return profile


# =========================================================
# HEALTH
# =========================================================

@router.get("/health")
def buyer_health():
    return {
        "status": "ok",
        "module": "buyer",
    }


# =========================================================
# BUYER PROFILE
# =========================================================

@router.get("/profile")
def get_buyer_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_buyer),
):
    profile = get_buyer_profile_for_user(
        db,
        current_user,
    )

    return profile


@router.put("/profile")
def update_buyer_profile(
    payload: BuyerProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_buyer),
):
    profile = get_buyer_profile_for_user(
        db,
        current_user,
    )

    updates = payload.model_dump(
        exclude_unset=True,
        exclude_none=True,
    )

    for field, value in updates.items():
        setattr(
            profile,
            field,
            value,
        )

    db.commit()
    db.refresh(profile)

    return profile


# =========================================================
# SEARCH FARMERS
# =========================================================

@router.get("/farmers")
def search_farmers(
    q: str | None = Query(
        default=None,
        max_length=100,
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_buyer),
):
    query = (
        db.query(
            FarmerProfile,
            User,
        )
        .join(
            User,
            User.id
            == FarmerProfile.user_id,
        )
    )

    if q and q.strip():
        search = f"%{q.strip()}%"

        query = query.filter(
            User.full_name.ilike(search)
            | FarmerProfile.village.ilike(search)
            | FarmerProfile.district.ilike(search)
            | FarmerProfile.state.ilike(search)
        )

    rows = (
        query
        .limit(50)
        .all()
    )

    return [
        {
            "farmer_id": str(profile.id),
            "user_id": str(user.id),
            "name": user.full_name,
            "email": user.email,
            "village": profile.village,
            "district": profile.district,
            "state": profile.state,
            "language": profile.language,
        }
        for profile, user in rows
    ]


# =========================================================
# RECOMMENDED CROPS
# =========================================================

@router.get("/recommended-crops")
def recommended_crops(
    limit: int = Query(
        default=10,
        ge=1,
        le=50,
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_buyer),
):
    listings = (
        db.query(CropListing)
        .filter(
            CropListing.status
            == "active"
        )
        .order_by(
            CropListing.created_at.desc()
        )
        .limit(limit)
        .all()
    )

    return listings


# =========================================================
# BUYER DASHBOARD
# =========================================================

@router.get("/dashboard")
def buyer_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_buyer),
):
    buyer = get_buyer_profile_for_user(
        db,
        current_user,
    )

    active_listings = (
        db.query(CropListing)
        .filter(
            CropListing.status
            == "active"
        )
        .count()
    )

    favorites_count = (
        db.query(Favorite)
        .filter(
            Favorite.user_id
            == current_user.id
        )
        .count()
    )

    orders_count = (
        db.query(Order)
        .filter(
            Order.buyer_id
            == buyer.id
        )
        .count()
    )

    payments_count = (
        db.query(Payment)
        .join(
            Order,
            Payment.order_id
            == Order.id,
        )
        .filter(
            Order.buyer_id
            == buyer.id
        )
        .count()
    )

    transport_count = (
        db.query(TransportBooking)
        .join(
            Order,
            TransportBooking.order_id
            == Order.id,
        )
        .filter(
            Order.buyer_id
            == buyer.id
        )
        .count()
    )

    recent_listings = (
        db.query(CropListing)
        .filter(
            CropListing.status
            == "active"
        )
        .order_by(
            CropListing.created_at.desc()
        )
        .limit(5)
        .all()
    )

    return {
        "buyer": {
            "id": str(buyer.id),
            "business_name": buyer.business_name,
            "business_type": buyer.business_type,
            "city": buyer.city,
            "state": buyer.state,
        },
        "stats": {
            "active_listings": active_listings,
            "favorites": favorites_count,
            "orders": orders_count,
            "payments": payments_count,
            "transport_bookings": transport_count,
        },
        "recommended_crops": recent_listings,
    }


# =========================================================
# BUYER REVIEWS
# =========================================================

@router.get("/reviews")
def buyer_reviews(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_buyer),
):
    buyer = get_buyer_profile_for_user(
        db,
        current_user,
    )

    reviews = (
        db.query(Review)
        .join(
            Order,
            Review.order_id
            == Order.id,
        )
        .filter(
            Order.buyer_id
            == buyer.id
        )
        .all()
    )

    return reviews


@router.post(
    "/reviews",
    status_code=status.HTTP_201_CREATED,
)
def create_buyer_review(
    payload: ReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_buyer),
):
    buyer = get_buyer_profile_for_user(
        db,
        current_user,
    )

    order = (
        db.query(Order)
        .filter(
            Order.id == payload.order_id,
            Order.buyer_id == buyer.id,
        )
        .first()
    )

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )

    existing_review = (
        db.query(Review)
        .filter(
            Review.order_id
            == order.id
        )
        .first()
    )

    if existing_review:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Review already exists for this order",
        )

    review = Review(
        order_id=order.id,
        rating=payload.rating,
        comment=payload.comment,
    )

    db.add(review)
    db.commit()
    db.refresh(review)

    return review