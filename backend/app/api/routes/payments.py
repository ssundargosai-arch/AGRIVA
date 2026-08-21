import uuid
from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.db.session import get_db

from app.models.finance import (
    Payment,
    Transaction,
)
from app.models.market import (
    Buyer,
    Order,
)
from app.models.user import (
    BuyerProfile,
    User,
)

from app.schemas.payment import (
    PaymentCreate,
    PaymentResponse,
    PaymentStatusUpdate,
)


router = APIRouter(
    prefix="/api/payments",
    tags=["Payments"],
)


# =========================================================
# HELPER - GET MARKETPLACE BUYER
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
            BuyerProfile.user_id == current_user.id
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
            Buyer.buyer_profile_id == buyer_profile.id
        )
        .first()
    )

    if buyer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Marketplace buyer record not found",
        )

    return buyer


# =========================================================
# HELPER - VERIFY BUYER OWNS ORDER
# =========================================================

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


# =========================================================
# HEALTH
# =========================================================

@router.get("/health")
def payment_health():
    return {
        "status": "ok",
        "module": "AGRIVA Payments",
        "phase": 10,
    }


# =========================================================
# CREATE PAYMENT
# BUYER ONLY
# =========================================================

@router.post(
    "",
    response_model=PaymentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_payment(
    payload: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
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

    # Payment can only be created after farmer accepts order.
    if order.status != "accepted":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Payment can only be created "
                "for an accepted order"
            ),
        )

    payment_method = (
        payload.payment_method
        .strip()
        .lower()
    )

    allowed_methods = {
        "upi",
        "card",
        "netbanking",
        "cash",
        "wallet",
    }

    if payment_method not in allowed_methods:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Invalid payment method. "
                "Allowed methods: upi, card, "
                "netbanking, cash, wallet"
            ),
        )

    # Prevent duplicate payment records.
    existing = (
        db.query(Payment)
        .filter(
            Payment.order_id == order.id
        )
        .first()
    )

    if existing:
        return existing

    payment = Payment(
        order_id=order.id,
        amount=order.total_amount,
        payment_method=payment_method,
        status="pending",
    )

    try:
        db.add(payment)
        db.commit()
        db.refresh(payment)

    except Exception as exc:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to create payment",
        ) from exc

    return payment


# =========================================================
# BUYER - MY PAYMENTS
# =========================================================

@router.get(
    "/my-payments",
    response_model=list[PaymentResponse],
)
def get_my_payments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    buyer = get_buyer_for_user(
        db,
        current_user,
    )

    payments = (
        db.query(Payment)
        .join(
            Order,
            Order.id == Payment.order_id,
        )
        .filter(
            Order.buyer_id == buyer.id
        )
        .order_by(
            Payment.id.desc()
        )
        .all()
    )

    return payments


# =========================================================
# GET PAYMENT BY ORDER
# =========================================================

@router.get(
    "/order/{order_id}",
    response_model=PaymentResponse,
)
def get_payment_for_order(
    order_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
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

    payment = (
        db.query(Payment)
        .filter(
            Payment.order_id == order.id
        )
        .first()
    )

    if payment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found",
        )

    return payment


# =========================================================
# GET SINGLE PAYMENT
# =========================================================

@router.get(
    "/{payment_id}",
    response_model=PaymentResponse,
)
def get_payment(
    payment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    buyer = get_buyer_for_user(
        db,
        current_user,
    )

    payment = (
        db.query(Payment)
        .join(
            Order,
            Order.id == Payment.order_id,
        )
        .filter(
            Payment.id == payment_id,
            Order.buyer_id == buyer.id,
        )
        .first()
    )

    if payment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found",
        )

    return payment


# =========================================================
# UPDATE PAYMENT STATUS
# BUYER OWNERSHIP + LIFECYCLE PROTECTED
# =========================================================

@router.patch(
    "/{payment_id}/status",
    response_model=PaymentResponse,
)
def update_payment_status(
    payment_id: UUID,
    payload: PaymentStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    buyer = get_buyer_for_user(
        db,
        current_user,
    )

    # Buyer can update only their own payment.
    payment = (
        db.query(Payment)
        .join(
            Order,
            Order.id == Payment.order_id,
        )
        .filter(
            Payment.id == payment_id,
            Order.buyer_id == buyer.id,
        )
        .first()
    )

    if payment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found",
        )

    new_status = (
        payload.status
        .strip()
        .lower()
    )

    current_status = (
        payment.status
        .strip()
        .lower()
    )

    allowed_statuses = {
        "pending",
        "paid",
        "failed",
        "refunded",
    }

    if new_status not in allowed_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Invalid payment status. "
                "Allowed: pending, paid, failed, refunded"
            ),
        )

    # =====================================================
    # PAYMENT LIFECYCLE
    #
    # pending -> paid
    # pending -> failed
    # paid    -> refunded
    #
    # failed and refunded are terminal states.
    # =====================================================

    allowed_transitions = {
        "pending": {
            "paid",
            "failed",
        },
        "paid": {
            "refunded",
        },
        "failed": set(),
        "refunded": set(),
    }

    # Same status request is safe/idempotent.
    if new_status == current_status:
        return payment

    valid_next_statuses = allowed_transitions.get(
        current_status
    )

    if valid_next_statuses is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Unknown current payment status: "
                f"{current_status}"
            ),
        )

    if new_status not in valid_next_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Invalid payment status transition: "
                f"{current_status} -> {new_status}"
            ),
        )

    try:
        payment.status = new_status

        # =================================================
        # PENDING -> PAID
        # =================================================

        if new_status == "paid":
            transaction = (
                db.query(Transaction)
                .filter(
                    Transaction.payment_id == payment.id
                )
                .first()
            )

            if transaction is None:
                transaction = Transaction(
                    payment_id=payment.id,
                    transaction_reference=(
                        "AGRIVA-"
                        + uuid.uuid4().hex.upper()
                    ),
                    amount=payment.amount,
                    status="success",
                )

                db.add(transaction)

            else:
                transaction.status = "success"

        # =================================================
        # PENDING -> FAILED
        # =================================================

        elif new_status == "failed":
            transaction = (
                db.query(Transaction)
                .filter(
                    Transaction.payment_id == payment.id
                )
                .first()
            )

            # Usually no transaction exists for a failed
            # payment in this demo flow. If one exists,
            # synchronize its status.
            if transaction:
                transaction.status = "failed"

        # =================================================
        # PAID -> REFUNDED
        # =================================================

        elif new_status == "refunded":
            transaction = (
                db.query(Transaction)
                .filter(
                    Transaction.payment_id == payment.id
                )
                .first()
            )

            if transaction is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        "Cannot refund payment because "
                        "transaction record was not found"
                    ),
                )

            transaction.status = "refunded"

        db.commit()
        db.refresh(payment)

    except HTTPException:
        db.rollback()
        raise

    except Exception as exc:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to update payment status",
        ) from exc

    return payment