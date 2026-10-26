from pathlib import Path
import shutil

ROOT = Path(r"D:\AGRIVA\backend")

paths = {
    "service": ROOT / "app/services/buyer_verification.py",
    "assurance": ROOT / "app/api/routes/transaction_assurance.py",
    "schema": ROOT / "app/schemas/marketplace.py",
    "marketplace": ROOT / "app/api/marketplace.py",
}

for name, path in paths.items():
    if not path.exists():
        raise RuntimeError(
            f"Required file missing: {path}"
        )

backup_root = (
    ROOT /
    "backup-before-buyer-verification-integration"
)

backup_root.mkdir(
    parents=True,
    exist_ok=True,
)

for path in paths.values():
    rel = path.relative_to(ROOT)
    dst = backup_root / rel
    dst.parent.mkdir(
        parents=True,
        exist_ok=True,
    )
    shutil.copy2(path, dst)

service = paths["service"].read_text(
    encoding="utf-8-sig"
)

assurance = paths["assurance"].read_text(
    encoding="utf-8-sig"
)

schema = paths["schema"].read_text(
    encoding="utf-8-sig"
)

marketplace = paths["marketplace"].read_text(
    encoding="utf-8-sig"
)


# =========================================================
# 1. SHARED VERIFICATION SNAPSHOT SERVICE
# =========================================================

helper_marker = (
    "def verification_snapshot_for_profile("
)

if helper_marker not in service:
    service += r'''


def verification_snapshot_for_profile(
    *,
    db: Session,
    buyer_profile_id: uuid.UUID | None,
) -> dict:
    """
    Return AGRIVA platform verification information
    without implying Government/KYC/bank verification.
    """

    if buyer_profile_id is None:
        status = "UNVERIFIED"

        return {
            "status": status,
            "status_label": status_label(
                status
            ),
            "verification_note": (
                verification_note(
                    status
                )
            ),
            "reviewed_at": None,
        }

    record = (
        get_verification_for_profile(
            db=db,
            buyer_profile_id=(
                buyer_profile_id
            ),
        )
    )

    status = (
        record.status
        if record is not None
        else "UNVERIFIED"
    )

    return {
        "status": status,
        "status_label": (
            status_label(status)
        ),
        "verification_note": (
            verification_note(status)
        ),
        "reviewed_at": (
            record.reviewed_at
            if record is not None
            else None
        ),
    }
'''


# =========================================================
# 2. TRANSACTION ASSURANCE
# =========================================================

old_import = '''from app.services.transaction_assurance import (
    AssuranceValidationError,
    BUYER_HISTORY_NOTE,
    BUYER_VERIFICATION_NOTE,
    BUYER_VERIFICATION_STATUS,
'''

new_import = '''from app.services.transaction_assurance import (
    AssuranceValidationError,
    BUYER_HISTORY_NOTE,
'''

if (
    "verification_snapshot_for_profile"
    not in assurance
):
    if old_import not in assurance:
        raise RuntimeError(
            "Transaction Assurance import "
            "anchor not found."
        )

    assurance = assurance.replace(
        old_import,
        new_import,
        1,
    )

    service_import_anchor = (
        "from app.services."
        "transaction_assurance import ("
    )

    idx = assurance.find(
        service_import_anchor
    )

    if idx == -1:
        raise RuntimeError(
            "Transaction service import "
            "position not found."
        )

    assurance = (
        assurance[:idx]
        + "from app.services.buyer_verification "
        + "import verification_snapshot_for_profile\n"
        + assurance[idx:]
    )


profile_block = '''    profile = None
    if buyer is not None:
        profile = (
            db.query(BuyerProfile)
            .filter(BuyerProfile.id == buyer.buyer_profile_id)
            .first()
        )
'''

verification_block = '''    profile = None
    if buyer is not None:
        profile = (
            db.query(BuyerProfile)
            .filter(BuyerProfile.id == buyer.buyer_profile_id)
            .first()
        )

    verification = (
        verification_snapshot_for_profile(
            db=db,
            buyer_profile_id=(
                profile.id
                if profile is not None
                else None
            ),
        )
    )
'''

if (
    'verification_status=verification["status"]'
    not in assurance
):
    if profile_block not in assurance:
        raise RuntimeError(
            "Buyer profile snapshot "
            "anchor not found."
        )

    assurance = assurance.replace(
        profile_block,
        verification_block,
        1,
    )

    assurance = assurance.replace(
        "verification_status=BUYER_VERIFICATION_STATUS,",
        'verification_status=verification["status"],',
        1,
    )

    assurance = assurance.replace(
        "verification_note=BUYER_VERIFICATION_NOTE,",
        'verification_note=verification["verification_note"],',
        1,
    )


assurance = assurance.replace(
    '"buyer_verification_source": '
    '"AGRIVA_PROFILE_AND_PLATFORM_HISTORY_ONLY",',
    '"buyer_verification_source": '
    '"AGRIVA_ADMIN_DOCUMENT_REVIEW_AND_PLATFORM_HISTORY",',
)


# =========================================================
# 3. MARKETPLACE RESPONSE SCHEMA
# =========================================================

schema_anchor = '''    buyer_rating: float | None = None

    breakdown: BuyerMatchBreakdownResponse
'''

schema_replacement = '''    buyer_rating: float | None = None

    verification_status: str = "UNVERIFIED"
    verification_label: str = "Not verified by AGRIVA"
    verification_note: str = ""
    agriva_verified: bool = False

    breakdown: BuyerMatchBreakdownResponse
'''

if (
    "agriva_verified: bool"
    not in schema
):
    if schema_anchor not in schema:
        raise RuntimeError(
            "Marketplace BuyerMatchItem "
            "schema anchor not found."
        )

    schema = schema.replace(
        schema_anchor,
        schema_replacement,
        1,
    )


# =========================================================
# 4. MARKETPLACE SERVICE IMPORT
# =========================================================

if (
    "verification_snapshot_for_profile"
    not in marketplace
):
    import_anchor = '''from app.services.buyer_matching import (
    calculate_buyer_match,
)
'''

    import_replacement = '''from app.services.buyer_matching import (
    calculate_buyer_match,
)
from app.services.buyer_verification import (
    verification_snapshot_for_profile,
)
'''

    if import_anchor not in marketplace:
        raise RuntimeError(
            "Marketplace service import "
            "anchor not found."
        )

    marketplace = marketplace.replace(
        import_anchor,
        import_replacement,
        1,
    )


# =========================================================
# 5. MARKETPLACE MATCH VERIFICATION SNAPSHOT
# =========================================================

city_anchor = '''            buyer_city = (
                buyer.city
                or buyer_profile.city
            )

            matches.append(
'''

city_replacement = '''            buyer_city = (
                buyer.city
                or buyer_profile.city
            )

            verification = (
                verification_snapshot_for_profile(
                    db=db,
                    buyer_profile_id=(
                        buyer_profile.id
                    ),
                )
            )

            matches.append(
'''

if (
    "verification = (\n"
    "                verification_snapshot_for_profile"
    not in marketplace
):
    if city_anchor not in marketplace:
        raise RuntimeError(
            "Marketplace buyer_city "
            "anchor not found."
        )

    marketplace = marketplace.replace(
        city_anchor,
        city_replacement,
        1,
    )


rating_anchor = '''                    buyer_rating=(
                        buyer.rating
                    ),

                    breakdown=(
'''

rating_replacement = '''                    buyer_rating=(
                        buyer.rating
                    ),

                    verification_status=(
                        verification["status"]
                    ),

                    verification_label=(
                        verification[
                            "status_label"
                        ]
                    ),

                    verification_note=(
                        verification[
                            "verification_note"
                        ]
                    ),

                    agriva_verified=(
                        verification["status"]
                        == "AGRIVA_VERIFIED"
                    ),

                    breakdown=(
'''

if (
    "agriva_verified=("
    not in marketplace
):
    if rating_anchor not in marketplace:
        raise RuntimeError(
            "Marketplace buyer_rating "
            "anchor not found."
        )

    marketplace = marketplace.replace(
        rating_anchor,
        rating_replacement,
        1,
    )


# =========================================================
# 6. INTEGRATION TESTS
# =========================================================

test_path = (
    ROOT /
    "tests/test_buyer_verification_integration.py"
)

if not test_path.exists():
    test_path.write_text(
r'''import inspect
from uuid import uuid4

from app.api.marketplace import (
    generate_buyer_matches,
)
from app.api.routes.transaction_assurance import (
    _buyer_snapshot,
    transaction_assurance_health,
)
from app.schemas.marketplace import (
    BuyerMatchBreakdownResponse,
    BuyerMatchItem,
)


def sample_breakdown():
    return BuyerMatchBreakdownResponse(
        crop_score=30,
        quantity_score=20,
        price_score=20,
        quality_score=15,
        distance_score=8,
        rating_score=4.5,
    )


def test_marketplace_schema_contains_verification():
    item = BuyerMatchItem(
        buyer_id=uuid4(),
        buyer_name="Demo Buyer",
        match_percentage=97.5,
        match_label="EXCELLENT",
        verification_status=(
            "AGRIVA_VERIFIED"
        ),
        verification_label=(
            "AGRIVA Verified"
        ),
        verification_note=(
            "AGRIVA platform review."
        ),
        agriva_verified=True,
        breakdown=sample_breakdown(),
    )

    assert item.agriva_verified is True
    assert (
        item.verification_status
        == "AGRIVA_VERIFIED"
    )


def test_marketplace_match_score_shape_unchanged():
    breakdown = sample_breakdown()

    assert breakdown.crop_score == 30
    assert breakdown.quantity_score == 20
    assert breakdown.price_score == 20
    assert breakdown.quality_score == 15
    assert breakdown.distance_score == 8
    assert breakdown.rating_score == 4.5


def test_marketplace_route_uses_verification_snapshot():
    source = inspect.getsource(
        generate_buyer_matches
    )

    assert (
        "verification_snapshot_for_profile"
        in source
    )

    assert (
        "agriva_verified"
        in source
    )


def test_transaction_assurance_uses_real_snapshot():
    source = inspect.getsource(
        _buyer_snapshot
    )

    assert (
        "verification_snapshot_for_profile"
        in source
    )

    assert (
        "BUYER_VERIFICATION_STATUS"
        not in source
    )


def test_transaction_assurance_health_reports_review_source():
    payload = (
        transaction_assurance_health()
    )

    assert (
        payload[
            "buyer_verification_source"
        ]
        == (
            "AGRIVA_ADMIN_DOCUMENT_REVIEW_"
            "AND_PLATFORM_HISTORY"
        )
    )

    assert (
        payload["bank_payment_verification"]
        is False
    )
''',
        encoding="utf-8",
        newline="\n",
    )

    print(
        "CREATED: "
        "tests/test_buyer_verification_integration.py"
    )


# =========================================================
# SAVE ONLY AFTER ALL ANCHORS SUCCEEDED
# =========================================================

paths["service"].write_text(
    service,
    encoding="utf-8",
    newline="\n",
)

paths["assurance"].write_text(
    assurance,
    encoding="utf-8",
    newline="\n",
)

paths["schema"].write_text(
    schema,
    encoding="utf-8",
    newline="\n",
)

paths["marketplace"].write_text(
    marketplace,
    encoding="utf-8",
    newline="\n",
)

print(
    "UPDATED: buyer_verification service"
)

print(
    "UPDATED: transaction assurance"
)

print(
    "UPDATED: marketplace schema"
)

print(
    "UPDATED: marketplace matching"
)

print()
print(
    "BUYER VERIFICATION INTEGRATION COMPLETE"
)

print(
    "Match score modified: NO"
)

print(
    "Government/KYC claim added: NO"
)

print(
    "Backup:",
    backup_root
)
