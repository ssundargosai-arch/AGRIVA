import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class BuyerVerification(Base):
    __tablename__ = "buyer_verifications"

    __table_args__ = (
        CheckConstraint(
            "status IN ("
            "'PENDING', "
            "'AGRIVA_VERIFIED', "
            "'REJECTED'"
            ")",
            name="ck_buyer_verification_status",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    buyer_profile_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "buyer_profiles.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        unique=True,
        index=True,
    )

    status: Mapped[str] = mapped_column(
        String(40),
        nullable=False,
        default="PENDING",
        index=True,
    )

    document_type: Mapped[str] = mapped_column(
        String(60),
        nullable=False,
    )

    business_name_snapshot: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )

    business_type_snapshot: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    gstin: Mapped[str | None] = mapped_column(
        String(15),
        nullable=True,
    )

    business_registration_number: Mapped[str | None] = mapped_column(
        String(80),
        nullable=True,
    )

    document_original_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    document_stored_name: Mapped[str] = mapped_column(
        String(400),
        nullable=False,
    )

    document_content_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    document_size_bytes: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    document_sha256: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
    )

    declaration_accepted: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )

    review_note: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    reviewed_by_admin_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "users.id",
            ondelete="SET NULL",
        ),
        nullable=True,
    )

    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    reviewed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
