from pathlib import Path

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Request,
    UploadFile,
    status,
)
from fastapi.responses import FileResponse

from app.api.dependencies import (
    require_farmer,
)
from app.models.user import User

from app.schemas.marketplace_media import (
    MarketplaceImageItem,
    MarketplaceImageUploadResponse,
)

from app.services.marketplace_media import (
    MAX_IMAGES_PER_UPLOAD,
    MarketplaceMediaError,
    delete_marketplace_image,
    resolve_marketplace_image,
    save_marketplace_image,
    validate_marketplace_image,
)


router = APIRouter(
    prefix="/api/marketplace/media",
    tags=["Marketplace Media"],
)


MEDIA_TYPES = {
    ".jpg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
}


@router.post(
    "/images",
    response_model=(
        MarketplaceImageUploadResponse
    ),
    status_code=status.HTTP_201_CREATED,
)
async def upload_marketplace_images(
    request: Request,
    files: list[UploadFile] = File(...),
    _current_user: User = Depends(
        require_farmer
    ),
):
    if not files:
        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=(
                "At least one crop image "
                "is required."
            ),
        )

    if len(files) > MAX_IMAGES_PER_UPLOAD:
        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=(
                "A maximum of 5 crop images "
                "can be uploaded at once."
            ),
        )

    prepared_files: list[
        tuple[
            UploadFile,
            bytes,
            str,
        ]
    ] = []

    # Validate every file before writing any
    # file to disk.
    for upload in files:
        content = await upload.read()

        try:
            validate_marketplace_image(
                content=content,
                content_type=(
                    upload.content_type
                ),
            )

        except MarketplaceMediaError as exc:
            raise HTTPException(
                status_code=(
                    status.HTTP_400_BAD_REQUEST
                ),
                detail=str(exc),
            ) from exc

        prepared_files.append(
            (
                upload,
                content,
                upload.content_type
                or "application/octet-stream",
            )
        )

    saved_filenames: list[str] = []
    response_images: list[
        MarketplaceImageItem
    ] = []

    try:
        for (
            upload,
            content,
            content_type,
        ) in prepared_files:
            filename = (
                save_marketplace_image(
                    content=content,
                    content_type=(
                        content_type
                    ),
                )
            )

            saved_filenames.append(
                filename
            )

            image_url = str(
                request.url_for(
                    "get_marketplace_image",
                    filename=filename,
                )
            )

            response_images.append(
                MarketplaceImageItem(
                    filename=filename,
                    url=image_url,
                    original_name=(
                        upload.filename
                    ),
                    content_type=(
                        content_type
                    ),
                    size_bytes=len(content),
                )
            )

    except MarketplaceMediaError as exc:
        for filename in saved_filenames:
            delete_marketplace_image(
                filename
            )

        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=str(exc),
        ) from exc

    return MarketplaceImageUploadResponse(
        images=response_images,
        urls=[
            item.url
            for item in response_images
        ],
    )


@router.get(
    "/images/{filename}",
    name="get_marketplace_image",
)
def get_marketplace_image(
    filename: str,
):
    try:
        path = (
            resolve_marketplace_image(
                filename
            )
        )

    except MarketplaceMediaError as exc:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=(
                "Marketplace image "
                "not found."
            ),
        ) from exc

    suffix = (
        Path(path)
        .suffix
        .lower()
    )

    media_type = MEDIA_TYPES.get(
        suffix,
        "application/octet-stream",
    )

    return FileResponse(
        path=path,
        media_type=media_type,
        filename=None,
        headers={
            "Cache-Control":
                "public, max-age=86400",
        },
    )