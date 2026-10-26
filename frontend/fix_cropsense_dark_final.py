from pathlib import Path
import re
import shutil

root = Path(r"D:\AGRIVA\frontend")

page = (
    root
    / "app"
    / "dashboard"
    / "farmer"
    / "crops"
    / "recommendation"
    / "page.tsx"
)

css = root / "app" / "globals.css"

backup = Path(
    r"D:\AGRIVA\frontend_source_backups\before-cropsense-dark-final"
)

backup.mkdir(parents=True, exist_ok=True)

shutil.copy2(page, backup / "page.tsx")
shutil.copy2(css, backup / "globals.css")

text = page.read_text(encoding="utf-8-sig")

# -----------------------------------------------------
# Tag CropSense page root
# -----------------------------------------------------

match = re.search(
    r"<main\b[\s\S]*?>",
    text
)

if not match:
    raise RuntimeError(
        "CropSense <main> not found."
    )

tag = match.group(0)

if "agriva-cropsense-page" not in tag:

    if 'className="' in tag:
        new_tag = tag.replace(
            'className="',
            'className="agriva-cropsense-page ',
            1
        )
    else:
        new_tag = (
            tag[:-1]
            + ' className="agriva-cropsense-page">'
        )

    text = (
        text[:match.start()]
        + new_tag
        + text[match.end():]
    )

page.write_text(
    text,
    encoding="utf-8",
    newline="\n"
)

# -----------------------------------------------------
# CropSense scoped CSS
# -----------------------------------------------------

css_text = css.read_text(
    encoding="utf-8-sig"
)

marker = "/* AGRIVA_CROPSENSE_DARK_FINAL */"

patch = r'''

/* AGRIVA_CROPSENSE_DARK_FINAL */

/* Scoped only to CropSense recommendation page */

html.dark .agriva-cropsense-page,
html[data-theme="dark"] .agriva-cropsense-page {
  background: #06140f !important;
  color: #f8fafc !important;
}


/* Main section titles:
   fixes "Your farm and soil context" etc. */

html.dark
.agriva-cropsense-page
:where(h2, h3, h4),
html[data-theme="dark"]
.agriva-cropsense-page
:where(h2, h3, h4) {
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
  opacity: 1 !important;
}


/* Hardcoded dark title utilities */

html.dark
.agriva-cropsense-page
:where(
  .text-slate-950,
  .text-slate-900,
  .text-slate-800,
  .text-emerald-950,
  .text-emerald-900
),
html[data-theme="dark"]
.agriva-cropsense-page
:where(
  .text-slate-950,
  .text-slate-900,
  .text-slate-800,
  .text-emerald-950,
  .text-emerald-900
) {
  color: #f8fafc !important;
  -webkit-text-fill-color: #f8fafc !important;
}


/* Secondary descriptions */

html.dark
.agriva-cropsense-page
:where(
  .text-slate-700,
  .text-slate-600
),
html[data-theme="dark"]
.agriva-cropsense-page
:where(
  .text-slate-700,
  .text-slate-600
) {
  color: #cbd5e1 !important;
}

html.dark
.agriva-cropsense-page
:where(
  .text-slate-500,
  .text-slate-400
),
html[data-theme="dark"]
.agriva-cropsense-page
:where(
  .text-slate-500,
  .text-slate-400
) {
  color: #9fb0bd !important;
}


/* White/light content cards */

html.dark
.agriva-cropsense-page
:where(section, article, div).bg-white,
html[data-theme="dark"]
.agriva-cropsense-page
:where(section, article, div).bg-white {
  background-color: #0b2118 !important;
  border-color: #28513a !important;
}


/* Slate light cards */

html.dark
.agriva-cropsense-page
:where(section, article, div).bg-slate-50,
html.dark
.agriva-cropsense-page
:where(section, article, div).bg-slate-100,
html[data-theme="dark"]
.agriva-cropsense-page
:where(section, article, div).bg-slate-50,
html[data-theme="dark"]
.agriva-cropsense-page
:where(section, article, div).bg-slate-100 {
  background-color: #10271d !important;
  border-color: #315846 !important;
}


/* Inputs */

html.dark
.agriva-cropsense-page
:where(input, select, textarea),
html[data-theme="dark"]
.agriva-cropsense-page
:where(input, select, textarea) {
  background: #081c14 !important;
  border-color: #315846 !important;
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
}

html.dark
.agriva-cropsense-page
:where(input, textarea)::placeholder,
html[data-theme="dark"]
.agriva-cropsense-page
:where(input, textarea)::placeholder {
  color: #94a3b8 !important;
}


/* Keep warning / rule-based recommendation box readable */

html.dark
.agriva-cropsense-page
.bg-amber-50,
html[data-theme="dark"]
.agriva-cropsense-page
.bg-amber-50 {
  background: #fff7e8 !important;
  color: #7c2d12 !important;
}


/* Light mode protection */

html:not(.dark)
.agriva-cropsense-page {
  color: #0f172a;
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

print("CropSense page scoped ✅")
print("CROPSENSE DARK MODE FIX INSTALLED ✅")
print("Backup:", backup)
