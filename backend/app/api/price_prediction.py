from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from sqlalchemy.orm import Session

from app.api.dependencies import (
    require_farmer,
)
from app.db.session import get_db

from app.models.crop import (
    Crop,
    CropQualityPrediction,
    PricePrediction,
)
from app.models.farm import (
    Farm,
    FarmField,
)
from app.models.user import (
    FarmerProfile,
    User,
)

from app.schemas.price_prediction import (
    PriceHistoryPoint,
    PricePredictionRequest,
    PricePredictionResponse,
)

from app.services.price_prediction import (
    calculate_price_prediction,
)


from app.services.price_units import price_to_per_kg
router = APIRouter(
    prefix="/api/ai",
    tags=["AI Price Prediction"],
)


DISCLAIMER = (
    "Price predictions are estimates and may "
    "differ from actual market prices."
)


def get_farmer_crop(
    crop_id,
    current_user: User,
    db: Session,
) -> Crop:
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
        .join(
            FarmerProfile,
            Farm.farmer_id
            == FarmerProfile.id,
        )
        .filter(
            Crop.id == crop_id,
            FarmerProfile.user_id
            == current_user.id,
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
                "belong to the logged-in farmer"
            ),
        )

    return crop


def get_latest_quality(
    crop_id,
    db: Session,
) -> CropQualityPrediction | None:
    rows = (
        db.query(
            CropQualityPrediction
        )
        .filter(
            CropQualityPrediction.crop_id
            == crop_id
        )
        .all()
    )

    if not rows:
        return None

    return rows[-1]


@router.post(
    "/price-prediction",
    response_model=(
        PricePredictionResponse
    ),
)
def create_price_prediction(
    payload: PricePredictionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_farmer
    ),
):
    crop: Crop | None = None

    crop_name: str | None = None
    quality: str | None = None

    # =============================================
    # REGISTERED CROP MODE
    # =============================================

    if payload.crop_id is not None:
        crop = get_farmer_crop(
            crop_id=payload.crop_id,
            current_user=current_user,
            db=db,
        )

        crop_name = crop.name

        latest_quality = (
            get_latest_quality(
                crop_id=crop.id,
                db=db,
            )
        )

        if latest_quality is not None:
            quality = (
                latest_quality.grade
            )

        elif payload.quality is not None:
            quality = payload.quality

        else:
            raise HTTPException(
                status_code=404,
                detail=(
                    "No crop quality prediction "
                    "found. Run AGRIVA Crop "
                    "Quality analysis first or "
                    "provide quality manually."
                ),
            )

    # =============================================
    # MANUAL / LEGACY MODE
    # =============================================

    else:
        if not payload.crop:
            raise HTTPException(
                status_code=422,
                detail=(
                    "Either crop_id or crop "
                    "must be provided."
                ),
            )

        if payload.quality is None:
            raise HTTPException(
                status_code=422,
                detail=(
                    "Quality is required when "
                    "crop_id is not provided."
                ),
            )

        crop_name = (
            payload.crop.strip()
        )

        quality = (
            payload.quality
        )

    if crop_name is None:
        raise HTTPException(
            status_code=422,
            detail="Crop name could not be resolved.",
        )

    if quality is None:
        raise HTTPException(
            status_code=422,
            detail="Crop quality could not be resolved.",
        )

    # =============================================
    # PRICE INTELLIGENCE CALCULATION
    # =============================================

    try:
        result = (
            calculate_price_prediction(
                crop=crop_name,
                location=payload.location,
                quality=quality,
                quantity=payload.quantity,
                season=payload.season,
                historical_prices=(
                    payload.historical_prices
                ),
            )
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail=str(exc),
        ) from exc

    # =============================================
    # STORE EXISTING CORE PREDICTION
    #
    # No DB migration is required in this step.
    # Rich live market metadata is returned by
    # the API but not persisted yet.
    # =============================================

    # Phase 6C price-unit safety.
    # Service response prices follow result["unit"].
    # Database *_per_kg columns must always store INR/kg.
    try:
        phase6c_current_price_per_kg = price_to_per_kg(
            result["current_price"],
            result.get("unit"),
        )

        phase6c_predicted_price_per_kg = price_to_per_kg(
            result["predicted_price"],
            result.get("unit"),
        )

        phase6c_expected_min_per_kg = price_to_per_kg(
            result["expected_range_min"],
            result.get("unit"),
        )

        phase6c_expected_max_per_kg = price_to_per_kg(
            result["expected_range_max"],
            result.get("unit"),
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail=str(exc),
        ) from exc

    prediction = PricePrediction(
        user_id=current_user.id,

        crop_id=(
            crop.id
            if crop is not None
            else None
        ),

        crop_name=crop_name,

        market_name=(
            payload.location.strip()
        ),

        quality=quality,

        quantity=payload.quantity,

        season=(
            payload.season.strip()
        ),

        historical_prices=result[
            "historical_prices"
        ],

        current_price_per_kg=(
            phase6c_current_price_per_kg
        ),

        predicted_price_per_kg=(
            phase6c_predicted_price_per_kg
        ),

        expected_min_price=(
            phase6c_expected_min_per_kg
        ),

        expected_max_price=(
            phase6c_expected_max_per_kg
        ),

        confidence=result[
            "confidence"
        ],

        trend=result[
            "trend"
        ],
    )

    try:
        db.add(prediction)
        db.commit()
        db.refresh(prediction)

    except Exception as exc:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to store price "
                "prediction."
            ),
        ) from exc

    # =============================================
    # CHART DATA
    # =============================================

    chart_data: list[
        PriceHistoryPoint
    ] = []

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

    chart_data.append(
        PriceHistoryPoint(
            label="Current",
            price=float(
                result[
                    "current_price"
                ]
            ),
        )
    )

    chart_data.append(
        PriceHistoryPoint(
            label="Predicted",
            price=float(
                result[
                    "predicted_price"
                ]
            ),
        )
    )

    # =============================================
    # PRICE INTELLIGENCE RESPONSE
    # =============================================

    return PricePredictionResponse(
        id=str(prediction.id),

        crop_id=(
            str(prediction.crop_id)
            if prediction.crop_id
            else None
        ),

        crop=prediction.crop_name,

        location=(
            prediction.market_name
        ),

        quality=(
            prediction.quality
            or quality
        ),

        quantity=(
            prediction.quantity
            if prediction.quantity
            is not None
            else payload.quantity
        ),

        season=(
            prediction.season
            or payload.season
        ),

                current_price=result["current_price"],

                predicted_price=result["predicted_price"],

                expected_range_min=result["expected_range_min"],

                expected_range_max=result["expected_range_max"],

        confidence=(
            prediction.confidence
            if prediction.confidence
            is not None
            else result[
                "confidence"
            ]
        ),

        trend=(
            prediction.trend
            or result[
                "trend"
            ]
        ),

        historical_prices=(
            prediction.historical_prices
            or []
        ),

        chart_data=chart_data,

        demo_mode=result[
            "demo_mode"
        ],

        data_mode=result[
            "data_mode"
        ],

        unit=result[
            "unit"
        ],

        market_data=result[
            "market_data"
        ],

        prediction_factors=result[
            "prediction_factors"
        ],

        price_change_percentage=result[
            "price_change_percentage"
        ],

        disclaimer=DISCLAIMER,
    )