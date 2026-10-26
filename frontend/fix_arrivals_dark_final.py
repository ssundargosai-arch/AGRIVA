from pathlib import Path
import re
import shutil

root = Path(r"D:\AGRIVA\frontend")

page = (
    root
    / "app"
    / "dashboard"
    / "farmer"
    / "arrivals"
    / "page.tsx"
)

css = root / "app" / "globals.css"

backup = Path(
    r"D:\AGRIVA\frontend_source_backups\before-arrivals-dark-final"
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

# =====================================================
# TAG ONLY ARRIVALS PAGE ROOT
# =====================================================

main_match = re.search(
    r"<main\b[\s\S]*?>",
    text
)

if not main_match:
    raise RuntimeError(
        "Arrivals <main> element not found."
    )

main_tag = main_match.group(0)

if "agriva-arrivals-page" not in main_tag:

    if 'className="' in main_tag:
        new_tag = main_tag.replace(
            'className="',
            'className="agriva-arrivals-page ',
            1
        )
    else:
        new_tag = (
            main_tag[:-1]
            + ' className="agriva-arrivals-page">'
        )

    text = (
        text[:main_match.start()]
        + new_tag
        + text[main_match.end():]
    )

page.write_text(
    text,
    encoding="utf-8",
    newline="\n"
)


# =====================================================
# ARRIVALS-SPECIFIC THEME CSS
# =====================================================

css_text = css.read_text(
    encoding="utf-8-sig"
)

marker = "/* AGRIVA_ARRIVALS_DARK_FINAL */"

patch = r'''

/* AGRIVA_ARRIVALS_DARK_FINAL */

/*
   Scoped ONLY to:
   /dashboard/farmer/arrivals
*/


/* ====================================================
   DARK PAGE
   ==================================================== */

html.dark .agriva-arrivals-page,
html[data-theme="dark"] .agriva-arrivals-page {
  background: #06140f !important;
  color: #f8fafc !important;
}


/* ====================================================
   HERO
   ==================================================== */

html.dark
.agriva-arrivals-page
> section:first-of-type,
html[data-theme="dark"]
.agriva-arrivals-page
> section:first-of-type {
  background-image:
    linear-gradient(
      135deg,
      #06140f 0%,
      #0b2118 52%,
      #10291d 100%
    ) !important;

  background-color: #06140f !important;
  border-color: #28513a !important;
}


/* Hero main title */

html.dark
.agriva-arrivals-page
> section:first-of-type h1,
html[data-theme="dark"]
.agriva-arrivals-page
> section:first-of-type h1 {
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
}


/* Hero description */

html.dark
.agriva-arrivals-page
> section:first-of-type p,
html[data-theme="dark"]
.agriva-arrivals-page
> section:first-of-type p {
  color: #cbd5e1 !important;
  -webkit-text-fill-color: #cbd5e1 !important;
}


/* Market Intelligence badge should stay green */

html.dark
.agriva-arrivals-page
> section:first-of-type
.text-emerald-800,
html[data-theme="dark"]
.agriva-arrivals-page
> section:first-of-type
.text-emerald-800 {
  color: #34d399 !important;
  -webkit-text-fill-color: #34d399 !important;
}


/* ====================================================
   MAIN CARDS
   ==================================================== */

html.dark
.agriva-arrivals-page
:where(section, article, div).bg-white,
html[data-theme="dark"]
.agriva-arrivals-page
:where(section, article, div).bg-white {
  background-color: #0b2118 !important;
  border-color: #28513a !important;
}


/* Translucent white cards */

html.dark
.agriva-arrivals-page
:where(section, article, div)[class*="bg-white/"],
html[data-theme="dark"]
.agriva-arrivals-page
:where(section, article, div)[class*="bg-white/"] {
  background-color: #0b2118 !important;
  border-color: #28513a !important;
}


/* ====================================================
   TITLES
   Fixes "Check Market Arrivals"
   ==================================================== */

html.dark
.agriva-arrivals-page
h2,
html.dark
.agriva-arrivals-page
h3,
html[data-theme="dark"]
.agriva-arrivals-page
h2,
html[data-theme="dark"]
.agriva-arrivals-page
h3 {
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
  opacity: 1 !important;
}


/* Explicit emerald dark headings */

html.dark
.agriva-arrivals-page
.text-emerald-950,
html.dark
.agriva-arrivals-page
.text-emerald-900,
html[data-theme="dark"]
.agriva-arrivals-page
.text-emerald-950,
html[data-theme="dark"]
.agriva-arrivals-page
.text-emerald-900 {
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
}


/* ====================================================
   BODY / SECONDARY TEXT
   ==================================================== */

html.dark
.agriva-arrivals-page
.text-slate-700,
html.dark
.agriva-arrivals-page
.text-slate-600,
html[data-theme="dark"]
.agriva-arrivals-page
.text-slate-700,
html[data-theme="dark"]
.agriva-arrivals-page
.text-slate-600 {
  color: #cbd5e1 !important;
}

html.dark
.agriva-arrivals-page
.text-slate-500,
html[data-theme="dark"]
.agriva-arrivals-page
.text-slate-500 {
  color: #aab9c7 !important;
}


/* ====================================================
   FORM LABELS
   ==================================================== */

html.dark
.agriva-arrivals-page label,
html[data-theme="dark"]
.agriva-arrivals-page label {
  color: #f1f5f9 !important;
}


/* ====================================================
   INPUTS
   ==================================================== */

html.dark
.agriva-arrivals-page
:where(input, select, textarea),
html[data-theme="dark"]
.agriva-arrivals-page
:where(input, select, textarea) {
  background-color: #081c14 !important;
  border-color: #315846 !important;
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
}

html.dark
.agriva-arrivals-page
:where(input, textarea)::placeholder,
html[data-theme="dark"]
.agriva-arrivals-page
:where(input, textarea)::placeholder {
  color: #94a3b8 !important;
}


/* ====================================================
   LANGUAGE PANEL
   ==================================================== */

html.dark
.agriva-arrivals-page
[class*="bg-white/9"],
html[data-theme="dark"]
.agriva-arrivals-page
[class*="bg-white/9"] {
  background-color: #0b2118 !important;
  border-color: #315846 !important;
}


/* ====================================================
   BUTTONS
   ==================================================== */

html.dark
.agriva-arrivals-page
button[class*="bg-emerald"],
html[data-theme="dark"]
.agriva-arrivals-page
button[class*="bg-emerald"] {
  color: #ffffff !important;
}


/* ====================================================
   LIGHT MODE PROTECTION
   ==================================================== */

html:not(.dark)
.agriva-arrivals-page {
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

print("Arrivals page scoped ✅")
print("ARRIVALS DARK MODE FIX INSTALLED ✅")
print("Backup:", backup)
