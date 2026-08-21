from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.dependencies import require_farmer
from app.db.session import get_db
from app.models.crop import PricePrediction
from app.models.user import User
from app.schemas.price_prediction import (
    PriceHistoryPoint,
    PricePredictionRequest,
    PricePredictionResponse,
)
from app.services.price_prediction import (
    calculate_price_prediction,
)


router = APIRouter(
    prefix="/api/ai",
    tags=["AI Price Prediction"],
)


DISCLAIMER = (
    "Price predictions are estimates and may "
    "differ from actual market prices."
)


@router.post(
    "/price-prediction",
    response_model=PricePredictionResponse,
)
def create_price_prediction(
    payload: PricePredictionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_farmer),
):
    try:
        result = calculate_price_prediction(
            crop=payload.crop,
            location=payload.location,
            quality=payload.quality,
            quantity=payload.quantity,
            season=payload.season,
            historical_prices=payload.historical_prices,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail=str(exc),
        ) from exc

    # Store prediction in database
    prediction = PricePrediction(
        user_id=current_user.id,

        # Phase 9 accepts crop name directly,
        # so no crop row is required.
        crop_id=None,

        crop_name=payload.crop.strip(),
        market_name=payload.location.strip(),

        quality=payload.quality,
        quantity=payload.quantity,
        season=payload.season.strip(),

        historical_prices=result[
            "historical_prices"
        ],

        current_price_per_kg=result[
            "current_price"
        ],

        predicted_price_per_kg=result[
            "predicted_price"
        ],

        expected_min_price=result[
            "expected_range_min"
        ],

        expected_max_price=result[
            "expected_range_max"
        ],

        confidence=result["confidence"],
        trend=result["trend"],
    )

    try:
        db.add(prediction)
        db.commit()
        db.refresh(prediction)

    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to store price prediction."
            ),
        )

    # Build chart data for Recharts
    chart_data: list[PriceHistoryPoint] = []

    for index, price in enumerate(
        result["historical_prices"],
        start=1,
    ):
        chart_data.append(
            PriceHistoryPoint(
                label=f"History {index}",
                price=float(price),
            )
        )

    # Add current price
    chart_data.append(
        PriceHistoryPoint(
            label="Current",
            price=float(
                result["current_price"]
            ),
        )
    )

    # Add predicted price
    chart_data.append(
        PriceHistoryPoint(
            label="Predicted",
            price=float(
                result["predicted_price"]
            ),
        )
    )

    return PricePredictionResponse(
        id=str(prediction.id),

        crop=prediction.crop_name,

        location=prediction.market_name,

        quality=(
            prediction.quality
            or payload.quality
        ),

        quantity=(
            prediction.quantity
            if prediction.quantity is not None
            else payload.quantity
        ),

        season=(
            prediction.season
            or payload.season
        ),

        current_price=(
            prediction.current_price_per_kg
            if prediction.current_price_per_kg
            is not None
            else result["current_price"]
        ),

        predicted_price=(
            prediction.predicted_price_per_kg
        ),

        expected_range_min=(
            prediction.expected_min_price
            if prediction.expected_min_price
            is not None
            else result["expected_range_min"]
        ),

        expected_range_max=(
            prediction.expected_max_price
            if prediction.expected_max_price
            is not None
            else result["expected_range_max"]
        ),

        confidence=(
            prediction.confidence
            if prediction.confidence
            is not None
            else result["confidence"]
        ),

        trend=(
            prediction.trend
            or result["trend"]
        ),

        historical_prices=(
            prediction.historical_prices
            or []
        ),

        chart_data=chart_data,

        demo_mode=result["demo_mode"],

        disclaimer=DISCLAIMER,
    )