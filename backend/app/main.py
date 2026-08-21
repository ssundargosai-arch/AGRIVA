from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.api.ai_image import router as ai_image_router
from app.core.config import get_settings
from app.db import check_database_connection
from app.api.routes.transport import router as transport_router
from app.api.routes.payments import router as payments_router
from app.api.routes.orders import router as orders_router
from app.api.auth import router as auth_router
from app.api.farmer import router as farmer_router
from app.api.ai_crop import router as crop_ai_router
from app.api.store import router as store_router
from app.api.price_prediction import (
    router as price_prediction_router,
)
from app.api.marketplace import (
    router as marketplace_router,
)

settings = get_settings()


app = FastAPI(
    title="AGRIVA Backend",
    version="0.1.0",
    description="AGRIVA smart farming ecosystem backend.",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth_router)
app.include_router(farmer_router)
app.include_router(crop_ai_router)
app.include_router(store_router)
app.include_router(ai_image_router)
app.include_router(price_prediction_router)
app.include_router(marketplace_router)
app.include_router(orders_router)
app.include_router(payments_router)
app.include_router(transport_router)


@app.get("/")
def root():
    return {
        "message": "AGRIVA API is running"
    }


@app.get("/api/health")
def health() -> dict[str, object]:
    try:
        check_database_connection()

    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail="Database unavailable",
        ) from exc

    return {
        "success": True,
        "service": "AGRIVA Backend",
        "status": "healthy",
    }