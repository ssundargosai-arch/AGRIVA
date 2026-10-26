from pathlib import Path
import shutil
import re

path = Path(
    r"D:\AGRIVA\frontend\app\login\page.tsx"
)

backup = Path(
    r"D:\AGRIVA\frontend_source_backups\login-page.before-hide-admin-final.tsx"
)

backup.parent.mkdir(
    parents=True,
    exist_ok=True
)

shutil.copy2(path, backup)

text = path.read_text(
    encoding="utf-8-sig"
)


# =========================================================
# 1. REMOVE ADMIN ROLE BUTTON
# =========================================================

admin_anchor = re.search(
    r'selectedRole\s*===\s*"ADMIN"',
    text
)

if not admin_anchor:
    # multiline formatting
    admin_anchor = re.search(
        r'selectedRole\s*===\s*\n\s*"ADMIN"',
        text
    )

if admin_anchor:
    start = text.rfind(
        "<RoleButton",
        0,
        admin_anchor.start()
    )

    end = text.find(
        "/>",
        admin_anchor.end()
    )

    if start == -1 or end == -1:
        raise RuntimeError(
            "Admin RoleButton boundaries not found."
        )

    end += 2

    text = (
        text[:start]
        + text[end:]
    )

    print("REMOVED: Admin role button")
else:
    print("SKIP: Admin role button already absent")


# =========================================================
# 2. PUBLIC ROLE TYPE = FARMER + BUYER
# =========================================================

text = re.sub(
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
    flags=re.VERBOSE
)


# =========================================================
# 3. REMOVE PUBLIC ADMIN DEMO CREDENTIALS
# =========================================================

text = re.sub(
    r'''
        \n\s*ADMIN:\s*\{
        \s*email:\s*"admin@agriva\.demo",\s*
        password:\s*"Admin@123",\s*
        \},
    ''',
    "",
    text,
    count=1,
    flags=re.VERBOSE
)


# =========================================================
# 4. CHANGE PUBLIC DESCRIPTION
# =========================================================

text = text.replace(
    "Select Farmer, Buyer or Admin. "
    "For demo testing, the matching credentials "
    "are filled automatically.",
    "Select Farmer or Buyer. "
    "For demo testing, the matching credentials "
    "are filled automatically.",
    1
)


# =========================================================
# 5. CLEAN PUBLIC LOGIN BADGE
#    FARMER ? Farmer Login : Buyer Login
# =========================================================

badge_start = text.find(
    '{selectedRole ==='
)

if badge_start != -1:
    admin_login_pos = text.find(
        '"Admin Login"',
        badge_start
    )

    if admin_login_pos != -1:
        # Only replace the specific selected-role badge block.
        block_end = text.find(
            "</div>",
            admin_login_pos
        )

        if block_end != -1:
            old_block = text[
                badge_start:block_end
            ]

            if (
                '"Farmer Login"' in old_block
                and '"Buyer Login"' in old_block
                and '"Admin Login"' in old_block
            ):
                new_block = '''{selectedRole === "FARMER"
                ? ui(
                    "Farmer Login",
                    "किसान लॉगिन"
                  )
                : ui(
                    "Buyer Login",
                    "खरीदार लॉगिन"
                  )}'''

                text = (
                    text[:badge_start]
                    + new_block
                    + text[block_end:]
                )

                print(
                    "UPDATED: login role badge"
                )


# =========================================================
# 6. REMOVE ShieldCheck IMPORT IF UNUSED
# =========================================================

if "<ShieldCheck" not in text:
    text = re.sub(
        r'(?m)^\s*ShieldCheck,\s*\r?\n',
        "",
        text,
        count=1
    )


# =========================================================
# SAFETY CHECKS
# =========================================================

assert 'admin@agriva.demo' not in text
assert 'selectedRole === "ADMIN"' not in text
assert '"Admin Login"' not in text

# Admin authenticated-role redirect MUST remain
assert 'role === "ADMIN"' in text
assert '"/dashboard/admin"' in text

# Farmer and Buyer public login MUST remain
assert '"FARMER"' in text
assert '"BUYER"' in text
assert '"Farmer"' in text
assert '"Buyer"' in text


path.write_text(
    text,
    encoding="utf-8",
    newline="\n"
)

print()
print("========================================")
print("PUBLIC ADMIN OPTION HIDDEN ✅")
print("========================================")
print("Farmer button        : VISIBLE")
print("Buyer button         : VISIBLE")
print("Admin button         : HIDDEN")
print("Admin demo account   : REMOVED")
print("Admin login badge    : REMOVED")
print("Admin backend route  : PRESERVED")
print("Admin dashboard      : PRESERVED")
print("========================================")
print("Backup:", backup)
