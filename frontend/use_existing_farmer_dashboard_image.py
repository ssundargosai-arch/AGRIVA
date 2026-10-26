from pathlib import Path
import re
import shutil

ROOT = Path(r"D:\AGRIVA\frontend")
page = ROOT / "app/dashboard/farmer/page.tsx"

images = []

for ext in ("*.png", "*.jpg", "*.jpeg", "*.webp"):
    images.extend(
        (ROOT / "public").rglob(ext)
    )

matches = [
    p for p in images
    if "farmer" in p.name.lower()
    and (
        "dashboard" in p.name.lower()
        or "dashbord" in p.name.lower()
    )
]

if not matches:
    raise RuntimeError(
        "Farmer dashboard image public folder me nahi mili."
    )

image = matches[0]

url = "/" + image.relative_to(
    ROOT / "public"
).as_posix()

print("USING IMAGE:", image)
print("PUBLIC URL:", url)

backup = Path(
    r"D:\AGRIVA\frontend_source_backups\farmer-page.before-dashboard-image.tsx"
)

backup.parent.mkdir(
    parents=True,
    exist_ok=True
)

shutil.copy2(
    page,
    backup
)

text = page.read_text(
    encoding="utf-8-sig"
)

if 'from "next/image"' not in text:
    text = text.replace(
        '"use client";',
        '"use client";\n\nimport Image from "next/image";',
        1
    )

old = '''          <p className="text-2xl font-black leading-tight text-[#0F172A] sm:text-3xl">
            {farmer?.name ? t("helloNamed", { name: farmer.name }) : t("helloFallback")}
          </p>
          <p className="mt-2 text-base text-[#334155]">{t("greetingPrompt")}</p>'''

new = f'''          <div className="grid items-center gap-5 lg:grid-cols-[1fr_420px]">
            <div>
              <p className="text-2xl font-black leading-tight text-[#0F172A] sm:text-3xl lg:text-4xl">
                {{farmer?.name
                  ? t("helloNamed", {{ name: farmer.name }})
                  : t("helloFallback")}}
              </p>

              <p className="mt-3 text-base text-[#334155] sm:text-lg">
                {{t("greetingPrompt")}}
              </p>
            </div>

            <div className="relative h-52 overflow-hidden rounded-3xl border border-emerald-100 shadow-sm sm:h-60 lg:h-56">
              <Image
                src="{url}"
                alt="AGRIVA Farmer Dashboard"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 420px"
                className="object-cover object-center"
              />
            </div>
          </div>'''

if old in text:
    text = text.replace(
        old,
        new,
        1
    )

elif "AGRIVA Farmer Dashboard" in text:
    text = re.sub(
        r'src="[^"]+"\s+alt="AGRIVA Farmer Dashboard"',
        f'src="{url}"\n                alt="AGRIVA Farmer Dashboard"',
        text,
        count=1
    )

else:
    raise RuntimeError(
        "Greeting hero block nahi mila."
    )

page.write_text(
    text,
    encoding="utf-8",
    newline="\n"
)

print()
print("FARMER DASHBOARD IMAGE CONNECTED ✅")
print("Used:", image.name)
