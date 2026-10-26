from pathlib import Path
import json
import re
import shutil

ROOT = Path(r"D:\AGRIVA\frontend")
PAGE = ROOT / "app" / "dashboard" / "farmer" / "page.tsx"
CSS = ROOT / "app" / "globals.css"
EN = ROOT / "locales" / "en.json"

BACKUP = Path(
    r"D:\AGRIVA\frontend_source_backups\before-farmer-section-heading-fix"
)
BACKUP.mkdir(parents=True, exist_ok=True)

shutil.copy2(PAGE, BACKUP / "page.tsx")
shutil.copy2(CSS, BACKUP / "globals.css")

page = PAGE.read_text(encoding="utf-8-sig")
data = json.loads(EN.read_text(encoding="utf-8-sig"))


def norm(value):
    return (
        str(value)
        .replace("’", "'")
        .replace("‘", "'")
        .strip()
        .lower()
    )


targets = {
    norm("Today’s important information"),
    norm("Main farmer actions"),
    norm("More useful services"),
}


def walk(obj, prefix=""):
    results = []

    if isinstance(obj, dict):
        for key, value in obj.items():
            path = f"{prefix}.{key}" if prefix else key

            if isinstance(value, dict):
                results.extend(walk(value, path))

            elif isinstance(value, str):
                if norm(value) in targets:
                    results.append((path, value))

    return results


found = walk(data)

print("Translation headings found:")

for path, value in found:
    print(" ", path, "=", value)

if len(found) != 3:
    raise RuntimeError(
        f"Expected 3 headings, found {len(found)}. "
        "No file was changed."
    )


namespace_match = re.search(
    r'useTranslations\(\s*["\']([^"\']+)["\']\s*\)',
    page
)

namespace = (
    namespace_match.group(1)
    if namespace_match
    else ""
)

changed = 0

for full_key, value in found:

    key = full_key

    if (
        namespace
        and full_key.startswith(namespace + ".")
    ):
        key = full_key[len(namespace) + 1:]

    pattern = re.compile(
        r'(<h([1-6])\b)'
        r'([^>]*?)'
        r'(>\s*\{t\(\s*["\']'
        + re.escape(key)
        + r'["\']\s*\)\}\s*</h\2>)',
        re.DOTALL,
    )

    def replace(match):
        attrs = match.group(3)

        if "agriva-section-heading" in attrs:
            return match.group(0)

        if 'className="' in attrs:
            attrs = attrs.replace(
                'className="',
                'className="agriva-section-heading ',
                1
            )
        else:
            attrs += ' className="agriva-section-heading"'

        return (
            match.group(1)
            + attrs
            + match.group(4)
        )

    page, count = pattern.subn(
        replace,
        page,
        count=1
    )

    if count != 1:
        raise RuntimeError(
            f'Could not locate JSX heading for '
            f'{value!r} using t("{key}"). '
            "No file was written."
        )

    changed += count


PAGE.write_text(
    page,
    encoding="utf-8",
    newline="\n"
)


css = CSS.read_text(
    encoding="utf-8-sig"
)

marker = "/* AGRIVA_FARMER_SECTION_HEADINGS_FIX */"

patch = r'''

/* AGRIVA_FARMER_SECTION_HEADINGS_FIX */

/*
   Farmer dashboard section titles.
   Keep them readable regardless of the page surface.
*/

.agriva-section-heading {
  color: #0f172a !important;
  opacity: 1 !important;
  text-shadow: none !important;
}


/* Current farmer dark layout keeps these separators
   on a light page surface, so use strong dark-green text. */

.agriva-dark .agriva-section-heading {
  color: #062d20 !important;
  opacity: 1 !important;
  text-shadow: none !important;
}


/* Also cover root global dark state */

html.dark .agriva-dark .agriva-section-heading,
html[data-theme="dark"]
  .agriva-dark
  .agriva-section-heading {
  color: #062d20 !important;
}

'''

if marker not in css:
    CSS.write_text(
        css.rstrip() + "\n" + patch + "\n",
        encoding="utf-8",
        newline="\n"
    )

print()
print("Headings patched:", changed)
print("FARMER SECTION HEADINGS FIX COMPLETE ✅")
print("Backup:", BACKUP)
