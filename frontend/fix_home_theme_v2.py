from pathlib import Path
import shutil

path = Path(r"D:\AGRIVA\frontend\app\page.tsx")

backup = Path(
    r"D:\AGRIVA\frontend_source_backups\before-home-theme-v2.tsx"
)

shutil.copy2(path, backup)

text = path.read_text(
    encoding="utf-8-sig"
)

replacements = {
    'text-white md:text-6xl':
        'text-[var(--agriva-text)] md:text-6xl',

    'text-slate-300 md:text-lg':
        'text-[var(--agriva-text-muted)] md:text-lg',

    'text-slate-300':
        'text-[var(--agriva-text-muted)]',
}

changed = 0

for old, new in replacements.items():
    if old in text:
        text = text.replace(old, new)
        changed += 1

path.write_text(
    text,
    encoding="utf-8",
    newline="\n"
)

print("Homepage theme replacements:", changed)
print("HOME THEME PATCH COMPLETE ✅")
