from pathlib import Path
import json

root = Path(r"D:\AGRIVA\frontend")

translations = {
    "en": {
        "analytics": "Farm Analytics",
        "analyticsDesc": "View income, profit, sales and crop performance.",
    },
    "hi": {
        "analytics": "खेती विश्लेषण",
        "analyticsDesc": "आय, लाभ, बिक्री और फसल प्रदर्शन देखें।",
    },
    "mr": {
        "analytics": "शेती विश्लेषण",
        "analyticsDesc": "उत्पन्न, नफा, विक्री आणि पीक कामगिरी पहा.",
    },
}

for locale, values in translations.items():
    path = root / "locales" / f"{locale}.json"

    with path.open("r", encoding="utf-8-sig") as f:
        data = json.load(f)

    if "phase2Dashboard" not in data:
        raise RuntimeError(
            f"phase2Dashboard namespace missing in {locale}.json"
        )

    data["phase2Dashboard"].update(values)

    # Remove accidentally-added root keys
    data.pop("analytics", None)
    data.pop("analyticsDesc", None)

    with path.open("w", encoding="utf-8", newline="\n") as f:
        json.dump(
            data,
            f,
            ensure_ascii=False,
            indent=2
        )
        f.write("\n")

    print(locale, "phase2Dashboard analytics keys added")

print("DASHBOARD ANALYTICS TRANSLATION FIXED")
