from pathlib import Path

page = Path(
    r"D:\AGRIVA\frontend\app\dashboard\farmer\weather\page.tsx"
)

text = page.read_text(
    encoding="utf-8-sig"
)

# Show only 5 forecast days
text = text.replace(
    "weather.forecast.map(",
    "weather.forecast.slice(0, 5).map("
)

# 5-card desktop layout
text = text.replace(
    "xl:grid-cols-7",
    "xl:grid-cols-5"
)

# Heading: 7-Day -> 5-Day
# Current UI renders this through t("forecast").
text = text.replace(
    '{t("forecast")}',
    '''{ui(
                      "5-Day Forecast",
                      "5-दिन का पूर्वानुमान"
                    )}'''
)

page.write_text(
    text,
    encoding="utf-8",
    newline="\n"
)

final = page.read_text(
    encoding="utf-8"
)

assert "weather.forecast.slice(0, 5).map(" in final
assert '"5-Day Forecast"' in final

print("WEATHER UPDATED ✅")
print("Heading: 5-Day Forecast")
print("Maximum forecast cards: 5")
