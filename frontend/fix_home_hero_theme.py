from pathlib import Path
import shutil

root = Path(r"D:\AGRIVA\frontend")

page = root / "app" / "page.tsx"
css = root / "app" / "globals.css"

backup = Path(
    r"D:\AGRIVA\frontend_source_backups\before-home-hero-dark-fix"
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

# =========================================================
# 1. TAG HOME HERO
# =========================================================

text = page.read_text(
    encoding="utf-8-sig"
)

anchor = 't("navigation.dashboard")'

index = text.find(anchor)

if index == -1:
    raise RuntimeError(
        "Home Dashboard button anchor not found."
    )

section_start = text.rfind(
    "<section",
    0,
    index
)

if section_start == -1:
    raise RuntimeError(
        "Home hero section not found."
    )

section_end = text.find(
    ">",
    section_start
)

if section_end == -1:
    raise RuntimeError(
        "Home hero opening tag is incomplete."
    )

tag = text[
    section_start:
    section_end + 1
]

if "agriva-home-hero" not in tag:

    if 'className="' in tag:

        new_tag = tag.replace(
            'className="',
            'className="agriva-home-hero ',
            1
        )

    else:

        new_tag = tag[:-1] + (
            ' className="agriva-home-hero">'
        )

    text = (
        text[:section_start]
        + new_tag
        + text[section_end + 1:]
    )

    page.write_text(
        text,
        encoding="utf-8",
        newline="\n"
    )

    print(
        "Home hero tagged ✅"
    )

else:
    print(
        "Home hero already tagged ✅"
    )


# =========================================================
# 2. ADD EXACT LIGHT + DARK HERO DESIGN
# =========================================================

css_text = css.read_text(
    encoding="utf-8-sig"
)

marker = "/* AGRIVA_HOME_HERO_THEME_FIX */"

styles = r'''

/* AGRIVA_HOME_HERO_THEME_FIX */

/* ---------- LIGHT ---------- */

.agriva-home-hero {
  background:
    radial-gradient(
      circle at 85% 10%,
      rgba(167, 243, 208, 0.38),
      transparent 32%
    ),
    linear-gradient(
      135deg,
      #f0fdf4 0%,
      #f8fffa 50%,
      #ecfdf5 100%
    ) !important;

  color: #0f172a;
}

.agriva-home-hero h1 {
  color: #0f172a !important;
}

.agriva-home-hero p {
  color: #475569 !important;
}


/* ---------- DARK ---------- */

html.dark .agriva-home-hero,
html[data-theme="dark"] .agriva-home-hero {
  background:
    radial-gradient(
      circle at 85% 10%,
      rgba(34, 197, 94, 0.15),
      transparent 34%
    ),
    linear-gradient(
      135deg,
      #06110c 0%,
      #0b2117 48%,
      #0d2b1d 100%
    ) !important;

  color: #f8fafc;
}

html.dark .agriva-home-hero h1,
html[data-theme="dark"] .agriva-home-hero h1 {
  color: #f8fafc !important;
}

html.dark .agriva-home-hero p,
html[data-theme="dark"] .agriva-home-hero p {
  color: #cbd5e1 !important;
}


/* AI Recommendation badge */

html.dark
  .agriva-home-hero
  :where(span)[class*="rounded-full"],
html[data-theme="dark"]
  .agriva-home-hero
  :where(span)[class*="rounded-full"] {
  border-color: rgba(52, 211, 153, 0.35);
}


/* Marketplace secondary action */

html.dark
  .agriva-home-hero
  a[href="/marketplace"],
html[data-theme="dark"]
  .agriva-home-hero
  a[href="/marketplace"] {
  background: #13241d !important;
  border-color: #315445 !important;
  color: #f8fafc !important;
}

html.dark
  .agriva-home-hero
  a[href="/marketplace"]:hover,
html[data-theme="dark"]
  .agriva-home-hero
  a[href="/marketplace"]:hover {
  background: #193126 !important;
}


/* Dashboard primary action always high contrast */

.agriva-home-hero
  a[href="/dashboard/farmer"] {
  color: #ffffff !important;
}

'''

if marker not in css_text:

    css.write_text(
        css_text.rstrip()
        + "\n"
        + styles
        + "\n",
        encoding="utf-8",
        newline="\n"
    )

    print(
        "Home hero light/dark CSS added ✅"
    )

else:
    print(
        "Home hero CSS already present ✅"
    )


print()
print(
    "HOME HERO THEME FIX COMPLETE ✅"
)

print(
    "Backup:",
    backup
)
