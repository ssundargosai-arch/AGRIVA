from datetime import datetime, timezone
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
    require_admin,
    require_farmer,
)
from app.db.session import get_db
from app.models.crop import Crop
from app.models.farm import Farm, FarmField
from app.models.finance import Payment, Transaction
from app.models.grievance import Grievance
from app.models.market import Buyer, CropListing, Order, OrderItem
from app.models.order_tracking import OrderTrackingEvent
from app.models.support import TransportBooking
from app.models.user import BuyerProfile, FarmerProfile, User
from app.schemas.transaction_assurance import (
    BuyerPlatformHistory,
    BuyerTrustSnapshot,
    GrievanceAdminUpdate,
    GrievanceCreate,
    GrievanceResponse,
    PaymentAssuranceSnapshot,
    TrackingEventSnapshot,
    TransactionAssuranceOrderResponse,
    TransactionSafetyFlags,
    TransportAssuranceSnapshot,
)
from app.services.buyer_verification import verification_snapshot_for_profile
from app.services.transaction_assurance import (
    AssuranceValidationError,
    BUYER_HISTORY_NOTE,
    normalize_grievance_category,
    normalize_grievance_status,
    payment_evidence,
    validate_grievance_transition,
)


router = APIRouter(
    prefix="/api/transaction-assurance",
    tags=["Transaction Assurance"],
)


PAID_LIKE_STATUSES = {
    "paid",
    "success",
    "successful",
    "completed",
}

OPEN_GRIEVANCE_STATUSES = {
    "OPEN",
    "IN_REVIEW",
}


# =========================================================
# OWNERSHIP HELPERS
# =========================================================


def _farmer_profile(
    db: Session,
    current_user: User,
) -> FarmerProfile:
    profile = (
        db.query(FarmerProfile)
        .filter(FarmerProfile.user_id == current_user.id)
        .first()
    )

    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Farmer profile not found",
        )

    return profile


def _farmer_order_query(
    db: Session,
    current_user: User,
):
    farmer = _farmer_profile(db, current_user)

    return (
        db.query(Order)
        .join(
            CropListing,
            Order.listing_id == CropListing.id,
        )
        .join(
            Crop,
            CropListing.crop_id == Crop.id,
        )
        .join(
            FarmField,
            Crop.field_id == FarmField.id,
        )
        .join(
            Farm,
            FarmField.farm_id == Farm.id,
        )
        .filter(Farm.farmer_id == farmer.id)
    )


def _get_farmer_order(
    db: Session,
    current_user: User,
    order_id: UUID,
) -> Order:
    order = (
        _farmer_order_query(db, current_user)
        .filter(Order.id == order_id)
        .first()
    )

    if order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )

    return order


# =========================================================
# SNAPSHOT BUILDERS
# =========================================================


def _buyer_snapshot(
    db: Session,
    order: Order,
) -> BuyerTrustSnapshot:
    buyer = (
        db.query(Buyer)
        .filter(Buyer.id == order.buyer_id)
        .first()
    )

    profile = None
    if buyer is not None:
        profile = (
            db.query(BuyerProfile)
            .filter(BuyerProfile.id == buyer.buyer_profile_id)
            .first()
        )

    verification = (
        verification_snapshot_for_profile(
            db=db,
            buyer_profile_id=(
                profile.id
                if profile is not None
                else None
            ),
        )
    )

    orders_recorded = (
        db.query(Order)
        .filter(Order.buyer_id == order.buyer_id)
        .count()
    )

    completed_orders_recorded = (
        db.query(Order)
        .filter(
            Order.buyer_id == order.buyer_id,
            func.lower(Order.status) == "completed",
        )
        .count()
    )

    payments_recorded = (
        db.query(Payment)
        .join(Order, Order.id == Payment.order_id)
        .filter(Order.buyer_id == order.buyer_id)
        .count()
    )

    paid_payment_records = (
        db.query(Payment)
        .join(Order, Order.id == Payment.order_id)
        .filter(
            Order.buyer_id == order.buyer_id,
            func.lower(Payment.status).in_(PAID_LIKE_STATUSES),
        )
        .count()
    )

    open_grievances_recorded = (
        db.query(Grievance)
        .join(Order, Order.id == Grievance.order_id)
        .filter(
            Order.buyer_id == order.buyer_id,
            Grievance.status.in_(OPEN_GRIEVANCE_STATUSES),
        )
        .count()
    )

    return BuyerTrustSnapshot(
        buyer_id=order.buyer_id,
        business_name=(
            profile.business_name if profile is not None else None
        ),
        business_type=(
            profile.business_type if profile is not None else None
        ),
        city=(profile.city if profile is not None else None),
        state=(profile.state if profile is not None else None),
        verification_status=verification["status"],
        verification_note=verification["verification_note"],
        platform_history=BuyerPlatformHistory(
            orders_recorded=orders_recorded,
            completed_orders_recorded=completed_orders_recorded,
            payments_recorded=payments_recorded,
            paid_payment_records=paid_payment_records,
            open_grievances_recorded=open_grievances_recorded,
        ),
        history_note=BUYER_HISTORY_NOTE,
    )


def _payment_snapshot(
    db: Session,
    order: Order,
) -> PaymentAssuranceSnapshot:
    payment = (
        db.query(Payment)
        .filter(Payment.order_id == order.id)
        .first()
    )

    if payment is None:
        evidence_level, evidence_note = payment_evidence(
            payment_exists=False,
            transaction_reference=None,
        )

        return PaymentAssuranceSnapshot(
            payment_exists=False,
            evidence_level=evidence_level,
            evidence_note=evidence_note,
        )

    transaction = (
        db.query(Transaction)
        .filter(Transaction.payment_id == payment.id)
        .first()
    )

    reference = (
        transaction.transaction_reference
        if transaction is not None
        else None
    )

    evidence_level, evidence_note = payment_evidence(
        payment_exists=True,
        transaction_reference=reference,
    )

    return PaymentAssuranceSnapshot(
        payment_exists=True,
        payment_id=payment.id,
        amount=float(payment.amount),
        payment_method=payment.payment_method,
        status=payment.status,
        transaction_reference=reference,
        transaction_status=(
            transaction.status if transaction is not None else None
        ),
        evidence_level=evidence_level,
        evidence_note=evidence_note,
    )


def _transport_snapshot(
    db: Session,
    order: Order,
) -> TransportAssuranceSnapshot:
    booking = (
        db.query(TransportBooking)
        .filter(TransportBooking.order_id == order.id)
        .first()
    )

    if booking is None:
        return TransportAssuranceSnapshot(
            booking_exists=False,
        )

    return TransportAssuranceSnapshot(
        booking_exists=True,
        booking_id=booking.id,
        vehicle_type=booking.vehicle_type,
        pickup_location=booking.pickup_location,
        delivery_location=booking.delivery_location,
        estimated_cost=float(booking.estimated_cost),
        status=booking.status,
    )


def _tracking_snapshots(
    db: Session,
    order: Order,
) -> list[TrackingEventSnapshot]:
    events = (
        db.query(OrderTrackingEvent)
        .filter(OrderTrackingEvent.order_id == order.id)
        .order_by(OrderTrackingEvent.created_at.asc())
        .all()
    )

    return [
        TrackingEventSnapshot.model_validate(event)
        for event in events
    ]


def _grievances_for_order(
    db: Session,
    order: Order,
) -> list[GrievanceResponse]:
    rows = (
        db.query(Grievance)
        .filter(Grievance.order_id == order.id)
        .order_by(Grievance.created_at.desc())
        .all()
    )

    return [
        GrievanceResponse.model_validate(row)
        for row in rows
    ]


def _order_crop_and_quantity(
    db: Session,
    order: Order,
) -> tuple[str | None, float, float | None]:
    items = (
        db.query(OrderItem)
        .filter(OrderItem.order_id == order.id)
        .all()
    )

    quantity = sum(
        float(item.quantity_kg)
        for item in items
    )

    price_per_kg = None
    if items:
        weighted_total = sum(
            float(item.quantity_kg) * float(item.price_per_kg)
            for item in items
        )
        if quantity > 0:
            price_per_kg = weighted_total / quantity

    listing = (
        db.query(CropListing)
        .filter(CropListing.id == order.listing_id)
        .first()
    )

    crop_name = None
    if listing is not None:
        crop = (
            db.query(Crop)
            .filter(Crop.id == listing.crop_id)
            .first()
        )
        if crop is not None:
            crop_name = crop.name

    return crop_name, quantity, price_per_kg


def _build_order_assurance(
    db: Session,
    order: Order,
) -> TransactionAssuranceOrderResponse:
    crop_name, quantity, price_per_kg = _order_crop_and_quantity(
        db,
        order,
    )

    return TransactionAssuranceOrderResponse(
        order_id=order.id,
        listing_id=order.listing_id,
        order_status=order.status,
        order_created_at=order.created_at,
        total_amount=float(order.total_amount),
        crop=crop_name,
        quantity_kg=quantity,
        price_per_kg=price_per_kg,
        buyer=_buyer_snapshot(db, order),
        payment=_payment_snapshot(db, order),
        transport=_transport_snapshot(db, order),
        tracking=_tracking_snapshots(db, order),
        grievances=_grievances_for_order(db, order),
        safety=TransactionSafetyFlags(),
    )


# =========================================================
# HEALTH
# =========================================================


@router.get("/health")
def transaction_assurance_health():
    return {
        "status": "ok",
        "module": "AGRIVA Transaction Assurance",
        "phase": "SIH-6D",
        "buyer_verification_source": "AGRIVA_ADMIN_DOCUMENT_REVIEW_AND_PLATFORM_HISTORY",
        "bank_payment_verification": False,
        "payment_guarantee": False,
        "delivery_guarantee": False,
        "grievance_mutates_order": False,
        "grievance_mutates_payment": False,
        "grievance_mutates_transport": False,
    }


# =========================================================
# FARMER - TRANSACTION ASSURANCE
# =========================================================


@router.get(
    "/farmer/orders",
    response_model=list[TransactionAssuranceOrderResponse],
)
def farmer_transaction_assurance_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_farmer),
):
    orders = (
        _farmer_order_query(db, current_user)
        .order_by(Order.created_at.desc())
        .all()
    )

    return [
        _build_order_assurance(db, order)
        for order in orders
    ]


@router.get(
    "/farmer/orders/{order_id}",
    response_model=TransactionAssuranceOrderResponse,
)
def farmer_transaction_assurance_order(
    order_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_farmer),
):
    order = _get_farmer_order(
        db,
        current_user,
        order_id,
    )

    return _build_order_assurance(db, order)


# =========================================================
# FARMER - GRIEVANCES
# =========================================================


@router.get(
    "/grievances/my",
    response_model=list[GrievanceResponse],
)
def my_grievances(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_farmer),
):
    return (
        db.query(Grievance)
        .filter(Grievance.farmer_user_id == current_user.id)
        .order_by(Grievance.created_at.desc())
        .all()
    )


@router.post(
    "/grievances",
    response_model=GrievanceResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_grievance(
    payload: GrievanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_farmer),
):
    order = _get_farmer_order(
        db,
        current_user,
        payload.order_id,
    )

    try:
        category = normalize_grievance_category(payload.category)
    except AssuranceValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc

    existing = (
        db.query(Grievance)
        .filter(
            Grievance.order_id == order.id,
            Grievance.farmer_user_id == current_user.id,
            Grievance.category == category,
            Grievance.status.in_(OPEN_GRIEVANCE_STATUSES),
        )
        .first()
    )

    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "An open grievance already exists for this order and category."
            ),
        )

    subject = payload.subject.strip()
    description = payload.description.strip()

    grievance = Grievance(
        order_id=order.id,
        farmer_user_id=current_user.id,
        category=category,
        subject=subject,
        description=description,
        status="OPEN",
    )

    try:
        db.add(grievance)
        db.commit()
        db.refresh(grievance)
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to create grievance",
        ) from exc

    return grievance


# =========================================================
# ADMIN - GRIEVANCES
# Keep literal /admin routes before /grievances/{id}.
# =========================================================


@router.get(
    "/admin/grievances",
    response_model=list[GrievanceResponse],
)
def admin_grievances(
    grievance_status: str | None = Query(
        default=None,
        alias="status",
    ),
    category: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    query = db.query(Grievance)

    if grievance_status:
        try:
            normalized_status = normalize_grievance_status(
                grievance_status
            )
        except AssuranceValidationError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=str(exc),
            ) from exc

        query = query.filter(
            Grievance.status == normalized_status
        )

    if category:
        try:
            normalized_category = normalize_grievance_category(category)
        except AssuranceValidationError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=str(exc),
            ) from exc

        query = query.filter(
            Grievance.category == normalized_category
        )

    return (
        query
        .order_by(Grievance.created_at.desc())
        .limit(300)
        .all()
    )


@router.patch(
    "/admin/grievances/{grievance_id}",
    response_model=GrievanceResponse,
)
def admin_update_grievance(
    grievance_id: UUID,
    payload: GrievanceAdminUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    grievance = (
        db.query(Grievance)
        .filter(Grievance.id == grievance_id)
        .first()
    )

    if grievance is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Grievance not found",
        )

    resolution_note = (
        payload.resolution_note.strip()
        if payload.resolution_note
        else None
    )

    try:
        new_status = validate_grievance_transition(
            grievance.status,
            payload.status,
            resolution_note,
        )
    except AssuranceValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc

    grievance.status = new_status

    if resolution_note:
        grievance.resolution_note = resolution_note

    if new_status in {"RESOLVED", "REJECTED"}:
        grievance.resolved_by_user_id = current_user.id
        grievance.resolved_at = datetime.now(timezone.utc)
    else:
        grievance.resolved_by_user_id = None
        grievance.resolved_at = None

    try:
        db.commit()
        db.refresh(grievance)
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to update grievance",
        ) from exc

    return grievance


# =========================================================
# FARMER / ADMIN - SINGLE GRIEVANCE
# =========================================================


@router.get(
    "/grievances/{grievance_id}",
    response_model=GrievanceResponse,
)
def get_grievance(
    grievance_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    grievance = (
        db.query(Grievance)
        .filter(Grievance.id == grievance_id)
        .first()
    )

    if grievance is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Grievance not found",
        )

    if current_user.role == "ADMIN":
        return grievance

    if (
        current_user.role == "FARMER"
        and grievance.farmer_user_id == current_user.id
    ):
        return grievance

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Grievance not found",
    )
