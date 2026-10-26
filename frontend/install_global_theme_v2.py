from pathlib import Path
import shutil

root = Path(r"D:\AGRIVA\frontend")
css = root / "app" / "globals.css"

backup_dir = Path(
    r"D:\AGRIVA\frontend_source_backups\before-global-theme-cleanup"
)
backup_dir.mkdir(parents=True, exist_ok=True)

shutil.copy2(
    css,
    backup_dir / "globals.css"
)

text = css.read_text(
    encoding="utf-8-sig"
)

marker = "/* AGRIVA_GLOBAL_THEME_V2 */"

theme_css = r'''

/* AGRIVA_GLOBAL_THEME_V2 */

/* =========================================================
   AGRIVA GLOBAL THEME TOKENS
   ========================================================= */

:root {
  --agriva-bg: #f6fbf7;
  --agriva-surface: #ffffff;
  --agriva-surface-soft: #eef8f1;
  --agriva-surface-strong: #e0f1e6;

  --agriva-text: #0f172a;
  --agriva-text-muted: #475569;
  --agriva-text-soft: #64748b;

  --agriva-border: #d7e5dc;
  --agriva-border-strong: #b8d5c4;

  --agriva-primary: #059669;
  --agriva-primary-hover: #047857;
  --agriva-primary-text: #ffffff;

  --agriva-shadow:
    0 14px 36px rgba(15, 23, 42, 0.09);
}

html.dark,
html[data-theme="dark"] {
  --agriva-bg: #07140f;
  --agriva-surface: #0d1d16;
  --agriva-surface-soft: #12271e;
  --agriva-surface-strong: #173126;

  --agriva-text: #f8fafc;
  --agriva-text-muted: #cbd5e1;
  --agriva-text-soft: #94a3b8;

  --agriva-border: #294338;
  --agriva-border-strong: #38604d;

  --agriva-primary: #22c55e;
  --agriva-primary-hover: #16a34a;
  --agriva-primary-text: #04120a;

  --agriva-shadow:
    0 16px 40px rgba(0, 0, 0, 0.32);
}


/* =========================================================
   DOCUMENT BASE
   ========================================================= */

html,
body {
  background-color: var(--agriva-bg);
  color: var(--agriva-text);
}

body {
  transition:
    background-color 180ms ease,
    color 180ms ease;
}


/* =========================================================
   AGRIVA SEMANTIC HELPERS
   Use these in new components.
   ========================================================= */

.agriva-page {
  background: var(--agriva-bg);
  color: var(--agriva-text);
}

.agriva-surface {
  background: var(--agriva-surface);
  color: var(--agriva-text);
  border-color: var(--agriva-border);
}

.agriva-surface-soft {
  background: var(--agriva-surface-soft);
  color: var(--agriva-text);
  border-color: var(--agriva-border);
}

.agriva-text {
  color: var(--agriva-text);
}

.agriva-muted {
  color: var(--agriva-text-muted);
}

.agriva-soft {
  color: var(--agriva-text-soft);
}

.agriva-border {
  border-color: var(--agriva-border);
}

.agriva-shadow {
  box-shadow: var(--agriva-shadow);
}


/* =========================================================
   LIGHT MODE CONTRAST SAFETY
   ========================================================= */

html:not(.dark)[data-theme="light"] body,
html:not(.dark) body {
  background-color: var(--agriva-bg);
  color: var(--agriva-text);
}


/* Dark text utilities that are already safe */
html:not(.dark) .text-slate-950 {
  color: #020617;
}

html:not(.dark) .text-slate-900 {
  color: #0f172a;
}

html:not(.dark) .text-slate-800 {
  color: #1e293b;
}

html:not(.dark) .text-slate-700 {
  color: #334155;
}


/* Very pale text becomes readable in light mode */
html:not(.dark) .text-slate-300 {
  color: #475569;
}

html:not(.dark) .text-slate-400 {
  color: #64748b;
}

html:not(.dark) .text-slate-500 {
  color: #475569;
}


/* Cards hardcoded dark should not stay dark in LIGHT mode.
   Buttons and links are intentionally excluded. */

html:not(.dark)
  :where(div, section, article, aside)
  .bg-slate-950,
html:not(.dark)
  :where(div, section, article, aside).bg-slate-950 {
  background-color: #ffffff;
}

html:not(.dark)
  :where(div, section, article, aside)
  .bg-slate-900,
html:not(.dark)
  :where(div, section, article, aside).bg-slate-900 {
  background-color: #ffffff;
}


/* Explicit dark cards */
html:not(.dark)
  :where(div, section, article, aside)[class*="bg-[#0"] {
  color: #0f172a;
}


/* White headings on light sections */
html:not(.dark)
  main
  :where(h1, h2, h3, h4)
  .text-white {
  color: #0f172a;
}

html:not(.dark)
  main
  :where(h1, h2, h3, h4).text-white {
  color: #0f172a;
}


/* Text inside converted dark cards */
html:not(.dark)
  :where(div, section, article, aside).bg-slate-950
  :where(.text-white, .text-slate-100, .text-slate-200) {
  color: #0f172a;
}

html:not(.dark)
  :where(div, section, article, aside).bg-slate-950
  :where(.text-slate-300, .text-slate-400, .text-slate-500) {
  color: #475569;
}

html:not(.dark)
  :where(div, section, article, aside).bg-slate-900
  :where(.text-white, .text-slate-100, .text-slate-200) {
  color: #0f172a;
}

html:not(.dark)
  :where(div, section, article, aside).bg-slate-900
  :where(.text-slate-300, .text-slate-400, .text-slate-500) {
  color: #475569;
}


/* Keep real action buttons readable */
html:not(.dark)
  :where(button, a).bg-emerald-600,
html:not(.dark)
  :where(button, a).bg-emerald-700,
html:not(.dark)
  :where(button, a).bg-green-600,
html:not(.dark)
  :where(button, a).bg-green-700 {
  color: #ffffff;
}


/* =========================================================
   DARK MODE CONTRAST SAFETY
   ========================================================= */

html.dark .text-slate-950,
html[data-theme="dark"] .text-slate-950 {
  color: #f8fafc;
}

html.dark .text-slate-900,
html[data-theme="dark"] .text-slate-900 {
  color: #f1f5f9;
}

html.dark .text-slate-800,
html[data-theme="dark"] .text-slate-800 {
  color: #e2e8f0;
}

html.dark .text-slate-700,
html[data-theme="dark"] .text-slate-700 {
  color: #cbd5e1;
}

html.dark .text-slate-600,
html[data-theme="dark"] .text-slate-600 {
  color: #b6c2cf;
}

html.dark .text-slate-500,
html[data-theme="dark"] .text-slate-500 {
  color: #a8b5c4;
}

html.dark .text-slate-400,
html[data-theme="dark"] .text-slate-400 {
  color: #94a3b8;
}


/* Hardcoded white/light cards become proper dark surfaces */
html.dark
  :where(div, section, article, aside).bg-white,
html[data-theme="dark"]
  :where(div, section, article, aside).bg-white {
  background-color: var(--agriva-surface);
}

html.dark
  :where(div, section, article, aside).bg-slate-50,
html[data-theme="dark"]
  :where(div, section, article, aside).bg-slate-50 {
  background-color: var(--agriva-surface-soft);
}

html.dark
  :where(div, section, article, aside).bg-slate-100,
html[data-theme="dark"]
  :where(div, section, article, aside).bg-slate-100 {
  background-color: var(--agriva-surface-soft);
}


/* Light green cards */
html.dark
  :where(div, section, article, aside).bg-emerald-50,
html[data-theme="dark"]
  :where(div, section, article, aside).bg-emerald-50,
html.dark
  :where(div, section, article, aside).bg-green-50,
html[data-theme="dark"]
  :where(div, section, article, aside).bg-green-50 {
  background-color: #102a1d;
}


/* Blue info surfaces */
html.dark
  :where(div, section, article, aside).bg-blue-50,
html[data-theme="dark"]
  :where(div, section, article, aside).bg-blue-50 {
  background-color: #101f35;
}


/* Amber/warning surfaces */
html.dark
  :where(div, section, article, aside).bg-amber-50,
html[data-theme="dark"]
  :where(div, section, article, aside).bg-amber-50,
html.dark
  :where(div, section, article, aside).bg-yellow-50,
html[data-theme="dark"]
  :where(div, section, article, aside).bg-yellow-50 {
  background-color: #30260f;
}


/* Red/error surfaces */
html.dark
  :where(div, section, article, aside).bg-red-50,
html[data-theme="dark"]
  :where(div, section, article, aside).bg-red-50 {
  background-color: #321414;
}


/* Borders */
html.dark .border-slate-100,
html.dark .border-slate-200,
html[data-theme="dark"] .border-slate-100,
html[data-theme="dark"] .border-slate-200 {
  border-color: #294338;
}

html.dark .border-emerald-100,
html.dark .border-emerald-200,
html[data-theme="dark"] .border-emerald-100,
html[data-theme="dark"] .border-emerald-200 {
  border-color: #28523d;
}


/* Inputs */
html.dark
  :where(input, select, textarea),
html[data-theme="dark"]
  :where(input, select, textarea) {
  color: #f8fafc;
}

html.dark
  :where(input, select, textarea)::placeholder,
html[data-theme="dark"]
  :where(input, select, textarea)::placeholder {
  color: #94a3b8;
}


/* Native selects need a dark background */
html.dark select,
html[data-theme="dark"] select {
  background-color: #102019;
}


/* =========================================================
   COMMON AGRIVA CARD QUALITY
   ========================================================= */

html:not(.dark)
  :where(article, section, div)[class*="rounded-3xl"][class*="border"] {
  border-color: var(--agriva-border);
}

html.dark
  :where(article, section, div)[class*="rounded-3xl"][class*="border"],
html[data-theme="dark"]
  :where(article, section, div)[class*="rounded-3xl"][class*="border"] {
  border-color: var(--agriva-border);
}


/* =========================================================
   RECHARTS
   ========================================================= */

html.dark .recharts-cartesian-grid line,
html[data-theme="dark"] .recharts-cartesian-grid line {
  stroke: #294338;
}

html.dark .recharts-text,
html[data-theme="dark"] .recharts-text {
  fill: #cbd5e1;
}


/* =========================================================
   END AGRIVA GLOBAL THEME V2
   ========================================================= */

'''

if marker in text:
    print("AGRIVA global theme V2 already installed ✅")
else:
    css.write_text(
        text.rstrip() + "\n" + theme_css + "\n",
        encoding="utf-8",
        newline="\n"
    )

    print("AGRIVA GLOBAL THEME V2 INSTALLED ✅")
    print("Backup:", backup_dir / "globals.css")
