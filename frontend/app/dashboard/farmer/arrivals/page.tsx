"use client";

import {
  useState,
} from "react";

import {
  ArrowLeft,
  BarChart3,
  Database,
  IndianRupee,
  Loader2,
  MapPin,
  Search,
  TrendingDown,
  TrendingUp,
  Wheat,
} from "lucide-react";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";

import LanguageSelector from "@/components/LanguageSelector";


const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000";


type TrendPoint = {
  date: string;
  arrival_quantity_mt: number;
};


type ArrivalData = {
  crop: string;
  district: string;
  state: string;

  arrival_scope: string;
  arrival_source: string;
  arrival_data_mode: string;

  latest_arrival_date: string;
  latest_arrival_mt: number;
  seven_day_average_mt: number;
  change_vs_average_percent: number;

  arrival_level:
    | "HIGH"
    | "NORMAL"
    | "LOW";

  supply_pressure: string;

  price_market: string | null;
  current_modal_price_per_quintal:
    | number
    | null;

  price_arrival_date: string | null;
  price_source: string | null;
  price_data_mode: string;

  insight: string;
  disclaimer: string;

  trend: TrendPoint[];
};


const COPY = {
  en: {
    back: "Farmer Dashboard",
    language: "Language",

    badge:
      "AGRIVA Market Intelligence",

    title:
      "Mandi Arrival Intelligence",

    subtitle:
      "Understand crop arrivals, supply pressure and the latest Government mandi price before deciding when to sell.",

    searchTitle:
      "Check Market Arrivals",

    crop: "Crop",
    district: "District",
    state: "State",

    analyze:
      "Analyze arrivals",

    analyzing:
      "Analyzing market...",

    examples:
      "Quick examples",

    latest:
      "Latest arrival",

    average:
      "7-day average",

    change:
      "Vs recent average",

    marketPrice:
      "Current mandi price",

    perQuintal:
      "/ quintal",

    high:
      "High arrivals",

    normal:
      "Normal arrivals",

    low:
      "Low arrivals",

    arrivalTrend:
      "7-Day Arrival Trend",

    arrivalTrendDesc:
      "Arrival quantity in metric tonnes.",

    insight:
      "AGRIVA Market Insight",

    dataTransparency:
      "Data Transparency",

    arrivalData:
      "Arrival volume",

    priceData:
      "Mandi price",

    demo:
      "Prototype dataset",

    live:
      "LIVE Government data",

    unavailable:
      "Unavailable",

    priceSource:
      "Price source",

    arrivalSource:
      "Arrival source",

    location:
      "Market area",

    possiblePressure:
      "Supply pressure",

    highPressure:
      "Higher arrivals may increase supply pressure.",

    lowPressure:
      "Lower arrivals may support prices.",

    normalPressure:
      "Supply is close to the recent average.",

    disclaimerTitle:
      "Important",

    noToken:
      "Please login again to use Mandi Arrival Intelligence.",

    error:
      "Unable to load arrival intelligence.",

    invalid:
      "Enter crop, district and state.",

    mt:
      "MT",
  },

  hi: {
    back:
      "किसान डैशबोर्ड",

    language:
      "भाषा",

    badge:
      "AGRIVA बाजार बुद्धिमत्ता",

    title:
      "मंडी आवक विश्लेषण",

    subtitle:
      "फसल बेचने का समय तय करने से पहले मंडी की आवक, आपूर्ति दबाव और नवीनतम सरकारी मंडी भाव समझें।",

    searchTitle:
      "मंडी आवक देखें",

    crop:
      "फसल",

    district:
      "जिला",

    state:
      "राज्य",

    analyze:
      "आवक का विश्लेषण करें",

    analyzing:
      "बाजार विश्लेषण हो रहा है...",

    examples:
      "त्वरित उदाहरण",

    latest:
      "नवीनतम आवक",

    average:
      "7-दिन औसत",

    change:
      "हाल के औसत से अंतर",

    marketPrice:
      "वर्तमान मंडी भाव",

    perQuintal:
      "/ क्विंटल",

    high:
      "अधिक आवक",

    normal:
      "सामान्य आवक",

    low:
      "कम आवक",

    arrivalTrend:
      "7-दिन की आवक प्रवृत्ति",

    arrivalTrendDesc:
      "मीट्रिक टन में आवक मात्रा।",

    insight:
      "AGRIVA बाजार जानकारी",

    dataTransparency:
      "डेटा पारदर्शिता",

    arrivalData:
      "आवक मात्रा",

    priceData:
      "मंडी भाव",

    demo:
      "प्रोटोटाइप डेटा",

    live:
      "LIVE सरकारी डेटा",

    unavailable:
      "उपलब्ध नहीं",

    priceSource:
      "भाव स्रोत",

    arrivalSource:
      "आवक स्रोत",

    location:
      "बाजार क्षेत्र",

    possiblePressure:
      "आपूर्ति दबाव",

    highPressure:
      "अधिक आवक से बाजार में आपूर्ति दबाव बढ़ सकता है।",

    lowPressure:
      "कम आवक कीमतों को सहारा दे सकती है।",

    normalPressure:
      "आपूर्ति हाल के औसत के करीब है।",

    disclaimerTitle:
      "महत्वपूर्ण",

    noToken:
      "मंडी आवक विश्लेषण के लिए दोबारा लॉगिन करें।",

    error:
      "मंडी आवक जानकारी लोड नहीं हो सकी।",

    invalid:
      "फसल, जिला और राज्य दर्ज करें।",

    mt:
      "MT",
  },

  mr: {
    back:
      "शेतकरी डॅशबोर्ड",

    language:
      "भाषा",

    badge:
      "AGRIVA बाजार बुद्धिमत्ता",

    title:
      "मंडी आवक विश्लेषण",

    subtitle:
      "पीक कधी विकायचे हे ठरवण्यापूर्वी मंडी आवक, पुरवठ्याचा दबाव आणि नवीनतम सरकारी बाजारभाव समजून घ्या.",

    searchTitle:
      "मंडी आवक तपासा",

    crop:
      "पीक",

    district:
      "जिल्हा",

    state:
      "राज्य",

    analyze:
      "आवक विश्लेषण करा",

    analyzing:
      "बाजार विश्लेषण सुरू आहे...",

    examples:
      "त्वरित उदाहरणे",

    latest:
      "नवीनतम आवक",

    average:
      "7-दिवस सरासरी",

    change:
      "अलीकडील सरासरीपेक्षा बदल",

    marketPrice:
      "सध्याचा मंडी भाव",

    perQuintal:
      "/ क्विंटल",

    high:
      "जास्त आवक",

    normal:
      "सामान्य आवक",

    low:
      "कमी आवक",

    arrivalTrend:
      "7-दिवसांची आवक प्रवृत्ती",

    arrivalTrendDesc:
      "मेट्रिक टनमध्ये आवक प्रमाण.",

    insight:
      "AGRIVA बाजार माहिती",

    dataTransparency:
      "डेटा पारदर्शकता",

    arrivalData:
      "आवक प्रमाण",

    priceData:
      "मंडी भाव",

    demo:
      "प्रोटोटाइप डेटा",

    live:
      "LIVE सरकारी डेटा",

    unavailable:
      "उपलब्ध नाही",

    priceSource:
      "भाव स्रोत",

    arrivalSource:
      "आवक स्रोत",

    location:
      "बाजार क्षेत्र",

    possiblePressure:
      "पुरवठा दबाव",

    highPressure:
      "जास्त आवक बाजारात पुरवठा दबाव वाढवू शकते.",

    lowPressure:
      "कमी आवक किमतींना आधार देऊ शकते.",

    normalPressure:
      "पुरवठा अलीकडील सरासरीच्या जवळ आहे.",

    disclaimerTitle:
      "महत्त्वाचे",

    noToken:
      "मंडी आवक विश्लेषणासाठी पुन्हा लॉगिन करा.",

    error:
      "मंडी आवक माहिती लोड झाली नाही.",

    invalid:
      "पीक, जिल्हा आणि राज्य भरा.",

    mt:
      "MT",
  },
} as const;


const EXAMPLES = [
  {
    crop: "Onion",
    district: "Nashik",
    state: "Maharashtra",
  },
  {
    crop: "Maize",
    district: "Nashik",
    state: "Maharashtra",
  },
  {
    crop: "Wheat",
    district: "Pune",
    state: "Maharashtra",
  },
  {
    crop: "Soybean",
    district: "Latur",
    state: "Maharashtra",
  },
];


function getToken() {
  return (
    localStorage.getItem(
      "access_token"
    ) ||
    localStorage.getItem(
      "token"
    )
  );
}


function formatPrice(
  value: number
) {
  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }
  ).format(value);
}


export default function ArrivalsPage() {
  const router = useRouter();
  const locale = useLocale();

  const copy =
    COPY[
      locale === "hi" ||
      locale === "mr"
        ? locale
        : "en"
    ];

  const [crop, setCrop] =
    useState("Onion");

  const [district, setDistrict] =
    useState("Nashik");

  const [stateName, setStateName] =
    useState("Maharashtra");

  const [data, setData] =
    useState<ArrivalData | null>(
      null
    );

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");


  async function analyze() {
    const token = getToken();

    if (!token) {
      setError(copy.noToken);
      return;
    }

    if (
      !crop.trim() ||
      !district.trim() ||
      !stateName.trim()
    ) {
      setError(copy.invalid);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const params =
        new URLSearchParams({
          crop: crop.trim(),
          district:
            district.trim(),
          state:
            stateName.trim(),
        });

      const response = await fetch(
        `${API_URL}/api/market-intelligence/arrivals?${params.toString()}`,
        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

      const result =
        await response
          .json()
          .catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.detail ||
            copy.error
        );
      }

      setData(
        result as ArrivalData
      );
    } catch (err) {
      setData(null);

      setError(
        err instanceof Error
          ? err.message
          : copy.error
      );
    } finally {
      setLoading(false);
    }
  }


  function levelLabel(
    level: ArrivalData[
      "arrival_level"
    ]
  ) {
    if (level === "HIGH") {
      return copy.high;
    }

    if (level === "LOW") {
      return copy.low;
    }

    return copy.normal;
  }


  function pressureText(
    level: ArrivalData[
      "arrival_level"
    ]
  ) {
    if (level === "HIGH") {
      return copy.highPressure;
    }

    if (level === "LOW") {
      return copy.lowPressure;
    }

    return copy.normalPressure;
  }


  function translatedInsight() {
    if (!data) {
      return "";
    }

    const pct =
      Math.abs(
        data.change_vs_average_percent
      ).toFixed(1);

    if (locale === "hi") {
      if (
        data.arrival_level ===
        "HIGH"
      ) {
        return `${data.crop} की आवक हाल के औसत से लगभग ${pct}% अधिक है। अधिक आपूर्ति से कीमत पर नीचे की ओर दबाव बन सकता है, लेकिन यह कीमत गिरने की गारंटी नहीं है। बेचने से पहले वर्तमान मंडी भाव और खरीदार ऑफर की तुलना करें।`;
      }

      if (
        data.arrival_level ===
        "LOW"
      ) {
        return `${data.crop} की आवक हाल के औसत से लगभग ${pct}% कम है। कम आपूर्ति कीमतों को सहारा दे सकती है, लेकिन कीमत बढ़ने की गारंटी नहीं है।`;
      }

      return `${data.crop} की आवक हाल के औसत के करीब है। बेचने का निर्णय लेते समय मंडी भाव, खरीदार मांग, गुणवत्ता और भंडारण लागत को साथ में देखें।`;
    }

    if (locale === "mr") {
      if (
        data.arrival_level ===
        "HIGH"
      ) {
        return `${data.crop} ची आवक अलीकडील सरासरीपेक्षा सुमारे ${pct}% जास्त आहे. जास्त पुरवठ्यामुळे किमतीवर खाली जाण्याचा दबाव येऊ शकतो, पण किंमत कमी होईल याची हमी नाही. विक्रीपूर्वी मंडी भाव आणि खरेदीदार ऑफर तुलना करा.`;
      }

      if (
        data.arrival_level ===
        "LOW"
      ) {
        return `${data.crop} ची आवक अलीकडील सरासरीपेक्षा सुमारे ${pct}% कमी आहे. कमी पुरवठा किमतींना आधार देऊ शकतो, परंतु किंमत वाढेल याची हमी नाही.`;
      }

      return `${data.crop} ची आवक अलीकडील सरासरीच्या जवळ आहे. विक्रीचा निर्णय घेताना मंडी भाव, खरेदीदार मागणी, गुणवत्ता आणि साठवण खर्च एकत्र पहा.`;
    }

    return data.insight;
  }


  return (
    <main className="agriva-arrivals-page min-h-screen bg-[#f7faf7] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <section className="border-b border-emerald-200 bg-gradient-to-br from-[#f8fff9] via-[#eafff0] to-[#fff7df] dark:border-slate-800 dark:from-slate-950 dark:via-emerald-950/40 dark:to-slate-950">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <button
              onClick={() =>
                router.push(
                  "/dashboard/farmer"
                )
              }
              className="inline-flex items-center gap-2 text-sm font-black text-emerald-800 hover:text-emerald-950 dark:text-emerald-300"
            >
              <ArrowLeft className="h-4 w-4" />
              {copy.back}
            </button>

            <div className="flex items-center gap-3 self-start rounded-2xl border border-emerald-200 bg-white/90 px-3 py-2 shadow-sm dark:border-emerald-900 dark:bg-slate-900/90 sm:self-auto">
              <span className="hidden text-xs font-black uppercase tracking-[0.14em] text-emerald-800 dark:text-emerald-300 sm:inline">
                {copy.language}
              </span>

              <LanguageSelector />
            </div>
          </div>

          <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
            <BarChart3 className="h-4 w-4" />
            {copy.badge}
          </div>

          <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-tight text-emerald-950 dark:text-emerald-50 sm:text-5xl">
            {copy.title}
          </h1>

          <p className="mt-4 max-w-4xl text-lg font-medium leading-8 text-slate-700 dark:text-slate-300">
            {copy.subtitle}
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-[0_10px_35px_rgba(15,118,110,0.08)] dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          <h2 className="text-2xl font-black text-emerald-950 dark:text-emerald-50">
            {copy.searchTitle}
          </h2>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <Field
              label={copy.crop}
            >
              <input
                value={crop}
                onChange={(event) =>
                  setCrop(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950"
              />
            </Field>

            <Field
              label={copy.district}
            >
              <input
                value={district}
                onChange={(event) =>
                  setDistrict(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950"
              />
            </Field>

            <Field
              label={copy.state}
            >
              <input
                value={stateName}
                onChange={(event) =>
                  setStateName(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950"
              />
            </Field>
          </div>

          <div className="mt-5">
            <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-500">
              {copy.examples}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {EXAMPLES.map(
                (example) => (
                  <button
                    key={`${example.crop}-${example.district}`}
                    type="button"
                    onClick={() => {
                      setCrop(
                        example.crop
                      );
                      setDistrict(
                        example.district
                      );
                      setStateName(
                        example.state
                      );
                    }}
                    className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-800 transition hover:border-emerald-400 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
                  >
                    {example.crop} ·{" "}
                    {
                      example.district
                    }
                  </button>
                )
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              void analyze()
            }
            disabled={loading}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 font-black text-white shadow-md transition hover:bg-emerald-800 disabled:opacity-60 sm:w-auto"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}

            {loading
              ? copy.analyzing
              : copy.analyze}
          </button>

          {error && (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 font-semibold text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
              {error}
            </div>
          )}
        </section>

        {data && (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                title={copy.latest}
                value={`${data.latest_arrival_mt.toLocaleString("en-IN")} ${copy.mt}`}
                subtitle={
                  data.latest_arrival_date
                }
                icon={
                  <Wheat className="h-6 w-6" />
                }
              />

              <MetricCard
                title={copy.average}
                value={`${data.seven_day_average_mt.toLocaleString("en-IN")} ${copy.mt}`}
                subtitle={
                  data.arrival_scope
                }
                icon={
                  <Database className="h-6 w-6" />
                }
              />

              <MetricCard
                title={copy.change}
                value={`${data.change_vs_average_percent >= 0 ? "+" : ""}${data.change_vs_average_percent.toFixed(2)}%`}
                subtitle={levelLabel(
                  data.arrival_level
                )}
                icon={
                  data.change_vs_average_percent >=
                  0 ? (
                    <TrendingUp className="h-6 w-6" />
                  ) : (
                    <TrendingDown className="h-6 w-6" />
                  )
                }
              />

              <MetricCard
                title={copy.marketPrice}
                value={
                  data.current_modal_price_per_quintal !==
                  null
                    ? formatPrice(
                        data.current_modal_price_per_quintal
                      )
                    : copy.unavailable
                }
                subtitle={
                  data.current_modal_price_per_quintal !==
                  null
                    ? `${data.price_data_mode} ${copy.perQuintal}`
                    : copy.unavailable
                }
                icon={
                  <IndianRupee className="h-6 w-6" />
                }
              />
            </section>

            <section className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr]">
              <div className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-[0_10px_35px_rgba(15,118,110,0.08)] dark:border-slate-800 dark:bg-slate-900 sm:p-8">
                <h2 className="text-2xl font-black text-emerald-950 dark:text-emerald-50">
                  {copy.arrivalTrend}
                </h2>

                <p className="mt-2 text-slate-600 dark:text-slate-300">
                  {copy.arrivalTrendDesc}
                </p>

                <div className="mt-6 h-80 w-full">
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <AreaChart
                      data={data.trend}
                    >
                      <defs>
                        <linearGradient
                          id="arrivalFill"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#059669"
                            stopOpacity={0.35}
                          />
                          <stop
                            offset="95%"
                            stopColor="#059669"
                            stopOpacity={0.03}
                          />
                        </linearGradient>
                      </defs>

                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                      />

                      <XAxis
                        dataKey="date"
                        tickFormatter={(
                          value
                        ) =>
                          String(
                            value
                          ).slice(5)
                        }
                      />

                      <YAxis />

                      <Tooltip
                        formatter={(
                          value
                        ) => [
                          `${Number(
                            value
                          ).toLocaleString(
                            "en-IN"
                          )} MT`,
                          copy.arrivalData,
                        ]}
                      />

                      <Area
                        type="monotone"
                        dataKey="arrival_quantity_mt"
                        stroke="#059669"
                        strokeWidth={3}
                        fill="url(#arrivalFill)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="space-y-6">
                <div
                  className={`rounded-3xl border p-6 shadow-sm ${
                    data.arrival_level ===
                    "HIGH"
                      ? "border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30"
                      : data.arrival_level ===
                          "LOW"
                        ? "border-sky-300 bg-sky-50 dark:border-sky-900 dark:bg-sky-950/30"
                        : "border-emerald-300 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30"
                  }`}
                >
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-600 dark:text-slate-300">
                    {copy.possiblePressure}
                  </p>

                  <h3 className="mt-3 text-3xl font-black">
                    {levelLabel(
                      data.arrival_level
                    )}
                  </h3>

                  <p className="mt-4 leading-7 text-slate-700 dark:text-slate-200">
                    {pressureText(
                      data.arrival_level
                    )}
                  </p>
                </div>

                <div className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-amber-50 p-6 shadow-sm dark:border-emerald-900 dark:from-emerald-950/40 dark:via-slate-900 dark:to-slate-900">
                  <h3 className="text-xl font-black text-emerald-950 dark:text-emerald-50">
                    {copy.insight}
                  </h3>

                  <p className="mt-4 leading-7 text-slate-700 dark:text-slate-200">
                    {translatedInsight()}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
              <h2 className="text-2xl font-black text-emerald-950 dark:text-emerald-50">
                {copy.dataTransparency}
              </h2>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950/30">
                  <div className="flex flex-wrap items-center gap-2">
                    <Database className="h-5 w-5 text-amber-700" />

                    <h3 className="font-black">
                      {copy.arrivalData}
                    </h3>

                    <span className="rounded-full bg-amber-200 px-3 py-1 text-xs font-black text-amber-900 dark:bg-amber-900 dark:text-amber-100">
                      {data.arrival_data_mode ===
                      "LIVE_VERIFIED"
                        ? copy.live
                        : copy.demo}
                    </span>
                  </div>

                  <p className="mt-4 text-sm leading-6 text-slate-700 dark:text-slate-200">
                    {copy.arrivalSource}:{" "}
                    {data.arrival_source}
                  </p>
                </div>

                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900 dark:bg-emerald-950/30">
                  <div className="flex flex-wrap items-center gap-2">
                    <IndianRupee className="h-5 w-5 text-emerald-700" />

                    <h3 className="font-black">
                      {copy.priceData}
                    </h3>

                    <span className="rounded-full bg-emerald-200 px-3 py-1 text-xs font-black text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100">
                      {data.price_data_mode ===
                      "LIVE"
                        ? copy.live
                        : data.price_data_mode}
                    </span>
                  </div>

                  <p className="mt-4 text-sm leading-6 text-slate-700 dark:text-slate-200">
                    {copy.priceSource}:{" "}
                    {data.price_source ||
                      copy.unavailable}
                  </p>

                  <p className="mt-2 flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0" />

                    {data.price_market ||
                      `${data.district}, ${data.state}`}
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800">
                <p className="font-black">
                  {copy.disclaimerTitle}
                </p>

                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {data.disclaimer}
                </p>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}


function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-slate-700 dark:text-slate-200">
        {label}
      </span>

      {children}
    </label>
  );
}


function MetricCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
}) {
  return (
    <article className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-[0_8px_30px_rgba(15,118,110,0.07)] dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
            {title}
          </p>

          <p className="mt-3 text-2xl font-black text-emerald-950 dark:text-emerald-100">
            {value}
          </p>

          <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            {subtitle}
          </p>
        </div>

        <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          {icon}
        </div>
      </div>
    </article>
  );
}
