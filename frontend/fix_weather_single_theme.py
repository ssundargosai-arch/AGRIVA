from pathlib import Path
import shutil

path = Path(
    r"D:\AGRIVA\frontend\app\dashboard\farmer\weather\page.tsx"
)

backup = Path(
    r"D:\AGRIVA\frontend_source_backups\weather.before-global-theme-safe.tsx"
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
# 1. ADD GLOBAL THEME IMPORT
# =========================================================

theme_import = (
    'import { useTheme } '
    'from "@/app/components/ThemeProvider";'
)

if theme_import not in text:
    anchor = 'from "next-intl";'

    pos = text.find(anchor)

    if pos == -1:
        raise RuntimeError(
            'next-intl import anchor not found.'
        )

    line_end = text.find(
        "\n",
        pos
    )

    text = (
        text[:line_end + 1]
        + theme_import
        + "\n"
        + text[line_end + 1:]
    )


# =========================================================
# 2. REPLACE WEATHER LOCAL THEME STATE
# =========================================================

old_state = '''  const [theme, setTheme] =
    useState<"light" | "dark">("light");'''

new_state = '''  const { theme } = useTheme();'''

if old_state not in text:
    raise RuntimeError(
        "Weather local theme state not found."
    )

text = text.replace(
    old_state,
    new_state,
    1
)


# =========================================================
# 3. REPLACE THEME INITIALIZATION EFFECT
# =========================================================

ui_anchor = "  function ui("

ui_pos = text.find(ui_anchor)

if ui_pos == -1:
    raise RuntimeError(
        "ui() function anchor not found."
    )

effect_start = text.find(
    "  useEffect(() => {",
    ui_pos
)

if effect_start == -1:
    raise RuntimeError(
        "Weather initialization effect not found."
    )

effect_end_marker = "  }, []);"

effect_end = text.find(
    effect_end_marker,
    effect_start
)

if effect_end == -1:
    raise RuntimeError(
        "Weather effect end not found."
    )

effect_end += len(effect_end_marker)

old_effect = text[
    effect_start:
    effect_end
]

if (
    'localStorage.getItem' not in old_effect
    or 'agriva_theme' not in old_effect
    or 'void loadWeather();' not in old_effect
):
    raise RuntimeError(
        "Located effect is not the expected "
        "Weather theme initialization effect."
    )

new_effect = '''  useEffect(() => {
    void loadWeather();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);'''

text = (
    text[:effect_start]
    + new_effect
    + text[effect_end:]
)


# =========================================================
# 4. REMOVE LOCAL toggleTheme FUNCTION
# =========================================================

toggle_start = text.find(
    "  function toggleTheme() {"
)

if toggle_start == -1:
    raise RuntimeError(
        "toggleTheme function not found."
    )

next_function = text.find(
    "  async function authorizedFetch",
    toggle_start
)

if next_function == -1:
    raise RuntimeError(
        "authorizedFetch anchor not found."
    )

text = (
    text[:toggle_start]
    + text[next_function:]
)


# =========================================================
# 5. REMOVE TOP-RIGHT DUPLICATE THEME BUTTON
# =========================================================

click_pos = text.find(
    "onClick={toggleTheme}"
)

if click_pos == -1:
    raise RuntimeError(
        "Top-right Weather theme button not found."
    )

button_start = text.rfind(
    "<button",
    0,
    click_pos
)

button_end = text.find(
    "</button>",
    click_pos
)

if (
    button_start == -1
    or button_end == -1
):
    raise RuntimeError(
        "Could not determine duplicate button boundaries."
    )

button_end += len("</button>")

duplicate_button = text[
    button_start:
    button_end
]

if (
    "theme ===" not in duplicate_button
    or "toggleTheme" not in duplicate_button
):
    raise RuntimeError(
        "Located button is not the Weather theme button."
    )

text = (
    text[:button_start]
    + text[button_end:]
)


# =========================================================
# 6. IMPROVE BACK BUTTON CONTRAST
# =========================================================

old_class = (
    'className="rounded-xl border border-emerald-100 '
    'bg-white/90 px-4 py-2 text-sm font-bold '
    'text-slate-700 shadow-sm backdrop-blur transition '
    'hover:-translate-y-0.5 hover:shadow-md"'
)

new_class = (
    'className="rounded-xl border border-emerald-300 '
    'bg-white px-4 py-2 text-sm font-bold '
    'text-slate-800 shadow-sm transition '
    'hover:-translate-y-0.5 hover:border-emerald-500 '
    'hover:shadow-md '
    'dark:border-emerald-700 '
    'dark:bg-[#0D2015] '
    'dark:text-slate-100"'
)

if old_class not in text:
    raise RuntimeError(
        "Back button class not found."
    )

text = text.replace(
    old_class,
    new_class,
    1
)


# =========================================================
# SAFETY CHECKS BEFORE WRITE
# =========================================================

if "const [theme, setTheme]" in text:
    raise RuntimeError(
        "Local theme state still remains."
    )

if "function toggleTheme()" in text:
    raise RuntimeError(
        "Local toggleTheme still remains."
    )

if "onClick={toggleTheme}" in text:
    raise RuntimeError(
        "Duplicate theme button still remains."
    )

if "const { theme } = useTheme();" not in text:
    raise RuntimeError(
        "Global theme hook was not connected."
    )

if text == original:
    raise RuntimeError(
        "No changes were produced."
    )


# =========================================================
# WRITE ONLY AFTER ALL CHECKS PASS
# =========================================================

path.write_text(
    text,
    encoding="utf-8",
    newline="\n"
)

print("Weather uses global AGRIVA theme ✅")
print("Duplicate top-right Dark/Light removed ✅")
print("Weather local theme state removed ✅")
print("Back button contrast improved ✅")
print()
print("WEATHER SINGLE THEME CONTROL COMPLETE ✅")
print("Backup:", backup)
