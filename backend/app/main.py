from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.api.admin import router as admin_router
from app.api.ai import router as ai_router
from app.api.ai_crop import router as crop_ai_router
from app.api.ai_image import router as ai_image_router
from app.api.auth import router as auth_router
from app.api.buyer import router as buyer_router
from app.api.farmer import router as farmer_router

from app.api.marketplace import (
    router as marketplace_router,
)
from app.api.marketplace_listing_management import (
    router as marketplace_listing_management_router,
)
from app.api.marketplace_media import (
    router as marketplace_media_router,
)
from app.api.price_prediction import (
    router as price_prediction_router,
)
from app.api.store import router as store_router

from app.api.routes import (
    agriva_ai,
    weather,
)
from app.api.routes.analytics import (
    router as analytics_router,
)
from app.api.routes.crops import (
    router as crops_router,
)
from app.api.routes.farms import (
    router as farms_router,
)
from app.api.routes.orders import (
    router as orders_router,
)
from app.api.routes.payments import (
    router as payments_router,
)
from app.api.routes.transport import (
    router as transport_router,
)

from app.core.config import get_settings
from app.db import (
    check_database_connection,
)


settings = get_settings()


from app.api.routes.storage import router as storage_router

from app.api.routes.mandi_arrivals import router as mandi_arrivals_router

from app.api.routes.buyer_verification import router as buyer_verification_router

app = FastAPI(
    title="AGRIVA Backend",
    version="0.1.0",
    description=(
        "AGRIVA smart farming "
        "ecosystem backend."
    ),
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_origin_regex=r"^https://[a-z0-9-]+\.trycloudflare\.com$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(buyer_router)
app.include_router(admin_router)
app.include_router(auth_router)
app.include_router(farmer_router)
app.include_router(crop_ai_router)
app.include_router(store_router)
app.include_router(ai_image_router)
app.include_router(
    price_prediction_router
)
app.include_router(
    marketplace_router
)
app.include_router(
    marketplace_listing_management_router
)
app.include_router(
    marketplace_media_router
)
app.include_router(orders_router)
app.include_router(payments_router)
app.include_router(transport_router)
app.include_router(weather.router)
app.include_router(agriva_ai.router)
app.include_router(analytics_router)
app.include_router(farms_router)
app.include_router(ai_router)
app.include_router(crops_router)


@app.get("/")
def root():
    return {
        "message":
            "AGRIVA API is running"
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

# =========================================================
# AGRIVA_SIH_PHASE6A_OFFERS_ROUTER
# Buyer offer / farmer counter-offer lifecycle
# =========================================================
from app.api.routes.offers import router as phase6a_offers_router

app.include_router(phase6a_offers_router)


# SIH Phase 6B - FPO aggregation
from app.api.routes import fpo as fpo_routes
app.include_router(fpo_routes.router)

# SIH Phase 6C - Storage / sale decision support
from app.api.routes import sale_decision as sale_decision_routes
app.include_router(sale_decision_routes.router)


# SIH Phase 6D - Transaction assurance / grievance safety
from app.api.routes import transaction_assurance as transaction_assurance_routes
app.include_router(transaction_assurance_routes.router)

app.include_router(storage_router)

app.include_router(mandi_arrivals_router)

app.include_router(buyer_verification_router)
