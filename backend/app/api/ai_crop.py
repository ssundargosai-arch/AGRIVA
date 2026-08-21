from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import require_farmer
from app.db.session import get_db
from app.models.crop import (
    CropRecommendation,
    CropFarmPlan,
    CropCalendar,
)
from app.models.farm import FarmField
from app.models.user import User
from app.schemas.crop_recommendation import (
    CropRecommendationRequest,
    CropRecommendationResponse,
    CropSelectionRequest,
)
from app.services.crop_recommendation import recommend_crops


router = APIRouter(
    prefix="/api/ai",
    tags=["AI Crop Recommendation"],
)


@router.post(
    "/crop-recommendation",
    response_model=CropRecommendationResponse,
)
def crop_recommendation(
    data: CropRecommendationRequest,
):
    recommendations = recommend_crops(data)

    return {
        "recommendations": recommendations
    }


@router.post("/crop-plan")
def create_crop_plan(
    field_id: str,
    data: CropSelectionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_farmer),
):
    farmer_profile = current_user.farmer_profile

    if not farmer_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Farmer profile not found",
        )

    field = (
        db.query(FarmField)
        .join(FarmField.farm)
        .filter(
            FarmField.id == field_id,
        )
        .first()
    )

    if not field:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Field not found",
        )

    if field.farm.farmer_id != farmer_profile.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This field does not belong to the logged-in farmer",
        )

    recommendation_data = data.recommendation_data or {}

    recommendation = CropRecommendation(
        field_id=field.id,
        crop_name=data.crop,
        suitability_score=float(
            recommendation_data.get(
                "match_percentage",
                100.0,
            )
        ),
        reason=(
            f"{data.crop} selected based on soil, "
            f"season, water availability and market conditions."
        ),
        expected_yield=recommendation_data.get(
            "expected_yield"
        ),
        expected_profit=recommendation_data.get(
            "expected_profit"
        ),
        water_requirement=recommendation_data.get(
            "water_requirement"
        ),
        growing_duration=recommendation_data.get(
            "growing_duration"
        ),
        market_demand=recommendation_data.get(
            "market_demand"
        ),
        risk=recommendation_data.get(
            "risk"
        ),
        selected=True,
    )

    db.add(recommendation)

    plan = CropFarmPlan(
        field_id=field.id,
        crop_name=data.crop,
        soil_preparation=(
            "Prepare the field with deep ploughing. "
            "Remove weeds and mix well-decomposed organic manure."
        ),
        seed_selection=(
            f"Use certified, disease-free and high-quality "
            f"{data.crop} seeds suitable for the local climate."
        ),
        sowing=(
            "Sow at the recommended spacing and depth. "
            "Maintain proper plant population."
        ),
        fertilizer=(
            "Apply fertilizer according to soil-test results. "
            "Use balanced nitrogen, phosphorus and potassium."
        ),
        irrigation=(
            "Irrigate according to crop stage and soil moisture. "
            "Avoid both waterlogging and excessive drying."
        ),
        disease_monitoring=(
            "Inspect the crop regularly for pests and diseases. "
            "Use integrated pest-management practices."
        ),
        harvest=(
            "Harvest when the crop reaches physiological maturity "
            "and store the produce under suitable conditions."
        ),
    )

    db.add(plan)
    db.flush()

    calendar_rows = [
        CropCalendar(
            farm_plan_id=plan.id,
            stage="Land Preparation",
            start_day=1,
            end_day=7,
            activity="Plough field, remove weeds and apply organic manure.",
        ),
        CropCalendar(
            farm_plan_id=plan.id,
            stage="Seed Preparation",
            start_day=8,
            end_day=10,
            activity="Select certified seeds and perform seed treatment.",
        ),
        CropCalendar(
            farm_plan_id=plan.id,
            stage="Sowing",
            start_day=11,
            end_day=15,
            activity="Sow seeds with recommended spacing and depth.",
        ),
        CropCalendar(
            farm_plan_id=plan.id,
            stage="Early Growth",
            start_day=16,
            end_day=35,
            activity="Monitor germination, weeds and irrigation.",
        ),
        CropCalendar(
            farm_plan_id=plan.id,
            stage="Vegetative Growth",
            start_day=36,
            end_day=70,
            activity="Apply nutrients and monitor pests and diseases.",
        ),
        CropCalendar(
            farm_plan_id=plan.id,
            stage="Flowering / Development",
            start_day=71,
            end_day=100,
            activity="Maintain irrigation and monitor crop health.",
        ),
        CropCalendar(
            farm_plan_id=plan.id,
            stage="Maturity and Harvest",
            start_day=101,
            end_day=150,
            activity="Monitor maturity, harvest and store produce.",
        ),
    ]

    db.add_all(calendar_rows)
    db.commit()

    db.refresh(plan)

    return {
        "success": True,
        "field_id": str(field.id),
        "recommendation_id": str(recommendation.id),
        "farm_plan_id": str(plan.id),
        "crop": plan.crop_name,
        "soil_preparation": plan.soil_preparation,
        "seed_selection": plan.seed_selection,
        "sowing": plan.sowing,
        "fertilizer": plan.fertilizer,
        "irrigation": plan.irrigation,
        "disease_monitoring": plan.disease_monitoring,
        "harvest": plan.harvest,
        "crop_calendar": [
            {
                "stage": row.stage,
                "start_day": row.start_day,
                "end_day": row.end_day,
                "activity": row.activity,
            }
            for row in calendar_rows
        ],
    }