from pathlib import Path

import pytest

from app.services.marketplace_media import (
    MarketplaceMediaError,
    resolve_marketplace_image,
    save_marketplace_image,
    validate_marketplace_image,
)


VALID_PNG = (
    b"\x89PNG\r\n\x1a\n"
    + b"AGRIVA-DEMO-IMAGE"
)


VALID_JPEG = (
    b"\xff\xd8\xff"
    + b"AGRIVA-DEMO-IMAGE"
)


VALID_WEBP = (
    b"RIFF"
    + b"\x10\x00\x00\x00"
    + b"WEBP"
    + b"AGRIVA"
)


def test_valid_png_image():
    extension = validate_marketplace_image(
        content=VALID_PNG,
        content_type="image/png",
    )

    assert extension == ".png"


def test_valid_jpeg_image():
    extension = validate_marketplace_image(
        content=VALID_JPEG,
        content_type="image/jpeg",
    )

    assert extension == ".jpg"


def test_valid_webp_image():
    extension = validate_marketplace_image(
        content=VALID_WEBP,
        content_type="image/webp",
    )

    assert extension == ".webp"


def test_reject_unsupported_image_type():
    with pytest.raises(
        MarketplaceMediaError
    ):
        validate_marketplace_image(
            content=b"GIF89a",
            content_type="image/gif",
        )


def test_reject_fake_png():
    with pytest.raises(
        MarketplaceMediaError
    ):
        validate_marketplace_image(
            content=b"not-a-real-png",
            content_type="image/png",
        )


def test_reject_empty_image():
    with pytest.raises(
        MarketplaceMediaError
    ):
        validate_marketplace_image(
            content=b"",
            content_type="image/jpeg",
        )


def test_save_and_resolve_image(
    tmp_path: Path,
):
    filename = save_marketplace_image(
        content=VALID_PNG,
        content_type="image/png",
        storage_dir=tmp_path,
    )

    assert filename.endswith(".png")

    assert len(
        filename.split(".")[0]
    ) == 32

    resolved = resolve_marketplace_image(
        filename,
        storage_dir=tmp_path,
    )

    assert resolved.exists()

    assert resolved.read_bytes() == VALID_PNG


def test_reject_path_traversal(
    tmp_path: Path,
):
    with pytest.raises(
        MarketplaceMediaError
    ):
        resolve_marketplace_image(
            "../../secret.txt",
            storage_dir=tmp_path,
        )
