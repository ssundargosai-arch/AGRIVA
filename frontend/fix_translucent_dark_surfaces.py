from pathlib import Path
import shutil

path = Path(r"D:\AGRIVA\frontend\app\globals.css")

backup = Path(
    r"D:\AGRIVA\frontend_source_backups\before-translucent-dark-fix.css"
)

shutil.copy2(path, backup)

text = path.read_text(
    encoding="utf-8-sig"
)

marker = "/* AGRIVA_TRANSLUCENT_SURFACE_DARK_FIX */"

patch = r'''

/* AGRIVA_TRANSLUCENT_SURFACE_DARK_FIX */

/*
   Tailwind classes such as bg-white/95, bg-white/90 and
   bg-white/80 were staying light after switching AGRIVA
   to dark mode.
*/

html.dark
  :where(div, section, article, aside, form)[class*="bg-white/9"],
html[data-theme="dark"]
  :where(div, section, article, aside, form)[class*="bg-white/9"],
html.dark
  :where(div, section, article, aside, form)[class*="bg-white/8"],
html[data-theme="dark"]
  :where(div, section, article, aside, form)[class*="bg-white/8"] {
  background-color: rgba(13, 29, 22, 0.97) !important;
  color: #f8fafc;
}


/* Main headings on those surfaces */

html.dark
  :where(div, section, article, aside, form)[class*="bg-white/9"]
  :where(h1, h2, h3, h4),
html[data-theme="dark"]
  :where(div, section, article, aside, form)[class*="bg-white/9"]
  :where(h1, h2, h3, h4) {
  color: #f8fafc !important;
}


/* Form labels */

html.dark
  :where(div, section, article, aside, form)[class*="bg-white/9"]
  label,
html[data-theme="dark"]
  :where(div, section, article, aside, form)[class*="bg-white/9"]
  label {
  color: #dbe5ee !important;
}


/* Secondary explanatory copy */

html.dark
  :where(div, section, article, aside, form)[class*="bg-white/9"]
  .text-slate-500,
html.dark
  :where(div, section, article, aside, form)[class*="bg-white/9"]
  .text-slate-600,
html[data-theme="dark"]
  :where(div, section, article, aside, form)[class*="bg-white/9"]
  .text-slate-500,
html[data-theme="dark"]
  :where(div, section, article, aside, form)[class*="bg-white/9"]
  .text-slate-600 {
  color: #b8c5d1 !important;
}


/* Login / registration input surfaces */

html.dark
  :where(input, textarea, select),
html[data-theme="dark"]
  :where(input, textarea, select) {
  background-color: #0d182b !important;
  border-color: #355044 !important;
  color: #f8fafc !important;
}

html.dark
  :where(input, textarea)::placeholder,
html[data-theme="dark"]
  :where(input, textarea)::placeholder {
  color: #8798ac !important;
}


/* Dividers on dark forms */

html.dark
  :where(div, section, article, aside, form)[class*="bg-white/9"]
  :where(hr),
html[data-theme="dark"]
  :where(div, section, article, aside, form)[class*="bg-white/9"]
  :where(hr) {
  border-color: #33493f !important;
}


/* Create-account/link copy stays readable */

html.dark
  :where(div, section, article, aside, form)[class*="bg-white/9"]
  a:not([class*="bg-emerald"]):not([class*="bg-green"]),
html[data-theme="dark"]
  :where(div, section, article, aside, form)[class*="bg-white/9"]
  a:not([class*="bg-emerald"]):not([class*="bg-green"]) {
  color: #d5e1ea;
}


/* Keep main AGRIVA actions bright */

html.dark
  :where(button, a)[class*="bg-emerald"],
html[data-theme="dark"]
  :where(button, a)[class*="bg-emerald"],
html.dark
  :where(button, a)[class*="bg-green"],
html[data-theme="dark"]
  :where(button, a)[class*="bg-green"] {
  color: #ffffff;
}

'''

if marker in text:
    print(
        "Translucent surface dark fix already installed ✅"
    )
else:
    path.write_text(
        text.rstrip()
        + "\n"
        + patch
        + "\n",
        encoding="utf-8",
        newline="\n"
    )

    print(
        "AGRIVA translucent surface dark fix installed ✅"
    )

print("Backup:", backup)
