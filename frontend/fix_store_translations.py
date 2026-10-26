from pathlib import Path
import json
import shutil

root = Path(r"D:\AGRIVA\frontend\locales")

translations = {
    "en": {
        "title": "Farmer Store",
        "subtitle": "Buy farming essentials and agricultural supplies."
    },
    "hi": {
        "title": "किसान स्टोर",
        "subtitle": "खेती के लिए आवश्यक सामान और कृषि सामग्री खरीदें।"
    },
    "mr": {
        "title": "शेतकरी स्टोअर",
        "subtitle": "शेतीसाठी आवश्यक वस्तू आणि कृषी साहित्य खरेदी करा."
    }
}

backup_root = Path(
    r"D:\AGRIVA\frontend_source_backups\before-store-translation-fix"
)

backup_root.mkdir(
    parents=True,
    exist_ok=True
)

for locale, values in translations.items():
    path = root / f"{locale}.json"

    if not path.exists():
        raise RuntimeError(
            f"Locale file missing: {path}"
        )

    shutil.copy2(
        path,
        backup_root / path.name
    )

    data = json.loads(
        path.read_text(
            encoding="utf-8-sig"
        )
    )

    store = data.get("store")

    if not isinstance(store, dict):
        store = {}

    store["title"] = values["title"]
    store["subtitle"] = values["subtitle"]

    data["store"] = store

    path.write_text(
        json.dumps(
            data,
            ensure_ascii=False,
            indent=2
        ) + "\n",
        encoding="utf-8"
    )

    print(
        f"{locale.upper()} store translations fixed ✅"
    )

print()
print("STORE TRANSLATION FIX COMPLETE ✅")
