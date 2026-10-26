from pathlib import Path
import json

root = Path(r"D:\AGRIVA\frontend")

titles = {
    "en": "7-Day Forecast",
    "hi": "7-दिन का मौसम पूर्वानुमान",
    "mr": "7 दिवसांचा हवामान अंदाज",
}

for locale, title in titles.items():
    path = root / "locales" / f"{locale}.json"

    with path.open("r", encoding="utf-8-sig") as f:
        data = json.load(f)

    if "weatherPage" not in data:
        raise RuntimeError(
            f"weatherPage namespace missing in {locale}.json"
        )

    data["weatherPage"]["forecast"] = title

    with path.open("w", encoding="utf-8", newline="\n") as f:
        json.dump(
            data,
            f,
            ensure_ascii=False,
            indent=2,
        )
        f.write("\n")

    print(locale, "->", data["weatherPage"]["forecast"])

print("7-DAY FORECAST LOCALES FIXED")
