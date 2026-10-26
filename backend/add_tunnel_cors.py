from pathlib import Path
import shutil

path = Path(r"D:\AGRIVA\backend\app\main.py")
backup = path.with_name("main.py.before-tunnel-cors")

shutil.copy2(path, backup)

text = path.read_text(encoding="utf-8-sig")

origin = (
    '        "https://made-empty-inclusion-rhythm.'
    'trycloudflare.com",\n'
)

anchor = '        "http://127.0.0.1:3001",\n'

if (
    "https://made-empty-inclusion-rhythm.trycloudflare.com"
    not in text
):
    if anchor not in text:
        raise RuntimeError("CORS block anchor not found")

    text = text.replace(
        anchor,
        anchor + origin,
        1
    )

    path.write_text(
        text,
        encoding="utf-8",
        newline="\n"
    )

    print("Cloudflare frontend CORS added ✅")
else:
    print("Cloudflare frontend CORS already present ✅")

print("Backup:", backup)
