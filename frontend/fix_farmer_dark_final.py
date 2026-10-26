from pathlib import Path
import shutil

path = Path(r"D:\AGRIVA\frontend\app\globals.css")

backup = Path(
    r"D:\AGRIVA\frontend_source_backups\globals.before-farmer-dark-final.css"
)

shutil.copy2(path, backup)

text = path.read_text(
    encoding="utf-8-sig"
)

marker = "/* AGRIVA_FARMER_DARK_FINAL */"

patch = r'''

/* AGRIVA_FARMER_DARK_FINAL */

/*
   Farmer Dashboard uses its own agriva-dark wrapper.
   These rules deliberately depend on .agriva-dark instead
   of only html.dark.
*/


/* =========================================================
   PAGE / BODY
   ========================================================= */

html:has(.agriva-dark),
body:has(.agriva-dark) {
  background-color: #07140f !important;
  color: #f8fafc !important;
}

.agriva-dark {
  background-color: #07140f !important;
  color: #f8fafc !important;
  color-scheme: dark;
}


/* Prevent washed-out light page regions */

.agriva-dark
  :where(main, section, div)[class*="bg-[#F7FAF7]"],
.agriva-dark
  :where(main, section, div)[class*="bg-[#F4F7F2]"],
.agriva-dark
  :where(main, section, div)[class*="bg-[#F5F8F4]"] {
  background-color: #07140f !important;
}


/* =========================================================
   SECTION HEADINGS
   ========================================================= */

.agriva-dark
  :where(h1, h2, h3, h4) {
  color: #f8fafc !important;
}


/* =========================================================
   NORMAL TEXT
   ========================================================= */

.agriva-dark .text-slate-950,
.agriva-dark .text-slate-900,
.agriva-dark .text-slate-800 {
  color: #f1f5f9 !important;
}

.agriva-dark .text-slate-700,
.agriva-dark .text-slate-600 {
  color: #cbd5e1 !important;
}

.agriva-dark .text-slate-500 {
  color: #b8c5d1 !important;
}

.agriva-dark .text-slate-400 {
  color: #94a3b8 !important;
}


/* Farmer dashboard hex text */

.agriva-dark [class*="text-[#0F172A]"],
.agriva-dark [class*="text-[#334155]"] {
  color: #e2e8f0 !important;
}


/* =========================================================
   WHITE / LIGHT CARDS
   ========================================================= */

.agriva-dark
  :where(div, section, article, aside)[class~="bg-white"],
.agriva-dark
  :where(div, section, article, aside)[class*="bg-white/"] {
  background-color: #0d1d16 !important;
  border-color: #294338 !important;
}


/* Slate light cards */

.agriva-dark
  :where(div, section, article, aside).bg-slate-50,
.agriva-dark
  :where(div, section, article, aside).bg-slate-100 {
  background-color: #10231a !important;
  border-color: #294338 !important;
}


/* Green light information cards */

.agriva-dark
  :where(div, section, article, aside).bg-emerald-50,
.agriva-dark
  :where(div, section, article, aside).bg-green-50 {
  background-color: #102a1d !important;
  border-color: #28523d !important;
}


/* =========================================================
   CARD SECONDARY COPY
   ========================================================= */

.agriva-dark article p.text-slate-500,
.agriva-dark article p.text-slate-600,
.agriva-dark section p.text-slate-500,
.agriva-dark section p.text-slate-600 {
  color: #aebdca !important;
}


/* =========================================================
   WEATHER MINI CARDS
   ========================================================= */

.agriva-dark
  :where(article, div)[class*="bg-white"]
  :where(.text-slate-900, .text-slate-800, .text-slate-700) {
  color: #f1f5f9 !important;
}


/* =========================================================
   BORDERS
   ========================================================= */

.agriva-dark .border-slate-100,
.agriva-dark .border-slate-200,
.agriva-dark .border-slate-300 {
  border-color: #294338 !important;
}


/* =========================================================
   BOTTOM NAVIGATION
   ========================================================= */

.agriva-dark nav {
  background-color: #07140f !important;
  border-color: #294338 !important;
}

.agriva-dark nav .text-slate-500,
.agriva-dark nav .text-slate-600 {
  color: #94a3b8 !important;
}


/* =========================================================
   INPUT / SELECT
   ========================================================= */

.agriva-dark
  :where(input, textarea, select) {
  background-color: #0c1d16 !important;
  border-color: #355044 !important;
  color: #f8fafc !important;
}

.agriva-dark
  :where(input, textarea)::placeholder {
  color: #829388 !important;
}


/* =========================================================
   KEEP AGRIVA ACTION BUTTONS HIGH CONTRAST
   ========================================================= */

.agriva-dark
  :where(button, a)[class*="bg-emerald-"],
.agriva-dark
  :where(button, a)[class*="bg-green-"] {
  color: #ffffff !important;
}


/* =========================================================
   SHADOW QUALITY
   ========================================================= */

.agriva-dark
  :where(article, section, div)[class*="shadow"] {
  --tw-shadow-color: rgba(0, 0, 0, 0.28);
}

'''

if marker in text:
    print("Farmer dark final CSS already installed ✅")
else:
    path.write_text(
        text.rstrip() + "\n" + patch + "\n",
        encoding="utf-8",
        newline="\n"
    )

    print("FARMER DARK MODE FINAL FIX INSTALLED ✅")

print("Backup:", backup)
