from pathlib import Path
import json
import re
import shutil

ROOT = Path(r"D:\AGRIVA\frontend")
PAGE = ROOT / "app" / "page.tsx"
LOCALES = ROOT / "locales"

BACKUP = Path(
    r"D:\AGRIVA\frontend_source_backups\before-home-store-complete-fix"
)
BACKUP.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------
# Proper translations for AGRIVA Store homepage
# ---------------------------------------------------------

TRANSLATIONS = {
    "store.title": {
        "en": "Farmer Store",
        "hi": "किसान स्टोर",
        "mr": "शेतकरी स्टोअर",
    },

    "store.subtitle": {
        "en": "Seeds, fertilizers, tools and farming essentials in one place.",
        "hi": "बीज, उर्वरक, कृषि उपकरण और खेती की आवश्यक सामग्री एक ही स्थान पर।",
        "mr": "बियाणे, खते, शेतीची साधने आणि आवश्यक कृषी साहित्य एकाच ठिकाणी.",
    },

    "store.seeds": {
        "en": "Quality Seeds",
        "hi": "गुणवत्तापूर्ण बीज",
        "mr": "दर्जेदार बियाणे",
    },

    "store.products": {
        "en": "Trusted agricultural products for better farming.",
        "hi": "बेहतर खेती के लिए भरोसेमंद कृषि उत्पाद।",
        "mr": "उत्तम शेतीसाठी विश्वासार्ह कृषी उत्पादने.",
    },

    "store.fertilizers": {
        "en": "Fertilizers",
        "hi": "उर्वरक",
        "mr": "खते",
    },

    "store.tools": {
        "en": "Farm Tools",
        "hi": "कृषि उपकरण",
        "mr": "शेतीची साधने",
    },

    "store.equipment": {
        "en": "Farm Equipment",
        "hi": "कृषि उपकरण",
        "mr": "कृषी उपकरणे",
    },

    "store.irrigation": {
        "en": "Irrigation",
        "hi": "सिंचाई",
        "mr": "सिंचन",
    },

    "store.cropProtection": {
        "en": "Crop Protection",
        "hi": "फसल सुरक्षा",
        "mr": "पीक संरक्षण",
    },

    "store.organic": {
        "en": "Organic Products",
        "hi": "जैविक उत्पाद",
        "mr": "सेंद्रिय उत्पादने",
    },

    "store.shopNow": {
        "en": "Visit Store",
        "hi": "स्टोर देखें",
        "mr": "स्टोअर पहा",
    },
}


# ---------------------------------------------------------
# Find every store.* key actually used on homepage
# ---------------------------------------------------------

page_text = PAGE.read_text(
    encoding="utf-8-sig"
)

used_keys = sorted(
    set(
        re.findall(
            r'''t\(\s*["'](store\.[^"']+)["']''',
            page_text
        )
    )
)

print("STORE KEYS USED ON HOMEPAGE:")
for key in used_keys:
    print(" -", key)

print()


def set_nested(data, key, value):
    parts = key.split(".")
    current = data

    for part in parts[:-1]:
        if (
            part not in current
            or not isinstance(current[part], dict)
        ):
            current[part] = {}

        current = current[part]

    current[parts[-1]] = value


def has_nested(data, key):
    current = data

    for part in key.split("."):
        if (
            not isinstance(current, dict)
            or part not in current
        ):
            return False

        current = current[part]

    return True


def humanize(key):
    value = key.split(".")[-1]

    value = re.sub(
        r'(?<!^)(?=[A-Z])',
        ' ',
        value
    )

    value = value.replace(
        "_",
        " "
    )

    return value.title()


for locale in ["en", "hi", "mr"]:

    path = LOCALES / f"{locale}.json"

    shutil.copy2(
        path,
        BACKUP / path.name
    )

    data = json.loads(
        path.read_text(
            encoding="utf-8-sig"
        )
    )

    print(f"=== {locale.upper()} ===")

    for key in used_keys:

        if has_nested(data, key):
            print("EXISTS :", key)
            continue

        if key in TRANSLATIONS:
            value = TRANSLATIONS[key][locale]

            set_nested(
                data,
                key,
                value
            )

            print(
                "ADDED  :",
                key,
                "=",
                value
            )

        else:
            # Safety fallback so next-intl does not crash.
            value = humanize(key)

            set_nested(
                data,
                key,
                value
            )

            print(
                "FALLBACK:",
                key,
                "=",
                value
            )

    path.write_text(
        json.dumps(
            data,
            ensure_ascii=False,
            indent=2
        ) + "\n",
        encoding="utf-8"
    )

    print()


# ---------------------------------------------------------
# FINAL VERIFY
# ---------------------------------------------------------

failed = False

for locale in ["en", "hi", "mr"]:

    data = json.loads(
        (LOCALES / f"{locale}.json")
        .read_text(
            encoding="utf-8-sig"
        )
    )

    missing = [
        key
        for key in used_keys
        if not has_nested(data, key)
    ]

    if missing:
        failed = True
        print(
            locale,
            "MISSING:",
            missing
        )


if failed:
    raise RuntimeError(
        "Some store translations are still missing."
    )


print("========================================")
print("HOMEPAGE STORE TRANSLATIONS COMPLETE ✅")
print("EN ✅")
print("HI ✅")
print("MR ✅")
print("========================================")
