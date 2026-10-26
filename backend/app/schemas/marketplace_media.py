from pydantic import BaseModel, Field


class MarketplaceImageItem(BaseModel):
    filename: str
    url: str
    original_name: str | None = None
    content_type: str

    size_bytes: int = Field(
        ge=1,
    )


class MarketplaceImageUploadResponse(BaseModel):
    images: list[
        MarketplaceImageItem
    ] = Field(
        default_factory=list,
    )

    urls: list[str] = Field(
        default_factory=list,
    )
