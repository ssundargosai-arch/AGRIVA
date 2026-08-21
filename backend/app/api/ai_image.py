from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    UploadFile,
)
from sqlalchemy.orm import Session

from app.api.dependencies import require_farmer
from app.core.config import get_settings
from app.db.session import get_db
from app.models.ai_image import AIImageAnalysis
from app.models.user import User
from app.services.image_analysis import (
    demo_crop_disease,
    demo_crop_quality,
)


router = APIRouter(
    prefix="/api/ai",
    tags=["AGRIVA CropSense"],
)


settings = get_settings()


async def read_image(
    file: UploadFile,
) -> bytes:

    if not file.content_type:
        raise HTTPException(
            status_code=400,
            detail="Image content type required",
        )

    if not file.content_type.startswith(
        "image/"
    ):
        raise HTTPException(
            status_code=400,
            detail="Only image files are allowed",
        )

    content = await file.read()

    if not content:
        raise HTTPException(
            status_code=400,
            detail="Image file is empty",
        )

    max_size = 10 * 1024 * 1024

    if len(content) > max_size:
        raise HTTPException(
            status_code=400,
            detail="Image must be smaller than 10 MB",
        )

    return content


@router.post("/crop-disease")
async def crop_disease(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_farmer
    ),
):
    content = await read_image(file)

    result = demo_crop_disease(content)

    result["demo_prediction"] = bool(
        settings.demo_mode
    )

    analysis = AIImageAnalysis(
        user_id=current_user.id,
        analysis_type="crop_disease",
        image_name=file.filename
        or "crop-image",
        result=result,
        is_demo=settings.demo_mode,
    )

    db.add(analysis)
    db.commit()
    db.refresh(analysis)

    return {
        "success": True,
        "analysis_id": str(analysis.id),
        **result,
    }


@router.post("/crop-quality")
async def crop_quality(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_farmer
    ),
):
    content = await read_image(file)

    result = demo_crop_quality(content)

    result["demo_prediction"] = bool(
        settings.demo_mode
    )

    analysis = AIImageAnalysis(
        user_id=current_user.id,
        analysis_type="crop_quality",
        image_name=file.filename
        or "crop-image",
        result=result,
        is_demo=settings.demo_mode,
    )

    db.add(analysis)
    db.commit()
    db.refresh(analysis)

    return {
        "success": True,
        "analysis_id": str(analysis.id),
        **result,
    }


@router.get("/image-analysis/history")
def image_analysis_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_farmer
    ),
):
    rows = (
        db.query(AIImageAnalysis)
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
                "id": str(row.id),
                "analysis_type": (
                    row.analysis_type
                ),
                "image_name": row.image_name,
                "result": row.result,
                "is_demo": row.is_demo,
                "created_at": row.created_at,
            }
            for row in rows
        ],
    }
