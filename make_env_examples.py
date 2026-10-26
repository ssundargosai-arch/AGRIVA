from pathlib import Path
import re

LIVE = Path(r"D:\AGRIVA")
PKG = Path(r"D:\AGRIVA_FINAL_SUBMISSION\AGRIVA")

def read_env(path):
    rows = []
    if not path.exists():
        return rows

    for raw in path.read_text(
        encoding="utf-8-sig",
        errors="replace"
    ).splitlines():
        line = raw.strip()

        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        rows.append((key.strip(), value.strip()))

    return rows


def safe_value(key, value):
    upper = key.upper()

    if upper == "DATABASE_URL":
        db = "agriva_db"

        m = re.search(
            r"/([^/?]+)(?:\?.*)?$",
            value.strip("'\"")
        )

        if m:
            db = m.group(1)

        return (
            "postgresql+psycopg://"
            "postgres:YOUR_POSTGRES_PASSWORD"
            f"@localhost:5432/{db}"
        )

    if upper == "DATA_GOV_API_KEY":
        return "YOUR_DATA_GOV_API_KEY"

    sensitive = (
        "PASSWORD",
        "SECRET",
        "TOKEN",
        "API_KEY",
        "PRIVATE_KEY",
        "ACCESS_KEY",
        "CLIENT_SECRET",
    )

    if any(word in upper for word in sensitive):
        return "CHANGE_ME"

    return value.strip("'\"")


backend = read_env(
    LIVE / "backend" / ".env"
)

if not backend:
    raise RuntimeError(
        "D:\\AGRIVA\\backend\\.env not found."
    )

backend_out = [
    "# AGRIVA Backend Environment Example",
    "# Copy to .env and replace placeholders.",
    "",
]

for key, value in backend:
    backend_out.append(
        f"{key}={safe_value(key, value)}"
    )

(
    PKG / "backend" / ".env.example"
).write_text(
    "\n".join(backend_out) + "\n",
    encoding="utf-8"
)


frontend_out = """# AGRIVA Frontend Environment Example

NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
"""

(
    PKG / "frontend" / ".env.example"
).write_text(
    frontend_out,
    encoding="utf-8"
)

print("Backend .env.example CREATED ✅")
print("Frontend .env.example CREATED ✅")
