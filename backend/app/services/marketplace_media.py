from __future__ import annotations

import re
from pathlib import Path
from uuid import uuid4


MAX_IMAGES_PER_UPLOAD = 5
MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024

BACKEND_ROOT = Path(__file__).resolve().parents[2]

MARKETPLACE_IMAGE_DIR = (
    BACKEND_ROOT
    / "storage"
    / "marketplace"
    / "images"
)


CONTENT_TYPE_EXTENSION_MAP = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


SAFE_FILENAME_PATTERN = re.compile(
    r"^[0-9a-f]{32}\.(?:jpg|png|webp)$"
)


class MarketplaceMediaError(ValueError):
    """Raised when marketplace media is invalid."""


def normalize_content_type(
    content_type: str | None,
) -> str:
    return (
        str(content_type or "")
        .split(";", maxsplit=1)[0]
        .strip()
        .lower()
    )


def image_signature_matches(
    content: bytes,
    content_type: str,
) -> bool:
    if content_type == "image/jpeg":
        return (
            len(content) >= 3
            and content[:3]
            == b"\xff\xd8\xff"
        )

    if content_type == "image/png":
        return (
            len(content) >= 8
            and content[:8]
            == b"\x89PNG\r\n\x1a\n"
        )

    if content_type == "image/webp":
        return (
            len(content) >= 12
            and content[:4] == b"RIFF"
            and content[8:12] == b"WEBP"
        )

    return False


def validate_marketplace_image(
    *,
    content: bytes,
    content_type: str | None,
) -> str:
    """
    Validate one crop marketplace image.

    Returns the safe extension that should
    be used for the stored file.
    """

    if not content:
        raise MarketplaceMediaError(
            "Image file is empty."
        )

    if len(content) > MAX_IMAGE_SIZE_BYTES:
        raise MarketplaceMediaError(
            "Each image must be 10 MB or smaller."
        )

    normalized_type = normalize_content_type(
        content_type
    )

    extension = (
        CONTENT_TYPE_EXTENSION_MAP.get(
            normalized_type
        )
    )

    if extension is None:
        raise MarketplaceMediaError(
            "Only JPG, JPEG, PNG, and WEBP "
            "images are allowed."
        )

    if not image_signature_matches(
        content,
        normalized_type,
    ):
        raise MarketplaceMediaError(
            "The uploaded file content does not "
            "match its image type."
        )

    return extension


def save_marketplace_image(
    *,
    content: bytes,
    content_type: str | None,
    storage_dir: Path | None = None,
) -> str:
    extension = validate_marketplace_image(
        content=content,
        content_type=content_type,
    )

    target_directory = (
        storage_dir
        if storage_dir is not None
        else MARKETPLACE_IMAGE_DIR
    )

    try:
        target_directory.mkdir(
            parents=True,
            exist_ok=True,
        )

        filename = (
            f"{uuid4().hex}{extension}"
        )

        target_path = (
            target_directory
            / filename
        )

        target_path.write_bytes(
            content
        )

    except OSError as exc:
        raise MarketplaceMediaError(
            "Unable to store marketplace image."
        ) from exc

    return filename


def resolve_marketplace_image(
    filename: str,
    *,
    storage_dir: Path | None = None,
) -> Path:
    """
    Safely resolve an already stored marketplace
    image without allowing path traversal.
    """

    clean_filename = str(
        filename or ""
    ).strip().lower()

    if not SAFE_FILENAME_PATTERN.fullmatch(
        clean_filename
    ):
        raise MarketplaceMediaError(
            "Invalid marketplace image name."
        )

    target_directory = (
        storage_dir
        if storage_dir is not None
        else MARKETPLACE_IMAGE_DIR
    )

    target_path = (
        target_directory
        / clean_filename
    )

    if not target_path.is_file():
        raise MarketplaceMediaError(
            "Marketplace image not found."
        )

    return target_path


def delete_marketplace_image(
    filename: str,
    *,
    storage_dir: Path | None = None,
) -> None:
    """
    Best-effort cleanup used when a multi-image
    upload fails after some files were saved.
    """

    try:
        path = resolve_marketplace_image(
            filename,
            storage_dir=storage_dir,
        )

        path.unlink(
            missing_ok=True
        )

    except (
        MarketplaceMediaError,
        OSError,
    ):
        return