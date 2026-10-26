from pathlib import Path
import json
import re

ROOT = Path(r"D:\AGRIVA\frontend")

page = (ROOT / "app" / "page.tsx").read_text(
    encoding="utf-8-sig"
)

keys = sorted(set(
    re.findall(
        r'''(?<![A-Za-z0-9_])t\(\s*["']([^"']+)["']''',
        page
    )
))

def exists(data, key):
    current = data

    for part in key.split("."):
        if not isinstance(current, dict):
            return False
        if part not in current:
            return False
        current = current[part]

    return True

print("Homepage translation keys:", len(keys))
print()

failed = False

for locale in ["en", "hi", "mr"]:
    path = ROOT / "locales" / f"{locale}.json"

    data = json.loads(
        path.read_text(encoding="utf-8-sig")
    )

    missing = [
        key for key in keys
        if not exists(data, key)
    ]

    print(f"=== {locale.upper()} ===")

    if missing:
        failed = True
        for key in missing:
            print("MISSING:", key)
    else:
        print("PASS ✅")

    print()

if failed:
    print("TRANSLATION AUDIT FAILED ❌")
else:
    print("HOMEPAGE TRANSLATION AUDIT PASS ✅")
