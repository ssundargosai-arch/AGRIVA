from pathlib import Path
import re
import shutil

path = Path(r"D:\AGRIVA\frontend\app\layout.tsx")

shutil.copy2(
    path,
    path.with_name("layout.before-remove-theme-script.tsx")
)

text = path.read_text(encoding="utf-8-sig")

# Remove next/script import
text = re.sub(
    r'import\s+Script\s+from\s+"next/script";\s*\n?',
    "",
    text,
)

# Remove <Script ... themeBootScript ... />
text, count_script = re.subn(
    r'<Script\b.*?themeBootScript.*?/>',
    "",
    text,
    count=1,
    flags=re.DOTALL,
)

# Remove old normal <script> version too, if somehow still present
if count_script == 0:
    text, count_script = re.subn(
        r'<script\b.*?themeBootScript.*?</script>',
        "",
        text,
        count=1,
        flags=re.DOTALL,
    )

# Remove themeBootScript constant itself if it still exists.
text, count_const = re.subn(
    r'const\s+themeBootScript\s*=\s*`.*?`;\s*',
    "",
    text,
    count=1,
    flags=re.DOTALL,
)

path.write_text(
    text,
    encoding="utf-8",
    newline="\n"
)

print("Theme script blocks removed:", count_script)
print("Theme boot constant removed:", count_const)
print("ROOT LAYOUT SCRIPT-FREE")
