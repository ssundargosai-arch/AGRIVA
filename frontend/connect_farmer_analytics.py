from pathlib import Path
import json
import shutil

root = Path(r"D:\AGRIVA\frontend")
page = root / "app" / "dashboard" / "farmer" / "page.tsx"

shutil.copy2(
    page,
    page.with_name("page.before-analytics-connect.tsx")
)

text = page.read_text(encoding="utf-8")

old = '''    { icon: TrendingUp, title: t("expectedPrice"), desc: t("expectedPriceDesc"), onClick: () => router.push("/dashboard/farmer/price") },'''

new = '''    { icon: TrendingUp, title: t("expectedPrice"), desc: t("expectedPriceDesc"), onClick: () => router.push("/dashboard/farmer/price") },
    { icon: BarChart3, title: t("analytics"), desc: t("analyticsDesc"), onClick: () => router.push("/dashboard/farmer/analytics") },'''

if old not in text:
    raise RuntimeError("Expected actionCards line not found. No changes made.")

text = text.replace(old, new, 1)

# Add icon import beside TrendingUp
if "BarChart3," not in text:
    text = text.replace(
        "  TrendingUp,",
        "  TrendingUp,\n  BarChart3,"
    )

page.write_text(
    text,
    encoding="utf-8",
    newline="\n"
)

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

    # Dashboard currently uses root translation keys
    data.update(values)

    with path.open("w", encoding="utf-8", newline="\n") as f:
        json.dump(
            data,
            f,
            ensure_ascii=False,
            indent=2
        )
        f.write("\n")

print("FARMER DASHBOARD -> ANALYTICS CONNECTED")
