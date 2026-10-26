from pathlib import Path
from datetime import datetime
import re
import shutil

target = Path(
    r"D:\AGRIVA\backend\app\api\price_prediction.py"
)

if not target.exists():
    raise SystemExit(
        f"Missing file: {target}"
    )

stamp = datetime.now().strftime(
    "%Y%m%d-%H%M%S"
)

backup = target.with_name(
    f"price_prediction.py.before-phase6c-persistence-{stamp}"
)

shutil.copy2(
    target,
    backup,
)

text = target.read_text(
    encoding="utf-8-sig"
)

original = text


# =========================================================
# 1. IMPORT price_to_per_kg
# =========================================================

import_line = (
    "from app.services.price_units "
    "import price_to_per_kg\n"
)

if import_line not in text:

    pattern = re.compile(
        r"(from app\.services\.price_prediction import \(\s*"
        r"calculate_price_prediction,\s*"
        r"\)\s*\n)"
    )

    match = pattern.search(text)

    if not match:
        raise SystemExit(
            "Could not locate "
            "price_prediction service import."
        )

    text = (
        text[:match.end()]
        + import_line
        + text[match.end():]
    )


# =========================================================
# 2. CONVERT SERVICE PRICES BEFORE DB STORAGE
# =========================================================

if "phase6c_current_price_per_kg" not in text:

    marker = (
        "    prediction = PricePrediction(\n"
    )

    if marker not in text:
        raise SystemExit(
            "Could not locate "
            "prediction = PricePrediction(...)."
        )

    conversion_block = '''    # Phase 6C price-unit safety.
    # Service response prices follow result["unit"].
    # Database *_per_kg columns must always store INR/kg.
    try:
        phase6c_current_price_per_kg = price_to_per_kg(
            result["current_price"],
            result.get("unit"),
        )

        phase6c_predicted_price_per_kg = price_to_per_kg(
            result["predicted_price"],
            result.get("unit"),
        )

        phase6c_expected_min_per_kg = price_to_per_kg(
            result["expected_range_min"],
            result.get("unit"),
        )

        phase6c_expected_max_per_kg = price_to_per_kg(
            result["expected_range_max"],
            result.get("unit"),
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail=str(exc),
        ) from exc

'''

    text = text.replace(
        marker,
        conversion_block + marker,
        1,
    )


# =========================================================
# 3. PATCH DATABASE PERSISTENCE
# =========================================================

persistence_rules = [
    (
        r'''current_price_per_kg\s*=\s*result\[\s*
        ["']current_price["']\s*
        \]\s*,''',
        '''current_price_per_kg=(
            phase6c_current_price_per_kg
        ),''',
        "current_price_per_kg",
    ),
    (
        r'''predicted_price_per_kg\s*=\s*result\[\s*
        ["']predicted_price["']\s*
        \]\s*,''',
        '''predicted_price_per_kg=(
            phase6c_predicted_price_per_kg
        ),''',
        "predicted_price_per_kg",
    ),
    (
        r'''expected_min_price\s*=\s*result\[\s*
        ["']expected_range_min["']\s*
        \]\s*,''',
        '''expected_min_price=(
            phase6c_expected_min_per_kg
        ),''',
        "expected_min_price",
    ),
    (
        r'''expected_max_price\s*=\s*result\[\s*
        ["']expected_range_max["']\s*
        \]\s*,''',
        '''expected_max_price=(
            phase6c_expected_max_per_kg
        ),''',
        "expected_max_price",
    ),
]

for pattern, replacement, label in persistence_rules:

    updated, count = re.subn(
        pattern,
        replacement,
        text,
        count=1,
        flags=re.VERBOSE,
    )

    if count:
        text = updated

    elif replacement not in text:
        raise SystemExit(
            f"Could not patch persistence field: {label}"
        )


# =========================================================
# 4. KEEP PUBLIC API RESPONSE IN ORIGINAL SERVICE UNIT
#
# Important:
# DB stores INR/kg.
# Existing Price Prediction frontend should still receive
# result values in result["unit"] (normally INR/quintal).
# =========================================================

response_rules = [
    (
        r'''        current_price=\(\s*
        prediction\.current_price_per_kg\s*
        if\s+prediction\.current_price_per_kg\s*
        is\s+not\s+None\s*
        else\s+result\[\s*
        ["']current_price["']\s*
        \]\s*
        \),''',
        '''        current_price=result["current_price"],''',
        "response current_price",
    ),
    (
        r'''        predicted_price=\(\s*
        prediction\.predicted_price_per_kg\s*
        \),''',
        '''        predicted_price=result["predicted_price"],''',
        "response predicted_price",
    ),
    (
        r'''        expected_range_min=\(\s*
        prediction\.expected_min_price\s*
        if\s+prediction\.expected_min_price\s*
        is\s+not\s+None\s*
        else\s+result\[\s*
        ["']expected_range_min["']\s*
        \]\s*
        \),''',
        '''        expected_range_min=result["expected_range_min"],''',
        "response expected_range_min",
    ),
    (
        r'''        expected_range_max=\(\s*
        prediction\.expected_max_price\s*
        if\s+prediction\.expected_max_price\s*
        is\s+not\s+None\s*
        else\s+result\[\s*
        ["']expected_range_max["']\s*
        \]\s*
        \),''',
        '''        expected_range_max=result["expected_range_max"],''',
        "response expected_range_max",
    ),
]

for pattern, replacement, label in response_rules:

    updated, count = re.subn(
        pattern,
        replacement,
        text,
        count=1,
        flags=re.VERBOSE,
    )

    if count:
        text = updated

    elif replacement not in text:
        raise SystemExit(
            f"Could not patch {label}"
        )


# =========================================================
# 5. FINAL SAFETY CHECKS
# =========================================================

required = [
    "from app.services.price_units import price_to_per_kg",
    "phase6c_current_price_per_kg",
    "phase6c_predicted_price_per_kg",
    "phase6c_expected_min_per_kg",
    "phase6c_expected_max_per_kg",
]

for value in required:
    if value not in text:
        raise SystemExit(
            f"Safety check failed: missing {value}"
        )


target.write_text(
    text,
    encoding="utf-8",
)

print()
print("Phase 6C persistence patch applied.")
print(f"Backup: {backup}")
print(f"Updated: {target}")
