from pathlib import Path
import re
import shutil

path = Path(r"D:\AGRIVA\frontend\app\layout.tsx")
backup = path.with_name("layout.before-next-script-fix.tsx")

shutil.copy2(path, backup)

text = path.read_text(encoding="utf-8-sig")

# Add Next.js Script import
if 'from "next/script"' not in text:
    # Prefer adding after next imports
    match = re.search(
        r'((?:import .*?;\s*)+)',
        text,
        flags=re.DOTALL,
    )

    if not match:
        raise RuntimeError("Import section not found.")

    insert_at = match.end()

    text = (
        text[:insert_at]
        + '\nimport Script from "next/script";\n'
        + text[insert_at:]
    )

# Replace the inline React <script> used by themeBootScript
pattern = re.compile(
    r'<script\s*'
    r'dangerouslySetInnerHTML=\{\{\s*'
    r'__html:\s*themeBootScript\s*,?\s*'
    r'\}\}\s*'
    r'/?>'
    r'(?:\s*</script>)?',
    flags=re.DOTALL,
)

replacement = '''<Script
          id="agriva-theme-boot"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: themeBootScript,
          }}
        />'''

text, count = pattern.subn(
    replacement,
    text,
    count=1,
)

if count != 1:
    raise RuntimeError(
        f"Theme script block replacement count = {count}. "
        "No safe automatic replacement was made."
    )

path.write_text(
    text,
    encoding="utf-8",
    newline="\n",
)

print("NEXT.JS THEME SCRIPT FIXED")
print("Backup:", backup)
