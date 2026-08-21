import json
import os
from typing import Optional
from app.services.crop_recommendation import recommend_crops

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.models.soil import SoilAnalysis


router = APIRouter(
    prefix="/api/ai",
    tags=["AI Soil Analysis"],
)


def calculate_demo_analysis(
    ph: Optional[float],
    nitrogen: Optional[float],
    phosphorus: Optional[float],
    potassium: Optional[float],
    organic_carbon: Optional[float],
    moisture: Optional[float],
    temperature: Optional[float],
    soil_type: Optional[str],
):
    # Realistic demo defaults when the farmer does not provide values.
    ph = 6.5 if ph is None else ph
    nitrogen = 280 if nitrogen is None else nitrogen
    phosphorus = 22 if phosphorus is None else phosphorus
    potassium = 190 if potassium is None else potassium
    organic_carbon = 0.75 if organic_carbon is None else organic_carbon
    moisture = 32 if moisture is None else moisture
    temperature = 25 if temperature is None else temperature
    soil_type = soil_type or "Loamy"

    score = 100.0

    # pH
    if ph < 5.5 or ph > 8.0:
        score -= 25
    elif ph < 6.0 or ph > 7.5:
        score -= 10

    # Nitrogen
    if nitrogen < 200:
        score -= 15
    elif nitrogen < 250:
        score -= 7

    # Phosphorus
    if phosphorus < 15:
        score -= 12
    elif phosphorus < 20:
        score -= 6

    # Potassium
    if potassium < 120:
        score -= 12
    elif potassium < 160:
        score -= 6

    # Organic carbon
    if organic_carbon < 0.5:
        score -= 15
    elif organic_carbon < 0.75:
        score -= 7

    # Moisture
    if moisture < 15 or moisture > 65:
        score -= 10
    elif moisture < 20 or moisture > 55:
        score -= 5

    score = max(0, min(100, round(score, 1)))

    recommendations = []

    if ph < 6.0:
        recommendations.append(
            "Soil is acidic. Consider agricultural lime after professional soil verification."
        )
    elif ph > 7.5:
        recommendations.append(
            "Soil is alkaline. Consider organic matter and suitable soil amendments."
        )
    else:
        recommendations.append(
            "Soil pH is in a generally suitable range for many crops."
        )

    if nitrogen < 250:
        recommendations.append(
            "Nitrogen appears low. Consider compost, manure, or an appropriate nitrogen fertilizer."
        )

    if phosphorus < 20:
        recommendations.append(
            "Phosphorus appears low. Consider a phosphorus-rich fertilizer based on crop requirements."
        )

    if potassium < 160:
        recommendations.append(
            "Potassium appears low. Consider potassium fertilizer or suitable organic sources."
        )

    if organic_carbon < 0.75:
        recommendations.append(
            "Increase organic matter using compost, crop residue, or well-decomposed manure."
        )

    if moisture < 20:
        recommendations.append(
            "Soil moisture is low. Improve irrigation scheduling and soil water retention."
        )

    if len(recommendations) == 0:
        recommendations.append(
            "Maintain current soil management and continue periodic soil testing."
        )

    return {
        "soil_type": soil_type,
        "ph": ph,
        "nitrogen": nitrogen,
        "phosphorus": phosphorus,
        "potassium": potassium,
        "organic_carbon": organic_carbon,
        "moisture": moisture,
        "temperature": temperature,
        "soil_health_score": score,
        "recommendations": recommendations,
    }


@router.post("/soil-analysis")
async def soil_analysis(
    ph: Optional[float] = Form(None),
    nitrogen: Optional[float] = Form(None),
    phosphorus: Optional[float] = Form(None),
    potassium: Optional[float] = Form(None),
    organic_carbon: Optional[float] = Form(None),
    moisture: Optional[float] = Form(None),
    temperature: Optional[float] = Form(None),
    soil_type: Optional[str] = Form(None),
    source_type: str = Form("manual"),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    demo_mode = os.getenv("DEMO_MODE", "true").lower() == "true"

    if source_type not in {
        "manual",
        "report",
        "image",
        "camera",
    }:
        raise HTTPException(
            status_code=400,
            detail="Invalid source_type.",
        )

    if file:
        allowed = {
            "image/jpeg",
            "image/png",
            "image/webp",
            "application/pdf",
        }

        if file.content_type not in allowed:
            raise HTTPException(
                status_code=400,
                detail="Supported files: JPG, JPEG, PNG, WEBP and PDF.",
            )

        # Phase 5 demo mode does not run computer vision/OCR yet.
        # The uploaded file is accepted and represented as a simulated analysis.
        source_type = (
            "camera"
            if source_type == "camera"
            else "image"
            if file.content_type.startswith("image/")
            else "report"
        )

    if not demo_mode:
        raise HTTPException(
            status_code=501,
            detail="Production soil AI service is not configured yet.",
        )

    result = calculate_demo_analysis(
        ph,
        nitrogen,
        phosphorus,
        potassium,
        organic_carbon,
        moisture,
        temperature,
        soil_type,
    )

    analysis = SoilAnalysis(
        farmer_id=current_user.id,
        soil_type=result["soil_type"],
        ph=result["ph"],
        nitrogen=result["nitrogen"],
        phosphorus=result["phosphorus"],
        potassium=result["potassium"],
        organic_carbon=result["organic_carbon"],
        moisture=result["moisture"],
        temperature=result["temperature"],
        soil_health_score=result["soil_health_score"],
        recommendations=json.dumps(result["recommendations"]),
        source_type=source_type,
        demo_mode=True,
    )

    db.add(analysis)
    db.commit()
    db.refresh(analysis)

    return {
        "success": True,
        "message": "Simulated soil analysis completed.",
        "data": {
            "id": str(analysis.id),
            **result,
            "source_type": source_type,
            "demo_mode": True,
            "created_at": analysis.created_at.isoformat(),
        },
    }


@router.get("/soil-analysis/history")
def soil_analysis_history(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    rows = db.scalars(
        select(SoilAnalysis)
        .where(SoilAnalysis.farmer_id == current_user.id)
        .order_by(SoilAnalysis.created_at.desc())
    ).all()

    return {
        "success": True,
        "data": [
            {
                "id": str(row.id),
                "soil_type": row.soil_type,
                "ph": row.ph,
                "soil_health_score": row.soil_health_score,
                "source_type": row.source_type,
                "demo_mode": row.demo_mode,
                "created_at": row.created_at.isoformat(),
            }
            for row in rows
        ],
    }
