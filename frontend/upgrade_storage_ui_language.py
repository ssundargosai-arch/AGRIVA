from pathlib import Path
import shutil

ROOT = Path(r"D:\AGRIVA\frontend")

page = (
    ROOT /
    "app/dashboard/farmer/storage/page.tsx"
)

language_selector = (
    ROOT /
    "components/LanguageSelector.tsx"
)

if not page.exists():
    raise RuntimeError(
        "Storage page not found."
    )

if not language_selector.exists():
    raise RuntimeError(
        "LanguageSelector.tsx not found. "
        "No changes were made."
    )


# =========================================================
# SAFE BACKUP OUTSIDE app/
# =========================================================

backup_dir = Path(
    r"D:\AGRIVA\frontend_source_backups"
)

backup_dir.mkdir(
    parents=True,
    exist_ok=True,
)

backup = (
    backup_dir /
    "storage-page-before-color-language.tsx"
)

shutil.copy2(
    page,
    backup,
)

text = page.read_text(
    encoding="utf-8-sig"
)


# =========================================================
# LANGUAGE SELECTOR IMPORT
# =========================================================

import_anchor = (
    'import { useRouter } '
    'from "next/navigation";'
)

language_import = (
    'import LanguageSelector '
    'from "@/components/LanguageSelector";'
)

if language_import not in text:
    if import_anchor not in text:
        raise RuntimeError(
            "Could not find navigation import."
        )

    text = text.replace(
        import_anchor,
        import_anchor
        + "\n"
        + language_import,
        1,
    )


# =========================================================
# ADD MISSING LOCALIZED TEXT
# =========================================================

en_old = '''    genericError:
      "Unable to load AGRIVA Storage Network.",
  },'''

en_new = '''    genericError:
      "Unable to load AGRIVA Storage Network.",
    invalidInput:
      "Enter a valid quantity and storage period.",
    language: "Language",
    demoBadge: "Demo directory",
  },'''

hi_old = '''    genericError: "AGRIVA भंडारण नेटवर्क लोड नहीं हो सका।",
  },'''

hi_new = '''    genericError: "AGRIVA भंडारण नेटवर्क लोड नहीं हो सका।",
    invalidInput:
      "सही मात्रा और भंडारण अवधि दर्ज करें।",
    language: "भाषा",
    demoBadge: "डेमो डायरेक्टरी",
  },'''

mr_old = '''    genericError: "AGRIVA साठवण नेटवर्क लोड झाले नाही.",
  },
} as const;'''

mr_new = '''    genericError: "AGRIVA साठवण नेटवर्क लोड झाले नाही.",
    invalidInput:
      "योग्य प्रमाण आणि साठवण कालावधी भरा.",
    language: "भाषा",
    demoBadge: "डेमो डायरेक्टरी",
  },
} as const;'''

for old, new, name in [
    (en_old, en_new, "English"),
    (hi_old, hi_new, "Hindi"),
    (mr_old, mr_new, "Marathi"),
]:
    if old in text:
        text = text.replace(
            old,
            new,
            1,
        )
        print(
            f"UPDATED: {name} storage copy"
        )
    elif "invalidInput" not in text:
        raise RuntimeError(
            f"Could not patch {name} copy."
        )


# =========================================================
# LOCALIZE REMAINING ERROR
# =========================================================

text = text.replace(
'''      setError(
        "Enter a valid quantity and storage period."
      );''',
'''      setError(
        copy.invalidInput
      );''',
)


# =========================================================
# HEADER:
# BACK BUTTON + LANGUAGE SELECTOR
# =========================================================

old_header = '''          <button
            onClick={() =>
              router.push(
                "/dashboard/farmer"
              )
            }
            className="inline-flex items-center gap-2 text-sm font-bold text-emerald-700 hover:text-emerald-900 dark:text-emerald-300"
          >
            <ArrowLeft className="h-4 w-4" />
            {copy.back}
          </button>

          <div className="mt-8 inline-flex'''

new_header = '''          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <button
              onClick={() =>
                router.push(
                  "/dashboard/farmer"
                )
              }
              className="inline-flex items-center gap-2 text-sm font-black text-emerald-800 transition hover:text-emerald-950 dark:text-emerald-300 dark:hover:text-emerald-100"
            >
              <ArrowLeft className="h-4 w-4" />
              {copy.back}
            </button>

            <div className="flex items-center gap-3 self-start rounded-2xl border border-emerald-200 bg-white/90 px-3 py-2 shadow-sm backdrop-blur dark:border-emerald-900 dark:bg-slate-900/90 sm:self-auto">
              <span className="hidden text-xs font-black uppercase tracking-[0.14em] text-emerald-800 dark:text-emerald-300 sm:inline">
                {copy.language}
              </span>

              <LanguageSelector />
            </div>
          </div>

          <div className="mt-8 inline-flex'''

if old_header not in text:
    if "<LanguageSelector />" not in text:
        raise RuntimeError(
            "Could not locate Storage header."
        )
else:
    text = text.replace(
        old_header,
        new_header,
        1,
    )


# =========================================================
# AGRIVA COLOR SYSTEM
# =========================================================

replacements = {
    # Main background
    'bg-[#f4f8f3] text-slate-900':
        'bg-[#f7faf7] text-slate-900',

    # Hero
    'border-b border-emerald-100 bg-gradient-to-br from-white via-emerald-50 to-green-100':
        'border-b border-emerald-200 bg-gradient-to-br from-[#f8fff9] via-[#eafff0] to-[#fff7df]',

    # Main title
    'className="mt-5 max-w-4xl text-4xl font-black tracking-tight sm:text-5xl"':
        'className="mt-5 max-w-4xl text-4xl font-black tracking-tight text-emerald-950 sm:text-5xl dark:text-emerald-50"',

    # Hero description
    'text-lg leading-8 text-slate-600':
        'text-lg font-medium leading-8 text-slate-700',

    # Prototype box
    'border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900':
        'border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 p-4 text-sm text-amber-950',

    # General cards
    'rounded-3xl border border-slate-200 bg-white p-6 shadow-sm':
        'rounded-3xl border border-emerald-100 bg-white p-6 shadow-[0_10px_35px_rgba(15,118,110,0.08)]',

    # Selected storage facility
    'border-emerald-500 bg-emerald-50 shadow-md dark:bg-emerald-950/30':
        'border-emerald-600 bg-gradient-to-br from-emerald-50 to-green-50 shadow-md ring-2 ring-emerald-100 dark:bg-emerald-950/30 dark:ring-emerald-900',

    # Unselected
    'border-slate-200 hover:border-emerald-300':
        'border-slate-200 bg-white hover:border-emerald-400 hover:bg-emerald-50/40',

    # Estimate panel
    'border border-emerald-200 bg-emerald-50 p-6 shadow-sm':
        'border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-amber-50 p-6 shadow-[0_10px_35px_rgba(5,150,105,0.10)]',

    # Calculate button
    'bg-slate-900 px-5 py-3 font-black text-white hover:bg-slate-800 disabled:opacity-50':
        'bg-emerald-700 px-5 py-3 font-black text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-emerald-200 disabled:text-emerald-700 disabled:opacity-100',

    # Send request button
    'bg-emerald-700 px-5 py-3 font-black text-white hover:bg-emerald-800 disabled:opacity-50':
        'bg-emerald-700 px-5 py-3 font-black text-white shadow-md transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-emerald-200 disabled:text-emerald-700 disabled:opacity-100',
}

for old, new in replacements.items():
    if old in text:
        text = text.replace(
            old,
            new,
        )


# =========================================================
# MAKE SECTION TITLES AGRIVA GREEN
# =========================================================

text = text.replace(
    'className="text-2xl font-black"',
    'className="text-2xl font-black text-emerald-950 dark:text-emerald-50"',
)

text = text.replace(
    'className="text-xl font-black"',
    'className="text-xl font-black text-emerald-950 dark:text-emerald-50"',
)


# =========================================================
# ADD DATA MODE BADGE TO FACILITY CARDS
# =========================================================

old_facility_type = '''                          <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">
                            {facility.facility_type ===
                            "COLD_STORAGE"
                              ? copy.coldStorage
                              : copy.warehouse}
                          </p>'''

new_facility_type = '''                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">
                              {facility.facility_type ===
                              "COLD_STORAGE"
                                ? copy.coldStorage
                                : copy.warehouse}
                            </p>

                            {facility.data_mode ===
                              "DEMO_DIRECTORY" && (
                              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
                                {copy.demoBadge}
                              </span>
                            )}
                          </div>'''

if old_facility_type in text:
    text = text.replace(
        old_facility_type,
        new_facility_type,
        1,
    )


# =========================================================
# SAVE
# =========================================================

page.write_text(
    text,
    encoding="utf-8",
    newline="\n",
)

print()
print(
    "AGRIVA STORAGE UI UPDATED"
)
print(
    "Palette: Emerald + Cream + Saffron + Cold Blue"
)
print(
    "Languages: English + Hindi + Marathi"
)
print(
    "LanguageSelector: integrated"
)
print(
    "Backup:",
    backup
)
