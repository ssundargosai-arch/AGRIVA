from io import BytesIO
from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)

from PIL import Image, UnidentifiedImageError
from sqlalchemy.orm import Session

from app.api.dependencies import require_farmer
from app.core.config import get_settings
from app.db.session import get_db

from app.models.ai_image import AIImageAnalysis

from app.models.crop import (
    Crop,
    CropHealth,
    CropQualityPrediction,
)

from app.models.farm import (
    Farm,
    FarmField,
)

from app.models.user import (
    FarmerProfile,
    User,
)

from app.services.image_analysis import (
    demo_crop_disease,
    demo_crop_quality,
)


router = APIRouter(
    prefix="/api/ai",
    tags=["AGRIVA CropSense"],
)

settings = get_settings()


# =========================================================
# IMAGE FILE VALIDATION
# =========================================================

async def read_image(
    file: UploadFile,
) -> bytes:
    if not file.content_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image content type required",
        )

    if not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only image files are allowed",
        )

    content = await file.read()

    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image file is empty",
        )

    max_size = 10 * 1024 * 1024

    if len(content) > max_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image must be smaller than 10 MB",
        )

    # Ensure bytes are actually a readable image.
    try:
        with Image.open(BytesIO(content)) as image:
            image.verify()

    except (
        UnidentifiedImageError,
        OSError,
        ValueError,
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is not a valid image",
        )

    return content


# =========================================================
# CROP / LEAF VALIDATION
# =========================================================

def validate_crop_leaf_image(
    content: bytes,
) -> None:
    """
    Conservative demo-mode validation.

    The current AGRIVA disease predictor is deterministic
    demo logic, not a trained computer-vision model.

    This function prevents obviously unrelated images from
    automatically receiving a fake crop-disease result.

    This heuristic is intended mainly for leaf/crop-doctor
    images. It is NOT a replacement for a trained vision
    classifier.
    """

    try:
        with Image.open(BytesIO(content)) as image:
            image = image.convert("RGB")

            width, height = image.size

            # Very small images are unreliable.
            if width < 120 or height < 120:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=(
                        "Image is too small. Please upload a clear "
                        "crop or leaf image."
                    ),
                )

            # Resize only for inexpensive validation.
            image.thumbnail(
                (300, 300)
            )

            pixels = list(
                image.getdata()
            )

    except HTTPException:
        raise

    except (
        UnidentifiedImageError,
        OSError,
        ValueError,
    ):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "Unable to analyze this image. Please upload "
                "a clear crop or leaf image."
            ),
        )

    if not pixels:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "Unable to analyze this image. Please upload "
                "a clear crop or leaf image."
            ),
        )

    vegetation_pixels = 0
    saturated_pixels = 0

    for red, green, blue in pixels:
        max_channel = max(
            red,
            green,
            blue,
        )

        min_channel = min(
            red,
            green,
            blue,
        )

        # Basic saturation estimate.
        saturation = (
            max_channel -
            min_channel
        )

        if saturation > 25:
            saturated_pixels += 1

        # Conservative vegetation-like RGB rule.
        #
        # Green must be meaningfully stronger than both
        # red and blue, while avoiding extremely dark pixels.
        if (
            green >= 45
            and green > red * 1.05
            and green > blue * 1.08
            and (green - red) >= 8
            and (green - blue) >= 10
        ):
            vegetation_pixels += 1

    total_pixels = len(pixels)

    vegetation_ratio = (
        vegetation_pixels /
        total_pixels
    )

    saturation_ratio = (
        saturated_pixels /
        total_pixels
    )

    # Crop Doctor is primarily intended for leaf/crop images.
    # A conservative threshold prevents arbitrary photos
    # from being classified as Potato/Wheat/etc.
    looks_like_crop_leaf = (
        vegetation_ratio >= 0.025
        and saturation_ratio >= 0.06
    )

    if not looks_like_crop_leaf:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "Invalid Crop Doctor image. Please upload a "
                "clear photo of a crop, plant, or leaf. "
                "Human, animal, document, and unrelated images "
                "cannot be analyzed."
            ),
        )


# =========================================================
# FARMER CROP OWNERSHIP
# =========================================================

def get_farmer_crop(
    crop_id: UUID,
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
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "Crop not found or does not belong "
                "to the logged-in farmer"
            ),
        )

    return crop


# =========================================================
# CROP DISEASE / CROP DOCTOR
# =========================================================

@router.post("/crop-disease")
async def crop_disease(
    crop_id: UUID = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_farmer),
):
    crop = get_farmer_crop(
        crop_id=crop_id,
        current_user=current_user,
        db=db,
    )

    content = await read_image(
        file
    )

    # -----------------------------------------------------
    # IMPORTANT:
    # Validate before demo disease prediction.
    #
    # If validation fails, HTTPException is raised here,
    # therefore no fake AIImageAnalysis or CropHealth
    # record is saved to the database.
    # -----------------------------------------------------

    validate_crop_leaf_image(
        content
    )

    result = demo_crop_disease(
    content,
    registered_crop=crop.name,
    )
    
    result["demo_prediction"] = bool(
        settings.demo_mode
    )

    result["validation_note"] = (
        "Image passed AGRIVA demo crop-image validation. "
        "Disease output is still a demo prediction and "
        "must not be treated as a trained vision diagnosis."
    )

    analysis = AIImageAnalysis(
        user_id=current_user.id,
        analysis_type="crop_disease",
        image_name=(
            file.filename
            or "crop-image"
        ),
        result={
            **result,
            "crop_id": str(
                crop.id
            ),
            "registered_crop": (
                crop.name
            ),
        },
        is_demo=settings.demo_mode,
    )

    health_status = (
        "Needs Attention"
        if result.get(
            "possible_disease"
        )
        else "Healthy"
    )

    health_record = CropHealth(
        crop_id=crop.id,
        health_status=health_status,
        disease_name=result.get(
            "possible_disease"
        ),
        confidence=result.get(
            "confidence"
        ),
        notes="; ".join(
            result.get(
                "recommendations",
                [],
            )
        ),
    )

    db.add(
        analysis
    )

    db.add(
        health_record
    )

    try:
        db.commit()

        db.refresh(
            analysis
        )

        db.refresh(
            health_record
        )

    except Exception:
        db.rollback()
        raise

    return {
        "success": True,
        "valid_crop_image": True,
        "analysis_id": str(
            analysis.id
        ),
        "health_record_id": str(
            health_record.id
        ),
        "crop_id": str(
            crop.id
        ),
        "registered_crop": (
            crop.name
        ),
        **result,
    }


# =========================================================
# CROP QUALITY
# =========================================================

@router.post("/crop-quality")
async def crop_quality(
    crop_id: UUID = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_farmer),
):
    crop = get_farmer_crop(
        crop_id=crop_id,
        current_user=current_user,
        db=db,
    )

    content = await read_image(
        file
    )

    result = demo_crop_quality(
        content
    )

    result["demo_prediction"] = bool(
        settings.demo_mode
    )

    analysis = AIImageAnalysis(
        user_id=current_user.id,
        analysis_type="crop_quality",
        image_name=(
            file.filename
            or "crop-image"
        ),
        result={
            **result,
            "crop_id": str(
                crop.id
            ),
            "registered_crop": (
                crop.name
            ),
        },
        is_demo=settings.demo_mode,
    )

    quality_prediction = (
        CropQualityPrediction(
            crop_id=crop.id,
            grade=result["grade"],
            confidence=result[
                "quality_score"
            ],
        )
    )

    db.add(
        analysis
    )

    db.add(
        quality_prediction
    )

    try:
        db.commit()

        db.refresh(
            analysis
        )

        db.refresh(
            quality_prediction
        )

    except Exception:
        db.rollback()
        raise

    return {
        "success": True,
        "analysis_id": str(
            analysis.id
        ),
        "quality_prediction_id": str(
            quality_prediction.id
        ),
        "crop_id": str(
            crop.id
        ),
        "registered_crop": (
            crop.name
        ),
        **result,
    }


# =========================================================
# IMAGE ANALYSIS HISTORY
# =========================================================

@router.get(
    "/image-analysis/history"
)
def image_analysis_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_farmer),
):
    rows = (
        db.query(
            AIImageAnalysis
        )
        .filter(
            AIImageAnalysis.user_id
            == current_user.id
        )
        .order_by(
            AIImageAnalysis.created_at.desc()
        )
        .limit(50)
        .all()
    )

    return {
        "success": True,
        "history": [
            {
                "id": str(
                    row.id
                ),
                "analysis_type": (
                    row.analysis_type
                ),
                "image_name": (
                    row.image_name
                ),
                "result": (
                    row.result
                ),
                "is_demo": (
                    row.is_demo
                ),
                "created_at": (
                    row.created_at
                ),
            }
            for row in rows
        ],
    }