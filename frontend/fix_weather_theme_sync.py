from pathlib import Path
import re
import shutil

path = Path(
    r"D:\AGRIVA\frontend\app\dashboard\farmer\weather\page.tsx"
)

backup = Path(
    r"D:\AGRIVA\frontend_source_backups\weather.before-theme-sync.tsx"
)

backup.parent.mkdir(
    parents=True,
    exist_ok=True
)

shutil.copy2(
    path,
    backup
)

text = path.read_text(
    encoding="utf-8-sig"
)

original = text


# ---------------------------------------------------------
# 1. Import global AGRIVA theme
# ---------------------------------------------------------

theme_import = (
    'import { useTheme } '
    'from "@/app/components/ThemeProvider";'
)

if theme_import not in text:

    # Insert before first local component import if possible
    import_anchor = (
        'import LanguageSelector '
        'from "@/components/LanguageSelector";'
    )

    if import_anchor in text:
        text = text.replace(
            import_anchor,
            theme_import
            + "\n"
            + import_anchor,
            1
        )
    else:
        # safe insertion after "use client";
        anchor = '"use client";'

        if anchor not in text:
            raise RuntimeError(
                'Could not find "use client" anchor.'
            )

        text = text.replace(
            anchor,
            anchor
            + "\n\n"
            + theme_import,
            1
        )


# ---------------------------------------------------------
# 2. Keep existing local variable but synchronize it
#    with AGRIVA global theme.
# ---------------------------------------------------------

state_pattern = re.compile(
    r'const\s+\[theme,\s*setTheme\]\s*=\s*'
    r'useState<"light"\s*\|\s*"dark">\("light"\);'
)

match = state_pattern.search(text)

if not match:
    raise RuntimeError(
        "Weather local theme state not found. "
        "No file written."
    )

replacement = (
    'const { theme: globalTheme } = useTheme();\n'
    '  const [theme, setTheme] = '
    'useState<"light" | "dark">(globalTheme);'
)

text = state_pattern.sub(
    replacement,
    text,
    count=1
)


# ---------------------------------------------------------
# 3. Replace old localStorage theme initialization
#    with synchronization from ThemeProvider.
# ---------------------------------------------------------

effect_pattern = re.compile(
    r'useEffect\(\(\)\s*=>\s*\{\s*'
    r'const\s+savedTheme\s*=\s*'
    r'localStorage\.getItem\(\s*"agriva_theme"\s*\);'
    r'.*?'
    r'\},\s*\[\]\s*\);',
    re.DOTALL
)

effect_match = effect_pattern.search(text)

if not effect_match:
    raise RuntimeError(
        "Weather theme initialization effect not found. "
        "No file written."
    )

sync_effect = '''useEffect(() => {
    setTheme(globalTheme);
  }, [globalTheme]);'''

text = effect_pattern.sub(
    sync_effect,
    text,
    count=1
)


# ---------------------------------------------------------
# 4. Hide/remove duplicate Weather theme button.
#    We keep code reference temporarily for safest build,
#    but button is no longer rendered.
# ---------------------------------------------------------

button_pattern = re.compile(
    r'(<button\b[^>]*?'
    r'onClick=\{toggleTheme\}'
    r'[^>]*?)>',
    re.DOTALL
)

button_match = button_pattern.search(text)

if not button_match:
    raise RuntimeError(
        "Duplicate Weather theme button not found. "
        "No file written."
    )

opening = button_match.group(1)

if 'style={{ display: "none" }}' not in opening:
    new_opening = (
        opening
        + '\n            style={{ display: "none" }}'
    )

    text = (
        text[:button_match.start()]
        + new_opening
        + ">"
        + text[button_match.end():]
    )


# ---------------------------------------------------------
# 5. Add explicit weather theme colors.
# ---------------------------------------------------------

marker = "/* AGRIVA_WEATHER_THEME_SYNC_FINAL */"

if marker not in text:

    style_anchor = "</style>"

    css = r'''

        /* AGRIVA_WEATHER_THEME_SYNC_FINAL */

        .agriva-weather-dark {
          background: #06140f !important;
          color: #f8fafc !important;
        }

        .agriva-weather-dark h1,
        .agriva-weather-dark h2,
        .agriva-weather-dark h3 {
          color: #f8fafc !important;
        }

        .agriva-weather-dark .agriva-current-weather {
          background: rgba(8, 31, 21, 0.94) !important;
          border-color: #315846 !important;
        }

        .agriva-weather-dark
        .agriva-current-weather
        :where(h1, h2, h3, p) {
          color: #f8fafc !important;
        }

        .agriva-weather-dark
        .agriva-current-weather
        .text-slate-500,
        .agriva-weather-dark
        .agriva-current-weather
        .text-slate-600 {
          color: #cbd5e1 !important;
        }

        .agriva-weather-dark
        :where(input, select, textarea) {
          background: #0b2118 !important;
          border-color: #315846 !important;
          color: #f8fafc !important;
        }

        .agriva-weather-dark
        :where(input, textarea)::placeholder {
          color: #94a3b8 !important;
        }

        .agriva-weather-dark
        button {
          border-color: #315846;
        }

'''

    if style_anchor not in text:
        raise RuntimeError(
            "</style> not found in Weather page."
        )

    text = text.replace(
        style_anchor,
        css + "\n      " + style_anchor,
        1
    )


if text == original:
    raise RuntimeError(
        "No modifications were made."
    )

path.write_text(
    text,
    encoding="utf-8",
    newline="\n"
)

print("Global AGRIVA theme connected ✅")
print("Duplicate Weather theme button removed ✅")
print("Weather light/dark colors synchronized ✅")
print()
print("WEATHER THEME CLEANUP COMPLETE ✅")
print("Backup:", backup)
