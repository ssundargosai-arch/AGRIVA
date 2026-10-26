from pathlib import Path
import shutil

path = Path(r"D:\AGRIVA\frontend\app\globals.css")

backup = Path(
    r"D:\AGRIVA\frontend_source_backups\globals.before-analytics-emphasis-final.css"
)

shutil.copy2(path, backup)

text = path.read_text(
    encoding="utf-8-sig"
)

marker = "/* AGRIVA_ANALYTICS_EMPHASIS_FINAL */"

patch = r'''

/* AGRIVA_ANALYTICS_EMPHASIS_FINAL */

/*
   Analytics Total Revenue card is the special emphasis card.
   Its original light gradient must be removed in dark mode.
*/

html.dark
article.border-emerald-300.bg-gradient-to-br.from-emerald-50.via-white.to-white,
html[data-theme="dark"]
article.border-emerald-300.bg-gradient-to-br.from-emerald-50.via-white.to-white {
  background-image: none !important;
  background-color: #0b2118 !important;
  border-color: #28513a !important;
  color: #f8fafc !important;
}


/* Title */

html.dark
article.border-emerald-300.bg-gradient-to-br.from-emerald-50.via-white.to-white
.text-slate-500,
html.dark
article.border-emerald-300.bg-gradient-to-br.from-emerald-50.via-white.to-white
.text-slate-600,
html[data-theme="dark"]
article.border-emerald-300.bg-gradient-to-br.from-emerald-50.via-white.to-white
.text-slate-500,
html[data-theme="dark"]
article.border-emerald-300.bg-gradient-to-br.from-emerald-50.via-white.to-white
.text-slate-600 {
  color: #b8c5d1 !important;
}


/* Main ₹ value */

html.dark
article.border-emerald-300.bg-gradient-to-br.from-emerald-50.via-white.to-white
.text-slate-950,
html.dark
article.border-emerald-300.bg-gradient-to-br.from-emerald-50.via-white.to-white
.text-slate-900,
html.dark
article.border-emerald-300.bg-gradient-to-br.from-emerald-50.via-white.to-white
.text-slate-800,
html[data-theme="dark"]
article.border-emerald-300.bg-gradient-to-br.from-emerald-50.via-white.to-white
.text-slate-950,
html[data-theme="dark"]
article.border-emerald-300.bg-gradient-to-br.from-emerald-50.via-white.to-white
.text-slate-900,
html[data-theme="dark"]
article.border-emerald-300.bg-gradient-to-br.from-emerald-50.via-white.to-white
.text-slate-800 {
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
  opacity: 1 !important;
}


/* Emerald icon */

html.dark
article.border-emerald-300.bg-gradient-to-br.from-emerald-50.via-white.to-white
.text-emerald-700,
html[data-theme="dark"]
article.border-emerald-300.bg-gradient-to-br.from-emerald-50.via-white.to-white
.text-emerald-700 {
  color: #34d399 !important;
}


/* Decorative circle */

html.dark
article.border-emerald-300.bg-gradient-to-br.from-emerald-50.via-white.to-white
[class*="bg-emerald-500/5"],
html[data-theme="dark"]
article.border-emerald-300.bg-gradient-to-br.from-emerald-50.via-white.to-white
[class*="bg-emerald-500/5"] {
  background-color: rgba(16, 185, 129, 0.10) !important;
}

'''

if marker in text:
    print("Analytics emphasis fix already installed ✅")
else:
    path.write_text(
        text.rstrip() + "\n" + patch + "\n",
        encoding="utf-8",
        newline="\n"
    )

    print("ANALYTICS TOTAL REVENUE DARK FIX INSTALLED ✅")

print("Backup:", backup)
