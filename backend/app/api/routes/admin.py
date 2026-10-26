from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.dependencies import require_admin
from app.db.session import get_db

from app.models.user import (
    User,
    FarmerProfile,
    BuyerProfile,
)

from app.models.store import Product

from app.models.market import (
    CropListing,
    Order,
)

from app.models.finance import Payment

from app.models.support import Notification

from app.models.crop import (
    CropHealth,
    CropQualityPrediction,
    PricePrediction,
)


# =========================================================
# ROUTER
# =========================================================

router = APIRouter(
    prefix="/api/admin",
    tags=["Admin"],
)


# =========================================================
# REQUEST SCHEMAS
# =========================================================

class UserStatusUpdate(BaseModel):
    is_active: bool


class UserRoleUpdate(BaseModel):
    role: str


class ProductUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    price: float | None = Field(default=None, ge=0)
    stock_quantity: int | None = Field(default=None, ge=0)


class OrderStatusUpdate(BaseModel):
    status: str


class PaymentStatusUpdate(BaseModel):
    status: str


class ListingStatusUpdate(BaseModel):
    status: str


class NotificationCreate(BaseModel):
    user_id: UUID
    title: str = Field(..., min_length=1, max_length=200)
    message: str = Field(..., min_length=1)


# =========================================================
# HEALTH
# =========================================================

@router.get("/health")
def admin_health(
    current_user: User = Depends(require_admin),
):
    return {
        "status": "ok",
        "module": "admin",
        "admin_user_id": str(current_user.id),
    }


# =========================================================
# DASHBOARD
# =========================================================

@router.get("/dashboard")
def admin_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    total_users = db.query(User).count()

    total_farmers = (
        db.query(FarmerProfile)
        .count()
    )

    total_buyers = (
        db.query(BuyerProfile)
        .count()
    )

    total_products = (
        db.query(Product)
        .count()
    )

    total_listings = (
        db.query(CropListing)
        .count()
    )

    active_listings = (
        db.query(CropListing)
        .filter(
            CropListing.status == "active"
        )
        .count()
    )

    total_orders = (
        db.query(Order)
        .count()
    )

    total_payments = (
        db.query(Payment)
        .count()
    )

    successful_revenue = (
        db.query(
            func.coalesce(
                func.sum(Payment.amount),
                0.0,
            )
        )
        .filter(
            func.lower(Payment.status).in_(
                [
                    "success",
                    "successful",
                    "paid",
                    "completed",
                ]
            )
        )
        .scalar()
    )

    price_predictions = (
        db.query(PricePrediction)
        .count()
    )

    quality_predictions = (
        db.query(CropQualityPrediction)
        .count()
    )

    health_predictions = (
        db.query(CropHealth)
        .count()
    )

    total_ai_predictions = (
        price_predictions
        + quality_predictions
        + health_predictions
    )

    unread_notifications = (
        db.query(Notification)
        .filter(
            Notification.is_read.is_(False)
        )
        .count()
    )

    recent_orders = (
        db.query(Order)
        .order_by(
            Order.created_at.desc()
        )
        .limit(5)
        .all()
    )

    return {
        "stats": {
            "total_users": total_users,
            "total_farmers": total_farmers,
            "total_buyers": total_buyers,
            "total_products": total_products,
            "total_listings": total_listings,
            "active_listings": active_listings,
            "total_orders": total_orders,
            "total_payments": total_payments,
            "revenue": float(
                successful_revenue or 0
            ),
            "ai_predictions": {
                "total": total_ai_predictions,
                "price": price_predictions,
                "quality": quality_predictions,
                "crop_health": health_predictions,
            },
            "unread_notifications": (
                unread_notifications
            ),
        },
        "recent_orders": recent_orders,
    }


# =========================================================
# REGIONAL ACTIVITY
# =========================================================

@router.get("/regional-activity")
def regional_activity(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    farmer_rows = (
        db.query(
            FarmerProfile.state,
            func.count(FarmerProfile.id),
        )
        .group_by(FarmerProfile.state)
        .all()
    )

    buyer_rows = (
        db.query(
            BuyerProfile.state,
            func.count(BuyerProfile.id),
        )
        .group_by(BuyerProfile.state)
        .all()
    )

    regions = {}

    for state_name, count in farmer_rows:
        key = state_name or "Unknown"

        regions.setdefault(
            key,
            {
                "state": key,
                "farmers": 0,
                "buyers": 0,
            },
        )

        regions[key]["farmers"] = count

    for state_name, count in buyer_rows:
        key = state_name or "Unknown"

        regions.setdefault(
            key,
            {
                "state": key,
                "farmers": 0,
                "buyers": 0,
            },
        )

        regions[key]["buyers"] = count

    return list(regions.values())


# =========================================================
# USERS
# =========================================================

@router.get("/users")
def admin_users(
    role: str | None = Query(default=None),
    q: str | None = Query(default=None),
    limit: int = Query(
        default=100,
        ge=1,
        le=500,
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    query = db.query(User)

    if role:
        query = query.filter(
            User.role == role.upper()
        )

    if q and q.strip():
        search = f"%{q.strip()}%"

        query = query.filter(
            User.full_name.ilike(search)
            | User.email.ilike(search)
            | User.phone.ilike(search)
        )

    users = (
        query
        .limit(limit)
        .all()
    )

    return [
        {
            "id": str(user.id),
            "full_name": user.full_name,
            "email": user.email,
            "phone": user.phone,
            "role": user.role,
            "is_active": user.is_active,
            "created_at": user.created_at,
            "updated_at": user.updated_at,
        }
        for user in users
    ]


@router.patch("/users/{user_id}/status")
def update_user_status(
    user_id: UUID,
    payload: UserStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if user.id == current_user.id and not payload.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin cannot deactivate own account",
        )

    user.is_active = payload.is_active

    db.commit()
    db.refresh(user)

    return user


@router.patch("/users/{user_id}/role")
def update_user_role(
    user_id: UUID,
    payload: UserRoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    allowed_roles = {
        "ADMIN",
        "FARMER",
        "BUYER",
    }

    new_role = payload.role.upper()

    if new_role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Role must be ADMIN, FARMER or BUYER"
            ),
        )

    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if (
        user.id == current_user.id
        and new_role != "ADMIN"
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin cannot remove own admin role",
        )

    user.role = new_role

    db.commit()
    db.refresh(user)

    return user


# =========================================================
# FARMERS
# =========================================================

@router.get("/farmers")
def admin_farmers(
    q: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    query = (
        db.query(
            FarmerProfile,
            User,
        )
        .join(
            User,
            User.id == FarmerProfile.user_id,
        )
    )

    if q and q.strip():
        search = f"%{q.strip()}%"

        query = query.filter(
            User.full_name.ilike(search)
            | User.email.ilike(search)
            | FarmerProfile.village.ilike(search)
            | FarmerProfile.district.ilike(search)
            | FarmerProfile.state.ilike(search)
        )

    rows = (
        query
        .limit(100)
        .all()
    )

    return [
        {
            "farmer_id": str(profile.id),
            "user_id": str(user.id),
            "name": user.full_name,
            "email": user.email,
            "phone": user.phone,
            "is_active": user.is_active,
            "village": profile.village,
            "district": profile.district,
            "state": profile.state,
            "language": profile.language,
        }
        for profile, user in rows
    ]


# =========================================================
# BUYERS
# =========================================================

@router.get("/buyers")
def admin_buyers(
    q: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    query = (
        db.query(
            BuyerProfile,
            User,
        )
        .join(
            User,
            User.id == BuyerProfile.user_id,
        )
    )

    if q and q.strip():
        search = f"%{q.strip()}%"

        query = query.filter(
            User.full_name.ilike(search)
            | User.email.ilike(search)
            | BuyerProfile.business_name.ilike(search)
            | BuyerProfile.business_type.ilike(search)
            | BuyerProfile.city.ilike(search)
            | BuyerProfile.state.ilike(search)
        )

    rows = (
        query
        .limit(100)
        .all()
    )

    return [
        {
            "buyer_id": str(profile.id),
            "user_id": str(user.id),
            "name": user.full_name,
            "email": user.email,
            "phone": user.phone,
            "is_active": user.is_active,
            "business_name": (
                profile.business_name
            ),
            "business_type": (
                profile.business_type
            ),
            "city": profile.city,
            "state": profile.state,
        }
        for profile, user in rows
    ]


# =========================================================
# PRODUCTS
# =========================================================

@router.get("/products")
def admin_products(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    return (
        db.query(Product)
        .limit(200)
        .all()
    )


@router.patch("/products/{product_id}")
def update_product(
    product_id: UUID,
    payload: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    product = (
        db.query(Product)
        .filter(Product.id == product_id)
        .first()
    )

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    updates = payload.model_dump(
        exclude_unset=True,
        exclude_none=True,
    )

    for field, value in updates.items():
        setattr(product, field, value)

    db.commit()
    db.refresh(product)

    return product


# =========================================================
# ORDERS
# =========================================================

@router.get("/orders")
def admin_orders(
    order_status: str | None = Query(
        default=None,
        alias="status",
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    query = db.query(Order)

    if order_status:
        query = query.filter(
            Order.status == order_status
        )

    return (
        query
        .order_by(
            Order.created_at.desc()
        )
        .limit(200)
        .all()
    )


@router.patch("/orders/{order_id}/status")
def update_order_status(
    order_id: UUID,
    payload: OrderStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    order = (
        db.query(Order)
        .filter(Order.id == order_id)
        .first()
    )

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )

    order.status = payload.status.strip().lower()

    db.commit()
    db.refresh(order)

    return order


# =========================================================
# PAYMENTS
# =========================================================

@router.get("/payments")
def admin_payments(
    payment_status: str | None = Query(
        default=None,
        alias="status",
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    query = db.query(Payment)

    if payment_status:
        query = query.filter(
            Payment.status == payment_status
        )

    return (
        query
        .limit(200)
        .all()
    )


@router.patch("/payments/{payment_id}/status")
def update_payment_status(
    payment_id: UUID,
    payload: PaymentStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    payment = (
        db.query(Payment)
        .filter(Payment.id == payment_id)
        .first()
    )

    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found",
        )

    payment.status = (
        payload.status
        .strip()
        .lower()
    )

    db.commit()
    db.refresh(payment)

    return payment


# =========================================================
# LISTINGS
# =========================================================

@router.get("/listings")
def admin_listings(
    listing_status: str | None = Query(
        default=None,
        alias="status",
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    query = db.query(CropListing)

    if listing_status:
        query = query.filter(
            CropListing.status == listing_status
        )

    return (
        query
        .limit(200)
        .all()
    )


@router.patch("/listings/{listing_id}/status")
def update_listing_status(
    listing_id: UUID,
    payload: ListingStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    listing = (
        db.query(CropListing)
        .filter(
            CropListing.id == listing_id
        )
        .first()
    )

    if not listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found",
        )

    listing.status = (
        payload.status
        .strip()
        .lower()
    )

    db.commit()
    db.refresh(listing)

    return listing


# =========================================================
# NOTIFICATIONS
# =========================================================

@router.get("/notifications")
def admin_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    return (
        db.query(Notification)
        .limit(200)
        .all()
    )


@router.post(
    "/notifications",
    status_code=status.HTTP_201_CREATED,
)
def create_notification(
    payload: NotificationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    user = (
        db.query(User)
        .filter(
            User.id == payload.user_id
        )
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    notification = Notification(
        user_id=user.id,
        title=payload.title.strip(),
        message=payload.message.strip(),
        is_read=False,
    )

    db.add(notification)
    db.commit()
    db.refresh(notification)

    return notification


# =========================================================
# AI STATISTICS
# =========================================================

@router.get("/ai-stats")
def admin_ai_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    price_count = (
        db.query(PricePrediction)
        .count()
    )

    quality_count = (
        db.query(CropQualityPrediction)
        .count()
    )

    health_count = (
        db.query(CropHealth)
        .count()
    )

    return {
        "total": (
            price_count
            + quality_count
            + health_count
        ),
        "price_predictions": price_count,
        "quality_predictions": quality_count,
        "crop_health_analyses": health_count,
    }