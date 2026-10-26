from pathlib import Path
import shutil

ROOT = Path(r"D:\AGRIVA\backend")

FILES = {}

FILES["app/models/storage.py"] = r'''import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class StorageFacility(Base):
    __tablename__ = "storage_facilities"
    __table_args__ = (
        CheckConstraint(
            "facility_type IN ('WAREHOUSE', 'COLD_STORAGE')",
            name="ck_storage_facility_type",
        ),
        CheckConstraint(
            "status IN ('ACTIVE', 'INACTIVE')",
            name="ck_storage_facility_status",
        ),
        CheckConstraint(
            "total_capacity_quintal >= 0",
            name="ck_storage_total_capacity",
        ),
        CheckConstraint(
            "available_capacity_quintal >= 0",
            name="ck_storage_available_capacity_positive",
        ),
        CheckConstraint(
            "available_capacity_quintal <= total_capacity_quintal",
            name="ck_storage_available_capacity_limit",
        ),
        CheckConstraint(
            "rate_per_quintal_day >= 0",
            name="ck_storage_rate_positive",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    name: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
        index=True,
    )

    facility_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        index=True,
    )

    district: Mapped[str] = mapped_column(
        String(120),
        nullable=False,
        index=True,
    )

    state: Mapped[str] = mapped_column(
        String(120),
        nullable=False,
        index=True,
    )

    address: Mapped[str] = mapped_column(
        String(300),
        nullable=False,
    )

    total_capacity_quintal: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    available_capacity_quintal: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    rate_per_quintal_day: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    supports_cold_chain: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    contact_phone: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True,
    )

    status: Mapped[str] = mapped_column(
        String(20),
        default="ACTIVE",
        nullable=False,
        index=True,
    )

    data_mode: Mapped[str] = mapped_column(
        String(40),
        default="DEMO_DIRECTORY",
        nullable=False,
    )

    verification_note: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default=(
            "Prototype storage-directory record. "
            "Provider credentials and real-time capacity "
            "are not independently verified by AGRIVA."
        ),
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class StorageRequest(Base):
    __tablename__ = "storage_requests"
    __table_args__ = (
        CheckConstraint(
            "status IN ("
            "'REQUESTED', 'APPROVED', 'REJECTED', "
            "'CANCELLED', 'COMPLETED'"
            ")",
            name="ck_storage_request_status",
        ),
        CheckConstraint(
            "quantity_quintal > 0",
            name="ck_storage_request_quantity",
        ),
        CheckConstraint(
            "storage_days > 0",
            name="ck_storage_request_days",
        ),
        CheckConstraint(
            "estimated_cost >= 0",
            name="ck_storage_request_cost",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    facility_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "storage_facilities.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    farmer_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "users.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    listing_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "crop_listings.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    crop_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    quantity_quintal: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    storage_days: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    rate_per_quintal_day: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    estimated_cost: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(30),
        default="REQUESTED",
        nullable=False,
        index=True,
    )

    notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
'''

FILES["app/schemas/storage.py"] = r'''from datetime import datetime
from uuid import UUID

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
)


class StorageFacilityResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True
    )

    id: UUID
    name: str
    facility_type: str
    district: str
    state: str
    address: str
    total_capacity_quintal: float
    available_capacity_quintal: float
    rate_per_quintal_day: float
    supports_cold_chain: bool
    contact_phone: str | None
    status: str
    data_mode: str
    verification_note: str


class StorageCostEstimateResponse(BaseModel):
    facility_id: UUID
    quantity_quintal: float
    storage_days: int
    rate_per_quintal_day: float
    estimated_cost: float
    capacity_available: bool
    note: str


class StorageRequestCreate(BaseModel):
    facility_id: UUID

    crop_name: str = Field(
        min_length=2,
        max_length=100,
    )

    quantity_quintal: float = Field(
        gt=0,
        le=100000,
    )

    storage_days: int = Field(
        ge=1,
        le=365,
    )

    listing_id: UUID | None = None

    notes: str | None = Field(
        default=None,
        max_length=1000,
    )


class StorageRequestResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True
    )

    id: UUID
    facility_id: UUID
    farmer_user_id: UUID
    listing_id: UUID | None

    crop_name: str
    quantity_quintal: float
    storage_days: int
    rate_per_quintal_day: float
    estimated_cost: float
    status: str
    notes: str | None

    created_at: datetime
    updated_at: datetime


class StorageMessageResponse(BaseModel):
    message: str
'''

FILES["app/services/storage_service.py"] = r'''from uuid import UUID

from sqlalchemy.orm import Session

from app.models.storage import (
    StorageFacility,
    StorageRequest,
)


class StorageValidationError(ValueError):
    pass


class StorageNotFoundError(LookupError):
    pass


def calculate_storage_cost(
    *,
    quantity_quintal: float,
    storage_days: int,
    rate_per_quintal_day: float,
) -> float:
    if quantity_quintal <= 0:
        raise StorageValidationError(
            "Quantity must be greater than zero."
        )

    if storage_days <= 0:
        raise StorageValidationError(
            "Storage days must be greater than zero."
        )

    if rate_per_quintal_day < 0:
        raise StorageValidationError(
            "Storage rate cannot be negative."
        )

    return round(
        quantity_quintal
        * storage_days
        * rate_per_quintal_day,
        2,
    )


def capacity_available(
    *,
    requested_quantity: float,
    available_quantity: float,
) -> bool:
    if requested_quantity <= 0:
        return False

    return (
        requested_quantity
        <= available_quantity
    )


def list_storage_facilities(
    *,
    db: Session,
    district: str | None = None,
    state: str | None = None,
    facility_type: str | None = None,
    min_available_quintal: float | None = None,
) -> list[StorageFacility]:
    query = db.query(
        StorageFacility
    ).filter(
        StorageFacility.status == "ACTIVE"
    )

    if district:
        query = query.filter(
            StorageFacility.district.ilike(
                f"%{district.strip()}%"
            )
        )

    if state:
        query = query.filter(
            StorageFacility.state.ilike(
                f"%{state.strip()}%"
            )
        )

    if facility_type:
        normalized_type = (
            facility_type
            .strip()
            .upper()
        )

        if normalized_type not in {
            "WAREHOUSE",
            "COLD_STORAGE",
        }:
            raise StorageValidationError(
                "facility_type must be "
                "WAREHOUSE or COLD_STORAGE."
            )

        query = query.filter(
            StorageFacility.facility_type
            == normalized_type
        )

    if (
        min_available_quintal
        is not None
    ):
        if min_available_quintal < 0:
            raise StorageValidationError(
                "Minimum available capacity "
                "cannot be negative."
            )

        query = query.filter(
            StorageFacility
            .available_capacity_quintal
            >= min_available_quintal
        )

    return (
        query
        .order_by(
            StorageFacility.state.asc(),
            StorageFacility.district.asc(),
            StorageFacility
            .rate_per_quintal_day.asc(),
        )
        .all()
    )


def get_storage_facility(
    *,
    db: Session,
    facility_id: UUID,
) -> StorageFacility:
    facility = (
        db.query(StorageFacility)
        .filter(
            StorageFacility.id
            == facility_id
        )
        .first()
    )

    if facility is None:
        raise StorageNotFoundError(
            "Storage facility not found."
        )

    return facility


def estimate_storage_cost(
    *,
    db: Session,
    facility_id: UUID,
    quantity_quintal: float,
    storage_days: int,
) -> dict:
    facility = get_storage_facility(
        db=db,
        facility_id=facility_id,
    )

    cost = calculate_storage_cost(
        quantity_quintal=quantity_quintal,
        storage_days=storage_days,
        rate_per_quintal_day=(
            facility.rate_per_quintal_day
        ),
    )

    available = capacity_available(
        requested_quantity=quantity_quintal,
        available_quantity=(
            facility
            .available_capacity_quintal
        ),
    )

    return {
        "facility_id": facility.id,
        "quantity_quintal": (
            quantity_quintal
        ),
        "storage_days": storage_days,
        "rate_per_quintal_day": (
            facility.rate_per_quintal_day
        ),
        "estimated_cost": cost,
        "capacity_available": available,
        "note": (
            "This is an AGRIVA cost estimate "
            "based on the stored directory rate. "
            "Final provider price and availability "
            "must be confirmed by the storage provider."
        ),
    }


def create_storage_request(
    *,
    db: Session,
    farmer_user_id: UUID,
    facility_id: UUID,
    crop_name: str,
    quantity_quintal: float,
    storage_days: int,
    listing_id: UUID | None = None,
    notes: str | None = None,
) -> StorageRequest:
    facility = get_storage_facility(
        db=db,
        facility_id=facility_id,
    )

    if facility.status != "ACTIVE":
        raise StorageValidationError(
            "Storage facility is not active."
        )

    if not capacity_available(
        requested_quantity=quantity_quintal,
        available_quantity=(
            facility
            .available_capacity_quintal
        ),
    ):
        raise StorageValidationError(
            "Requested quantity exceeds "
            "the directory's currently "
            "available capacity."
        )

    estimated_cost = (
        calculate_storage_cost(
            quantity_quintal=(
                quantity_quintal
            ),
            storage_days=storage_days,
            rate_per_quintal_day=(
                facility
                .rate_per_quintal_day
            ),
        )
    )

    request = StorageRequest(
        facility_id=facility.id,
        farmer_user_id=farmer_user_id,
        listing_id=listing_id,
        crop_name=crop_name.strip(),
        quantity_quintal=(
            quantity_quintal
        ),
        storage_days=storage_days,
        rate_per_quintal_day=(
            facility
            .rate_per_quintal_day
        ),
        estimated_cost=estimated_cost,
        status="REQUESTED",
        notes=(
            notes.strip()
            if notes
            else None
        ),
    )

    db.add(request)
    db.commit()
    db.refresh(request)

    # Important:
    # REQUESTED is only an enquiry/request.
    # Capacity is NOT deducted until a
    # provider/admin approval workflow exists.

    return request


def get_farmer_storage_requests(
    *,
    db: Session,
    farmer_user_id: UUID,
) -> list[StorageRequest]:
    return (
        db.query(StorageRequest)
        .filter(
            StorageRequest.farmer_user_id
            == farmer_user_id
        )
        .order_by(
            StorageRequest
            .created_at.desc()
        )
        .all()
    )


def cancel_storage_request(
    *,
    db: Session,
    request_id: UUID,
    farmer_user_id: UUID,
) -> StorageRequest:
    request = (
        db.query(StorageRequest)
        .filter(
            StorageRequest.id
            == request_id,
            StorageRequest.farmer_user_id
            == farmer_user_id,
        )
        .first()
    )

    if request is None:
        raise StorageNotFoundError(
            "Storage request not found."
        )

    if request.status != "REQUESTED":
        raise StorageValidationError(
            "Only REQUESTED storage requests "
            "can be cancelled by the farmer."
        )

    request.status = "CANCELLED"

    db.commit()
    db.refresh(request)

    return request
'''

FILES["app/api/routes/storage.py"] = r'''from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    status,
)
from sqlalchemy.orm import Session

from app.api.dependencies import (
    require_farmer,
)
from app.db.session import get_db
from app.models.user import User
from app.schemas.storage import (
    StorageCostEstimateResponse,
    StorageFacilityResponse,
    StorageRequestCreate,
    StorageRequestResponse,
)
from app.services.storage_service import (
    StorageNotFoundError,
    StorageValidationError,
    cancel_storage_request,
    create_storage_request,
    estimate_storage_cost,
    get_farmer_storage_requests,
    get_storage_facility,
    list_storage_facilities,
)


router = APIRouter(
    prefix="/api/storage",
    tags=["Storage Network"],
)


def _http_error(exc: Exception):
    if isinstance(
        exc,
        StorageNotFoundError,
    ):
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=str(exc),
        ) from exc

    raise HTTPException(
        status_code=(
            status.HTTP_422_UNPROCESSABLE_ENTITY
        ),
        detail=str(exc),
    ) from exc


@router.get("/health")
def storage_health():
    return {
        "status": "ok",
        "module": "AGRIVA Storage Network",
        "directory_mode": True,
        "real_time_provider_verification": False,
    }


@router.get(
    "/facilities",
    response_model=list[
        StorageFacilityResponse
    ],
)
def storage_facilities(
    district: str | None = None,
    state_name: str | None = Query(
        default=None,
        alias="state",
    ),
    facility_type: str | None = None,
    min_available_quintal: float | None = Query(
        default=None,
        ge=0,
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_farmer
    ),
):
    del current_user

    try:
        return list_storage_facilities(
            db=db,
            district=district,
            state=state_name,
            facility_type=facility_type,
            min_available_quintal=(
                min_available_quintal
            ),
        )

    except StorageValidationError as exc:
        _http_error(exc)


@router.get(
    "/facilities/{facility_id}",
    response_model=StorageFacilityResponse,
)
def storage_facility_detail(
    facility_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_farmer
    ),
):
    del current_user

    try:
        return get_storage_facility(
            db=db,
            facility_id=facility_id,
        )

    except (
        StorageNotFoundError,
        StorageValidationError,
    ) as exc:
        _http_error(exc)


@router.get(
    "/cost-estimate",
    response_model=(
        StorageCostEstimateResponse
    ),
)
def storage_cost_estimate(
    facility_id: UUID,
    quantity_quintal: float = Query(
        gt=0
    ),
    storage_days: int = Query(
        ge=1,
        le=365,
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_farmer
    ),
):
    del current_user

    try:
        return estimate_storage_cost(
            db=db,
            facility_id=facility_id,
            quantity_quintal=(
                quantity_quintal
            ),
            storage_days=storage_days,
        )

    except (
        StorageNotFoundError,
        StorageValidationError,
    ) as exc:
        _http_error(exc)


@router.post(
    "/requests",
    response_model=StorageRequestResponse,
    status_code=status.HTTP_201_CREATED,
)
def request_storage(
    payload: StorageRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_farmer
    ),
):
    try:
        return create_storage_request(
            db=db,
            farmer_user_id=current_user.id,
            facility_id=payload.facility_id,
            crop_name=payload.crop_name,
            quantity_quintal=(
                payload.quantity_quintal
            ),
            storage_days=(
                payload.storage_days
            ),
            listing_id=payload.listing_id,
            notes=payload.notes,
        )

    except (
        StorageNotFoundError,
        StorageValidationError,
    ) as exc:
        _http_error(exc)


@router.get(
    "/requests/my",
    response_model=list[
        StorageRequestResponse
    ],
)
def my_storage_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_farmer
    ),
):
    return get_farmer_storage_requests(
        db=db,
        farmer_user_id=current_user.id,
    )


@router.patch(
    "/requests/{request_id}/cancel",
    response_model=StorageRequestResponse,
)
def cancel_my_storage_request(
    request_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_farmer
    ),
):
    try:
        return cancel_storage_request(
            db=db,
            request_id=request_id,
            farmer_user_id=current_user.id,
        )

    except (
        StorageNotFoundError,
        StorageValidationError,
    ) as exc:
        _http_error(exc)
'''

FILES["alembic/versions/6e01_storage_network.py"] = r'''"""add AGRIVA storage network

Revision ID: 6e01_storage_network
Revises: 6d01_transaction_assurance
"""

from typing import Sequence, Union
import uuid

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "6e01_storage_network"
down_revision: Union[str, None] = (
    "6d01_transaction_assurance"
)
branch_labels: Union[
    str,
    Sequence[str],
    None,
] = None
depends_on: Union[
    str,
    Sequence[str],
    None,
] = None


def upgrade() -> None:
    op.create_table(
        "storage_facilities",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "name",
            sa.String(length=200),
            nullable=False,
        ),
        sa.Column(
            "facility_type",
            sa.String(length=30),
            nullable=False,
        ),
        sa.Column(
            "district",
            sa.String(length=120),
            nullable=False,
        ),
        sa.Column(
            "state",
            sa.String(length=120),
            nullable=False,
        ),
        sa.Column(
            "address",
            sa.String(length=300),
            nullable=False,
        ),
        sa.Column(
            "total_capacity_quintal",
            sa.Float(),
            nullable=False,
        ),
        sa.Column(
            "available_capacity_quintal",
            sa.Float(),
            nullable=False,
        ),
        sa.Column(
            "rate_per_quintal_day",
            sa.Float(),
            nullable=False,
        ),
        sa.Column(
            "supports_cold_chain",
            sa.Boolean(),
            server_default=sa.false(),
            nullable=False,
        ),
        sa.Column(
            "contact_phone",
            sa.String(length=30),
            nullable=True,
        ),
        sa.Column(
            "status",
            sa.String(length=20),
            server_default="ACTIVE",
            nullable=False,
        ),
        sa.Column(
            "data_mode",
            sa.String(length=40),
            server_default="DEMO_DIRECTORY",
            nullable=False,
        ),
        sa.Column(
            "verification_note",
            sa.Text(),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "facility_type IN "
            "('WAREHOUSE', 'COLD_STORAGE')",
            name="ck_storage_facility_type",
        ),
        sa.CheckConstraint(
            "status IN ('ACTIVE', 'INACTIVE')",
            name="ck_storage_facility_status",
        ),
        sa.CheckConstraint(
            "total_capacity_quintal >= 0",
            name="ck_storage_total_capacity",
        ),
        sa.CheckConstraint(
            "available_capacity_quintal >= 0",
            name=(
                "ck_storage_available_"
                "capacity_positive"
            ),
        ),
        sa.CheckConstraint(
            "available_capacity_quintal "
            "<= total_capacity_quintal",
            name=(
                "ck_storage_available_"
                "capacity_limit"
            ),
        ),
        sa.CheckConstraint(
            "rate_per_quintal_day >= 0",
            name="ck_storage_rate_positive",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        "ix_storage_facilities_name",
        "storage_facilities",
        ["name"],
    )

    op.create_index(
        "ix_storage_facilities_type",
        "storage_facilities",
        ["facility_type"],
    )

    op.create_index(
        "ix_storage_facilities_district",
        "storage_facilities",
        ["district"],
    )

    op.create_index(
        "ix_storage_facilities_state",
        "storage_facilities",
        ["state"],
    )

    op.create_index(
        "ix_storage_facilities_status",
        "storage_facilities",
        ["status"],
    )

    op.create_table(
        "storage_requests",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "facility_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "farmer_user_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "listing_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
        sa.Column(
            "crop_name",
            sa.String(length=100),
            nullable=False,
        ),
        sa.Column(
            "quantity_quintal",
            sa.Float(),
            nullable=False,
        ),
        sa.Column(
            "storage_days",
            sa.Integer(),
            nullable=False,
        ),
        sa.Column(
            "rate_per_quintal_day",
            sa.Float(),
            nullable=False,
        ),
        sa.Column(
            "estimated_cost",
            sa.Float(),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.String(length=30),
            server_default="REQUESTED",
            nullable=False,
        ),
        sa.Column(
            "notes",
            sa.Text(),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "status IN ("
            "'REQUESTED', 'APPROVED', "
            "'REJECTED', 'CANCELLED', "
            "'COMPLETED'"
            ")",
            name="ck_storage_request_status",
        ),
        sa.CheckConstraint(
            "quantity_quintal > 0",
            name="ck_storage_request_quantity",
        ),
        sa.CheckConstraint(
            "storage_days > 0",
            name="ck_storage_request_days",
        ),
        sa.CheckConstraint(
            "estimated_cost >= 0",
            name="ck_storage_request_cost",
        ),
        sa.ForeignKeyConstraint(
            ["facility_id"],
            ["storage_facilities.id"],
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["farmer_user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["listing_id"],
            ["crop_listings.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        "ix_storage_requests_facility_id",
        "storage_requests",
        ["facility_id"],
    )

    op.create_index(
        "ix_storage_requests_farmer_user_id",
        "storage_requests",
        ["farmer_user_id"],
    )

    op.create_index(
        "ix_storage_requests_listing_id",
        "storage_requests",
        ["listing_id"],
    )

    op.create_index(
        "ix_storage_requests_status",
        "storage_requests",
        ["status"],
    )

    facilities = sa.table(
        "storage_facilities",
        sa.column(
            "id",
            postgresql.UUID(as_uuid=True),
        ),
        sa.column("name", sa.String()),
        sa.column(
            "facility_type",
            sa.String(),
        ),
        sa.column("district", sa.String()),
        sa.column("state", sa.String()),
        sa.column("address", sa.String()),
        sa.column(
            "total_capacity_quintal",
            sa.Float(),
        ),
        sa.column(
            "available_capacity_quintal",
            sa.Float(),
        ),
        sa.column(
            "rate_per_quintal_day",
            sa.Float(),
        ),
        sa.column(
            "supports_cold_chain",
            sa.Boolean(),
        ),
        sa.column(
            "contact_phone",
            sa.String(),
        ),
        sa.column("status", sa.String()),
        sa.column(
            "data_mode",
            sa.String(),
        ),
        sa.column(
            "verification_note",
            sa.Text(),
        ),
    )

    note = (
        "Prototype storage-directory entry. "
        "Provider credentials, pricing and "
        "real-time availability are not "
        "independently verified by AGRIVA."
    )

    op.bulk_insert(
        facilities,
        [
            {
                "id": uuid.uuid4(),
                "name": (
                    "Nashik Agri Storage Hub"
                ),
                "facility_type": "WAREHOUSE",
                "district": "Nashik",
                "state": "Maharashtra",
                "address": (
                    "Nashik District, Maharashtra"
                ),
                "total_capacity_quintal": 8000.0,
                "available_capacity_quintal": 5200.0,
                "rate_per_quintal_day": 2.25,
                "supports_cold_chain": False,
                "contact_phone": None,
                "status": "ACTIVE",
                "data_mode": "DEMO_DIRECTORY",
                "verification_note": note,
            },
            {
                "id": uuid.uuid4(),
                "name": (
                    "Lasalgaon Cold Chain Centre"
                ),
                "facility_type": "COLD_STORAGE",
                "district": "Nashik",
                "state": "Maharashtra",
                "address": (
                    "Lasalgaon, Nashik, Maharashtra"
                ),
                "total_capacity_quintal": 5000.0,
                "available_capacity_quintal": 3100.0,
                "rate_per_quintal_day": 4.75,
                "supports_cold_chain": True,
                "contact_phone": None,
                "status": "ACTIVE",
                "data_mode": "DEMO_DIRECTORY",
                "verification_note": note,
            },
            {
                "id": uuid.uuid4(),
                "name": (
                    "Pune Farmer Warehouse"
                ),
                "facility_type": "WAREHOUSE",
                "district": "Pune",
                "state": "Maharashtra",
                "address": (
                    "Pune District, Maharashtra"
                ),
                "total_capacity_quintal": 10000.0,
                "available_capacity_quintal": 6800.0,
                "rate_per_quintal_day": 2.60,
                "supports_cold_chain": False,
                "contact_phone": None,
                "status": "ACTIVE",
                "data_mode": "DEMO_DIRECTORY",
                "verification_note": note,
            },
        ],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_storage_requests_status",
        table_name="storage_requests",
    )
    op.drop_index(
        "ix_storage_requests_listing_id",
        table_name="storage_requests",
    )
    op.drop_index(
        "ix_storage_requests_farmer_user_id",
        table_name="storage_requests",
    )
    op.drop_index(
        "ix_storage_requests_facility_id",
        table_name="storage_requests",
    )
    op.drop_table("storage_requests")

    op.drop_index(
        "ix_storage_facilities_status",
        table_name="storage_facilities",
    )
    op.drop_index(
        "ix_storage_facilities_state",
        table_name="storage_facilities",
    )
    op.drop_index(
        "ix_storage_facilities_district",
        table_name="storage_facilities",
    )
    op.drop_index(
        "ix_storage_facilities_type",
        table_name="storage_facilities",
    )
    op.drop_index(
        "ix_storage_facilities_name",
        table_name="storage_facilities",
    )
    op.drop_table("storage_facilities")
'''

FILES["tests/test_storage_network.py"] = r'''import pytest

from app.main import app
from app.services.storage_service import (
    StorageValidationError,
    calculate_storage_cost,
    capacity_available,
)


def test_storage_cost_calculation():
    assert calculate_storage_cost(
        quantity_quintal=25,
        storage_days=10,
        rate_per_quintal_day=2.5,
    ) == 625.0


def test_storage_cost_invalid_quantity():
    with pytest.raises(
        StorageValidationError
    ):
        calculate_storage_cost(
            quantity_quintal=0,
            storage_days=10,
            rate_per_quintal_day=2.5,
        )


def test_storage_cost_invalid_days():
    with pytest.raises(
        StorageValidationError
    ):
        calculate_storage_cost(
            quantity_quintal=25,
            storage_days=0,
            rate_per_quintal_day=2.5,
        )


def test_storage_capacity_check():
    assert capacity_available(
        requested_quantity=25,
        available_quantity=100,
    )

    assert not capacity_available(
        requested_quantity=125,
        available_quantity=100,
    )


def test_storage_routes_registered():
    paths = {
        route.path
        for route in app.routes
    }

    assert "/api/storage/health" in paths
    assert "/api/storage/facilities" in paths
    assert "/api/storage/cost-estimate" in paths
    assert "/api/storage/requests" in paths
    assert "/api/storage/requests/my" in paths
'''


# ---------------------------------------------------------
# Backups
# ---------------------------------------------------------

backup_root = (
    ROOT /
    "backup-before-storage-network"
)

backup_root.mkdir(
    parents=True,
    exist_ok=True,
)

for rel in [
    "app/main.py",
    "app/models/__init__.py",
]:
    src = ROOT / rel

    if src.exists():
        dst = backup_root / rel
        dst.parent.mkdir(
            parents=True,
            exist_ok=True,
        )
        shutil.copy2(src, dst)


# ---------------------------------------------------------
# Write new files
# ---------------------------------------------------------

for rel, content in FILES.items():
    path = ROOT / rel

    if path.exists():
        raise RuntimeError(
            f"Refusing to overwrite existing file: {path}"
        )

    path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    path.write_text(
        content,
        encoding="utf-8",
        newline="\n",
    )

    print("CREATED:", rel)


# ---------------------------------------------------------
# Register models
# ---------------------------------------------------------

models_init = (
    ROOT /
    "app/models/__init__.py"
)

models_text = models_init.read_text(
    encoding="utf-8-sig"
)

storage_model_import = (
    "\nfrom .storage import "
    "StorageFacility, StorageRequest\n"
)

if "from .storage import" not in models_text:
    models_text = (
        models_text.rstrip()
        + storage_model_import
    )

    models_init.write_text(
        models_text,
        encoding="utf-8",
        newline="\n",
    )

    print(
        "UPDATED: app/models/__init__.py"
    )


# ---------------------------------------------------------
# Register router
# ---------------------------------------------------------

main_path = ROOT / "app/main.py"

main_text = main_path.read_text(
    encoding="utf-8-sig"
)

import_line = (
    "from app.api.routes.storage "
    "import router as storage_router"
)

if import_line not in main_text:
    marker = "app = FastAPI"

    index = main_text.find(marker)

    if index == -1:
        raise RuntimeError(
            "Could not find FastAPI app creation "
            "in app/main.py"
        )

    main_text = (
        main_text[:index]
        + import_line
        + "\n\n"
        + main_text[index:]
    )

if (
    "app.include_router(storage_router)"
    not in main_text
):
    main_text = (
        main_text.rstrip()
        + "\n\n"
        + "app.include_router(storage_router)\n"
    )

main_path.write_text(
    main_text,
    encoding="utf-8",
    newline="\n",
)

print("UPDATED: app/main.py")

print()
print(
    "AGRIVA STORAGE NETWORK BACKEND INSTALLED"
)
print(
    "Backup:",
    backup_root
)
