from pathlib import Path
import shutil

path = Path(
    r"D:\AGRIVA\frontend\app\dashboard\farmer\weather\page.tsx"
)

backup = Path(
    r"D:\AGRIVA\frontend_source_backups\weather_page.before-5-day-fix.tsx"
)

backup.parent.mkdir(
    parents=True,
    exist_ok=True,
)

shutil.copy2(
    path,
    backup,
)

text = path.read_text(
    encoding="utf-8-sig"
)

old_map = "weather.forecast.map("
new_map = "weather.forecast.slice(0, 5).map("

if old_map not in text:
    if new_map in text:
        print(
            "SKIP: 5-day slice already present"
        )
    else:
        raise RuntimeError(
            "Forecast map anchor not found."
        )
else:
    text = text.replace(
        old_map,
        new_map,
        1,
    )

old_grid = (
    "sm:grid-cols-2 "
    "lg:grid-cols-4 "
    "xl:grid-cols-7"
)

new_grid = (
    "sm:grid-cols-2 "
    "lg:grid-cols-3 "
    "xl:grid-cols-5"
)

if old_grid in text:
    text = text.replace(
        old_grid,
        new_grid,
        1,
    )

path.write_text(
    text,
    encoding="utf-8",
    newline="\n",
)

final = path.read_text(
    encoding="utf-8"
)

assert (
    "weather.forecast.slice(0, 5).map("
    in final
)

print(
    "WEATHER 5-DAY FIX COMPLETE"
)

print(
    "Forecast cards limited to: 5"
)

print(
    "Backend weather data changed: NO"
)

print(
    "Backup:",
    backup,
)
