from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class BuyerVerificationResponse(BaseModel):
    verification_id: UUID | None = None
    buyer_profile_id: UUID

    business_name: str
    business_type: str
    city: str
    state: str

    status: str
    status_label: str
    verification_note: str

    document_type: str | None = None
    gstin: str | None = None
    business_registration_number: str | None = None

    document_original_name: str | None = None

    submitted_at: datetime | None = None
    reviewed_at: datetime | None = None
    review_note: str | None = None


class BuyerPublicVerificationResponse(BaseModel):
    buyer_profile_id: UUID
    status: str
    status_label: str
    verification_note: str
    reviewed_at: datetime | None = None


class BuyerVerificationReviewRequest(BaseModel):
    status: str
    review_note: str | None = Field(
        default=None,
        max_length=1000,
    )
