from pathlib import Path
import shutil

page = Path(
    r"D:\AGRIVA\frontend\app\dashboard\farmer\page.tsx"
)

backup = Path(
    r"D:\AGRIVA\frontend_source_backups\farmer-page.before-hero-final.tsx"
)

backup.parent.mkdir(
    parents=True,
    exist_ok=True,
)

shutil.copy2(page, backup)

text = page.read_text(
    encoding="utf-8-sig"
)

# ---------------------------------------------
# Add next/image import
# ---------------------------------------------

image_import = 'import Image from "next/image";'

if image_import not in text:
    if '"use client";' in text:
        text = text.replace(
            '"use client";',
            '"use client";\n\n' + image_import,
            1,
        )
    elif "'use client';" in text:
        text = text.replace(
            "'use client';",
            "'use client';\n\n" + image_import,
            1,
        )
    else:
        first_import = text.find("import ")

        if first_import == -1:
            raise RuntimeError(
                "Import section not found."
            )

        text = (
            text[:first_import]
            + image_import
            + "\n"
            + text[first_import:]
        )

    print("ADDED: next/image import")
else:
    print("SKIP: next/image import already exists")


# ---------------------------------------------
# Current welcome block
# ---------------------------------------------

old = '''          <p className="text-2xl font-black leading-tight text-[#0F172A] sm:text-3xl">
            {farmer?.name ? t("helloNamed", { name: farmer.name }) : t("helloFallback")}
          </p>
          <p className="mt-2 text-base text-[#334155]">{t("greetingPrompt")}</p>'''

new = '''          <div className="grid items-center gap-6 lg:grid-cols-[1fr_430px]">
            <div className="py-2">
              <p className="text-2xl font-black leading-tight text-[#0F172A] sm:text-3xl lg:text-4xl">
                {farmer?.name
                  ? t("helloNamed", { name: farmer.name })
                  : t("helloFallback")}
              </p>

              <p className="mt-3 text-base text-[#334155] sm:text-lg">
                {t("greetingPrompt")}
              </p>

              <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-800">
                🌾 AGRIVA · Smart Farming
              </div>
            </div>

            <div className="relative h-52 overflow-hidden rounded-3xl border border-emerald-100 bg-emerald-50 shadow-md sm:h-60 lg:h-56">
              <Image
                src="/images/farmer-dashboard-hero.png"
                alt="AGRIVA Farmer Dashboard"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 430px"
                className="object-cover object-center"
              />

              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-emerald-950/10 via-transparent to-transparent" />
            </div>
          </div>'''

if 'src="/images/farmer-dashboard-hero.png"' in text:
    print("SKIP: Farmer hero already present")

elif old in text:
    text = text.replace(
        old,
        new,
        1,
    )

    print("UPDATED: Farmer welcome card")

else:
    raise RuntimeError(
        "Welcome block not found. File was not overwritten."
    )

page.write_text(
    text,
    encoding="utf-8",
    newline="\n",
)

final = page.read_text(
    encoding="utf-8"
)

assert image_import in final
assert 'src="/images/farmer-dashboard-hero.png"' in final

print()
print("FARMER DASHBOARD HERO COMPLETE ✅")
print("Image: /images/farmer-dashboard-hero.png")
print("Desktop: right side")
print("Mobile: below greeting")
print("Backup:", backup)
