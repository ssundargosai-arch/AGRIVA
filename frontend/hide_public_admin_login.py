from pathlib import Path
import re
import shutil

path = Path(r"D:\AGRIVA\frontend\app\login\page.tsx")

backup = Path(
    r"D:\AGRIVA\frontend_source_backups\login-page.before-hide-admin.tsx"
)

backup.parent.mkdir(
    parents=True,
    exist_ok=True
)

shutil.copy2(path, backup)

text = path.read_text(
    encoding="utf-8-sig"
)

original = text


# =========================================================
# 1. PUBLIC LOGIN ROLE TYPE: FARMER + BUYER ONLY
# =========================================================

text, count_role_type = re.subn(
    r'''type\s+LoginRole\s*=\s*
        \|\s*"FARMER"\s*
        \|\s*"BUYER"\s*
        \|\s*"ADMIN"\s*;
    ''',
    '''type LoginRole =
  | "FARMER"
  | "BUYER";''',
    text,
    count=1,
    flags=re.VERBOSE,
)

print(
    "LoginRole updated:",
    count_role_type == 1
)


# =========================================================
# 2. REMOVE ADMIN DEMO CREDENTIALS FROM PUBLIC FRONTEND
# =========================================================

text, count_admin_account = re.subn(
    r'''
        \n\s*ADMIN:\s*\{
        \s*email:\s*"admin@agriva\.demo",\s*
        password:\s*"Admin@123",\s*
        \},
    ''',
    "",
    text,
    count=1,
    flags=re.VERBOSE,
)

print(
    "Admin demo account removed:",
    count_admin_account == 1
)


# =========================================================
# 3. REMOVE ADMIN ROLE BUTTON
# =========================================================

admin_button_pattern = re.compile(
    r'''
        \n\s*
        <RoleButton
        \s+
        active=\{
            \s*selectedRole\s*===\s*"ADMIN"\s*
        \}
        .*?
        onClick=\{
            \(\)\s*=>\s*
            selectRole\(
                \s*"ADMIN"\s*
            \)
        \}
        \s*
        />
    ''',
    re.VERBOSE | re.DOTALL,
)

text, count_admin_button = (
    admin_button_pattern.subn(
        "",
        text,
        count=1
    )
)

print(
    "Admin role button removed:",
    count_admin_button == 1
)


# =========================================================
# 4. CHANGE PUBLIC ROLE DESCRIPTION
# =========================================================

old_sentence = (
    "Select Farmer, Buyer or Admin. "
    "For demo testing, the matching credentials "
    "are filled automatically."
)

new_sentence = (
    "Select Farmer or Buyer. "
    "For demo testing, the matching credentials "
    "are filled automatically."
)

if old_sentence in text:
    text = text.replace(
        old_sentence,
        new_sentence,
        1
    )

    print("Public role description updated: True")
else:
    print("Public role description updated: skipped")


# =========================================================
# 5. REMOVE UNUSED ShieldCheck IMPORT IF ADMIN BUTTON
#    WAS ITS ONLY USE
# =========================================================

if "<ShieldCheck" not in text:
    text = re.sub(
        r'(?m)^\s*ShieldCheck,\s*\r?\n',
        "",
        text,
        count=1
    )

    print("Unused ShieldCheck import cleaned")


# =========================================================
# SAFETY CHECKS
# =========================================================

if text == original:
    raise RuntimeError(
        "No changes were made. Stop."
    )

# These must disappear from PUBLIC role UI.
assert 'admin@agriva.demo' not in text
assert 'selectedRole === "ADMIN"' not in text
assert 'selectRole(\n                    "ADMIN"' not in text
assert "Select Farmer, Buyer or Admin." not in text

# IMPORTANT:
# Backend-authenticated ADMIN redirection must remain.
assert 'role === "ADMIN"' in text
assert '"/dashboard/admin"' in text


path.write_text(
    text,
    encoding="utf-8",
    newline="\n"
)

print()
print("PUBLIC ADMIN LOGIN HIDDEN ✅")
print("Farmer option: VISIBLE")
print("Buyer option: VISIBLE")
print("Admin role button: HIDDEN")
print("Admin demo credentials: REMOVED FROM PUBLIC PAGE")
print("Backend ADMIN redirect: PRESERVED")
print("Admin dashboard: PRESERVED")
print()
print("Backup:", backup)
