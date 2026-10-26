"use client";

import {
  BadgeIndianRupee,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Droplets,
  FlaskConical,
  Gauge,
  Leaf,
  Loader2,
  Scale,
  ShieldAlert,
  Sprout,
  TrendingUp,
  Wheat,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  FormEvent,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import FarmerPhase3Header from "@/components/phase3/FarmerPhase3Header";
import VoiceCapture from "@/components/phase3/VoiceCapture";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const SOIL_CACHE_KEY = "agriva-latest-soil-analysis";

type CropSenseForm = {
  ph: string;
  nitrogen: string;
  phosphorus: string;
  potassium: string;
  organic_carbon: string;
  moisture: string;
  temperature: string;
  rainfall: string;
  location: string;
  season: string;
  water_availability: string;
  farm_size: string;
};

type CropRecommendation = {
  crop: string;
  match_percentage: number;
  expected_yield: string;
  expected_profit: string;
  water_requirement: string;
  growing_duration: string;
  market_demand: string;
  risk: string;
};

type FarmPlanCalendarItem = {
  stage: string;
  start_day: number;
  end_day: number;
  activity: string;
};

type FarmPlan = {
  success?: boolean;
  field_id?: string;
  recommendation_id?: string;
  farm_plan_id?: string;
  crop: string;
  soil_preparation: string;
  seed_selection: string;
  sowing: string;
  fertilizer: string;
  irrigation: string;
  disease_monitoring: string;
  harvest: string;
  crop_calendar: FarmPlanCalendarItem[];
};

type FarmItem = {
  id: string;
  name: string;
  village?: string;
  district?: string;
  state?: string;
  total_area_acres?: number;
};

type FieldItem = {
  id: string;
  farm_id: string;
  field_name: string;
  area_acres: number;
  soil_type?: string | null;
  farmName?: string;
  village?: string;
  district?: string;
  state?: string;
};

type SoilCache = {
  field_id?: string | null;
  ph?: number | null;
  nitrogen?: number | null;
  phosphorus?: number | null;
  potassium?: number | null;
  organic_carbon?: number | null;
  moisture?: number | null;
  temperature?: number | null;
  soil_type?: string | null;
  soil_health_score?: number | null;
  demo_mode?: boolean;
  created_at?: string;
};

type WeatherResponse = {
  location?: string;
  current?: {
    temperature_c?: number;
  };
};

const EMPTY_FORM: CropSenseForm = {
  ph: "",
  nitrogen: "",
  phosphorus: "",
  potassium: "",
  organic_carbon: "",
  moisture: "",
  temperature: "",
  rainfall: "",
  location: "",
  season: "",
  water_availability: "Medium",
  farm_size: "",
};

const CROP_NAMES: Record<string, { mr: string; hi: string }> = {
  wheat: { mr: "गहू", hi: "गेहूँ" },
  rice: { mr: "भात", hi: "धान" },
  maize: { mr: "मका", hi: "मक्का" },
  mustard: { mr: "मोहरी", hi: "सरसों" },
  potato: { mr: "बटाटा", hi: "आलू" },
};

const PLAN_TRANSLATIONS: Record<
  string,
  { mr: string; hi: string }
> = {
  "Prepare the field with deep ploughing. Remove weeds and mix well-decomposed organic manure.": {
    mr: "शेताची खोल नांगरणी करा. तण काढा आणि चांगले कुजलेले सेंद्रिय खत मातीत मिसळा.",
    hi: "खेत की गहरी जुताई करें। खरपतवार हटाएँ और अच्छी तरह सड़ी जैविक खाद मिट्टी में मिलाएँ।",
  },
  "Sow at the recommended spacing and depth. Maintain proper plant population.": {
    mr: "शिफारस केलेल्या अंतरावर आणि खोलीवर पेरणी करा. योग्य रोपसंख्या राखा.",
    hi: "अनुशंसित दूरी और गहराई पर बुवाई करें। उचित पौध संख्या बनाए रखें।",
  },
  "Apply fertilizer according to soil-test results. Use balanced nitrogen, phosphorus and potassium.": {
    mr: "माती तपासणीच्या निकालानुसार खत द्या. नायट्रोजन, फॉस्फरस आणि पोटॅशियम संतुलित प्रमाणात वापरा.",
    hi: "मिट्टी जांच के परिणाम के अनुसार उर्वरक दें। नाइट्रोजन, फॉस्फोरस और पोटैशियम का संतुलित उपयोग करें।",
  },
  "Irrigate according to crop stage and soil moisture. Avoid both waterlogging and excessive drying.": {
    mr: "पिकाची अवस्था आणि मातीतील ओलाव्यानुसार सिंचन करा. पाणी साचणे किंवा माती अतिशय कोरडी होणे टाळा.",
    hi: "फसल की अवस्था और मिट्टी की नमी के अनुसार सिंचाई करें। जलभराव और अत्यधिक सूखापन दोनों से बचें।",
  },
  "Inspect the crop regularly for pests and diseases. Use integrated pest-management practices.": {
    mr: "कीड व रोगांसाठी पिकाची नियमित पाहणी करा. एकात्मिक कीड व्यवस्थापन पद्धती वापरा.",
    hi: "कीट और रोग के लिए फसल की नियमित निगरानी करें। एकीकृत कीट प्रबंधन अपनाएँ।",
  },
  "Harvest when the crop reaches physiological maturity and store the produce under suitable conditions.": {
    mr: "पीक योग्य परिपक्वतेला पोहोचल्यावर काढणी करा आणि उत्पादन योग्य परिस्थितीत साठवा.",
    hi: "फसल के शारीरिक रूप से परिपक्व होने पर कटाई करें और उपज को उपयुक्त परिस्थितियों में संग्रहित करें।",
  },
};

const CALENDAR_STAGE_TRANSLATIONS: Record<
  string,
  { mr: string; hi: string }
> = {
  "Land Preparation": { mr: "जमीन तयारी", hi: "खेत की तैयारी" },
  "Seed Preparation": { mr: "बियाणे तयारी", hi: "बीज तैयारी" },
  Sowing: { mr: "पेरणी", hi: "बुवाई" },
  "Early Growth": { mr: "प्रारंभिक वाढ", hi: "प्रारंभिक वृद्धि" },
  "Vegetative Growth": { mr: "शाकीय वाढ", hi: "वनस्पतिक वृद्धि" },
  "Flowering / Development": { mr: "फुलोरा / विकास", hi: "फूल / विकास" },
  "Maturity and Harvest": { mr: "परिपक्वता व काढणी", hi: "परिपक्वता और कटाई" },
};

const CALENDAR_ACTIVITY_TRANSLATIONS: Record<
  string,
  { mr: string; hi: string }
> = {
  "Plough field, remove weeds and apply organic manure.": {
    mr: "शेत नांगरून तण काढा आणि सेंद्रिय खत द्या.",
    hi: "खेत की जुताई करें, खरपतवार हटाएँ और जैविक खाद दें।",
  },
  "Select certified seeds and perform seed treatment.": {
    mr: "प्रमाणित बियाणे निवडा आणि बीजप्रक्रिया करा.",
    hi: "प्रमाणित बीज चुनें और बीज उपचार करें।",
  },
  "Sow seeds with recommended spacing and depth.": {
    mr: "शिफारस केलेल्या अंतरावर आणि खोलीवर बियाणे पेरा.",
    hi: "अनुशंसित दूरी और गहराई पर बीज बोएँ।",
  },
  "Monitor germination, weeds and irrigation.": {
    mr: "उगवण, तण आणि सिंचनावर लक्ष ठेवा.",
    hi: "अंकुरण, खरपतवार और सिंचाई की निगरानी करें।",
  },
  "Apply nutrients and monitor pests and diseases.": {
    mr: "पोषकद्रव्ये द्या आणि कीड-रोगांचे निरीक्षण करा.",
    hi: "पोषक तत्व दें और कीट-रोग की निगरानी करें।",
  },
  "Maintain irrigation and monitor crop health.": {
    mr: "सिंचन योग्य ठेवा आणि पिकाच्या आरोग्यावर लक्ष ठेवा.",
    hi: "सिंचाई बनाए रखें और फसल स्वास्थ्य की निगरानी करें।",
  },
  "Monitor maturity, harvest and store produce.": {
    mr: "परिपक्वता तपासा, काढणी करा आणि उत्पादन साठवा.",
    hi: "परिपक्वता देखें, कटाई करें और उपज का भंडारण करें।",
  },
};

function getToken() {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem("access_token") ||
    localStorage.getItem("token")
  );
}

function clearAuthStorage() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

function normalizeDigits(value: string) {
  const map: Record<string, string> = {
    "०": "0",
    "१": "1",
    "२": "2",
    "३": "3",
    "४": "4",
    "५": "5",
    "६": "6",
    "७": "7",
    "८": "8",
    "९": "9",
  };

  return value.replace(/[०-९]/g, (digit) => map[digit] ?? digit);
}

function firstNumberAfter(text: string, labels: string[]) {
  const normalized = normalizeDigits(
    text.toLowerCase().replace(/,/g, ".")
  );

  for (const label of labels) {
    const index = normalized.indexOf(label.toLowerCase());
    if (index === -1) continue;

    const tail = normalized.slice(index + label.length);
    const match = tail.match(/[-+]?\d+(?:\.\d+)?/);
    if (match) return match[0];
  }

  return null;
}

function sanitizeBackendText(value: string) {
  return value
    .replace(/₹/g, "₹")
    .replace(/”“/g, "–")
    .replace(/””/g, "—")
    .replace(/Â/g, "")
    .trim();
}

function currentSeason() {
  const month = new Date().getMonth() + 1;
  if (month >= 6 && month <= 10) return "Kharif";
  if (month === 11 || month === 12 || month <= 3) return "Rabi";
  return "Zaid";
}

function localizeCropName(value: string, locale: string) {
  const translated = CROP_NAMES[value.trim().toLowerCase()];
  if (!translated) return value;
  if (locale === "mr") return translated.mr;
  if (locale === "hi") return translated.hi;
  return value;
}

function localizeSimpleValue(
  value: string,
  locale: string,
  kind: "water" | "demand" | "risk"
) {
  const normalized = value.trim().toLowerCase();

  const maps = {
    water: {
      low: { mr: "कमी", hi: "कम" },
      medium: { mr: "मध्यम", hi: "मध्यम" },
      high: { mr: "जास्त", hi: "अधिक" },
    },
    demand: {
      low: { mr: "कमी", hi: "कम" },
      medium: { mr: "मध्यम", hi: "मध्यम" },
      high: { mr: "उच्च", hi: "उच्च" },
    },
    risk: {
      low: { mr: "कमी", hi: "कम" },
      medium: { mr: "मध्यम", hi: "मध्यम" },
      high: { mr: "जास्त", hi: "अधिक" },
    },
  } as const;

  const translated = maps[kind][normalized as "low" | "medium" | "high"];
  if (!translated) return value;
  if (locale === "mr") return translated.mr;
  if (locale === "hi") return translated.hi;
  return value;
}

function localizePlanText(value: string, locale: string) {
  const exact = PLAN_TRANSLATIONS[value];
  if (exact) {
    if (locale === "mr") return exact.mr;
    if (locale === "hi") return exact.hi;
  }

  const seedMatch = value.match(
    /^Use certified, disease-free and high-quality (.+) seeds suitable for the local climate\.$/
  );

  if (seedMatch) {
    const crop = localizeCropName(seedMatch[1], locale);
    if (locale === "mr") {
      return `${crop} साठी स्थानिक हवामानास योग्य, प्रमाणित, रोगमुक्त आणि दर्जेदार बियाणे वापरा.`;
    }
    if (locale === "hi") {
      return `${crop} के लिए स्थानीय जलवायु के अनुकूल प्रमाणित, रोगमुक्त और गुणवत्तापूर्ण बीज उपयोग करें।`;
    }
  }

  return value;
}

function localizeCalendarStage(value: string, locale: string) {
  const translated = CALENDAR_STAGE_TRANSLATIONS[value];
  if (!translated) return value;
  if (locale === "mr") return translated.mr;
  if (locale === "hi") return translated.hi;
  return value;
}

function localizeCalendarActivity(value: string, locale: string) {
  const translated = CALENDAR_ACTIVITY_TRANSLATIONS[value];
  if (!translated) return value;
  if (locale === "mr") return translated.mr;
  if (locale === "hi") return translated.hi;
  return value;
}

function toNumber(value: string) {
  const normalized = normalizeDigits(value.trim());
  if (!normalized) return null;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function formatMatch(value: number) {
  if (!Number.isFinite(value)) return "—";
  return `${Math.round(value)}%`;
}

function localizeDigits(value: string, locale: string) {
  if (locale !== "mr" && locale !== "hi") return value;

  const devanagari = ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"];
  return value.replace(/\d/g, (digit) => devanagari[Number(digit)]);
}

function localizePlanningRange(
  value: string,
  locale: string,
  kind: "yield" | "profit" | "duration"
) {
  let output = sanitizeBackendText(value);

  if (locale === "mr") {
    if (kind === "yield") {
      output = output
        .replace(/Quintal\/Acre/gi, "क्विंटल/एकर")
        .replace(/Quintals?\/Acre/gi, "क्विंटल/एकर");
    } else if (kind === "profit") {
      output = output.replace(/\/Acre/gi, "/एकर");
    } else {
      output = output.replace(/days?/gi, "दिवस");
    }
    return localizeDigits(output, locale);
  }

  if (locale === "hi") {
    if (kind === "yield") {
      output = output
        .replace(/Quintal\/Acre/gi, "क्विंटल/एकड़")
        .replace(/Quintals?\/Acre/gi, "क्विंटल/एकड़");
    } else if (kind === "profit") {
      output = output.replace(/\/Acre/gi, "/एकड़");
    } else {
      output = output.replace(/days?/gi, "दिन");
    }
    return localizeDigits(output, locale);
  }

  return output;
}

export default function CropSenseRecommendationPage() {
  const t = useTranslations("phase5CropSense");
  const locale = useLocale();
  const router = useRouter();

  const [form, setForm] = useState<CropSenseForm>({
    ...EMPTY_FORM,
    season: currentSeason(),
  });
  const [fields, setFields] = useState<FieldItem[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState("");
  const [recommendations, setRecommendations] = useState<
    CropRecommendation[]
  >([]);
  const [farmPlan, setFarmPlan] = useState<FarmPlan | null>(null);
  const [selectedCrop, setSelectedCrop] = useState("");
  const [loadingContext, setLoadingContext] = useState(true);
  const [loadingRecommendations, setLoadingRecommendations] =
    useState(false);
  const [savingCrop, setSavingCrop] = useState("");
  const [error, setError] = useState("");
  const [contextMessage, setContextMessage] = useState("");
  const [hasSoilContext, setHasSoilContext] = useState<boolean | null>(null);

  const loadContext = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    setLoadingContext(true);
    setError("");

    let cachedSoil: SoilCache | null = null;
    try {
      const raw = localStorage.getItem(SOIL_CACHE_KEY);
      if (raw) cachedSoil = JSON.parse(raw) as SoilCache;
    } catch {
      cachedSoil = null;
    }

    if (cachedSoil) {
      setHasSoilContext(true);
      setForm((current) => ({
        ...current,
        ph:
          cachedSoil?.ph == null ? current.ph : String(cachedSoil.ph),
        nitrogen:
          cachedSoil?.nitrogen == null
            ? current.nitrogen
            : String(cachedSoil.nitrogen),
        phosphorus:
          cachedSoil?.phosphorus == null
            ? current.phosphorus
            : String(cachedSoil.phosphorus),
        potassium:
          cachedSoil?.potassium == null
            ? current.potassium
            : String(cachedSoil.potassium),
        organic_carbon:
          cachedSoil?.organic_carbon == null
            ? current.organic_carbon
            : String(cachedSoil.organic_carbon),
        moisture:
          cachedSoil?.moisture == null
            ? current.moisture
            : String(cachedSoil.moisture),
        temperature:
          cachedSoil?.temperature == null
            ? current.temperature
            : String(cachedSoil.temperature),
      }));
      setContextMessage(t("soilLoaded"));
    } else {
      setHasSoilContext(false);
      setContextMessage(t("soilNotLoaded"));
    }

    try {
      const response = await fetch(`${API_URL}/api/farms`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      if (response.status === 401) {
        clearAuthStorage();
        router.replace("/login");
        return;
      }

      const farms = response.ok
        ? ((await response.json().catch(() => [])) as FarmItem[])
        : [];

      const fieldGroups = await Promise.all(
        (Array.isArray(farms) ? farms : []).map(async (farm) => {
          try {
            const fieldsResponse = await fetch(
              `${API_URL}/api/farms/${encodeURIComponent(farm.id)}/fields`,
              {
                headers: { Authorization: `Bearer ${token}` },
                cache: "no-store",
              }
            );

            if (!fieldsResponse.ok) return [] as FieldItem[];

            const body = (await fieldsResponse
              .json()
              .catch(() => [])) as FieldItem[];

            return (Array.isArray(body) ? body : []).map((field) => ({
              ...field,
              farm_id: field.farm_id || farm.id,
              farmName: farm.name,
              village: farm.village,
              district: farm.district,
              state: farm.state,
            }));
          } catch {
            return [] as FieldItem[];
          }
        })
      );

      const flattened = fieldGroups.flat();
      setFields(flattened);

      const cachedField = cachedSoil?.field_id || "";
      const preferred =
        flattened.find((field) => field.id === cachedField) ||
        flattened[0];

      if (preferred) {
        setSelectedFieldId(preferred.id);
        setForm((current) => ({
          ...current,
          farm_size:
            current.farm_size ||
            (Number.isFinite(Number(preferred.area_acres))
              ? String(preferred.area_acres)
              : ""),
          location:
            current.location ||
            [preferred.district, preferred.state]
              .filter(Boolean)
              .join(", "),
        }));
      }
    } catch {
      setFields([]);
    }

    try {
      const weatherResponse = await fetch(`${API_URL}/api/weather/farmer`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      if (weatherResponse.ok) {
        const weather = (await weatherResponse
          .json()
          .catch(() => null)) as WeatherResponse | null;

        setForm((current) => ({
          ...current,
          temperature:
            current.temperature ||
            (weather?.current?.temperature_c == null
              ? ""
              : String(weather.current.temperature_c)),
          location: current.location || weather?.location || "",
        }));
      }
    } catch {
      // Weather context is optional; leave farmer-entered values untouched.
    } finally {
      setLoadingContext(false);
    }
  }, [router, t]);

  useEffect(() => {
    void loadContext();
  }, [loadContext]);

  const selectedField = useMemo(
    () => fields.find((field) => field.id === selectedFieldId) || null,
    [fields, selectedFieldId]
  );

  function updateField(key: keyof CropSenseForm, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleRegisteredField(value: string) {
    setSelectedFieldId(value);
    const field = fields.find((item) => item.id === value);
    if (!field) return;

    setForm((current) => ({
      ...current,
      farm_size: String(field.area_acres || current.farm_size || ""),
      location:
        [field.district, field.state].filter(Boolean).join(", ") ||
        current.location,
    }));
  }

  function handleVoiceTranscript(transcript: string) {
    const ph = firstNumberAfter(transcript, ["ph", "पीएच", "p h"]);
    const nitrogen = firstNumberAfter(transcript, [
      "nitrogen",
      "नायट्रोजन",
      "नाइट्रोजन",
    ]);
    const phosphorus = firstNumberAfter(transcript, [
      "phosphorus",
      "फॉस्फरस",
      "फॉस्फोरस",
    ]);
    const potassium = firstNumberAfter(transcript, [
      "potassium",
      "पोटॅशियम",
      "पोटेशियम",
    ]);
    const carbon = firstNumberAfter(transcript, [
      "organic carbon",
      "सेंद्रिय कार्बन",
      "जैविक कार्बन",
    ]);
    const moisture = firstNumberAfter(transcript, [
      "moisture",
      "ओलावा",
      "नमी",
    ]);
    const temperature = firstNumberAfter(transcript, [
      "temperature",
      "तापमान",
    ]);
    const rainfall = firstNumberAfter(transcript, [
      "rainfall",
      "rain",
      "पाऊस",
      "बारिश",
    ]);
    const farmSize = firstNumberAfter(transcript, [
      "farm size",
      "area",
      "क्षेत्र",
      "एकर",
      "acre",
    ]);

    const lower = transcript.toLowerCase();
    let season: string | null = null;
    if (lower.includes("kharif") || lower.includes("खरीप") || lower.includes("खरीफ")) {
      season = "Kharif";
    } else if (lower.includes("rabi") || lower.includes("रब्बी") || lower.includes("रबी")) {
      season = "Rabi";
    } else if (lower.includes("zaid") || lower.includes("जायद") || lower.includes("उन्हाळी")) {
      season = "Zaid";
    }

    let water: string | null = null;
    if (
      lower.includes("water high") ||
      lower.includes("जास्त पाणी") ||
      lower.includes("अधिक पानी")
    ) {
      water = "High";
    } else if (
      lower.includes("water low") ||
      lower.includes("कमी पाणी") ||
      lower.includes("कम पानी")
    ) {
      water = "Low";
    } else if (
      lower.includes("water medium") ||
      lower.includes("मध्यम पाणी") ||
      lower.includes("मध्यम पानी")
    ) {
      water = "Medium";
    }

    setForm((current) => ({
      ...current,
      ph: ph ?? current.ph,
      nitrogen: nitrogen ?? current.nitrogen,
      phosphorus: phosphorus ?? current.phosphorus,
      potassium: potassium ?? current.potassium,
      organic_carbon: carbon ?? current.organic_carbon,
      moisture: moisture ?? current.moisture,
      temperature: temperature ?? current.temperature,
      rainfall: rainfall ?? current.rainfall,
      farm_size: farmSize ?? current.farm_size,
      season: season ?? current.season,
      water_availability: water ?? current.water_availability,
    }));
  }

  async function requestRecommendations(event: FormEvent) {
    event.preventDefault();
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    const numeric = {
      ph: toNumber(form.ph),
      nitrogen: toNumber(form.nitrogen),
      phosphorus: toNumber(form.phosphorus),
      potassium: toNumber(form.potassium),
      organic_carbon: toNumber(form.organic_carbon),
      moisture: toNumber(form.moisture),
      temperature: toNumber(form.temperature),
      rainfall: toNumber(form.rainfall),
      farm_size: toNumber(form.farm_size),
    };

    if (
      Object.values(numeric).some((value) => value == null) ||
      !form.location.trim() ||
      !form.season ||
      !form.water_availability
    ) {
      setError(t("requiredError"));
      return;
    }

    if ((numeric.ph ?? -1) < 0 || (numeric.ph ?? 15) > 14) {
      setError(t("phError"));
      return;
    }

    if ((numeric.farm_size ?? 0) <= 0) {
      setError(t("farmSizeError"));
      return;
    }

    setLoadingRecommendations(true);
    setError("");
    setFarmPlan(null);
    setSelectedCrop("");

    try {
      const response = await fetch(`${API_URL}/api/ai/crop-recommendation`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...numeric,
          location: form.location.trim(),
          season: form.season,
          water_availability: form.water_availability,
        }),
      });

      if (response.status === 401) {
        clearAuthStorage();
        router.replace("/login");
        return;
      }

      const body = (await response.json().catch(() => null)) as
        | { recommendations?: CropRecommendation[]; detail?: string }
        | null;

      if (!response.ok) {
        throw new Error(
          typeof body?.detail === "string"
            ? body.detail
            : t("recommendationFailed")
        );
      }

      const rows = Array.isArray(body?.recommendations)
        ? body.recommendations
        : [];
      setRecommendations(rows);

      if (rows.length === 0) {
        setError(t("noRecommendations"));
      }
    } catch (err) {
      setRecommendations([]);
      setError(
        err instanceof Error ? err.message : t("recommendationFailed")
      );
    } finally {
      setLoadingRecommendations(false);
    }
  }

  async function selectCrop(recommendation: CropRecommendation) {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    if (!selectedFieldId) {
      setError(t("fieldRequiredForPlan"));
      return;
    }

    const cropLabel = localizeCropName(recommendation.crop, locale);
    const best = recommendations[0];
    const isAlternative =
      Boolean(best) &&
      best.crop !== recommendation.crop &&
      best.match_percentage > recommendation.match_percentage;

    const confirmation = isAlternative
      ? t("confirmAlternative", {
          crop: cropLabel,
          match: localizeDigits(formatMatch(recommendation.match_percentage), locale),
          bestCrop: localizeCropName(best.crop, locale),
          bestMatch: localizeDigits(formatMatch(best.match_percentage), locale),
        })
      : t("confirmSelect", { crop: cropLabel });

    if (!window.confirm(confirmation)) {
      return;
    }

    setSavingCrop(recommendation.crop);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/api/ai/crop-plan?field_id=${encodeURIComponent(
          selectedFieldId
        )}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            crop: recommendation.crop,
            recommendation_data: recommendation,
          }),
        }
      );

      if (response.status === 401) {
        clearAuthStorage();
        router.replace("/login");
        return;
      }

      const body = (await response.json().catch(() => null)) as
        | (FarmPlan & { detail?: string })
        | null;

      if (!response.ok || !body?.crop) {
        throw new Error(
          typeof body?.detail === "string"
            ? body.detail
            : t("planFailed")
        );
      }

      setFarmPlan(body);
      setSelectedCrop(recommendation.crop);
      setTimeout(() => {
        document
          .getElementById("farm-plan")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("planFailed"));
    } finally {
      setSavingCrop("");
    }
  }

  const topComparison = recommendations.slice(0, 3);

  return (
    <div className="min-h-screen bg-[#F4F7F2] text-slate-900">
      <FarmerPhase3Header
        title={t("headerTitle")}
        subtitle={t("headerSubtitle")}
        backLabel={t("backDashboard")}
        showThemeControl
      />

      <main className="agriva-cropsense-page mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[30px] bg-[#0B6B46] text-white shadow-lg">
          <div className="grid gap-6 p-6 lg:grid-cols-[1.15fr_.85fr] lg:items-center lg:p-8">
            <div>
              <div className="flex items-center gap-3">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/20">
                  <Sprout className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-100">
                    AGRIVA CROPSENSE
                  </p>
                  <h1 className="mt-1 text-3xl font-black leading-tight sm:text-4xl">
                    {t("heroTitle")}
                  </h1>
                </div>
              </div>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-emerald-50 sm:text-base">
                {t("heroDescription")}
              </p>
            </div>

            <div className="rounded-3xl border border-amber-200 bg-[#FFF7E6] p-5 text-[#8A3F0A]">
              <div className="flex items-start gap-3">
                <ShieldAlert className="mt-0.5 h-6 w-6 shrink-0 text-amber-600" />
                <div>
                  <p className="font-black">{t("engineTitle")}</p>
                  <p className="mt-2 text-sm leading-6">
                    {t("engineDescription")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {contextMessage ? (
          <div
            className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm ${
              hasSoilContext
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-amber-200 bg-amber-50 text-amber-900"
            }`}
          >
            <span className="inline-flex items-center gap-2 font-semibold">
              {hasSoilContext ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <FlaskConical className="h-5 w-5" />
              )}
              {contextMessage}
            </span>
            <button
              type="button"
              onClick={() => router.push("/dashboard/farmer/soil")}
              className="font-black underline underline-offset-4"
            >
              {t("openSoil")}
            </button>
          </div>
        ) : null}

        <form
          onSubmit={requestRecommendations}
          className="rounded-3xl border border-[#D7E3DA] bg-white p-5 shadow-sm sm:p-6"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-[#0F172A]">
                {t("inputTitle")}
              </h2>
              <p className="mt-1 text-sm text-[#475569]">
                {t("inputDescription")}
              </p>
            </div>

            <VoiceCapture
              onTranscript={handleVoiceTranscript}
              label={t("voiceFill")}
              listeningLabel={t("voiceListening")}
              unsupportedLabel={t("voiceUnsupported")}
            />
          </div>

          {loadingContext ? (
            <div className="mt-5 flex items-center gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
              {t("loadingContext")}
            </div>
          ) : null}

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <NumberInput
              label="pH"
              value={form.ph}
              onChange={(value) => updateField("ph", value)}
              placeholder="6.5"
              step="0.01"
              min="0"
              max="14"
            />
            <NumberInput
              label={t("nitrogen")}
              value={form.nitrogen}
              onChange={(value) => updateField("nitrogen", value)}
              placeholder="280"
            />
            <NumberInput
              label={t("phosphorus")}
              value={form.phosphorus}
              onChange={(value) => updateField("phosphorus", value)}
              placeholder="22"
            />
            <NumberInput
              label={t("potassium")}
              value={form.potassium}
              onChange={(value) => updateField("potassium", value)}
              placeholder="190"
            />
            <NumberInput
              label={t("organicCarbon")}
              value={form.organic_carbon}
              onChange={(value) => updateField("organic_carbon", value)}
              placeholder="0.75"
              step="0.01"
            />
            <NumberInput
              label={t("moisture")}
              value={form.moisture}
              onChange={(value) => updateField("moisture", value)}
              placeholder="32"
            />
            <NumberInput
              label={t("temperature")}
              value={form.temperature}
              onChange={(value) => updateField("temperature", value)}
              placeholder="25"
            />
            <NumberInput
              label={t("rainfall")}
              value={form.rainfall}
              onChange={(value) => updateField("rainfall", value)}
              placeholder="650"
            />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block lg:col-span-2">
              <span className="text-sm font-black text-[#334155]">
                {t("registeredField")}
              </span>
              <select
                value={selectedFieldId}
                onChange={(event) => handleRegisteredField(event.target.value)}
                className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="">{t("fieldPlaceholder")}</option>
                {fields.map((field) => (
                  <option key={field.id} value={field.id}>
                    {field.field_name}
                    {field.farmName ? ` — ${field.farmName}` : ""}
                    {Number.isFinite(Number(field.area_acres))
                      ? ` (${field.area_acres} ac)`
                      : ""}
                  </option>
                ))}
              </select>
              {fields.length === 0 ? (
                <span className="mt-2 block text-xs text-amber-700">
                  {t("noFields")}
                </span>
              ) : null}
            </label>

            <TextInput
              label={t("location")}
              value={form.location}
              onChange={(value) => updateField("location", value)}
              placeholder={t("locationPlaceholder")}
            />
            <NumberInput
              label={t("farmSize")}
              value={form.farm_size}
              onChange={(value) => updateField("farm_size", value)}
              placeholder="2"
              step="0.01"
            />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-black text-[#334155]">
                {t("season")}
              </span>
              <select
                value={form.season}
                onChange={(event) => updateField("season", event.target.value)}
                className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="Kharif">{t("seasonKharif")}</option>
                <option value="Rabi">{t("seasonRabi")}</option>
                <option value="Zaid">{t("seasonZaid")}</option>
              </select>
              <span className="mt-2 block text-xs text-slate-500">
                {t("seasonHint")}
              </span>
            </label>

            <label className="block">
              <span className="text-sm font-black text-[#334155]">
                {t("waterAvailability")}
              </span>
              <select
                value={form.water_availability}
                onChange={(event) =>
                  updateField("water_availability", event.target.value)
                }
                className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="Low">{t("waterLow")}</option>
                <option value="Medium">{t("waterMedium")}</option>
                <option value="High">{t("waterHigh")}</option>
              </select>
            </label>
          </div>

          <div className="mt-5 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-900">
            {t("rainfallHint")}
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={loadingRecommendations}
              className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-[#0F7A4A] px-6 font-black text-white shadow-sm transition hover:bg-[#0B5D39] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingRecommendations ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Sprout className="h-5 w-5" />
              )}
              {loadingRecommendations
                ? t("findingRecommendations")
                : t("findRecommendations")}
            </button>

            <button
              type="button"
              onClick={() => router.push("/dashboard/farmer/soil")}
              className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl border border-[#D7E3DA] bg-white px-5 font-black text-[#334155] hover:bg-[#F4F7F2]"
            >
              <FlaskConical className="h-5 w-5" /> {t("checkSoilFirst")}
            </button>
          </div>

          {error ? (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800">
              {error}
            </div>
          ) : null}
        </form>

        {recommendations.length > 0 ? (
          <section className="space-y-5">
            <div>
              <h2 className="text-2xl font-black text-[#0F172A]">
                {t("resultsTitle")}
              </h2>
              <p className="mt-1 text-sm text-[#475569]">
                {t("resultsDescription")}
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {recommendations.map((item, index) => {
                const isSaving = savingCrop === item.crop;
                const isSelected = selectedCrop === item.crop;
                return (
                  <article
                    key={`${item.crop}-${index}`}
                    className={`rounded-3xl border bg-white p-5 shadow-sm transition ${
                      isSelected
                        ? "border-emerald-500 ring-2 ring-emerald-100"
                        : "border-[#D7E3DA]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#E8F5EE] text-[#0F7A4A]">
                          <Wheat className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
                            {index === 0 ? t("bestMatch") : t("recommendedCrop")}
                          </p>
                          <h3 className="mt-1 text-2xl font-black text-[#0F172A]">
                            {localizeCropName(item.crop, locale)}
                          </h3>
                        </div>
                      </div>

                      <div className="rounded-2xl bg-[#DCFCE7] px-3 py-2 text-center text-[#166534]">
                        <p className="text-2xl font-black">
                          {localizeDigits(formatMatch(item.match_percentage), locale)}
                        </p>
                        <p className="text-[11px] font-bold">{t("match")}</p>
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <ResultMetric
                        icon={<Scale className="h-4 w-4" />}
                        label={t("expectedYield")}
                        value={localizePlanningRange(item.expected_yield, locale, "yield")}
                      />
                      <ResultMetric
                        icon={<BadgeIndianRupee className="h-4 w-4" />}
                        label={t("expectedProfit")}
                        value={localizePlanningRange(item.expected_profit, locale, "profit")}
                      />
                      <ResultMetric
                        icon={<Droplets className="h-4 w-4" />}
                        label={t("waterRequirement")}
                        value={localizeSimpleValue(
                          item.water_requirement,
                          locale,
                          "water"
                        )}
                      />
                      <ResultMetric
                        icon={<CalendarDays className="h-4 w-4" />}
                        label={t("growingDuration")}
                        value={localizePlanningRange(item.growing_duration, locale, "duration")}
                      />
                      <ResultMetric
                        icon={<TrendingUp className="h-4 w-4" />}
                        label={t("marketDemand")}
                        value={localizeSimpleValue(
                          item.market_demand,
                          locale,
                          "demand"
                        )}
                      />
                      <ResultMetric
                        icon={<Gauge className="h-4 w-4" />}
                        label={t("risk")}
                        value={localizeSimpleValue(item.risk, locale, "risk")}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => void selectCrop(item)}
                      disabled={Boolean(savingCrop)}
                      className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#0F7A4A] px-4 font-black text-white hover:bg-[#0B5D39] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSaving ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : isSelected ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <ChevronRight className="h-5 w-5" />
                      )}
                      {isSelected ? t("selected") : t("selectAndPlan")}
                    </button>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}

        {topComparison.length > 1 ? (
          <section className="rounded-3xl border border-[#D7E3DA] bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-2xl font-black text-[#0F172A]">
              {t("comparisonTitle")}
            </h2>
            <p className="mt-1 text-sm text-[#475569]">
              {t("comparisonDescription")}
            </p>

            <div className="mt-5 overflow-x-auto">
              <table className="min-w-[760px] w-full border-separate border-spacing-0 overflow-hidden rounded-2xl border border-slate-200 text-sm">
                <thead>
                  <tr className="bg-[#F4F7F2]">
                    <th className="border-b border-slate-200 px-4 py-3 text-left font-black text-slate-700">
                      {t("metric")}
                    </th>
                    {topComparison.map((item) => (
                      <th
                        key={item.crop}
                        className="border-b border-slate-200 px-4 py-3 text-left font-black text-[#0F172A]"
                      >
                        {localizeCropName(item.crop, locale)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <ComparisonRow
                    label={t("match")}
                    values={topComparison.map((item) =>
                      localizeDigits(formatMatch(item.match_percentage), locale)
                    )}
                  />
                  <ComparisonRow
                    label={t("expectedYield")}
                    values={topComparison.map((item) =>
                      localizePlanningRange(item.expected_yield, locale, "yield")
                    )}
                  />
                  <ComparisonRow
                    label={t("expectedProfit")}
                    values={topComparison.map((item) =>
                      localizePlanningRange(item.expected_profit, locale, "profit")
                    )}
                  />
                  <ComparisonRow
                    label={t("waterRequirement")}
                    values={topComparison.map((item) =>
                      localizeSimpleValue(
                        item.water_requirement,
                        locale,
                        "water"
                      )
                    )}
                  />
                  <ComparisonRow
                    label={t("marketDemand")}
                    values={topComparison.map((item) =>
                      localizeSimpleValue(
                        item.market_demand,
                        locale,
                        "demand"
                      )
                    )}
                  />
                  <ComparisonRow
                    label={t("risk")}
                    values={topComparison.map((item) =>
                      localizeSimpleValue(item.risk, locale, "risk")
                    )}
                  />
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {farmPlan ? (
          <section
            id="farm-plan"
            className="scroll-mt-24 space-y-5 rounded-3xl border border-emerald-200 bg-white p-5 shadow-sm sm:p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
                  {t("savedPlan")}
                </p>
                <h2 className="mt-1 text-3xl font-black text-[#0F172A]">
                  {localizeCropName(farmPlan.crop, locale)} — {t("farmPlanTitle")}
                </h2>
                <p className="mt-2 text-sm text-[#475569]">
                  {selectedField
                    ? t("planField", { field: selectedField.field_name })
                    : t("planSaved")}
                </p>
              </div>
              <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-800">
                {t("databaseSaved")}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <PlanCard
                icon={<Leaf className="h-5 w-5" />}
                title={t("soilPreparation")}
                value={localizePlanText(farmPlan.soil_preparation, locale)}
              />
              <PlanCard
                icon={<Wheat className="h-5 w-5" />}
                title={t("seedSelection")}
                value={localizePlanText(farmPlan.seed_selection, locale)}
              />
              <PlanCard
                icon={<Sprout className="h-5 w-5" />}
                title={t("sowing")}
                value={localizePlanText(farmPlan.sowing, locale)}
              />
              <PlanCard
                icon={<FlaskConical className="h-5 w-5" />}
                title={t("fertilizer")}
                value={localizePlanText(farmPlan.fertilizer, locale)}
              />
              <PlanCard
                icon={<Droplets className="h-5 w-5" />}
                title={t("irrigation")}
                value={localizePlanText(farmPlan.irrigation, locale)}
              />
              <PlanCard
                icon={<ShieldAlert className="h-5 w-5" />}
                title={t("diseaseMonitoring")}
                value={localizePlanText(
                  farmPlan.disease_monitoring,
                  locale
                )}
              />
              <PlanCard
                icon={<CheckCircle2 className="h-5 w-5" />}
                title={t("harvest")}
                value={localizePlanText(farmPlan.harvest, locale)}
              />
            </div>

            <div>
              <h3 className="text-2xl font-black text-[#0F172A]">
                {t("calendarTitle")}
              </h3>
              <p className="mt-1 text-sm text-[#475569]">
                {t("calendarDescription")}
              </p>

              <div className="mt-5 space-y-3">
                {(farmPlan.crop_calendar || []).map((row, index) => (
                  <div
                    key={`${row.stage}-${index}`}
                    className="grid gap-3 rounded-2xl border border-slate-200 bg-[#F8FAFC] p-4 sm:grid-cols-[130px_1fr]"
                  >
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.12em] text-emerald-700">
                        {t("dayRange", {
                          start: localizeDigits(String(row.start_day), locale),
                          end: localizeDigits(String(row.end_day), locale),
                        })}
                      </p>
                      <p className="mt-1 font-black text-[#0F172A]">
                        {localizeCalendarStage(row.stage, locale)}
                      </p>
                    </div>
                    <p className="text-sm leading-6 text-[#475569]">
                      {localizeCalendarActivity(row.activity, locale)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}
      </main>

      <style jsx global>{`
        .agriva-global-theme-toggle {
          display: none !important;
        }
      `}</style>
    </div>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  placeholder,
  step = "0.1",
  min = "0",
  max,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  step?: string;
  min?: string;
  max?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-black text-[#334155]">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
      />
    </label>
  );
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-black text-[#334155]">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
      />
    </label>
  );
}

function ResultMetric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-[#F8FAFC] p-3">
      <div className="flex items-center gap-2 text-emerald-700">
        {icon}
        <p className="text-xs font-black uppercase tracking-[0.08em]">
          {label}
        </p>
      </div>
      <p className="mt-2 text-sm font-black leading-5 text-[#0F172A]">
        {value || "—"}
      </p>
    </div>
  );
}

function ComparisonRow({
  label,
  values,
}: {
  label: string;
  values: string[];
}) {
  return (
    <tr>
      <th className="border-b border-slate-100 bg-white px-4 py-3 text-left font-black text-slate-600">
        {label}
      </th>
      {values.map((value, index) => (
        <td
          key={`${label}-${index}`}
          className="border-b border-slate-100 px-4 py-3 font-semibold text-[#0F172A]"
        >
          {value || "—"}
        </td>
      ))}
    </tr>
  );
}

function PlanCard({
  icon,
  title,
  value,
}: {
  icon: ReactNode;
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-[#F8FAFC] p-4">
      <div className="flex items-center gap-2 text-emerald-700">
        {icon}
        <p className="font-black">{title}</p>
      </div>
      <p className="mt-2 text-sm leading-6 text-[#475569]">{value}</p>
    </div>
  );
}
