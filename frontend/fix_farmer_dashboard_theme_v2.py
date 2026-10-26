from pathlib import Path
import shutil

path = Path(
    r"D:\AGRIVA\frontend\app\dashboard\farmer\page.tsx"
)

backup = Path(
    r"D:\AGRIVA\frontend_source_backups\before-farmer-theme-v2.tsx"
)

shutil.copy2(path, backup)

text = path.read_text(
    encoding="utf-8-sig"
)

replacements = {
    'text-[#0F172A]':
        'text-[var(--agriva-text)]',

    'text-[#334155]':
        'text-[var(--agriva-text-muted)]',

    'border-[#D7E3DA]':
        'border-[var(--agriva-border)]',
}

count = 0

for old, new in replacements.items():
    occurrences = text.count(old)

    if occurrences:
        text = text.replace(old, new)
        count += occurrences

path.write_text(
    text,
    encoding="utf-8",
    newline="\n"
)

print("Farmer dashboard replacements:", count)
print("FARMER DASHBOARD THEME PATCH COMPLETE ✅")
