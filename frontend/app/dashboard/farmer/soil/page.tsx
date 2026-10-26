"use client";

import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ClipboardList,
  Download,
  FileImage,
  FileText,
  FlaskConical,
  History,
  Leaf,
  Loader2,
  Mic,
  RefreshCw,
  Share2,
  Sprout,
  ThermometerSun,
  UploadCloud,
  Waves,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";

import FarmerPhase3Header from "@/components/phase3/FarmerPhase3Header";
import VoiceCapture from "@/components/phase3/VoiceCapture";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

type SourceType = "manual" | "report" | "image" | "camera";

type SoilForm = {
  ph: string;
  nitrogen: string;
  phosphorus: string;
  potassium: string;
  organic_carbon: string;
  moisture: string;
  temperature: string;
  soil_type: string;
};

type SoilAnalysis = {
  id: string;
  field_id?: string | null;
  soil_type: string | null;
  ph: number | null;
  nitrogen: number | null;
  phosphorus: number | null;
  potassium: number | null;
  organic_carbon: number | null;
  moisture: number | null;
  temperature: number | null;
  soil_health_score: number;
  recommendations: string[];
  source_type: SourceType | string;
  demo_mode: boolean;
  created_at: string;
};

type SoilAnalysisResponse = {
  success?: boolean;
  message?: string;
  data?: SoilAnalysis;
  detail?: string;
};

type SoilHistoryItem = Pick<
  SoilAnalysis,
  "id" | "soil_type" | "ph" | "soil_health_score" | "source_type" | "demo_mode" | "created_at"
>;

type SoilHistoryResponse = {
  success?: boolean;
  data?: SoilHistoryItem[];
};

const EMPTY_FORM: SoilForm = {
  ph: "",
  nitrogen: "",
  phosphorus: "",
  potassium: "",
  organic_carbon: "",
  moisture: "",
  temperature: "",
  soil_type: "",
};

const RECOMMENDATION_TRANSLATIONS: Record<string, { mr: string; hi: string }> = {
  "Soil is acidic. Consider agricultural lime after professional soil verification.": {
    mr: "माती आम्लीय दिसते. तज्ज्ञ माती तपासणीनंतर कृषी चुन्याचा विचार करा.",
    hi: "मिट्टी अम्लीय दिखती है। विशेषज्ञ मिट्टी जांच के बाद कृषि चूने पर विचार करें।",
  },
  "Soil is alkaline. Consider organic matter and suitable soil amendments.": {
    mr: "माती क्षारीय दिसते. सेंद्रिय पदार्थ आणि योग्य माती सुधारकांचा विचार करा.",
    hi: "मिट्टी क्षारीय दिखती है। जैविक पदार्थ और उपयुक्त मिट्टी सुधारक पर विचार करें।",
  },
  "Soil pH is in a generally suitable range for many crops.": {
    mr: "मातीचा pH अनेक पिकांसाठी साधारणपणे योग्य मर्यादेत आहे.",
    hi: "मिट्टी का pH कई फसलों के लिए सामान्यतः उपयुक्त सीमा में है।",
  },
  "Nitrogen appears low. Consider compost, manure, or an appropriate nitrogen fertilizer.": {
    mr: "नायट्रोजन कमी दिसतो. कंपोस्ट, शेणखत किंवा योग्य नायट्रोजन खताचा विचार करा.",
    hi: "नाइट्रोजन कम दिखता है। कम्पोस्ट, गोबर की खाद या उपयुक्त नाइट्रोजन उर्वरक पर विचार करें।",
  },
  "Phosphorus appears low. Consider a phosphorus-rich fertilizer based on crop requirements.": {
    mr: "फॉस्फरस कमी दिसतो. पिकाच्या गरजेनुसार फॉस्फरसयुक्त खताचा विचार करा.",
    hi: "फॉस्फोरस कम दिखता है। फसल की जरूरत के अनुसार फॉस्फोरस युक्त उर्वरक पर विचार करें।",
  },
  "Potassium appears low. Consider potassium fertilizer or suitable organic sources.": {
    mr: "पोटॅशियम कमी दिसतो. पोटॅशियम खत किंवा योग्य सेंद्रिय स्रोतांचा विचार करा.",
    hi: "पोटैशियम कम दिखता है। पोटैशियम उर्वरक या उपयुक्त जैविक स्रोतों पर विचार करें।",
  },
  "Increase organic matter using compost, crop residue, or well-decomposed manure.": {
    mr: "कंपोस्ट, पीक अवशेष किंवा चांगले कुजलेले शेणखत वापरून सेंद्रिय पदार्थ वाढवा.",
    hi: "कम्पोस्ट, फसल अवशेष या अच्छी तरह सड़ी गोबर खाद से जैविक पदार्थ बढ़ाएं।",
  },
  "Soil moisture is low. Improve irrigation scheduling and soil water retention.": {
    mr: "मातीतील ओलावा कमी आहे. सिंचनाचे नियोजन आणि पाणी धरून ठेवण्याची क्षमता सुधारवा.",
    hi: "मिट्टी की नमी कम है। सिंचाई का समय और मिट्टी की जल धारण क्षमता सुधारें।",
  },
  "Maintain current soil management and continue periodic soil testing.": {
    mr: "सध्याचे माती व्यवस्थापन सुरू ठेवा आणि नियमित माती तपासणी करा.",
    hi: "वर्तमान मिट्टी प्रबंधन जारी रखें और नियमित मिट्टी जांच कराएं।",
  },
};

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token") || localStorage.getItem("token");
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
  const normalized = normalizeDigits(text.toLowerCase().replace(/,/g, "."));
  for (const label of labels) {
    const index = normalized.indexOf(label.toLowerCase());
    if (index === -1) continue;
    const tail = normalized.slice(index + label.length);
    const match = tail.match(/[-+]?\d+(?:\.\d+)?/);
    if (match) return match[0];
  }
  return null;
}

function formatNumber(value: number | null | undefined, digits = 1) {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: digits }).format(value);
}

function formatDate(value: string, locale: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const localeTag = locale === "mr" ? "mr-IN" : locale === "hi" ? "hi-IN" : "en-IN";
  return new Intl.DateTimeFormat(localeTag, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}


function localizeSoilType(value: string | null | undefined, locale: string) {
  if (!value) return "—";
  const key = value.trim().toLowerCase();
  const map: Record<string, { mr: string; hi: string }> = {
    loamy: { mr: "दोमट माती", hi: "दोमट मिट्टी" },
    clayey: { mr: "चिकण माती", hi: "चिकनी मिट्टी" },
    clay: { mr: "चिकण माती", hi: "चिकनी मिट्टी" },
    sandy: { mr: "वालुकामय माती", hi: "रेतीली मिट्टी" },
    silty: { mr: "गाळाची माती", hi: "गादयुक्त मिट्टी" },
    silt: { mr: "गाळाची माती", hi: "गादयुक्त मिट्टी" },
  };
  const translated = map[key];
  if (!translated) return value;
  if (locale === "mr") return translated.mr;
  if (locale === "hi") return translated.hi;
  return value;
}

function localizeRecommendation(text: string, locale: string) {
  const translated = RECOMMENDATION_TRANSLATIONS[text];
  if (!translated) return text;
  if (locale === "mr") return translated.mr;
  if (locale === "hi") return translated.hi;
  return text;
}

export default function SoilHealthPage() {
  const t = useTranslations("phase4Soil");
  const locale = useLocale();
  const router = useRouter();

  const [sourceType, setSourceType] = useState<SourceType>("manual");
  const [form, setForm] = useState<SoilForm>(EMPTY_FORM);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<SoilAnalysis | null>(null);
  const [history, setHistory] = useState<SoilHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState("");
  const [shareMessage, setShareMessage] = useState("");
  const cameraRef = useRef<HTMLInputElement>(null);

  const loadHistory = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    setHistoryLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/ai/soil-analysis/history`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      if (response.status === 401) {
        clearAuthStorage();
        router.replace("/login");
        return;
      }

      const body = (await response.json().catch(() => null)) as SoilHistoryResponse | null;
      if (!response.ok || !body?.success) {
        setHistory([]);
        return;
      }
      setHistory(Array.isArray(body.data) ? body.data : []);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const scoreLevel = useMemo(() => {
    const score = analysis?.soil_health_score ?? null;
    if (score == null) return null;
    if (score >= 75) return { label: t("healthGood"), className: "text-emerald-700", ring: "#16a34a" };
    if (score >= 50) return { label: t("healthMedium"), className: "text-amber-700", ring: "#d97706" };
    return { label: t("healthAttention"), className: "text-rose-700", ring: "#dc2626" };
  }, [analysis, t]);

  const sourceLabel = useCallback(
    (value: string) => {
      if (value === "manual") return t("source_manual");
      if (value === "report") return t("source_report");
      if (value === "image") return t("source_image");
      if (value === "camera") return t("source_camera");
      return value || "—";
    },
    [t]
  );

  function updateField(key: keyof SoilForm, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSourceChange(next: SourceType) {
    setSourceType(next);
    setSelectedFile(null);
    setError("");
  }

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setError("");
  }

  function handleVoiceTranscript(transcript: string) {
    const ph = firstNumberAfter(transcript, ["ph", "पीएच", "p h"]);
    const nitrogen = firstNumberAfter(transcript, ["nitrogen", "नायट्रोजन", "नाइट्रोजन"]);
    const phosphorus = firstNumberAfter(transcript, ["phosphorus", "फॉस्फरस", "फास्फोरस", "फॉस्फोरस"]);
    const potassium = firstNumberAfter(transcript, ["potassium", "पोटॅशियम", "पोटेशियम"]);
    const organicCarbon = firstNumberAfter(transcript, ["organic carbon", "सेंद्रिय कार्बन", "जैविक कार्बन"]);
    const moisture = firstNumberAfter(transcript, ["moisture", "ओलावा", "नमी"]);
    const temperature = firstNumberAfter(transcript, ["temperature", "तापमान"]);

    setForm((current) => ({
      ...current,
      ph: ph ?? current.ph,
      nitrogen: nitrogen ?? current.nitrogen,
      phosphorus: phosphorus ?? current.phosphorus,
      potassium: potassium ?? current.potassium,
      organic_carbon: organicCarbon ?? current.organic_carbon,
      moisture: moisture ?? current.moisture,
      temperature: temperature ?? current.temperature,
    }));
  }

  function hasManualMeasurement() {
    return Object.entries(form).some(([key, value]) => key !== "soil_type" && value.trim() !== "") || form.soil_type.trim() !== "";
  }

  async function submitAnalysis(event: FormEvent) {
    event.preventDefault();
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    if (sourceType === "manual" && !hasManualMeasurement()) {
      setError(t("manualRequired"));
      return;
    }

    if (sourceType !== "manual" && !selectedFile) {
      setError(t("fileRequired"));
      return;
    }

    const payload = new FormData();
    payload.append("source_type", sourceType);

    for (const [key, value] of Object.entries(form)) {
      if (value.trim()) payload.append(key, normalizeDigits(value.trim()));
    }

    if (selectedFile) payload.append("file", selectedFile);

    setLoading(true);
    setError("");
    setShareMessage("");

    try {
      const response = await fetch(`${API_URL}/api/ai/soil-analysis`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: payload,
      });

      const body = (await response.json().catch(() => null)) as SoilAnalysisResponse | null;

      if (response.status === 401) {
        clearAuthStorage();
        router.replace("/login");
        return;
      }

      if (!response.ok || !body?.success || !body.data) {
        throw new Error(body?.detail || body?.message || t("analysisFailed"));
      }

      setAnalysis(body.data);
      try {
        localStorage.setItem(
          "agriva-latest-soil-analysis",
          JSON.stringify(body.data),
        );
      } catch {
        // The result still works when browser storage is unavailable.
      }
      await loadHistory();
      document.getElementById("soil-result")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("analysisFailed"));
    } finally {
      setLoading(false);
    }
  }

  function buildReportText() {
    if (!analysis) return "";
    const recommendationText = analysis.recommendations
      .map((item, index) => `${index + 1}. ${localizeRecommendation(item, locale)}`)
      .join("\n");

    return [
      "AGRIVA Soil Health Report",
      "========================",
      `${t("createdAt")}: ${formatDate(analysis.created_at, locale)}`,
      `${t("source")}: ${sourceLabel(analysis.source_type)}`,
      `${t("demoMode")}: ${analysis.demo_mode ? t("yes") : t("no")}`,
      "",
      `${t("soilHealthScore")}: ${formatNumber(analysis.soil_health_score, 1)}/100`,
      `${t("soilType")}: ${localizeSoilType(analysis.soil_type, locale)}`,
      `pH: ${formatNumber(analysis.ph, 2)}`,
      `${t("nitrogen")}: ${formatNumber(analysis.nitrogen)} mg/kg`,
      `${t("phosphorus")}: ${formatNumber(analysis.phosphorus)} mg/kg`,
      `${t("potassium")}: ${formatNumber(analysis.potassium)} mg/kg`,
      `${t("organicCarbon")}: ${formatNumber(analysis.organic_carbon, 2)}%`,
      `${t("moisture")}: ${formatNumber(analysis.moisture)}%`,
      `${t("temperature")}: ${formatNumber(analysis.temperature)}°C`,
      "",
      t("recommendations"),
      recommendationText || "—",
      "",
      analysis.demo_mode ? t("demoReportDisclaimer") : t("reportDisclaimer"),
    ].join("\n");
  }

  function downloadReport() {
    if (!analysis) return;
    const blob = new Blob([buildReportText()], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `AGRIVA-soil-report-${analysis.id.slice(0, 8)}.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  async function shareReport() {
    if (!analysis) return;
    const text = buildReportText();
    try {
      if (navigator.share) {
        await navigator.share({ title: "AGRIVA Soil Health Report", text });
        setShareMessage(t("shared"));
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        setShareMessage(t("copied"));
      } else {
        setShareMessage(t("shareUnavailable"));
      }
    } catch {
      setShareMessage("");
    }
  }

  const sourceCards: Array<{
    type: SourceType;
    icon: typeof Mic;
    title: string;
    description: string;
  }> = [
    { type: "manual", icon: FlaskConical, title: t("manualInput"), description: t("manualInputDesc") },
    { type: "report", icon: FileText, title: t("reportUpload"), description: t("reportUploadDesc") },
    { type: "image", icon: FileImage, title: t("imageUpload"), description: t("imageUploadDesc") },
    { type: "camera", icon: Camera, title: t("cameraUpload"), description: t("cameraUploadDesc") },
  ];

  return (
    <div className="agriva-soil-page min-h-screen bg-[#F4F7F2] text-slate-900">
      <FarmerPhase3Header
        title={t("headerTitle")}
        subtitle={t("headerSubtitle")}
        backLabel={t("backDashboard")}
        backHref="/dashboard/farmer"
        showThemeControl
      />

      <main className="agriva-soil-page mx-auto max-w-7xl space-y-6 px-4 py-5 pb-16 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-3xl bg-[#0B6B46] text-white shadow-lg">
          <div className="grid gap-5 p-5 sm:p-7 lg:grid-cols-[1.2fr_.8fr] lg:items-center">
            <div>
              <div className="flex items-center gap-3">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/20">
                  <Sprout className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-100">AGRIVA SOIL</p>
                  <h1 className="text-2xl font-black sm:text-3xl">{t("heroTitle")}</h1>
                </div>
              </div>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-emerald-50 sm:text-base">{t("heroDescription")}</p>
            </div>

            <div className="rounded-3xl border border-[#F3D28B] bg-[#FFF7E6] p-4 text-[#7C2D12] shadow-sm">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#D97706]" />
                <div>
                  <p className="font-black text-[#7C2D12]">{t("demoNoticeTitle")}</p>
                  <p className="mt-1 text-sm leading-6 text-[#92400E]">{t("demoNotice")}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <form onSubmit={submitAnalysis} className="space-y-6">
          <section className="rounded-3xl border border-[#D7E3DA] bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#E8F5EE] text-[#0F7A4A]">
                <ClipboardList className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-black text-[#0F172A]">{t("chooseMethod")}</h2>
                <p className="mt-1 text-sm text-[#475569]">{t("chooseMethodDesc")}</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {sourceCards.map((item) => {
                const Icon = item.icon;
                const active = sourceType === item.type;
                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => handleSourceChange(item.type)}
                    className={`min-h-36 rounded-2xl border p-4 text-left transition ${
                      active
                        ? "border-[#0F7A4A] bg-[#EDF8F1] shadow-sm"
                        : "border-slate-200 bg-white hover:border-emerald-300"
                    }`}
                    aria-pressed={active}
                  >
                    <div className={`grid h-10 w-10 place-items-center rounded-xl ${active ? "bg-[#0F7A4A] text-white" : "bg-[#E8F5EE] text-[#0F7A4A]"}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="mt-3 font-black text-[#0F172A]">{item.title}</p>
                    <p className="mt-1 text-xs leading-5 text-[#475569]">{item.description}</p>
                  </button>
                );
              })}
            </div>
          </section>

          {sourceType === "manual" ? (
            <section className="rounded-3xl border border-[#D7E3DA] bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-[#0F172A]">{t("manualMeasurements")}</h2>
                  <p className="mt-1 text-sm text-[#475569]">{t("manualMeasurementsDesc")}</p>
                </div>
                <VoiceCapture
                  onTranscript={handleVoiceTranscript}
                  label={t("voiceFill")}
                  listeningLabel={t("voiceListening")}
                  unsupportedLabel={t("voiceUnsupported")}
                />
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <SoilInput label="pH" value={form.ph} onChange={(value) => updateField("ph", value)} placeholder="6.5" step="0.01" min="0" max="14" />
                <SoilInput label={t("nitrogen")} unit="mg/kg" value={form.nitrogen} onChange={(value) => updateField("nitrogen", value)} placeholder="280" />
                <SoilInput label={t("phosphorus")} unit="mg/kg" value={form.phosphorus} onChange={(value) => updateField("phosphorus", value)} placeholder="22" />
                <SoilInput label={t("potassium")} unit="mg/kg" value={form.potassium} onChange={(value) => updateField("potassium", value)} placeholder="190" />
                <SoilInput label={t("organicCarbon")} unit="%" value={form.organic_carbon} onChange={(value) => updateField("organic_carbon", value)} placeholder="0.75" step="0.01" />
                <SoilInput label={t("moisture")} unit="%" value={form.moisture} onChange={(value) => updateField("moisture", value)} placeholder="32" />
                <SoilInput label={t("temperature")} unit="°C" value={form.temperature} onChange={(value) => updateField("temperature", value)} placeholder="25" />
                <label className="block">
                  <span className="text-sm font-black text-[#334155]">{t("soilType")}</span>
                  <input
                    type="text"
                    value={form.soil_type}
                    onChange={(event) => updateField("soil_type", event.target.value)}
                    placeholder={t("soilTypePlaceholder")}
                    className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />
                </label>
              </div>

              <div className="mt-5 rounded-2xl border border-[#D7E3DA] bg-[#F8FAFC] p-4 text-sm leading-6 text-[#475569]">
                {t("voiceExample")}
              </div>
            </section>
          ) : (
            <section className="rounded-3xl border border-[#D7E3DA] bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center gap-3">
                <UploadCloud className="h-6 w-6 text-[#0F7A4A]" />
                <div>
                  <h2 className="text-xl font-black text-[#0F172A]">{t(`source_${sourceType}` as "source_report")}</h2>
                  <p className="mt-1 text-sm text-[#475569]">{t("supportedFiles")}</p>
                </div>
              </div>

              {sourceType === "camera" ? (
                <div className="mt-5">
                  <input
                    ref={cameraRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    capture="environment"
                    onChange={handleFile}
                    className="sr-only"
                  />
                  <button
                    type="button"
                    onClick={() => cameraRef.current?.click()}
                    className="inline-flex min-h-14 items-center gap-3 rounded-2xl bg-[#0F7A4A] px-5 font-black text-white hover:bg-[#0B5D39]"
                  >
                    <Camera className="h-5 w-5" /> {t("openCamera")}
                  </button>
                </div>
              ) : (
                <label className="mt-5 flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-[#A7CBB3] bg-[#F4FBF7] px-5 py-8 text-center transition hover:border-[#0F7A4A]">
                  <UploadCloud className="h-9 w-9 text-[#0F7A4A]" />
                  <span className="mt-3 font-black text-[#0F172A]">{t("chooseFile")}</span>
                  <span className="mt-1 text-sm text-[#475569]">{t("supportedFiles")}</span>
                  <input
                    type="file"
                    accept={sourceType === "report" ? ".pdf,image/jpeg,image/png,image/webp" : "image/jpeg,image/png,image/webp"}
                    onChange={handleFile}
                    className="sr-only"
                  />
                </label>
              )}

              {selectedFile ? (
                <div className="mt-4 flex items-center gap-3 rounded-2xl border border-[#D7E3DA] bg-[#F8FAFC] p-4">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                  <div className="min-w-0">
                    <p className="truncate font-black text-[#0F172A]">{selectedFile.name}</p>
                    <p className="text-xs text-[#64748B]">{Math.max(1, Math.round(selectedFile.size / 1024))} KB</p>
                  </div>
                </div>
              ) : null}

              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                <strong>{t("uploadDemoTitle")}</strong> {t("uploadDemoExplanation")}
              </div>
            </section>
          )}

          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800" role="alert">
              {error}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#0F7A4A] px-6 font-black text-white shadow-sm transition hover:bg-[#0B5D39] disabled:cursor-wait disabled:opacity-70"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Leaf className="h-5 w-5" />}
              {loading ? t("analyzing") : t("analyzeSoil")}
            </button>
            <button
              type="button"
              onClick={() => {
                setForm(EMPTY_FORM);
                setSelectedFile(null);
                setAnalysis(null);
                setError("");
              }}
              className="min-h-14 rounded-2xl border border-[#D7E3DA] bg-white px-5 font-black text-[#334155]"
            >
              {t("reset")}
            </button>
          </div>
        </form>

        {analysis ? (
          <section id="soil-result" className="scroll-mt-24 space-y-5 rounded-3xl border border-[#BFDCC9] bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">{t("resultLabel")}</p>
                  {analysis.demo_mode ? (
                    <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-800">{t("demoBadge")}</span>
                  ) : null}
                </div>
                <h2 className="mt-2 text-2xl font-black text-[#0F172A]">{t("resultTitle")}</h2>
                <p className="mt-1 text-sm text-[#475569]">{formatDate(analysis.created_at, locale)}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={downloadReport} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#D7E3DA] bg-white px-4 text-sm font-black text-[#334155]">
                  <Download className="h-4 w-4" /> {t("downloadReport")}
                </button>
                <button type="button" onClick={() => void shareReport()} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#D7E3DA] bg-white px-4 text-sm font-black text-[#334155]">
                  <Share2 className="h-4 w-4" /> {t("shareReport")}
                </button>
              </div>
            </div>

            {shareMessage ? <p className="text-sm font-semibold text-emerald-700">{shareMessage}</p> : null}

            {analysis.demo_mode ? (
              <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm leading-6 text-violet-900">
                <strong>{t("demoResultTitle")}</strong> {t("demoResultExplanation")}
              </div>
            ) : null}

            <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
              <div className="rounded-3xl bg-[#F4FBF7] p-5 text-center">
                <div
                  className="mx-auto grid h-44 w-44 place-items-center rounded-full p-4"
                  style={{
                    background: `conic-gradient(${scoreLevel?.ring ?? "#16a34a"} ${Math.max(0, Math.min(100, analysis.soil_health_score)) * 3.6}deg, #dbe9df 0deg)`,
                  }}
                >
                  <div className="grid h-full w-full place-items-center rounded-full bg-white shadow-inner">
                    <div>
                      <p className="text-4xl font-black text-[#0F172A]">{formatNumber(analysis.soil_health_score, 0)}</p>
                      <p className="text-sm font-black text-[#64748B]">/100</p>
                    </div>
                  </div>
                </div>
                <p className={`mt-4 text-xl font-black ${scoreLevel?.className ?? "text-emerald-700"}`}>{scoreLevel?.label}</p>
                <p className="mt-1 text-xs leading-5 text-[#64748B]">{t("scoreInterpretation")}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <ResultMetric icon={<Leaf className="h-5 w-5" />} label={t("soilType")} value={localizeSoilType(analysis.soil_type, locale)} />
                <ResultMetric icon={<FlaskConical className="h-5 w-5" />} label="pH" value={formatNumber(analysis.ph, 2)} />
                <ResultMetric icon={<Sprout className="h-5 w-5" />} label={t("nitrogen")} value={`${formatNumber(analysis.nitrogen)} mg/kg`} />
                <ResultMetric icon={<Sprout className="h-5 w-5" />} label={t("phosphorus")} value={`${formatNumber(analysis.phosphorus)} mg/kg`} />
                <ResultMetric icon={<Sprout className="h-5 w-5" />} label={t("potassium")} value={`${formatNumber(analysis.potassium)} mg/kg`} />
                <ResultMetric icon={<Leaf className="h-5 w-5" />} label={t("organicCarbon")} value={`${formatNumber(analysis.organic_carbon, 2)}%`} />
                <ResultMetric icon={<Waves className="h-5 w-5" />} label={t("moisture")} value={`${formatNumber(analysis.moisture)}%`} />
                <ResultMetric icon={<ThermometerSun className="h-5 w-5" />} label={t("temperature")} value={`${formatNumber(analysis.temperature)}°C`} />
                <ResultMetric icon={<FileText className="h-5 w-5" />} label={t("source")} value={sourceLabel(analysis.source_type)} />
              </div>
            </div>

            <div>
              <h3 className="text-xl font-black text-[#0F172A]">{t("recommendations")}</h3>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                {analysis.recommendations.length > 0 ? (
                  analysis.recommendations.map((recommendation, index) => (
                    <div key={`${recommendation}-${index}`} className="flex gap-3 rounded-2xl border border-[#D7E3DA] bg-[#F8FAFC] p-4">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#0F7A4A]" />
                      <p className="text-sm leading-6 text-[#334155]">{localizeRecommendation(recommendation, locale)}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[#64748B]">{t("noRecommendations")}</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:flex sm:items-center sm:justify-between sm:gap-4">
              <div>
                <p className="font-black text-emerald-900">{t("continueCropSenseTitle")}</p>
                <p className="mt-1 text-sm leading-6 text-emerald-800">{t("continueCropSenseDescription")}</p>
              </div>
              <button
                type="button"
                onClick={() => router.push("/dashboard/farmer/crops/recommendation")}
                className="mt-3 inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#0F7A4A] px-5 font-black text-white shadow-sm transition hover:bg-[#0B5D39] sm:mt-0"
              >
                <Sprout className="h-5 w-5" />
                {t("continueCropSense")}
              </button>
            </div>
          </section>
        ) : null}

        <section className="rounded-3xl border border-[#D7E3DA] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#E8F5EE] text-[#0F7A4A]">
                <History className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-black text-[#0F172A]">{t("historyTitle")}</h2>
                <p className="mt-1 text-sm text-[#475569]">{t("historyDescription")}</p>
              </div>
            </div>
            <button type="button" onClick={() => void loadHistory()} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#D7E3DA] bg-white px-4 text-sm font-black text-[#334155]">
              <RefreshCw className="h-4 w-4" /> {t("refresh")}
            </button>
          </div>

          {historyLoading ? (
            <div className="mt-5 flex items-center gap-2 rounded-2xl bg-[#F8FAFC] p-4 text-sm font-semibold text-[#475569]">
              <Loader2 className="h-4 w-4 animate-spin" /> {t("loadingHistory")}
            </div>
          ) : history.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-[#A7CBB3] bg-[#F4FBF7] p-5 text-sm text-[#475569]">
              {t("noHistory")}
            </div>
          ) : (
            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              {history.slice(0, 10).map((item) => (
                <article key={item.id} className="rounded-2xl border border-[#D7E3DA] bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider text-emerald-700">#{item.id.replace(/-/g, "").slice(-6).toUpperCase()}</p>
                      <p className="mt-1 font-black text-[#0F172A]">{item.soil_type ? localizeSoilType(item.soil_type, locale) : t("soilTypeUnknown")}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-[#0F7A4A]">{formatNumber(item.soil_health_score, 0)}</p>
                      <p className="text-xs text-[#64748B]">/100</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#475569]">
                    <span>pH: <strong className="text-[#0F172A]">{formatNumber(item.ph, 2)}</strong></span>
                    <span>{t("source")}: <strong className="text-[#0F172A]">{sourceLabel(item.source_type)}</strong></span>
                    {item.demo_mode ? <span className="font-black text-violet-700">{t("demoBadge")}</span> : null}
                  </div>
                  <p className="mt-3 text-xs text-[#64748B]">{formatDate(item.created_at, locale)}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function SoilInput({
  label,
  unit,
  value,
  onChange,
  placeholder,
  step = "any",
  min,
  max,
}: {
  label: string;
  unit?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  step?: string;
  min?: string;
  max?: string;
}) {
  return (
    <label className="block">
      <span className="flex items-center justify-between gap-2 text-sm font-black text-[#334155]">
        <span>{label}</span>
        {unit ? <span className="text-xs font-bold text-[#64748B]">{unit}</span> : null}
      </span>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        step={step}
        min={min}
        max={max}
        className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
      />
    </label>
  );
}

function ResultMetric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#D7E3DA] bg-[#F8FAFC] p-4">
      <div className="flex items-center gap-2 text-[#0F7A4A]">
        {icon}
        <span className="text-xs font-black uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-3 text-lg font-black text-[#0F172A]">{value}</p>
    </div>
  );
}
