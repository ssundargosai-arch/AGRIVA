from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.api.dependencies import require_farmer
from app.db.session import get_db
from app.models.crop import Crop, PricePrediction
from app.models.farm import Farm, FarmField
from app.models.market import CropListing
from app.models.sale_decision import SaleDecisionSnapshot
from app.models.user import FarmerProfile, User
from app.schemas.sale_decision import (
    PredictionOption,
    SaleDecisionContextResponse,
    SaleDecisionCreate,
    SaleDecisionResponse,
)
from app.services.sale_decision import (
    calculate_sale_decision,
)
from app.services.price_units import (
    normalize_stored_prediction,
)


router = APIRouter(
    prefix="/api/sale-decision",
    tags=["Sale Decision"],
)


DISCLAIMER = (
    "AGRIVA provides decision support only. Future prices are predictions, "
    "not guarantees. Storage, transport and expected-loss values are based "
    "on the farmer's entered assumptions unless otherwise stated. "
    "This calculation does not sell crop, reserve inventory, create an "
    "order or create a payment."
)


def get_farmer_profile(
    db: Session,
    current_user: User,
) -> FarmerProfile:
    farmer = (
        db.query(FarmerProfile)
        .filter(FarmerProfile.user_id == current_user.id)
        .first()
    )

    if farmer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Farmer profile not found",
        )

    return farmer


def get_owned_listing(
    db: Session,
    listing_id: UUID,
    farmer_profile_id: UUID,
) -> tuple[CropListing, Crop]:
    row = (
        db.query(CropListing, Crop)
        .join(Crop, Crop.id == CropListing.crop_id)
        .join(FarmField, FarmField.id == Crop.field_id)
        .join(Farm, Farm.id == FarmField.farm_id)
        .filter(
            CropListing.id == listing_id,
            Farm.farmer_id == farmer_profile_id,
        )
        .first()
    )

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "Crop listing not found or it does not belong "
                "to the current farmer"
            ),
        )

    return row


def get_prediction_for_listing(
    db: Session,
    prediction_id: UUID,
    current_user: User,
    listing: CropListing,
    crop: Crop,
) -> PricePrediction:
    prediction = (
        db.query(PricePrediction)
        .filter(PricePrediction.id == prediction_id)
        .first()
    )

    if prediction is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Price prediction not found",
        )

    if (
        prediction.user_id is not None
        and prediction.user_id != current_user.id
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Price prediction not found",
        )

    crop_matches = False

    if prediction.crop_id is not None:
        crop_matches = (
            prediction.crop_id == listing.crop_id
        )
    else:
        crop_matches = (
            prediction.crop_name.strip().casefold()
            == crop.name.strip().casefold()
        )

    if not crop_matches:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Selected price prediction does not match "
                "the crop listing"
            ),
        )

    if float(prediction.predicted_price_per_kg) <= 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Selected price prediction is invalid",
        )

    return prediction


def prediction_option(
    prediction: PricePrediction,
    *,
    listing_reference_price_per_kg: float,
) -> PredictionOption:
    normalized = normalize_stored_prediction(
        current_price=prediction.current_price_per_kg,
        predicted_price=prediction.predicted_price_per_kg,
        expected_min_price=prediction.expected_min_price,
        expected_max_price=prediction.expected_max_price,
        listing_reference_price_per_kg=(
            listing_reference_price_per_kg
        ),
    )

    return PredictionOption(
        id=prediction.id,
        crop_name=prediction.crop_name,
        market_name=prediction.market_name,
        current_price_per_kg=(
            normalized.current_price_per_kg
        ),
        predicted_price_per_kg=(
            normalized.predicted_price_per_kg
        ),
        expected_min_price=(
            normalized.expected_min_price_per_kg
        ),
        expected_max_price=(
            normalized.expected_max_price_per_kg
        ),
        confidence=(
            float(prediction.confidence)
            if prediction.confidence is not None
            else None
        ),
        trend=prediction.trend,
        prediction_date=prediction.prediction_date,
    )


def recommendation_reason(
    recommendation: str,
) -> str:
    if recommendation == "STORE":
        return (
            "Even the stored-value estimate using the prediction's "
            "lower expected price is above the sell-now net value."
        )

    if recommendation == "CONSIDER_STORAGE":
        return (
            "The central predicted stored value is above sell-now, "
            "but the lower expected price does not clearly confirm "
            "that advantage."
        )

    return (
        "After entered storage, transport and expected loss costs, "
        "the central stored-value estimate does not exceed "
        "the sell-now net value."
    )


def serialize_snapshot(
    db: Session,
    snapshot: SaleDecisionSnapshot,
) -> SaleDecisionResponse:
    listing = (
        db.query(CropListing)
        .filter(CropListing.id == snapshot.listing_id)
        .first()
    )
    crop = (
        db.query(Crop)
        .filter(
            Crop.id == listing.crop_id
        )
        .first()
        if listing
        else None
    )

    return SaleDecisionResponse(
        id=snapshot.id,
        listing_id=snapshot.listing_id,
        prediction_id=snapshot.prediction_id,
        crop_name=(
            crop.name if crop else "Unknown"
        ),
        listing_location=(
            listing.location if listing else None
        ),
        quantity_kg=float(snapshot.quantity_kg),
        holding_days=snapshot.holding_days,
        storage_cost_per_kg_per_day=float(
            snapshot.storage_cost_per_kg_per_day
        ),
        storage_cost_total=float(
            snapshot.storage_cost_total
        ),
        transport_cost_now=float(
            snapshot.transport_cost_now
        ),
        transport_cost_later=float(
            snapshot.transport_cost_later
        ),
        expected_storage_loss_percent=float(
            snapshot.expected_storage_loss_percent
        ),
        other_holding_cost=float(
            snapshot.other_holding_cost
        ),
        storage_provider_name=(
            snapshot.storage_provider_name
        ),
        current_price_per_kg=float(
            snapshot.current_price_per_kg
        ),
        current_price_source=(
            snapshot.current_price_source
        ),
        future_price_per_kg=float(
            snapshot.future_price_per_kg
        ),
        expected_min_price_per_kg=(
            float(snapshot.expected_min_price_per_kg)
            if snapshot.expected_min_price_per_kg is not None
            else None
        ),
        expected_max_price_per_kg=(
            float(snapshot.expected_max_price_per_kg)
            if snapshot.expected_max_price_per_kg is not None
            else None
        ),
        prediction_confidence=(
            float(snapshot.prediction_confidence)
            if snapshot.prediction_confidence is not None
            else None
        ),
        prediction_trend=snapshot.prediction_trend,
        quantity_after_loss_kg=float(
            snapshot.quantity_after_loss_kg
        ),
        sell_now_gross=float(
            snapshot.sell_now_gross
        ),
        sell_now_net=float(
            snapshot.sell_now_net
        ),
        store_expected_gross=float(
            snapshot.store_expected_gross
        ),
        store_expected_net=float(
            snapshot.store_expected_net
        ),
        store_min_net=(
            float(snapshot.store_min_net)
            if snapshot.store_min_net is not None
            else None
        ),
        store_max_net=(
            float(snapshot.store_max_net)
            if snapshot.store_max_net is not None
            else None
        ),
        expected_advantage=float(
            snapshot.expected_advantage
        ),
        conservative_advantage=(
            float(snapshot.conservative_advantage)
            if snapshot.conservative_advantage is not None
            else None
        ),
        break_even_future_price_per_kg=float(
            snapshot.break_even_future_price_per_kg
        ),
        recommendation=snapshot.recommendation,
        recommendation_reason=recommendation_reason(
            snapshot.recommendation
        ),
        disclaimer=DISCLAIMER,
        created_at=snapshot.created_at,
    )


@router.get("/health")
def sale_decision_health():
    return {
        "status": "ok",
        "module": "AGRIVA Sale Decision",
        "phase": "SIH-6C",
        "requires_price_prediction": True,
        "storage_cost_source": "farmer_input",
        "transport_cost_source": "farmer_input",
        "expected_loss_source": "farmer_input",
        "mutates_listing": False,
        "creates_order": False,
        "creates_payment": False,
        "price_guarantee": False,
    }


@router.get(
    "/context/{listing_id}",
    response_model=SaleDecisionContextResponse,
)
def get_sale_decision_context(
    listing_id: UUID,
    current_user: User = Depends(require_farmer),
    db: Session = Depends(get_db),
):
    farmer = get_farmer_profile(
        db,
        current_user,
    )
    listing, crop = get_owned_listing(
        db,
        listing_id,
        farmer.id,
    )

    if (
        listing.status != "active"
        or float(listing.quantity_kg) <= 0
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Sale decision requires an active crop listing "
                "with available quantity"
            ),
        )

    predictions = (
        db.query(PricePrediction)
        .filter(
            or_(
                PricePrediction.crop_id == listing.crop_id,
                (
                    PricePrediction.crop_id.is_(None)
                    & (
                        PricePrediction.crop_name.ilike(
                            crop.name
                        )
                    )
                ),
            ),
            or_(
                PricePrediction.user_id == current_user.id,
                PricePrediction.user_id.is_(None),
            ),
        )
        .order_by(
            PricePrediction.prediction_date.desc()
        )
        .limit(5)
        .all()
    )

    return SaleDecisionContextResponse(
        listing_id=listing.id,
        crop_id=crop.id,
        crop_name=crop.name,
        listing_quantity_kg=float(
            listing.quantity_kg
        ),
        listing_expected_price_per_kg=float(
            listing.expected_price_per_kg
        ),
        listing_quality_grade=(
            listing.quality_grade
        ),
        listing_location=listing.location,
        prediction_required=True,
        predictions=[
            prediction_option(
                prediction,
                listing_reference_price_per_kg=float(
                    listing.expected_price_per_kg
                ),
            )
            for prediction in predictions
        ],
    )


@router.post(
    "/evaluate",
    response_model=SaleDecisionResponse,
    status_code=status.HTTP_201_CREATED,
)
def evaluate_sale_decision(
    payload: SaleDecisionCreate,
    current_user: User = Depends(require_farmer),
    db: Session = Depends(get_db),
):
    farmer = get_farmer_profile(
        db,
        current_user,
    )
    listing, crop = get_owned_listing(
        db,
        payload.listing_id,
        farmer.id,
    )

    if (
        listing.status != "active"
        or float(listing.quantity_kg) <= 0
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Sale decision requires an active crop listing "
                "with available quantity"
            ),
        )

    prediction = get_prediction_for_listing(
        db,
        payload.prediction_id,
        current_user,
        listing,
        crop,
    )

    quantity = (
        float(payload.quantity_kg)
        if payload.quantity_kg is not None
        else float(listing.quantity_kg)
    )

    if quantity > float(listing.quantity_kg):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": (
                    "Decision quantity exceeds the listing's "
                    "current available quantity"
                ),
                "requested_quantity_kg": quantity,
                "available_quantity_kg": float(
                    listing.quantity_kg
                ),
            },
        )

    try:
        normalized_prices = normalize_stored_prediction(
            current_price=prediction.current_price_per_kg,
            predicted_price=prediction.predicted_price_per_kg,
            expected_min_price=prediction.expected_min_price,
            expected_max_price=prediction.expected_max_price,
            listing_reference_price_per_kg=float(
                listing.expected_price_per_kg
            ),
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc

    current_price = (
        normalized_prices.current_price_per_kg
    )
    future_price = (
        normalized_prices.predicted_price_per_kg
    )
    expected_min = (
        normalized_prices.expected_min_price_per_kg
    )
    expected_max = (
        normalized_prices.expected_max_price_per_kg
    )

    current_price_source = (
        "price_prediction.current_price_per_kg"
        if normalized_prices.compatibility_mode
        == "stored_per_kg"
        else (
            "legacy_price_prediction.INR_per_quintal"
            "_converted_to_INR_per_kg"
        )
    )

    try:
        calculation = calculate_sale_decision(
            quantity_kg=quantity,
            current_price_per_kg=current_price,
            future_price_per_kg=future_price,
            expected_min_price_per_kg=expected_min,
            expected_max_price_per_kg=expected_max,
            holding_days=payload.holding_days,
            storage_cost_per_kg_per_day=(
                payload.storage_cost_per_kg_per_day
            ),
            transport_cost_now=(
                payload.transport_cost_now
            ),
            transport_cost_later=(
                payload.transport_cost_later
            ),
            expected_storage_loss_percent=(
                payload.expected_storage_loss_percent
            ),
            other_holding_cost=(
                payload.other_holding_cost
            ),
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    snapshot = SaleDecisionSnapshot(
        user_id=current_user.id,
        listing_id=listing.id,
        prediction_id=prediction.id,
        quantity_kg=quantity,
        holding_days=payload.holding_days,
        storage_cost_per_kg_per_day=(
            payload.storage_cost_per_kg_per_day
        ),
        transport_cost_now=(
            payload.transport_cost_now
        ),
        transport_cost_later=(
            payload.transport_cost_later
        ),
        expected_storage_loss_percent=(
            payload.expected_storage_loss_percent
        ),
        other_holding_cost=(
            payload.other_holding_cost
        ),
        storage_provider_name=(
            payload.storage_provider_name.strip()
            if payload.storage_provider_name
            else None
        ),
        current_price_per_kg=current_price,
        current_price_source=current_price_source,
        future_price_per_kg=future_price,
        expected_min_price_per_kg=expected_min,
        expected_max_price_per_kg=expected_max,
        prediction_confidence=(
            float(prediction.confidence)
            if prediction.confidence is not None
            else None
        ),
        prediction_trend=prediction.trend,
        quantity_after_loss_kg=(
            calculation.quantity_after_loss_kg
        ),
        storage_cost_total=(
            calculation.storage_cost_total
        ),
        sell_now_gross=(
            calculation.sell_now_gross
        ),
        sell_now_net=(
            calculation.sell_now_net
        ),
        store_expected_gross=(
            calculation.store_expected_gross
        ),
        store_expected_net=(
            calculation.store_expected_net
        ),
        store_min_net=(
            calculation.store_min_net
        ),
        store_max_net=(
            calculation.store_max_net
        ),
        expected_advantage=(
            calculation.expected_advantage
        ),
        conservative_advantage=(
            calculation.conservative_advantage
        ),
        break_even_future_price_per_kg=(
            calculation.break_even_future_price_per_kg
        ),
        recommendation=(
            calculation.recommendation
        ),
    )

    db.add(snapshot)
    db.commit()
    db.refresh(snapshot)

    return serialize_snapshot(
        db,
        snapshot,
    )


@router.get(
    "/history",
    response_model=list[SaleDecisionResponse],
)
def sale_decision_history(
    current_user: User = Depends(require_farmer),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(SaleDecisionSnapshot)
        .filter(
            SaleDecisionSnapshot.user_id
            == current_user.id
        )
        .order_by(
            SaleDecisionSnapshot.created_at.desc()
        )
        .limit(50)
        .all()
    )

    return [
        serialize_snapshot(db, row)
        for row in rows
    ]


@router.get(
    "/{decision_id}",
    response_model=SaleDecisionResponse,
)
def get_sale_decision(
    decision_id: UUID,
    current_user: User = Depends(require_farmer),
    db: Session = Depends(get_db),
):
    row = (
        db.query(SaleDecisionSnapshot)
        .filter(
            SaleDecisionSnapshot.id == decision_id,
            SaleDecisionSnapshot.user_id
            == current_user.id,
        )
        .first()
    )

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sale decision not found",
        )

    return serialize_snapshot(
        db,
        row,
    )
