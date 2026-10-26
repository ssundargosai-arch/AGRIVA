from pathlib import Path
import json
import re
import shutil

root = Path(r"D:\AGRIVA\frontend")
page = root / "app" / "marketplace" / "page.tsx"

shutil.copy2(
    page,
    page.with_name("page.before-visible-marathi-fix.tsx")
)

text = page.read_text(encoding="utf-8")

# =========================================================
# useLocale import
# =========================================================

text = text.replace(
    'import { useTranslations } from "next-intl";',
    'import { useLocale, useTranslations } from "next-intl";'
)

# =========================================================
# HELPERS
# =========================================================

marker = "export default function MarketplacePage()"

helper = r'''
function localizeMarketplaceCrop(
  crop: string,
  locale: string
) {
  const value = (crop || "").trim().toLowerCase();

  const crops: Record<string, Record<string, string>> = {
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

  return crops[value]?.[locale] || crop;
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
    text = text.replace(marker, helper + marker)

# =========================================================
# locale inside component
# =========================================================

needle = 'const t = useTranslations("marketplacePage");'

if needle in text and "const locale = useLocale();" not in text:
    text = text.replace(
        needle,
        needle + '\n  const locale = useLocale();'
    )

# =========================================================
# EXACT JSX REPLACEMENTS
# =========================================================

# Listing crop heading
text, n1 = re.subn(
    r"\{\s*listing\.crop\s*\}",
    "{localizeMarketplaceCrop(listing.crop, locale)}",
    text,
)

# Listing status
text, n2 = re.subn(
    r"\{\s*listing\.status\s*\}",
    "{localizeMarketplaceStatus(listing.status, locale)}",
    text,
)

# Buyer section selected crop
text = text.replace(
    "crop:\n                              selectedListing.crop,",
    "crop:\n                              localizeMarketplaceCrop(selectedListing.crop, locale),"
)

# Fallback if indentation differs
text = re.sub(
    r"crop:\s*selectedListing\.crop,",
    "crop: localizeMarketplaceCrop(selectedListing.crop, locale),",
    text,
)

# Order modal crop
text, n3 = re.subn(
    r"\{\s*orderingListing\.crop\s*\}",
    "{localizeMarketplaceCrop(orderingListing.crop, locale)}",
    text,
)

# Remove from Market button
text, n4 = re.subn(
    r">\s*Remove\s+from\s+Market\s*<",
    '>{t("removeFromMarket")}<',
    text,
)

# Place Order
text, n5 = re.subn(
    r">\s*Place Order\s*<",
    '>{t("placeOrder")}<',
    text,
)

page.write_text(
    text,
    encoding="utf-8",
    newline="\n"
)

print("crop replacements:", n1)
print("status replacements:", n2)
print("order crop replacements:", n3)
print("remove button replacements:", n4)
print("place order replacements:", n5)

# =========================================================
# LOCALE KEYS
# =========================================================

values = {
    "en": {
        "removeFromMarket": "Remove from Market",
        "placeOrder": "Place Order",
    },
    "hi": {
        "removeFromMarket": "बाज़ार से हटाएँ",
        "placeOrder": "ऑर्डर करें",
    },
    "mr": {
        "removeFromMarket": "बाजारातून काढा",
        "placeOrder": "ऑर्डर करा",
    },
}

for locale, entries in values.items():
    path = root / "locales" / f"{locale}.json"

    with path.open("r", encoding="utf-8-sig") as f:
        data = json.load(f)

    data["marketplacePage"].update(entries)

    with path.open("w", encoding="utf-8", newline="\n") as f:
        json.dump(
            data,
            f,
            ensure_ascii=False,
            indent=2,
        )
        f.write("\n")

print("VISIBLE MARKETPLACE I18N FIX COMPLETE")
