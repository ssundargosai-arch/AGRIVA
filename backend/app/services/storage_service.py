from uuid import UUID

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
