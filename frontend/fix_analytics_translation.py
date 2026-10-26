from pathlib import Path
import json
import shutil

ROOT = Path(r"D:\AGRIVA\frontend")
LOCALES = ROOT / "locales"

values = {
    "en": {
        "title": "Farm Analytics"
    },
    "hi": {
        "title": "कृषि विश्लेषण"
    },
    "mr": {
        "title": "शेती विश्लेषण"
    }
}

backup = Path(
    r"D:\AGRIVA\frontend_source_backups\before-analytics-translation-fix"
)

backup.mkdir(
    parents=True,
    exist_ok=True
)

for locale, translation in values.items():
    path = LOCALES / f"{locale}.json"

    if not path.exists():
        raise RuntimeError(
            f"Missing locale file: {path}"
        )

    shutil.copy2(
        path,
        backup / path.name
    )

    data = json.loads(
        path.read_text(
            encoding="utf-8-sig"
        )
    )

    analytics = data.get("analytics")

    if not isinstance(analytics, dict):
        analytics = {}

    analytics["title"] = translation["title"]

    data["analytics"] = analytics

    path.write_text(
        json.dumps(
            data,
            ensure_ascii=False,
            indent=2
        ) + "\n",
        encoding="utf-8"
    )

    print(
        f"{locale.upper()} analytics.title = "
        f"{translation['title']}"
    )

print()
print("ANALYTICS TRANSLATION FIX COMPLETE ✅")
