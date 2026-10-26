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
from app.models.finance import Payment
from app.models.market import (
    Buyer,
    CropListing,
    Order,
    OrderItem,
)
from app.models.order_tracking import (
    OrderTrackingEvent,
)
from app.models.user import (
    BuyerProfile,
    FarmerProfile,
    User,
)
from app.schemas.order import (
    OrderCreate,
    OrderResponse,
    OrderStatusUpdate,
)
from app.schemas.order_tracking import (
    OrderTrackingResponse,
)


router = APIRouter(
    prefix="/api/orders",
    tags=["Orders"],
)


# =========================================================
# HELPERS
# =========================================================


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


def farmer_order_query(
    db: Session,
    current_user: User,
):
    farmer_profile = get_farmer_profile(
        db,
        current_user,
    )

    return (
        db.query(Order)
        .join(
            CropListing,
            Order.listing_id
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
        .filter(
            Farm.farmer_id
            == farmer_profile.id
        )
    )


# =========================================================
# HEALTH
# =========================================================


@router.get("/health")
def orders_health():
    return {
        "status": "ok",
        "module": "AGRIVA Orders",
        "phase": 10,
        "farmer_ownership_security": True,
        "order_lifecycle_security": True,
        "inventory_restore": True,
    }


# =========================================================
# PLACE ORDER
# BUYER ONLY
# =========================================================


@router.post(
    "",
    response_model=OrderResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_order(
    payload: OrderCreate,
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

    if payload.quantity_kg <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Quantity must be "
                "greater than zero"
            ),
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

    price_per_kg = (
        listing.expected_price_per_kg
    )

    total_amount = round(
        payload.quantity_kg
        * price_per_kg,
        2,
    )

    try:
        order = Order(
            listing_id=listing.id,
            buyer_id=buyer.id,
            total_amount=total_amount,
            status="pending",
        )

        db.add(order)
        db.flush()

        order_item = OrderItem(
            order_id=order.id,
            crop_id=listing.crop_id,
            quantity_kg=(
                payload.quantity_kg
            ),
            price_per_kg=(
                price_per_kg
            ),
        )

        db.add(order_item)

        tracking_event = (
            OrderTrackingEvent(
                order_id=order.id,
                status="pending",
                message=(
                    "Order placed by buyer"
                ),
            )
        )

        db.add(tracking_event)

        listing.quantity_kg -= (
            payload.quantity_kg
        )

        if listing.quantity_kg <= 0:
            listing.quantity_kg = 0
            listing.status = "sold"

        db.commit()
        db.refresh(order)

        return order

    except HTTPException:
        db.rollback()
        raise

    except Exception as exc:
        db.rollback()

        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail="Unable to create order",
        ) from exc


# =========================================================
# BUYER - MY ORDERS
# =========================================================


@router.get(
    "/my-orders",
    response_model=list[OrderResponse],
)
def get_my_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    buyer = get_buyer_for_user(
        db,
        current_user,
    )

    return (
        db.query(Order)
        .filter(
            Order.buyer_id == buyer.id
        )
        .order_by(
            Order.created_at.desc()
        )
        .all()
    )


# =========================================================
# FARMER - VIEW INCOMING ORDERS
# Keep before /{order_id}
# =========================================================


@router.get(
    "/farmer/incoming",
    response_model=list[OrderResponse],
)
def get_farmer_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_farmer
    ),
):
    return (
        farmer_order_query(
            db,
            current_user,
        )
        .order_by(
            Order.created_at.desc()
        )
        .all()
    )


# =========================================================
# ORDER TRACKING
# =========================================================


@router.get(
    "/{order_id}/tracking",
    response_model=list[
        OrderTrackingResponse
    ],
)
def get_order_tracking(
    order_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    if current_user.role == "BUYER":
        buyer = get_buyer_for_user(
            db,
            current_user,
        )

        order = (
            db.query(Order)
            .filter(
                Order.id == order_id,
                Order.buyer_id
                == buyer.id,
            )
            .first()
        )

    elif current_user.role == "FARMER":
        order = (
            farmer_order_query(
                db,
                current_user,
            )
            .filter(
                Order.id == order_id
            )
            .first()
        )

    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    if order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )

    return (
        db.query(OrderTrackingEvent)
        .filter(
            OrderTrackingEvent.order_id
            == order.id
        )
        .order_by(
            OrderTrackingEvent.created_at.asc()
        )
        .all()
    )


# =========================================================
# GET SINGLE ORDER
# =========================================================


@router.get(
    "/{order_id}",
    response_model=OrderResponse,
)
def get_order(
    order_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    if current_user.role == "BUYER":
        buyer = get_buyer_for_user(
            db,
            current_user,
        )

        order = (
            db.query(Order)
            .filter(
                Order.id == order_id,
                Order.buyer_id
                == buyer.id,
            )
            .first()
        )

        if order is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found",
            )

        return order

    if current_user.role == "FARMER":
        order = (
            farmer_order_query(
                db,
                current_user,
            )
            .filter(
                Order.id == order_id
            )
            .first()
        )

        if order is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found",
            )

        return order

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Access denied",
    )


# =========================================================
# FARMER - UPDATE ORDER STATUS
# =========================================================


@router.patch(
    "/{order_id}/status",
    response_model=OrderResponse,
)
def update_order_status(
    order_id: UUID,
    payload: OrderStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_farmer
    ),
):
    order = (
        farmer_order_query(
            db,
            current_user,
        )
        .filter(
            Order.id == order_id
        )
        .first()
    )

    if order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )

    new_status = (
        payload.status
        .strip()
        .lower()
    )

    current_status = (
        order.status
        .strip()
        .lower()
    )

    allowed_statuses = {
        "pending",
        "accepted",
        "rejected",
        "completed",
        "cancelled",
    }

    if (
        new_status
        not in allowed_statuses
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Invalid order status. "
                "Allowed: pending, accepted, "
                "rejected, completed, cancelled"
            ),
        )

    allowed_transitions = {
        "pending": {
            "accepted",
            "rejected",
            "cancelled",
        },
        "accepted": {
            "completed",
            "cancelled",
        },
        "rejected": set(),
        "completed": set(),
        "cancelled": set(),
    }

    if (
        new_status
        == current_status
    ):
        return order

    valid_next_statuses = (
        allowed_transitions.get(
            current_status
        )
    )

    if valid_next_statuses is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Unknown current order "
                f"status: {current_status}"
            ),
        )

    if (
        new_status
        not in valid_next_statuses
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Invalid order status "
                "transition: "
                f"{current_status} "
                f"-> {new_status}"
            ),
        )

    try:
        # ---------------------------------------------
        # PAYMENT CANCELLATION PROTECTION
        # ---------------------------------------------

        if new_status == "cancelled":
            payment = (
                db.query(Payment)
                .filter(
                    Payment.order_id
                    == order.id
                )
                .order_by(
                    Payment.id.desc()
                )
                .first()
            )

            if payment is not None:
                payment_status = (
                    payment.status
                    .strip()
                    .lower()
                )

                protected_payment_statuses = {
                    "paid",
                    "completed",
                    "success",
                    "successful",
                }

                if (
                    payment_status
                    in protected_payment_statuses
                ):
                    raise HTTPException(
                        status_code=(
                            status.HTTP_400_BAD_REQUEST
                        ),
                        detail=(
                            "Paid order cannot "
                            "be cancelled. "
                            "Refund the payment first."
                        ),
                    )

        # ---------------------------------------------
        # INVENTORY RESTORE
        # ---------------------------------------------

        if new_status in {
            "rejected",
            "cancelled",
        }:
            listing = (
                db.query(CropListing)
                .filter(
                    CropListing.id
                    == order.listing_id
                )
                .first()
            )

            if listing is None:
                raise HTTPException(
                    status_code=(
                        status.HTTP_404_NOT_FOUND
                    ),
                    detail=(
                        "Order listing not found"
                    ),
                )

            order_items = (
                db.query(OrderItem)
                .filter(
                    OrderItem.order_id
                    == order.id
                )
                .all()
            )

            if not order_items:
                raise HTTPException(
                    status_code=(
                        status.HTTP_404_NOT_FOUND
                    ),
                    detail=(
                        "Order items not found"
                    ),
                )

            restore_quantity = sum(
                float(
                    item.quantity_kg
                )
                for item in order_items
            )

            listing.quantity_kg = (
                float(
                    listing.quantity_kg
                )
                + restore_quantity
            )

            if (
                listing.quantity_kg > 0
                and listing.status == "sold"
            ):
                listing.status = "active"

        # ---------------------------------------------
        # UPDATE STATUS
        # ---------------------------------------------

        order.status = new_status

        # ---------------------------------------------
        # TRACKING EVENT
        # ---------------------------------------------

        tracking_event = (
            OrderTrackingEvent(
                order_id=order.id,
                status=new_status,
                message=(
                    "Order status changed "
                    f"to {new_status}"
                ),
            )
        )

        db.add(tracking_event)

        db.commit()
        db.refresh(order)

        return order

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
                "Unable to update "
                "order status"
            ),
        ) from exc
