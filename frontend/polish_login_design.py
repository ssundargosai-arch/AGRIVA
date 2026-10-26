from pathlib import Path
import shutil

path = Path(
    r"D:\AGRIVA\frontend\app\login\page.tsx"
)

backup = Path(
    r"D:\AGRIVA\frontend_source_backups\login-page.before-design-polish.tsx"
)

backup.parent.mkdir(
    parents=True,
    exist_ok=True
)

shutil.copy2(path, backup)

text = path.read_text(
    encoding="utf-8-sig"
)

# ---------------------------------------------------------
# MAIN TWO COLUMN GRID
# ---------------------------------------------------------

text = text.replace(
    'className="grid gap-6 lg:grid-cols-[1fr_1.05fr]"',
    'className="grid gap-7 lg:grid-cols-[0.95fr_1.05fr] lg:items-stretch"',
    1
)


# ---------------------------------------------------------
# LEFT ROLE PANEL
# ---------------------------------------------------------

old_left = (
    'className="rounded-3xl bg-emerald-700 '
    'p-6 text-white shadow-xl sm:p-8"'
)

new_left = (
    'className="relative overflow-hidden rounded-[32px] '
    'border border-emerald-700/30 bg-emerald-900 '
    'p-6 text-white shadow-2xl shadow-emerald-950/20 '
    'sm:p-8 lg:p-10" '
    'style={{ '
    'backgroundImage: '
    '\'linear-gradient(135deg, rgba(6,78,59,0.96), '
    'rgba(5,150,105,0.72)), '
    'url("/images/farmer-dashboard-hero.png")\', '
    'backgroundSize: "cover", '
    'backgroundPosition: "center" '
    '}}'
)

if old_left not in text:
    raise RuntimeError(
        "Left role panel class not found."
    )

text = text.replace(
    old_left,
    new_left,
    1
)


# ---------------------------------------------------------
# RIGHT LOGIN CARD
# ---------------------------------------------------------

old_right = (
    'className="rounded-3xl border '
    'border-slate-200 bg-white p-6 shadow-xl sm:p-8"'
)

new_right = (
    'className="rounded-[32px] border border-slate-200/80 '
    'bg-white/95 p-6 shadow-2xl shadow-slate-900/10 '
    'backdrop-blur sm:p-8 lg:p-10"'
)

if old_right not in text:
    raise RuntimeError(
        "Login card class not found."
    )

text = text.replace(
    old_right,
    new_right,
    1
)


# ---------------------------------------------------------
# LOGIN ROLE BADGE
# ---------------------------------------------------------

text = text.replace(
    'className="mt-4 inline-flex rounded-full '
    'bg-emerald-50 px-3 py-1 text-xs font-bold '
    'text-emerald-700"',
    'className="mt-5 inline-flex items-center gap-2 '
    'rounded-full border border-emerald-200 '
    'bg-emerald-50 px-4 py-2 text-xs font-black '
    'uppercase tracking-wide text-emerald-800"',
    1
)


path.write_text(
    text,
    encoding="utf-8",
    newline="\n"
)

print("LOGIN DESIGN POLISH COMPLETE ✅")
print("Farmer image background: ENABLED")
print("Public roles: Farmer + Buyer")
print("Admin public button: HIDDEN")
print("Backup:", backup)
