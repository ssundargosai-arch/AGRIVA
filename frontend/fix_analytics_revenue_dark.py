from pathlib import Path
import shutil

path = Path(
    r"D:\AGRIVA\frontend\app\dashboard\farmer\analytics\page.tsx"
)

backup = Path(
    r"D:\AGRIVA\frontend_source_backups\analytics.before-revenue-dark-fix.tsx"
)

shutil.copy2(path, backup)

text = path.read_text(
    encoding="utf-8-sig"
)

old = (
    '"border-emerald-300 bg-gradient-to-br '
    'from-emerald-50 via-white to-white"'
)

new = (
    '"border-emerald-300 bg-gradient-to-br '
    'from-emerald-50 via-white to-white '
    'dark:border-emerald-800 '
    'dark:from-[#0D2A1E] '
    'dark:via-[#0B2118] '
    'dark:to-[#0B2118]"'
)

if old not in text:
    raise RuntimeError(
        "Analytics emphasis card class not found. "
        "No file changed."
    )

text = text.replace(
    old,
    new,
    1
)

path.write_text(
    text,
    encoding="utf-8",
    newline="\n"
)

print("TOTAL REVENUE DARK CARD FIXED ✅")
print("Backup:", backup)
