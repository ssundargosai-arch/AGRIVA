from pathlib import Path
import shutil

root = Path(r"D:\AGRIVA\frontend")

page = (
    root
    / "app"
    / "dashboard"
    / "farmer"
    / "storage"
    / "page.tsx"
)

css = root / "app" / "globals.css"

backup = Path(
    r"D:\AGRIVA\frontend_source_backups\before-storage-dark-final"
)

backup.mkdir(
    parents=True,
    exist_ok=True
)

shutil.copy2(
    page,
    backup / "page.tsx"
)

shutil.copy2(
    css,
    backup / "globals.css"
)

text = page.read_text(
    encoding="utf-8-sig"
)

changes = 0


# ======================================================
# ROOT PAGE
# ======================================================

old = (
    '<main className="min-h-screen bg-[#f7faf7] '
    'text-slate-900 dark:bg-slate-950 '
    'dark:text-slate-100">'
)

new = (
    '<main className="agriva-storage-page '
    'min-h-screen bg-[#f7faf7] '
    'text-slate-900 dark:bg-slate-950 '
    'dark:text-slate-100">'
)

if old in text:
    text = text.replace(
        old,
        new,
        1
    )
    changes += 1
else:
    raise RuntimeError(
        "Storage root <main> not found."
    )


# ======================================================
# HERO
# ======================================================

old = (
    '<section className="border-b border-emerald-200 '
    'bg-gradient-to-br from-[#f8fff9] via-[#eafff0] '
    'to-[#fff7df] dark:border-slate-800 '
    'dark:from-slate-950 dark:via-emerald-950/40 '
    'dark:to-slate-950">'
)

new = (
    '<section className="agriva-storage-hero '
    'border-b border-emerald-200 '
    'bg-gradient-to-br from-[#f8fff9] via-[#eafff0] '
    'to-[#fff7df] dark:border-slate-800 '
    'dark:from-slate-950 dark:via-emerald-950/40 '
    'dark:to-slate-950">'
)

if old in text:
    text = text.replace(
        old,
        new,
        1
    )
    changes += 1


old = (
    'className="mt-4 max-w-4xl text-lg font-medium '
    'leading-8 text-slate-700 dark:text-slate-300"'
)

new = (
    'className="agriva-storage-hero-subtitle '
    'mt-4 max-w-4xl text-lg font-medium '
    'leading-8 text-slate-700 dark:text-slate-300"'
)

if old in text:
    text = text.replace(
        old,
        new,
        1
    )
    changes += 1


# ======================================================
# MAIN STORAGE PANELS
# ======================================================

old = (
    'className="rounded-3xl border border-emerald-100 '
    'bg-white p-6 '
    'shadow-[0_10px_35px_rgba(15,118,110,0.08)] '
    'dark:border-slate-800 dark:bg-slate-900 sm:p-8"'
)

new = (
    'className="agriva-storage-panel '
    'rounded-3xl border border-emerald-100 '
    'bg-white p-6 '
    'shadow-[0_10px_35px_rgba(15,118,110,0.08)] '
    'dark:border-slate-800 dark:bg-slate-900 sm:p-8"'
)

panel_count = text.count(old)

if panel_count:
    text = text.replace(
        old,
        new
    )
    changes += panel_count


# Headings used by Storage panels

old = (
    'className="text-2xl font-black '
    'text-emerald-950 dark:text-emerald-50"'
)

new = (
    'className="agriva-storage-panel-title '
    'text-2xl font-black '
    'text-emerald-950 dark:text-emerald-50"'
)

title_count = text.count(old)

if title_count:
    text = text.replace(
        old,
        new
    )
    changes += title_count


# ======================================================
# FACILITY CARDS
# Critical: remove light gradient in DARK MODE
# ======================================================

old = (
    '"border-emerald-600 bg-gradient-to-br '
    'from-emerald-50 to-green-50 shadow-md '
    'ring-2 ring-emerald-100 '
    'dark:bg-emerald-950/30 dark:ring-emerald-900"'
)

new = (
    '"agriva-storage-facility-card '
    'border-emerald-600 bg-gradient-to-br '
    'from-emerald-50 to-green-50 shadow-md '
    'ring-2 ring-emerald-100 '
    'dark:bg-none dark:bg-emerald-950/30 '
    'dark:ring-emerald-900"'
)

if old in text:
    text = text.replace(
        old,
        new,
        1
    )
    changes += 1
else:
    raise RuntimeError(
        "Selected storage facility class not found."
    )


old = (
    '"border-slate-200 bg-white '
    'hover:border-emerald-400 '
    'hover:bg-emerald-50/40 '
    'dark:border-slate-700 dark:bg-slate-900"'
)

new = (
    '"agriva-storage-facility-card '
    'border-slate-200 bg-white '
    'hover:border-emerald-400 '
    'hover:bg-emerald-50/40 '
    'dark:border-slate-700 dark:bg-slate-900"'
)

if old in text:
    text = text.replace(
        old,
        new,
        1
    )
    changes += 1


# Facility name

old = (
    'className="mt-2 text-lg font-black"'
)

new = (
    'className="agriva-storage-facility-name '
    'mt-2 text-lg font-black"'
)

if old in text:
    text = text.replace(
        old,
        new,
        1
    )
    changes += 1


# Facility location

old = (
    'className="mt-4 flex items-start gap-2 '
    'text-sm text-slate-600 dark:text-slate-300"'
)

new = (
    'className="agriva-storage-facility-location '
    'mt-4 flex items-start gap-2 '
    'text-sm text-slate-600 dark:text-slate-300"'
)

if old in text:
    text = text.replace(
        old,
        new,
        1
    )
    changes += 1


# Rate box

old = (
    'className="mt-4 rounded-xl bg-white '
    'p-3 dark:bg-slate-800"'
)

new = (
    'className="agriva-storage-rate-box '
    'mt-4 rounded-xl bg-white '
    'p-3 dark:bg-slate-800"'
)

if old in text:
    text = text.replace(
        old,
        new,
        1
    )
    changes += 1


# Info cards component

old = (
    '<div className="rounded-xl bg-slate-50 '
    'p-3 dark:bg-slate-800">'
)

new = (
    '<div className="agriva-storage-info '
    'rounded-xl bg-slate-50 '
    'p-3 dark:bg-slate-800">'
)

if old in text:
    text = text.replace(
        old,
        new,
        1
    )
    changes += 1


page.write_text(
    text,
    encoding="utf-8",
    newline="\n"
)


# ======================================================
# TARGETED STORAGE CSS ONLY
# ======================================================

css_text = css.read_text(
    encoding="utf-8-sig"
)

marker = "/* AGRIVA_STORAGE_DARK_FINAL */"

patch = r'''

/* AGRIVA_STORAGE_DARK_FINAL */

/*
   Storage-specific dark-mode corrections.
   These rules do not affect other AGRIVA pages.
*/

html.dark .agriva-storage-page,
html[data-theme="dark"] .agriva-storage-page {
  background: #06140f !important;
  color: #f8fafc !important;
}


/* HERO */

html.dark .agriva-storage-hero,
html[data-theme="dark"] .agriva-storage-hero {
  background-image:
    linear-gradient(
      135deg,
      #06140f 0%,
      #0b2118 52%,
      #10281c 100%
    ) !important;

  border-color: #28513a !important;
}

html.dark .agriva-storage-hero h1,
html[data-theme="dark"] .agriva-storage-hero h1 {
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
}

html.dark .agriva-storage-hero-subtitle,
html[data-theme="dark"] .agriva-storage-hero-subtitle {
  color: #cbd5e1 !important;
  -webkit-text-fill-color: #cbd5e1 !important;
}


/* MAIN PANELS */

html.dark
.agriva-storage-page
.agriva-storage-panel,
html[data-theme="dark"]
.agriva-storage-page
.agriva-storage-panel {
  background: #0b2118 !important;
  border-color: #28513a !important;
  color: #f8fafc !important;
}


html.dark
.agriva-storage-page
.agriva-storage-panel-title,
html[data-theme="dark"]
.agriva-storage-page
.agriva-storage-panel-title {
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
}


/* Main panel description */

html.dark
.agriva-storage-panel
.text-slate-600,
html[data-theme="dark"]
.agriva-storage-panel
.text-slate-600 {
  color: #cbd5e1 !important;
}


/* FACILITY CARD */

html.dark
.agriva-storage-facility-card,
html[data-theme="dark"]
.agriva-storage-facility-card {
  background-image: none !important;
  background-color: #102a1d !important;
  border-color: #34d399 !important;
  color: #f8fafc !important;
}


/* Facility name */

html.dark
.agriva-storage-facility-name,
html[data-theme="dark"]
.agriva-storage-facility-name {
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
}


/* Facility address */

html.dark
.agriva-storage-facility-location,
html[data-theme="dark"]
.agriva-storage-facility-location {
  color: #cbd5e1 !important;
  -webkit-text-fill-color: #cbd5e1 !important;
}


/* Capacity cards */

html.dark
.agriva-storage-info,
html[data-theme="dark"]
.agriva-storage-info {
  background: #081727 !important;
  color: #f8fafc !important;
}

html.dark
.agriva-storage-info
.text-slate-500,
html[data-theme="dark"]
.agriva-storage-info
.text-slate-500 {
  color: #9fb0c5 !important;
}

html.dark
.agriva-storage-info
:where(.text-slate-900, .text-slate-950),
html[data-theme="dark"]
.agriva-storage-info
:where(.text-slate-900, .text-slate-950) {
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
}


/* Rate box */

html.dark
.agriva-storage-rate-box,
html[data-theme="dark"]
.agriva-storage-rate-box {
  background: #081727 !important;
  color: #f8fafc !important;
}

'''

if marker not in css_text:
    css.write_text(
        css_text.rstrip()
        + "\n"
        + patch
        + "\n",
        encoding="utf-8",
        newline="\n"
    )

print("Storage replacements:", changes)
print("STORAGE DARK MODE FINAL FIX INSTALLED ✅")
print("Backup:", backup)
