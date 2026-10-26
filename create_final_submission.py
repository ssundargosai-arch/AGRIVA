from pathlib import Path
import shutil

source = Path(r"D:\AGRIVA")
dest = Path(r"D:\AGRIVA_FINAL_SUBMISSION")

if dest.exists():
    shutil.rmtree(dest)

dest.mkdir(parents=True)

IGNORE_DIRS = {
    ".venv",
    "venv",
    "node_modules",
    ".next",
    "__pycache__",
    ".pytest_cache",
    ".git",
    ".idea",
    ".vscode",
}

SECRET_FILES = {
    ".env",
    ".env.local",
    ".env.production",
    ".env.development",
}

TEMP_PREFIXES = (
    "fix_",
    "patch_",
    "repair_",
)

TEMP_CONTAINS = (
    ".before-",
    ".corrupted-",
)

def ignore(folder, names):
    ignored = []

    folder_path = Path(folder)

    for name in names:
        p = folder_path / name

        if name in IGNORE_DIRS:
            ignored.append(name)
            continue

        if name in SECRET_FILES:
            ignored.append(name)
            continue

        if any(x in name for x in TEMP_CONTAINS):
            ignored.append(name)
            continue

        # Remove temporary patch scripts only from project roots
        relative = folder_path.relative_to(source)

        if len(relative.parts) <= 1:
            if name.endswith(".py") and name.startswith(TEMP_PREFIXES):
                ignored.append(name)

    return ignored


for project in ("backend", "frontend"):
    src = source / project
    dst = dest / project

    shutil.copytree(
        src,
        dst,
        ignore=ignore,
    )

print("FINAL SUBMISSION COPY CREATED")
print(dest)
