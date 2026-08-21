from pydantic import BaseModel, Field
from typing import Optional, List


class CropRecommendationRequest(BaseModel):
    ph: float = Field(..., ge=0, le=14)
    nitrogen: float = Field(..., ge=0)
    phosphorus: float = Field(..., ge=0)
    potassium: float = Field(..., ge=0)
    organic_carbon: float = Field(..., ge=0)
    moisture: float = Field(..., ge=0)
    temperature: float = Field(..., ge=0)
    rainfall: float = Field(..., ge=0)

    location: str
    season: str
    water_availability: str
    farm_size: float = Field(..., gt=0)


class CropRecommendation(BaseModel):
    crop: str
    match_percentage: float
    expected_yield: str
    expected_profit: str
    water_requirement: str
    growing_duration: str
    market_demand: str
    risk: str


class CropRecommendationResponse(BaseModel):
    recommendations: List[CropRecommendation]


class CropSelectionRequest(BaseModel):
    crop: str
    recommendation_data: Optional[dict] = None


class FarmPlanResponse(BaseModel):
    crop: str
    soil_preparation: str
    seed_selection: str
    sowing: str
    fertilizer: str
    irrigation: str
    disease_monitoring: str
    harvest: str
    crop_calendar: List[dict]