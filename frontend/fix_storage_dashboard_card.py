from pathlib import Path
import shutil

path = Path(
    r"D:\AGRIVA\frontend\app\dashboard\farmer\page.tsx"
)

backup = path.with_name(
    "page.before-storage-card-position-fix.tsx"
)

shutil.copy2(path, backup)

text = path.read_text(
    encoding="utf-8-sig"
)

lines = text.splitlines()

# --------------------------------------------------
# 1. Remove wrongly inserted Storage action card
#    wherever it currently exists
# --------------------------------------------------

cleaned = []

removed = 0

for line in lines:
    if (
        "icon: Store" in line
        and 't("storage")' in line
        and '/dashboard/farmer/storage' in line
    ):
        removed += 1
        continue

    cleaned.append(line)

lines = cleaned

print(
    "Wrong Storage card lines removed:",
    removed
)

# --------------------------------------------------
# 2. Find the REAL Weather action card
# --------------------------------------------------

target_index = None

for i, line in enumerate(lines):
    if (
        "icon: CloudSun" in line
        and 't("weatherAdvice")' in line
        and '/dashboard/farmer/weather' in line
    ):
        target_index = i
        break

if target_index is None:
    raise RuntimeError(
        "Could not find the real Weather action card."
    )

indent = (
    lines[target_index][
        :len(lines[target_index])
        - len(lines[target_index].lstrip())
    ]
)

storage_card = (
    indent
    + '{ icon: Store, '
    + 'title: t("storage"), '
    + 'desc: t("storageDesc"), '
    + 'onClick: () => '
    + 'router.push("/dashboard/farmer/storage") },'
)

lines.insert(
    target_index + 1,
    storage_card,
)

# --------------------------------------------------
# 3. Save
# --------------------------------------------------

path.write_text(
    "\n".join(lines) + "\n",
    encoding="utf-8",
    newline="\n",
)

print(
    "Storage card inserted after Weather action card."
)
print(
    "Backup:",
    backup
)
