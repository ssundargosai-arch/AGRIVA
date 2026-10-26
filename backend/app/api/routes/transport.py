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
)
from app.db.session import get_db

from app.models.finance import Payment
from app.models.market import (
    Buyer,
    Order,
)
from app.models.support import (
    TransportBooking,
)
from app.models.user import (
    BuyerProfile,
    User,
)

from app.schemas.transport import (
    TransportBookingCreate,
    TransportBookingResponse,
    TransportStatusUpdate,
)
from app.models.order_tracking import (
    OrderTrackingEvent,
)


router = APIRouter(
    prefix="/api/transport",
    tags=["Transport"],
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


def get_buyer_order(
    db: Session,
    order_id: UUID,
    buyer: Buyer,
) -> Order:
    order = (
        db.query(Order)
        .filter(
            Order.id == order_id,
            Order.buyer_id == buyer.id,
        )
        .first()
    )

    if order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )

    return order


def require_paid_order(
    db: Session,
    order: Order,
) -> Payment:
    payment = (
        db.query(Payment)
        .filter(
            Payment.order_id == order.id,
            Payment.status == "paid",
        )
        .first()
    )

    if payment is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Transport can only be booked "
                "after successful payment"
            ),
        )

    return payment


# =========================================================
# HEALTH
# =========================================================

@router.get("/health")
def transport_health():
    return {
        "status": "ok",
        "module": "AGRIVA Transport",
        "phase": 10,
    }


# =========================================================
# CREATE TRANSPORT BOOKING
# BUYER ONLY
# =========================================================

@router.post(
    "",
    response_model=TransportBookingResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_transport_booking(
    payload: TransportBookingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    buyer = get_buyer_for_user(
        db,
        current_user,
    )

    order = get_buyer_order(
        db,
        payload.order_id,
        buyer,
    )

    require_paid_order(
        db,
        order,
    )

    if order.status not in {
        "accepted",
        "completed",
    }:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Transport cannot be booked "
                f"for order status '{order.status}'"
            ),
        )

    existing = (
        db.query(TransportBooking)
        .filter(
            TransportBooking.order_id
            == order.id
        )
        .first()
    )

    if existing:
        return existing

    vehicle_type = (
        payload.vehicle_type
        .strip()
    )

    pickup_location = (
        payload.pickup_location
        .strip()
    )

    delivery_location = (
        payload.delivery_location
        .strip()
    )

    if not vehicle_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vehicle type is required",
        )

    if not pickup_location:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Pickup location is required",
        )

    if not delivery_location:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Delivery location is required",
        )

    booking = TransportBooking(
        order_id=order.id,
        vehicle_type=vehicle_type,
        pickup_location=pickup_location,
        delivery_location=delivery_location,
        estimated_cost=payload.estimated_cost,
        status="requested",
    )

    try:
        db.add(booking)
        db.commit()
        db.refresh(booking)

    except Exception as exc:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "Unable to create transport booking"
            ),
        ) from exc

    return booking


# =========================================================
# BUYER - MY TRANSPORT BOOKINGS
# =========================================================

@router.get(
    "/my-bookings",
    response_model=list[
        TransportBookingResponse
    ],
)
def get_my_transport_bookings(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    buyer = get_buyer_for_user(
        db,
        current_user,
    )

    bookings = (
        db.query(TransportBooking)
        .join(
            Order,
            Order.id
            == TransportBooking.order_id,
        )
        .filter(
            Order.buyer_id
            == buyer.id
        )
        .all()
    )

    return bookings


# =========================================================
# GET TRANSPORT BOOKING BY ORDER
# =========================================================

@router.get(
    "/order/{order_id}",
    response_model=TransportBookingResponse,
)
def get_transport_booking_by_order(
    order_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    buyer = get_buyer_for_user(
        db,
        current_user,
    )

    order = get_buyer_order(
        db,
        order_id,
        buyer,
    )

    booking = (
        db.query(TransportBooking)
        .filter(
            TransportBooking.order_id
            == order.id
        )
        .first()
    )

    if booking is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "Transport booking not found"
            ),
        )

    return booking


# =========================================================
# GET SINGLE TRANSPORT BOOKING
# =========================================================

@router.get(
    "/{booking_id}",
    response_model=TransportBookingResponse,
)
def get_transport_booking(
    booking_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    buyer = get_buyer_for_user(
        db,
        current_user,
    )

    booking = (
        db.query(TransportBooking)
        .join(
            Order,
            Order.id
            == TransportBooking.order_id,
        )
        .filter(
            TransportBooking.id
            == booking_id,
            Order.buyer_id
            == buyer.id,
        )
        .first()
    )

    if booking is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "Transport booking not found"
            ),
        )

    return booking


# =========================================================
# UPDATE TRANSPORT STATUS
# DEMO TRANSPORT FLOW
# =========================================================
@router.patch(
    "/{booking_id}/status",
    response_model=TransportBookingResponse,
)
def update_transport_status(
    booking_id: UUID,
    payload: TransportStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    buyer = get_buyer_for_user(
        db,
        current_user,
    )

    booking = (
        db.query(TransportBooking)
        .join(
            Order,
            Order.id
            == TransportBooking.order_id,
        )
        .filter(
            TransportBooking.id
            == booking_id,
            Order.buyer_id
            == buyer.id,
        )
        .first()
    )

    if booking is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transport booking not found",
        )

    new_status = (
        payload.status
        .strip()
        .lower()
    )

    allowed_statuses = {
        "requested",
        "confirmed",
        "picked_up",
        "in_transit",
        "delivered",
        "cancelled",
    }

    if new_status not in allowed_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Invalid transport status. "
                "Allowed: requested, confirmed, "
                "picked_up, in_transit, "
                "delivered, cancelled"
            ),
        )

    current_status = (
        booking.status
        .strip()
        .lower()
    )

    if new_status == current_status:
        return booking

    allowed_transitions = {
        "requested": {
            "confirmed",
            "cancelled",
        },
        "confirmed": {
            "picked_up",
            "cancelled",
        },
        "picked_up": {
            "in_transit",
        },
        "in_transit": {
            "delivered",
        },
        "delivered": set(),
        "cancelled": set(),
    }

    valid_next_statuses = (
        allowed_transitions.get(
            current_status,
            set(),
        )
    )

    if new_status not in valid_next_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Invalid transport status "
                f"transition: "
                f"{current_status} -> "
                f"{new_status}"
            ),
        )

    order_status_map = {
        "confirmed": "processing",
        "picked_up": "ready_for_pickup",
        "in_transit": "in_transit",
        "delivered": "delivered",
        "cancelled": "cancelled",
    }

    try:
        booking.status = new_status

        timeline_status = (
            order_status_map.get(
                new_status
            )
        )

        if timeline_status:
            db.add(
                OrderTrackingEvent(
                    order_id=booking.order_id,
                    status=timeline_status,
                    message=(
                        "Transport status changed "
                        f"to {new_status}"
                    ),
                )
            )

        # Delivery completes the related order.
        if new_status == "delivered":
            order = (
                db.query(Order)
                .filter(
                    Order.id
                    == booking.order_id
                )
                .first()
            )

            if order:
                order.status = "completed"

        db.commit()
        db.refresh(booking)

    except Exception as exc:
        db.rollback()

        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=(
                "Unable to update "
                "transport status"
            ),
        ) from exc

    return booking



    # -----------------------------------------------------
    # Valid status transitions
    # -----------------------------------------------------

    allowed_transitions = {
        "requested": {
            "confirmed",
            "cancelled",
        },

        "confirmed": {
            "picked_up",
            "cancelled",
        },

        "picked_up": {
            "in_transit",
        },

        "in_transit": {
            "delivered",
        },

        "delivered": set(),

        "cancelled": set(),
    }

    current_status = (
        booking.status
        .strip()
        .lower()
    )

    if new_status == current_status:
        return booking

    valid_next_statuses = (
        allowed_transitions.get(
            current_status,
            set(),
        )
    )

    if (
        new_status
        not in valid_next_statuses
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Invalid transport status "
                f"transition: "
                f"{current_status} -> "
                f"{new_status}"
            ),
        )

    try:
        booking.status = new_status

        # When transport is delivered,
        # complete the related order.
        if new_status == "delivered":
            order = (
                db.query(Order)
                .filter(
                    Order.id
                    == booking.order_id
                )
                .first()
            )

            if order:
                order.status = "completed"

        db.commit()
        db.refresh(booking)

    except Exception as exc:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "Unable to update "
                "transport status"
            ),
        ) from exc

    return booking