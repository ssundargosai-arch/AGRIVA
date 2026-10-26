export type FarmerLocale = "mr" | "hi" | "en";

const CROP_LABELS: Record<string, Record<FarmerLocale, string>> = {
  wheat: { mr: "गहू", hi: "गेहूँ", en: "Wheat" },
  maize: { mr: "मका", hi: "मक्का", en: "Maize" },
  corn: { mr: "मका", hi: "मक्का", en: "Corn" },
  onion: { mr: "कांदा", hi: "प्याज", en: "Onion" },
  tomato: { mr: "टोमॅटो", hi: "टमाटर", en: "Tomato" },
  rice: { mr: "तांदूळ", hi: "चावल", en: "Rice" },
  soybean: { mr: "सोयाबीन", hi: "सोयाबीन", en: "Soybean" },
  cotton: { mr: "कापूस", hi: "कपास", en: "Cotton" },
  sugarcane: { mr: "ऊस", hi: "गन्ना", en: "Sugarcane" },
  potato: { mr: "बटाटा", hi: "आलू", en: "Potato" },
  mustard: { mr: "मोहरी", hi: "सरसों", en: "Mustard" },
};

const STATUS_LABELS: Record<string, Record<FarmerLocale, string>> = {
  active: { mr: "सक्रिय", hi: "सक्रिय", en: "Active" },
  removed: { mr: "बाजारातून काढले", hi: "बाज़ार से हटाया", en: "Removed" },
  sold: { mr: "विकले", hi: "बिका हुआ", en: "Sold" },
  inactive: { mr: "निष्क्रिय", hi: "निष्क्रिय", en: "Inactive" },
  pending: { mr: "प्रलंबित", hi: "लंबित", en: "Pending" },
  accepted: { mr: "स्वीकारले", hi: "स्वीकृत", en: "Accepted" },
  confirmed: { mr: "स्वीकारले", hi: "स्वीकृत", en: "Confirmed" },
  completed: { mr: "पूर्ण", hi: "पूर्ण", en: "Completed" },
  rejected: { mr: "नाकारले", hi: "अस्वीकृत", en: "Rejected" },
  cancelled: { mr: "रद्द", hi: "रद्द", en: "Cancelled" },
  canceled: { mr: "रद्द", hi: "रद्द", en: "Cancelled" },
};

export function normalizeFarmerLocale(locale: string): FarmerLocale {
  if (locale.toLowerCase().startsWith("mr")) return "mr";
  if (locale.toLowerCase().startsWith("hi")) return "hi";
  return "en";
}

export function displayCropName(name: string | null | undefined, locale: string) {
  if (!name) return "";
  const normalizedLocale = normalizeFarmerLocale(locale);
  const normalizedName = name.trim().toLowerCase();
  return CROP_LABELS[normalizedName]?.[normalizedLocale] ?? name;
}

export function displayStatus(status: string | null | undefined, locale: string) {
  if (!status) return "";
  const normalizedLocale = normalizeFarmerLocale(locale);
  const normalizedStatus = status.trim().toLowerCase();
  return STATUS_LABELS[normalizedStatus]?.[normalizedLocale] ?? status;
}

export function displayMassUnit(unit: "kg" | "quintal" | "ton", locale: string) {
  const normalizedLocale = normalizeFarmerLocale(locale);
  if (normalizedLocale === "mr") {
    if (unit === "kg") return "किलो";
    if (unit === "quintal") return "क्विंटल";
    return "टन";
  }
  if (normalizedLocale === "hi") {
    if (unit === "kg") return "किलो";
    if (unit === "quintal") return "क्विंटल";
    return "टन";
  }
  if (unit === "kg") return "kg";
  if (unit === "quintal") return "quintal";
  return "ton";
}

export function displayDistanceUnit(locale: string) {
  return normalizeFarmerLocale(locale) === "en" ? "km" : "कि.मी.";
}

export function displayPriceUnit(unit: string | null | undefined, locale: string, fallback: string) {
  if (!unit?.trim()) return fallback;

  const normalizedLocale = normalizeFarmerLocale(locale);
  const normalized = unit.toLowerCase().replaceAll(" ", "");
  const rupee = "₹";

  if (
    normalized.includes("inr/quintal") ||
    normalized.includes("₹/quintal") ||
    normalized.includes("inrperquintal") ||
    normalized.includes("rupees/quintal")
  ) {
    return normalizedLocale === "en" ? `${rupee}/quintal` : `${rupee}/क्विंटल`;
  }

  if (
    normalized.includes("inr/kg") ||
    normalized.includes("₹/kg") ||
    normalized.includes("inrperkg") ||
    normalized.includes("rupees/kg")
  ) {
    return normalizedLocale === "en" ? `${rupee}/kg` : `${rupee}/किलो`;
  }

  return unit;
}

export function dateLocale(locale: string) {
  const normalizedLocale = normalizeFarmerLocale(locale);
  if (normalizedLocale === "mr") return "mr-IN";
  if (normalizedLocale === "hi") return "hi-IN";
  return "en-IN";
}
