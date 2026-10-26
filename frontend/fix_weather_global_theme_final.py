from pathlib import Path
import re
import shutil

path = Path(
    r"D:\AGRIVA\frontend\app\dashboard\farmer\weather\page.tsx"
)

backup = Path(
    r"D:\AGRIVA\frontend_source_backups\weather.before-global-theme-final.tsx"
)

backup.parent.mkdir(
    parents=True,
    exist_ok=True
)

shutil.copy2(path, backup)

text = path.read_text(
    encoding="utf-8-sig"
)

original = text


# =========================================================
# 1. IMPORT GLOBAL THEME
# =========================================================

theme_import = (
    'import { useTheme } '
    'from "@/app/components/ThemeProvider";'
)

if theme_import not in text:

    match = re.search(
        r'import[\s\S]*?from "next-intl";',
        text
    )

    if not match:
        raise RuntimeError(
            'next-intl import not found.'
        )

    insert_at = match.end()

    text = (
        text[:insert_at]
        + "\n"
        + theme_import
        + text[insert_at:]
    )


# =========================================================
# 2. REPLACE LOCAL THEME STATE
# =========================================================

old_state = '''  const [theme, setTheme] =
    useState<"light" | "dark">("light");'''

new_state = '''  const { theme } = useTheme();'''

if old_state not in text:
    raise RuntimeError(
        "Local Weather theme state not found."
    )

text = text.replace(
    old_state,
    new_state,
    1
)


# =========================================================
# 3. REMOVE LOCAL THEME INITIALIZATION
#    KEEP WEATHER LOADING
# =========================================================

effect_pattern = re.compile(
    r'''  useEffect\(\(\) => \{\s*
    const savedTheme =\s*
      localStorage\.getItem\(\s*
        "agriva_theme"\s*
      \);\s*

    if \(\s*
      savedTheme === "light" \|\|\s*
      savedTheme === "dark"\s*
    \) \{\s*
      setTheme\(savedTheme\);\s*
    \} else \{\s*
      setTheme\(\s*
        window\.matchMedia\?\.\(\s*
          "\(prefers-color-scheme: dark\)"\s*
        \)\.matches\s*
          \? "dark"\s*
          : "light"\s*
      \);\s*
    \}\s*

    void loadWeather\(\);\s*

    // eslint-disable-next-line react-hooks/exhaustive-deps\s*
  \}, \[\]\);''',
    re.VERBOSE,
)

new_effect = '''  useEffect(() => {
    void loadWeather();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);'''

text, count = effect_pattern.subn(
    new_effect,
    text,
    count=1
)

if count != 1:
    raise RuntimeError(
        "Weather theme initialization block not found."
    )


# =========================================================
# 4. REMOVE LOCAL toggleTheme FUNCTION
# =========================================================

toggle_pattern = re.compile(
    r'''  function toggleTheme\(\) \{
    setTheme\(\(current\) => \{
      const next =
        current === "dark"
          \? "light"
          : "dark";

      localStorage\.setItem\(
        "agriva_theme",
        next
      \);

      return next;
    \}\);
  \}


''',
    re.VERBOSE,
)

text, count = toggle_pattern.subn(
    "",
    text,
    count=1
)

if count != 1:
    raise RuntimeError(
        "Weather toggleTheme function not found."
    )


# =========================================================
# 5. REMOVE DUPLICATE TOP-RIGHT THEME BUTTON
# =========================================================

button_pattern = re.compile(
    r'''
          <button
            type="button"
            onClick=\{toggleTheme\}
            className="rounded-xl border border-emerald-100 bg-white/90 px-4 py-2 text-sm font-bold text-slate-700 shadow-sm backdrop-blur"
          >
            \{theme === "dark"
              \? "[^"]*Light"
              : "[^"]*Dark"\}
          </button>
''',
    re.VERBOSE,
)

text, count = button_pattern.subn(
    "",
    text,
    count=1
)

if count != 1:
    raise RuntimeError(
        "Duplicate Weather theme button not found."
    )


# =========================================================
# 6. IMPROVE BACK BUTTON COLOR
# =========================================================

old_back_class = (
    'className="rounded-xl border border-emerald-100 '
    'bg-white/90 px-4 py-2 text-sm font-bold '
    'text-slate-700 shadow-sm backdrop-blur transition '
    'hover:-translate-y-0.5 hover:shadow-md"'
)

new_back_class = (
    'className="rounded-xl border border-emerald-200 '
    'bg-white/95 px-4 py-2 text-sm font-bold '
    'text-slate-700 shadow-sm backdrop-blur transition '
    'hover:-translate-y-0.5 hover:border-emerald-400 '
    'hover:shadow-md '
    'dark:border-emerald-800 '
    'dark:bg-[#0D2015]/95 '
    'dark:text-slate-100 '
    'dark:hover:border-emerald-600"'
)

if old_back_class not in text:
    raise RuntimeError(
        "Weather Back button class not found."
    )

text = text.replace(
    old_back_class,
    new_back_class,
    1
)


# =========================================================
# SAFETY
# =========================================================

if "onClick={toggleTheme}" in text:
    raise RuntimeError(
        "Duplicate local theme control still exists."
    )

if "setTheme(" in text:
    raise RuntimeError(
        "Local Weather setTheme still exists."
    )

if text == original:
    raise RuntimeError(
        "No changes were made."
    )


path.write_text(
    text,
    encoding="utf-8",
    newline="\n"
)

print("Weather now uses global AGRIVA theme ✅")
print("Duplicate top-right theme button removed ✅")
print("Back button colors improved ✅")
print()
print("WEATHER GLOBAL THEME FINALIZED ✅")
print("Backup:", backup)
