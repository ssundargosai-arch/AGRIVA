from pathlib import Path
import re
import shutil

path = Path(
    r"D:\AGRIVA\frontend\app\login\page.tsx"
)

backup = Path(
    r"D:\AGRIVA\frontend_source_backups\login-page.before-admin-tail-fix.tsx"
)

backup.parent.mkdir(
    parents=True,
    exist_ok=True
)

shutil.copy2(path, backup)

text = path.read_text(
    encoding="utf-8-sig"
)

pattern = re.compile(
    r'''
        \n[ \t]*\}
        [ \t]*\n
        [ \t]*onClick=\{\(\)\s*=>\s*
        selectRole\(
        \s*"ADMIN"\s*
        \)
        \s*\}
        \s*
        />
    ''',
    re.VERBOSE
)

text, count = pattern.subn(
    "",
    text,
    count=1
)

if count != 1:
    raise RuntimeError(
        f"Broken Admin tail expected 1 time, found {count}."
    )

# Public Admin UI must be gone.
assert 'admin@agriva.demo' not in text
assert 'selectedRole === "ADMIN"' not in text
assert '"Admin Login"' not in text
assert re.search(
    r'selectRole\(\s*"ADMIN"\s*\)',
    text
) is None

# Authenticated backend role redirect MUST stay.
assert 'role === "ADMIN"' in text
assert '"/dashboard/admin"' in text

path.write_text(
    text,
    encoding="utf-8",
    newline="\n"
)

print("BROKEN ADMIN BUTTON TAIL REMOVED ✅")
print("Public Admin option: HIDDEN")
print("Admin backend redirect: PRESERVED")
print("Backup:", backup)
