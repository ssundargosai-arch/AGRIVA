# app/api/routes/farmer.py

from fastapi import APIRouter, Depends
from app.models.user import User
from app.api.dependencies import require_farmer

router = APIRouter(
    prefix="/api/farmer",
    tags=["Farmer"],
)


@router.get("/dashboard")
def farmer_dashboard(
    current_user: User = Depends(require_farmer),
):
    return {
        "message": "Welcome to Farmer Dashboard",
        "user_id": current_user.id,
        "role": current_user.role,
    }