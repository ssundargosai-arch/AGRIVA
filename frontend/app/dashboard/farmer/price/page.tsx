"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  CalendarDays,
  CircleAlert,
  IndianRupee,
  Loader2,
  MapPin,
  Minus,
  Search,
  Sparkles,
  Wheat,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import AgrivaAI from "@/app/components/AgrivaAI";
import FarmerBottomNav from "@/components/layout/FarmerBottomNav";
import FarmerPhase3Header from "@/components/phase3/FarmerPhase3Header";
import VoiceCapture from "@/components/phase3/VoiceCapture";
import {
  displayCropName,
  displayPriceUnit,
} from "@/components/phase3/displayLabels";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

type CropOption = { id: string; name: string; variety?: string | null };
type MarketData = {
  commodity: string;
  state: string | null;
  district: string | null;
  market: string | null;
  variety: string | null;
  grade: string | null;
  arrival_date: string | null;
  min_price: number | null;
  max_price: number | null;
  modal_price: number;
  source: string;
  unit: string;
  data_mode?: "LIVE" | "CACHED";
  cached_at?: string | null;
};
type PriceResult = {
  crop: string;
  location: string;
  current_price: number;
  predicted_price: number;
  expected_range_min: number;
  expected_range_max: number;
  confidence: number;
  trend: "UP" | "DOWN" | "STABLE";
  historical_prices: number[];
  chart_data?: Array<{
    label: string;
    price: number;
  }>;
  demo_mode: boolean;
  data_mode?: "LIVE" | "CACHED" | "HISTORICAL" | "DEMO";
  unit?: string;
  market_data?: MarketData | null;
  price_change_percentage?: number;
  disclaimer: string;
};


type LocaleKey = "en" | "hi" | "mr";

const PRICE_COPY = {
  en: {
    state: "State",
    currentPrice: "Current price",
    predictedPrice: "Predicted price",
    confidence: "Confidence",
    direction: "Trend",
    chartTitle: "Price trend",
    chartDescription:
      "Historical prices and AGRIVA's predicted price are shown together for easier comparison.",
    noChart: "Not enough price points are available to draw the trend chart.",
    demoData: "Demo / fallback data",
    demoTitle: "Demo estimate",
    demoDescription:
      "AGRIVA is using fallback demonstration price data for this estimate. Treat it as a demo, not a live market quote.",
    liveData: "Live data",
    cachedData: "Cached data",
    historicalData: "Historical data",
    estimateSummary: "Price prediction summary",
    exactDisclaimer:
      "Price predictions are estimates and may differ from actual market prices.",
    translatedDisclaimer: "",
  },
  hi: {
    state: "राज्य",
    currentPrice: "वर्तमान कीमत",
    predictedPrice: "अनुमानित कीमत",
    confidence: "विश्वसनीयता",
    direction: "रुझान",
    chartTitle: "कीमत का रुझान",
    chartDescription:
      "आसान तुलना के लिए पिछले दाम और AGRIVA की अनुमानित कीमत एक साथ दिखाई गई है।",
    noChart: "रुझान ग्राफ बनाने के लिए पर्याप्त कीमत डेटा उपलब्ध नहीं है।",
    demoData: "डेमो / फॉलबैक डेटा",
    demoTitle: "डेमो अनुमान",
    demoDescription:
      "इस अनुमान के लिए AGRIVA डेमो फॉलबैक मूल्य डेटा का उपयोग कर रहा है। इसे लाइव बाजार भाव न मानें।",
    liveData: "लाइव डेटा",
    cachedData: "कैश्ड डेटा",
    historicalData: "ऐतिहासिक डेटा",
    estimateSummary: "मूल्य अनुमान सारांश",
    exactDisclaimer:
      "Price predictions are estimates and may differ from actual market prices.",
    translatedDisclaimer:
      "मूल्य अनुमान केवल अनुमान हैं और वास्तविक बाजार कीमतों से अलग हो सकते हैं।",
  },
  mr: {
    state: "राज्य",
    currentPrice: "सध्याची किंमत",
    predictedPrice: "अंदाजित किंमत",
    confidence: "विश्वसनीयता",
    direction: "दिशा",
    chartTitle: "किंमत कल",
    chartDescription:
      "सोप्या तुलनेसाठी मागील किंमती आणि AGRIVA ची अंदाजित किंमत एकत्र दाखवली आहे.",
    noChart: "कलाचा आलेख दाखवण्यासाठी पुरेसे किंमत बिंदू उपलब्ध नाहीत.",
    demoData: "डेमो / फॉलबॅक डेटा",
    demoTitle: "डेमो अंदाज",
    demoDescription:
      "या अंदाजासाठी AGRIVA डेमो फॉलबॅक किंमत डेटा वापरत आहे. याला थेट बाजारभाव समजू नका.",
    liveData: "थेट डेटा",
    cachedData: "संचित डेटा",
    historicalData: "ऐतिहासिक डेटा",
    estimateSummary: "किंमत अंदाज सारांश",
    exactDisclaimer:
      "Price predictions are estimates and may differ from actual market prices.",
    translatedDisclaimer:
      "किंमत अंदाज हे केवळ अंदाज आहेत आणि प्रत्यक्ष बाजारभावापेक्षा वेगळे असू शकतात.",
  },
} as const;

function getLocaleKey(locale: string): LocaleKey {
  if (locale === "hi" || locale === "mr") return locale;
  return "en";
}

const CROP_ALIASES: Record<string, string[]> = {
  onion: ["onion", "कांदा", "प्याज"],
  wheat: ["wheat", "गहू", "गेहूं", "गेहूँ"],
  tomato: ["tomato", "टोमॅटो", "टमाटर"],
  maize: ["maize", "corn", "मका", "मक्का"],
  rice: ["rice", "तांदूळ", "चावल"],
  soybean: ["soybean", "सोयाबीन"],
  cotton: ["cotton", "कापूस", "कपास"],
  sugarcane: ["sugarcane", "ऊस", "गन्ना"],
  potato: ["potato", "बटाटा", "आलू"],
};

const PLACE_ALIASES: Record<string, string[]> = {
  Nashik: ["nashik", "nasik", "नाशिक"],
  Pune: ["pune", "पुणे", "पुण्यात"],
  Ahmednagar: ["ahmednagar", "अहमदनगर"],
  Nagpur: ["nagpur", "नागपूर"],
  Aurangabad: ["aurangabad", "छत्रपती संभाजीनगर", "संभाजीनगर"],
  Kolhapur: ["kolhapur", "कोल्हापूर"],
  Solapur: ["solapur", "सोलापूर"],
  Jalgaon: ["jalgaon", "जळगाव"],
  Satara: ["satara", "सातारा"],
  Sangli: ["sangli", "सांगली"],
};

function money(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export default function FarmerPricePage() {
  const router = useRouter();
  const t = useTranslations("phase3Price");
  const locale = useLocale();
  const localeKey = getLocaleKey(locale);
  const copy = PRICE_COPY[localeKey];
  const [crops, setCrops] = useState<CropOption[]>([]);
  const [cropText, setCropText] = useState("");
  const [location, setLocation] = useState("");
  const [quality, setQuality] = useState("A");
  const [quantity, setQuantity] = useState("25");
  const [season, setSeason] = useState("Rabi");
  const [loading, setLoading] = useState(false);
  const [loadingCrops, setLoadingCrops] = useState(true);
  const [error, setError] = useState("");
  const [result, setResult] = useState<PriceResult | null>(null);
  const [voiceMessage, setVoiceMessage] = useState("");

  const getToken = () =>
    typeof window === "undefined"
      ? null
      : localStorage.getItem("access_token") || localStorage.getItem("token");

  useEffect(() => {
    async function loadCrops() {
      const token = getToken();
      if (!token) {
        router.replace("/login");
        return;
      }
      try {
        const response = await fetch(`${API_URL}/api/crops`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const body = await response.json().catch(() => null);
        if (response.ok && Array.isArray(body)) setCrops(body);
      } finally {
        setLoadingCrops(false);
      }
    }
    void loadCrops();
  }, [router]);

  async function requestPrice(overrides?: { crop?: string; location?: string }) {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    const requestedCrop = (overrides?.crop ?? cropText).trim();
    const requestedLocation = (overrides?.location ?? location).trim();
    const quantityValue = Number(quantity);

    if (requestedCrop.length < 2) {
      setError(t("cropRequired"));
      return;
    }
    if (requestedLocation.length < 2) {
      setError(t("locationRequired"));
      return;
    }
    if (!Number.isFinite(quantityValue) || quantityValue <= 0) {
      setError(t("quantityRequired"));
      return;
    }
    if (!season.trim()) {
      setError(t("seasonRequired"));
      return;
    }

    const matchedCrop = crops.find(
      (crop) => crop.name.toLocaleLowerCase() === requestedCrop.toLocaleLowerCase(),
    );

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const payload: Record<string, unknown> = {
        location: requestedLocation,
        quality,
        quantity: quantityValue,
        season: season.trim(),
        historical_prices: [],
      };
      if (matchedCrop) payload.crop_id = matchedCrop.id;
      else payload.crop = requestedCrop;

      const response = await fetch(`${API_URL}/api/ai/price-prediction`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(typeof body?.detail === "string" ? body.detail : t("searchFailed"));
      }
      setCropText(requestedCrop);
      setLocation(requestedLocation);
      setResult(body as PriceResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("searchFailed"));
    } finally {
      setLoading(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void requestPrice();
  }

  function handleVoice(transcript: string) {
    const normalized = transcript.toLocaleLowerCase();
    let detectedCrop = "";
    let detectedPlace = "";

    for (const [canonical, aliases] of Object.entries(CROP_ALIASES)) {
      if (aliases.some((alias) => normalized.includes(alias))) {
        detectedCrop = crops.find((crop) => crop.name.toLocaleLowerCase() === canonical)?.name || canonical;
        break;
      }
    }
    if (!detectedCrop) {
      const crop = crops.find((item) => normalized.includes(item.name.toLocaleLowerCase()));
      if (crop) detectedCrop = crop.name;
    }

    for (const [place, aliases] of Object.entries(PLACE_ALIASES)) {
      if (aliases.some((alias) => normalized.includes(alias))) {
        detectedPlace = place;
        break;
      }
    }

    if (detectedCrop) setCropText(detectedCrop);
    if (detectedPlace) setLocation(detectedPlace);

    if (!detectedCrop) {
      setVoiceMessage(t("voiceNeedCrop"));
      return;
    }
    if (!detectedPlace && !location.trim()) {
      setVoiceMessage(t("voiceNeedLocation"));
      return;
    }

    const finalPlace = detectedPlace || location.trim();
    setVoiceMessage(t("voiceSearching"));
    void requestPrice({ crop: detectedCrop, location: finalPlace });
  }

  const trendValues = result?.historical_prices || [];
  const canShowTrend = Boolean(result && trendValues.length >= 2);
  const latestTrend = canShowTrend ? trendValues[trendValues.length - 1] : null;
  const trendMin = canShowTrend ? Math.min(...trendValues) : null;
  const trendMax = canShowTrend ? Math.max(...trendValues) : null;

  const chartData =
    result?.chart_data && result.chart_data.length > 0
      ? result.chart_data
      : [
          ...trendValues.map((price, index) => ({
            label: `${index + 1}`,
            price,
          })),
          ...(result
            ? [
                {
                  label: copy.predictedPrice,
                  price: result.predicted_price,
                },
              ]
            : []),
        ];

  const modeLabel = result?.demo_mode
    ? copy.demoData
    : result?.data_mode === "CACHED"
      ? copy.cachedData
      : result?.data_mode === "HISTORICAL"
        ? copy.historicalData
        : copy.liveData;

  const trendLabel =
    result?.trend === "UP"
      ? t("trendUp")
      : result?.trend === "DOWN"
        ? t("trendDown")
        : t("trendStable");
  const estimateUnit = displayPriceUnit(result?.unit, locale, t("unitUnavailable"));
  const withEstimateUnit = (value: number | null | undefined) => `${money(value)} · ${estimateUnit}`;
  const marketIsAggregate = Boolean(
    result?.market_data?.market?.toLocaleLowerCase().includes("aggregate"),
  );
  const marketUnit = displayPriceUnit(
    result?.market_data?.unit,
    locale,
    t("perQuintal"),
  );

  return (
    <div className="min-h-screen bg-[#F4F7F2] pb-24 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <FarmerPhase3Header title={t("title")} subtitle={t("subtitle")} backLabel={t("marketHub")} backHref="/dashboard/farmer/market" />

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-[#D7E3DA] bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7">
          <div className="flex items-start gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#E8F5EE] text-[#0F7A4A]"><Search className="h-6 w-6" /></span>
            <div>
              <h1 className="text-2xl font-black text-[#0F172A] dark:text-white sm:text-3xl">{t("marketPriceTitle")}</h1>
              <p className="mt-1 text-slate-600 dark:text-slate-300">{t("marketPriceDesc")}</p>
            </div>
          </div>

          <form onSubmit={submit} className="mt-6 space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t("crop")}>
                <input
                  list="agriva-phase3-crops"
                  value={cropText}
                  onChange={(e) => setCropText(e.target.value)}
                  placeholder={loadingCrops ? t("loadingCrops") : t("cropPlaceholder")}
                  className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-900 outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
                <datalist id="agriva-phase3-crops">
                  {crops.map((crop) => <option key={crop.id} value={crop.name} />)}
                </datalist>
              </Field>
              <Field label={t("marketLocation")}>
                <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder={t("locationPlaceholder")} className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-900 outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
              </Field>
            </div>

            <details className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/70">
              <summary className="cursor-pointer font-bold text-slate-800 dark:text-slate-100">{t("detailsNeeded")}</summary>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <Field label={t("quality")}>
                  <select value={quality} onChange={(e) => setQuality(e.target.value)} className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-900 outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white">
                    {["A+", "A", "B", "C", "Premium", "Standard"].map((item) => <option key={item}>{item}</option>)}
                  </select>
                </Field>
                <Field label={t("quantityKg")}>
                  <input type="number" min="0.01" step="0.01" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-900 outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
                </Field>
                <Field label={t("season")}>
                  <select value={season} onChange={(e) => setSeason(e.target.value)} className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-900 outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white">
                    <option value="Rabi">Rabi</option><option value="Kharif">Kharif</option><option value="Zaid">Zaid</option>
                  </select>
                </Field>
              </div>
            </details>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button type="submit" disabled={loading} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#0F7A4A] px-5 font-black text-white disabled:opacity-60">
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <IndianRupee className="h-5 w-5" />}
                {loading ? t("searching") : t("viewPrice")}
              </button>
              <VoiceCapture onTranscript={handleVoice} label={t("voicePrice")} listeningLabel={t("listening")} unsupportedLabel={t("voiceUnsupported")} />
            </div>
            {voiceMessage ? <p className="text-sm font-semibold text-[#0F7A4A]">{voiceMessage}</p> : null}
            {error ? <p className="rounded-xl border border-red-200 bg-red-50 p-3 font-semibold text-red-700">{error}</p> : null}
          </form>
        </section>

        {result ? (
          <>
            <section className="rounded-3xl border border-[#D7E3DA] bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black uppercase tracking-wider text-[#0F7A4A]">{t("marketResult")}</p>
                  <h2 className="mt-1 text-2xl font-black text-[#0F172A]">{displayCropName(result.market_data?.commodity || result.crop, locale)}</h2>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  {marketIsAggregate ? (
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                      {t("aggregateData")}
                    </span>
                  ) : null}
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${
                      result.demo_mode
                        ? "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
                        : "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
                    }`}
                  >
                    {modeLabel}
                  </span>
                </div>
              </div>

              {result.market_data ? (
                <div className="mt-5 space-y-5">
                  <div className="rounded-2xl bg-[#E8F5EE] p-5 text-center dark:bg-emerald-950/30">
                    <p className="text-sm font-bold text-slate-600 dark:text-slate-300">{t("averagePrice")}</p>
                    <p className="mt-1 text-4xl font-black text-[#0F7A4A]">{money(result.market_data.modal_price)}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">{marketUnit}</p>
                  </div>
                  {marketIsAggregate ? (
                    <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
                      <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />
                      <div>
                        <p className="font-black">{t("aggregateTitle")}</p>
                        <p className="mt-1 text-sm">{t("aggregateNotice")}</p>
                      </div>
                    </div>
                  ) : null}
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    <ResultCard
                      icon={<Building2 />}
                      label={marketIsAggregate ? t("aggregateMarket") : t("market")}
                      value={result.market_data.market || "—"}
                    />
                    <ResultCard
                      icon={<MapPin />}
                      label={t("district")}
                      value={result.market_data.district || "—"}
                    />
                    <ResultCard
                      icon={<Building2 />}
                      label={copy.state}
                      value={result.market_data.state || "—"}
                    />
                    <ResultCard
                      icon={<ArrowDownRight />}
                      label={t("minimumPrice")}
                      value={result.market_data.min_price == null ? "—" : money(result.market_data.min_price)}
                    />
                    <ResultCard
                      icon={<ArrowUpRight />}
                      label={t("maximumPrice")}
                      value={result.market_data.max_price == null ? "—" : money(result.market_data.max_price)}
                    />
                  </div>
                  <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600 dark:text-slate-300">
                    {result.market_data.arrival_date ? <span className="inline-flex items-center gap-1"><CalendarDays className="h-4 w-4" /> {t("updated")}: {result.market_data.arrival_date}</span> : null}
                    <span>{t("source")}: {result.market_data.source}</span>
                  </div>
                </div>
              ) : (
                <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
                  <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />
                  <div><p className="font-black">{t("liveUnavailable")}</p><p className="mt-1 text-sm">{t("liveUnavailableDesc")}</p></div>
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-[#D7E3DA] bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7">
              <h2 className="text-xl font-black text-[#0F172A] dark:text-white">
                {copy.estimateSummary}
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <ResultCard
                  icon={<IndianRupee />}
                  label={copy.currentPrice}
                  value={withEstimateUnit(result.current_price)}
                />
                <ResultCard
                  icon={<Sparkles />}
                  label={copy.predictedPrice}
                  value={withEstimateUnit(result.predicted_price)}
                />
                <ResultCard
                  icon={<CircleAlert />}
                  label={copy.confidence}
                  value={`${Math.round(result.confidence)}%`}
                />
                <ResultCard
                  icon={
                    result.trend === "UP" ? (
                      <ArrowUpRight />
                    ) : result.trend === "DOWN" ? (
                      <ArrowDownRight />
                    ) : (
                      <Minus />
                    )
                  }
                  label={copy.direction}
                  value={trendLabel}
                />
              </div>

              {result.demo_mode ? (
                <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
                  <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />
                  <div>
                    <p className="font-black">{copy.demoTitle}</p>
                    <p className="mt-1 text-sm leading-6">{copy.demoDescription}</p>
                  </div>
                </div>
              ) : null}
            </section>

            <section id="expected" className="scroll-mt-24 rounded-3xl border border-[#D7E3DA] bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7">
              <div className="flex items-start gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-50 text-violet-700"><Sparkles className="h-6 w-6" /></span>
                <div><h2 className="text-2xl font-black text-[#0F172A] dark:text-white">{t("expectedTitle")}</h2><p className="mt-1 text-slate-600 dark:text-slate-300">{t("expectedDesc")}</p></div>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <ResultCard icon={<IndianRupee />} label={t("expectedPrice")} value={withEstimateUnit(result.predicted_price)} />
                <ResultCard icon={<ArrowDownRight />} label={t("rangeMinimum")} value={withEstimateUnit(result.expected_range_min)} />
                <ResultCard icon={<ArrowUpRight />} label={t("rangeMaximum")} value={withEstimateUnit(result.expected_range_max)} />
              </div>
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
                {copy.translatedDisclaimer ? (
                  <p className="font-semibold">{copy.translatedDisclaimer}</p>
                ) : null}
                <p className={copy.translatedDisclaimer ? "mt-2" : ""}>
                  {copy.exactDisclaimer}
                </p>
              </div>
            </section>

            <section className="rounded-3xl border border-[#D7E3DA] bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7">
              <h2 className="text-xl font-black text-[#0F172A] dark:text-white">{t("trendTitle")}</h2>
              {canShowTrend ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-4">
                  <ResultCard
                    icon={
                      result.trend === "UP" ? (
                        <ArrowUpRight />
                      ) : result.trend === "DOWN" ? (
                        <ArrowDownRight />
                      ) : (
                        <Minus />
                      )
                    }
                    label={t("direction")}
                    value={trendLabel}
                  />
                  <ResultCard icon={<ArrowDownRight />} label={t("recentMin")} value={withEstimateUnit(trendMin)} />
                  <ResultCard icon={<ArrowUpRight />} label={t("recentMax")} value={withEstimateUnit(trendMax)} />
                  <ResultCard icon={<Wheat />} label={t("latestPrice")} value={withEstimateUnit(latestTrend)} />
                </div>
              ) : (
                <p className="mt-3 rounded-xl bg-slate-50 p-4 text-slate-600 dark:bg-slate-950/70 dark:text-slate-300">
                  {t("trendUnavailable")}
                </p>
              )}
            </section>

            <section className="rounded-3xl border border-[#D7E3DA] bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7">
              <div>
                <h2 className="text-xl font-black text-[#0F172A] dark:text-white">
                  {copy.chartTitle}
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {copy.chartDescription}
                </p>
              </div>

              {chartData.length >= 2 ? (
                <div className="mt-5 h-80 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950/70">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 12, right: 16, left: 4, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" />
                      <YAxis
                        width={72}
                        tickFormatter={(value) => `₹${Number(value).toLocaleString("en-IN")}`}
                      />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="price"
                        stroke="#059669"
                        strokeWidth={3}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="mt-4 rounded-xl bg-slate-50 p-4 text-slate-600 dark:bg-slate-950/70 dark:text-slate-300">
                  {copy.noChart}
                </p>
              )}
            </section>
          </>
        ) : null}
      </main>
      <FarmerBottomNav
        onAlerts={() => router.push("/dashboard/farmer#important-alerts")}
        onProfile={() => router.push("/dashboard/farmer")}
      />
      <AgrivaAI />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">{label}</span>{children}</label>;
}

function ResultCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/70"><div className="flex items-center gap-2 text-[#0F7A4A] dark:text-emerald-400">{icon}<span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</span></div><p className="mt-2 text-lg font-black text-[#0F172A] dark:text-white">{value}</p></div>;
}
