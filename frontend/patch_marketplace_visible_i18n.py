from pathlib import Path
import json
import shutil

root = Path(r"D:\AGRIVA\frontend")
page = root / "app" / "marketplace" / "page.tsx"

shutil.copy2(
    page,
    page.with_name("page.before-crop-status-i18n.tsx")
)

text = page.read_text(encoding="utf-8")

# ---------------------------------------------------------
# useLocale import
# ---------------------------------------------------------
text = text.replace(
    'import { useTranslations } from "next-intl";',
    'import { useLocale, useTranslations } from "next-intl";'
)

# ---------------------------------------------------------
# Add localization helpers before component
# ---------------------------------------------------------
marker = "export default function MarketplacePage()"

helper = r'''
function localizeMarketplaceCrop(
  crop: string,
  locale: string
) {
  const key = (crop || "").trim().toLowerCase();

  const names: Record<
    string,
    Record<string, string>
  > = {
    wheat: {
      en: "Wheat",
      hi: "गेहूं",
      mr: "गहू",
    },
    maize: {
      en: "Maize",
      hi: "मक्का",
      mr: "मका",
    },
    rice: {
      en: "Rice",
      hi: "चावल",
      mr: "तांदूळ",
    },
    soybean: {
      en: "Soybean",
      hi: "सोयाबीन",
      mr: "सोयाबीन",
    },
    cotton: {
      en: "Cotton",
      hi: "कपास",
      mr: "कापूस",
    },
    onion: {
      en: "Onion",
      hi: "प्याज",
      mr: "कांदा",
    },
    tomato: {
      en: "Tomato",
      hi: "टमाटर",
      mr: "टोमॅटो",
    },
    potato: {
      en: "Potato",
      hi: "आलू",
      mr: "बटाटा",
    },
    sugarcane: {
      en: "Sugarcane",
      hi: "गन्ना",
      mr: "ऊस",
    },
  };

  return names[key]?.[locale] || crop;
}

function localizeMarketplaceStatus(
  status: string,
  locale: string
) {
  const value = (status || "").trim().toLowerCase();

  if (value === "active") {
    if (locale === "mr") return "सक्रिय";
    if (locale === "hi") return "सक्रिय";
    return "Active";
  }

  if (value === "sold") {
    if (locale === "mr") return "विकले";
    if (locale === "hi") return "बिक गया";
    return "Sold";
  }

  if (value === "inactive") {
    if (locale === "mr") return "निष्क्रिय";
    if (locale === "hi") return "निष्क्रिय";
    return "Inactive";
  }

  return status;
}

'''

if "function localizeMarketplaceCrop(" not in text:
    text = text.replace(
        marker,
        helper + marker
    )

# ---------------------------------------------------------
# locale variable
# ---------------------------------------------------------
needle = 'const t = useTranslations("marketplacePage");'

if needle in text and "const locale = useLocale();" not in text:
    text = text.replace(
        needle,
        needle + '\n  const locale = useLocale();'
    )

# ---------------------------------------------------------
# Replace visible crop title
# ---------------------------------------------------------
text = text.replace(
    "{listing.crop}",
    "{localizeMarketplaceCrop(listing.crop, locale)}"
)

# In case selected listing crop appears elsewhere
text = text.replace(
    "{selectedListing.crop}",
    "{localizeMarketplaceCrop(selectedListing.crop, locale)}"
)

# ---------------------------------------------------------
# Replace visible status
# ---------------------------------------------------------
text = text.replace(
    "{listing.status}",
    "{localizeMarketplaceStatus(listing.status, locale)}"
)

# ---------------------------------------------------------
# Remove from Market translation
# ---------------------------------------------------------
text = text.replace(
    "Remove from Market",
    '{t("removeFromMarket")}'
)

page.write_text(
    text,
    encoding="utf-8",
    newline="\n"
)

# ---------------------------------------------------------
# Locale keys
# ---------------------------------------------------------
values = {
    "en": "Remove from Market",
    "hi": "बाज़ार से हटाएँ",
    "mr": "बाजारातून काढा",
}

for locale_name in ("en", "hi", "mr"):
    p = root / "locales" / f"{locale_name}.json"

    with p.open("r", encoding="utf-8-sig") as f:
        data = json.load(f)

    data["marketplacePage"]["removeFromMarket"] = values[locale_name]

    with p.open("w", encoding="utf-8", newline="\n") as f:
        json.dump(
            data,
            f,
            ensure_ascii=False,
            indent=2,
        )
        f.write("\n")

print("MARKETPLACE CROP + STATUS + REMOVE LOCALIZATION PATCHED")
