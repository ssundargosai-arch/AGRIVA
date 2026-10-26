from pathlib import Path
import shutil

SOURCE = Path(r"D:\AGRIVA")
DEST = Path(r"D:\AGRIVA_FINAL_SUBMISSION\AGRIVA")

# ---------------------------------------------------------
# Directories that must never go into submission
# ---------------------------------------------------------

EXCLUDED_DIR_NAMES = {
    ".git",
    ".venv",
    "venv",
    "node_modules",
    ".next",
    "__pycache__",
    ".pytest_cache",
    ".mypy_cache",
    ".ruff_cache",
    ".idea",
    ".vscode",
    "htmlcov",
}

# ---------------------------------------------------------
# Exact sensitive/generated files
# ---------------------------------------------------------

EXCLUDED_FILE_NAMES = {
    ".env",
    ".env.local",
    ".env.development",
    ".env.production",
    ".env.test",
    ".coverage",
    "coverage.xml",
    "Thumbs.db",
    ".DS_Store",
}

# ---------------------------------------------------------
# Temporary root-level script prefixes
# ---------------------------------------------------------

TEMP_SCRIPT_PREFIXES = (
    "fix_",
    "install_",
    "patch_",
    "restore_",
    "debug_",
    "inspect_",
    "audit_",
)

ALLOWED_TOP_LEVEL = {
    "backend",
    "frontend",
}

def should_skip_dir(path: Path) -> bool:
    name = path.name.lower()

    if name in {x.lower() for x in EXCLUDED_DIR_NAMES}:
        return True

    # Old development backup folders
    if "backup" in name:
        return True

    if name == "frontend_source_backups":
        return True

    return False


def should_skip_file(path: Path, relative: Path) -> bool:
    name = path.name
    lower = name.lower()

    if name in EXCLUDED_FILE_NAMES:
        return True

    if lower.endswith((".pyc", ".pyo", ".log")):
        return True

    if ".before-" in lower:
        return True

    if lower.endswith(
        (
            ".backup",
            ".bak",
            ".old",
        )
    ):
        return True

    # Exclude temporary helper scripts only when they are
    # directly inside backend/ or frontend/.
    if (
        len(relative.parts) == 2
        and path.suffix.lower() == ".py"
        and lower.startswith(TEMP_SCRIPT_PREFIXES)
    ):
        return True

    return False


# ---------------------------------------------------------
# Fresh staging directory
# ---------------------------------------------------------

if DEST.exists():
    shutil.rmtree(DEST)

DEST.mkdir(
    parents=True,
    exist_ok=True
)


# ---------------------------------------------------------
# Copy backend + frontend
# ---------------------------------------------------------

copied_files = 0
skipped_files = 0

for top_name in ALLOWED_TOP_LEVEL:
    source_root = SOURCE / top_name
    dest_root = DEST / top_name

    if not source_root.exists():
        raise RuntimeError(
            f"Missing source directory: {source_root}"
        )

    for item in source_root.rglob("*"):
        relative_inside = item.relative_to(source_root)
        relative_project = Path(top_name) / relative_inside

        # Skip anything whose parent contains an excluded dir.
        if any(
            should_skip_dir(parent)
            for parent in item.parents
            if parent != source_root
            and parent != SOURCE
        ):
            continue

        if item.is_dir():
            if should_skip_dir(item):
                continue

            (dest_root / relative_inside).mkdir(
                parents=True,
                exist_ok=True
            )

            continue

        if should_skip_file(
            item,
            relative_project
        ):
            skipped_files += 1
            continue

        # -------------------------------------------------
        # PRIVATE BUYER VERIFICATION DOCUMENTS
        # -------------------------------------------------

        normalized = relative_project.as_posix().lower()

        if normalized.startswith(
            "backend/data/buyer_verification/"
        ):
            skipped_files += 1
            continue

        target = dest_root / relative_inside

        target.parent.mkdir(
            parents=True,
            exist_ok=True
        )

        shutil.copy2(
            item,
            target
        )

        copied_files += 1


print()
print("AGRIVA CLEAN STAGING CREATED ✅")
print("Destination:", DEST)
print("Copied files:", copied_files)
print("Excluded files:", skipped_files)
print()
print("LIVE PROJECT WAS NOT MODIFIED ✅")
