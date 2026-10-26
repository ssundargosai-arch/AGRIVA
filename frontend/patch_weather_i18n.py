from pathlib import Path
import json
import shutil

root = Path(r"D:\AGRIVA\frontend")
page = root / "app" / "dashboard" / "farmer" / "weather" / "page.tsx"

shutil.copy2(
    page,
    page.with_name("page.before-weather-i18n.tsx")
)

text = page.read_text(encoding="utf-8")

# Visible labels
replacements = {
    "5-Day Forecast": '{t("forecastTitle")}',
    "AGRIVA FORECAST": '{t("forecastEyebrow")}',
    "Plan irrigation, spraying and harvest with confidence.": '{t("forecastHint")}',
    "Agricultural Alerts": '{t("agriculturalAlerts")}',
    "SMART PROTECTION": '{t("smartProtection")}',
    "AGRIVA SMART FARM TIP": '{t("smartFarmTip")}',
    "Rain chance today": '{t("rainChanceToday")}',
}

for old, new in replacements.items():
    text = text.replace(old, new)

# Common card labels
text = text.replace(">Rain<", '>{t("rain")}<')
text = text.replace(">Rainfall<", '>{t("rainfall")}<')
text = text.replace(">Wind<", '>{t("wind")}<')

page.write_text(text, encoding="utf-8", newline="\n")

locale_values = {
    "en": {
        "forecastTitle": "7-Day Forecast",
        "forecastEyebrow": "AGRIVA FORECAST",
        "forecastHint": "Plan irrigation, spraying and harvest with confidence.",
        "agriculturalAlerts": "Agricultural Alerts",
        "smartProtection": "SMART PROTECTION",
        "smartFarmTip": "AGRIVA SMART FARM TIP",
        "rainChanceToday": "Rain chance today",
        "rain": "Rain",
        "rainfall": "Rainfall",
        "wind": "Wind",
    },
    "hi": {
        "forecastTitle": "7-दिन का मौसम पूर्वानुमान",
        "forecastEyebrow": "AGRIVA मौसम पूर्वानुमान",
        "forecastHint": "सिंचाई, छिड़काव और कटाई की योजना आत्मविश्वास से बनाएं।",
        "agriculturalAlerts": "कृषि चेतावनियाँ",
        "smartProtection": "स्मार्ट सुरक्षा",
        "smartFarmTip": "AGRIVA स्मार्ट खेती सुझाव",
        "rainChanceToday": "आज बारिश की संभावना",
        "rain": "बारिश",
        "rainfall": "वर्षा",
        "wind": "हवा",
    },
    "mr": {
        "forecastTitle": "7 दिवसांचा हवामान अंदाज",
        "forecastEyebrow": "AGRIVA हवामान अंदाज",
        "forecastHint": "सिंचन, फवारणी आणि कापणीचे नियोजन आत्मविश्वासाने करा.",
        "agriculturalAlerts": "कृषी सूचना",
        "smartProtection": "स्मार्ट संरक्षण",
        "smartFarmTip": "AGRIVA स्मार्ट शेती सल्ला",
        "rainChanceToday": "आज पावसाची शक्यता",
        "rain": "पाऊस",
        "rainfall": "पर्जन्यमान",
        "wind": "वारा",
    },
}

for locale, values in locale_values.items():
    p = root / "locales" / f"{locale}.json"

    with p.open("r", encoding="utf-8-sig") as f:
        data = json.load(f)

    section = data.setdefault("weatherPage", {})
    section.update(values)

    with p.open("w", encoding="utf-8", newline="\n") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")

print("WEATHER 7-DAY + I18N PATCH COMPLETE")
