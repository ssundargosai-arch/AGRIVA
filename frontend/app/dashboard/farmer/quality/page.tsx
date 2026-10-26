"use client";

import Link from "next/link";

import {
  ChangeEvent,
  useEffect,
  useState,
} from "react";

import {
  useLocale,
  useTranslations,
} from "next-intl";

import {
  ArrowLeft,
  BadgeCheck,
  Camera,
  CheckCircle2,
  CircleAlert,
  FileImage,
  Gauge,
  Gem,
  Leaf,
  Loader2,
  ScanLine,
  ShoppingBasket,
  Sparkles,
  Upload,
} from "lucide-react";


const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000";


type CropOption = {
  id: string;
  field_id: string;
  name: string;
  variety: string | null;
  status: string;
};


type QualityResult = {
  quality_score: number;
  grade:
    | "A+"
    | "A"
    | "B"
    | "C";
  ripeness: string;
  defects: string[];
  market_suitability: string;
  demo_prediction: boolean;
  model_note: string;
  crop_id?: string;
  registered_crop?: string;
};


type LocaleKey = "en" | "hi" | "mr";

const QUALITY_COPY = {
  en: {
    intelligence: "AGRIVA Quality Intelligence",
    visualGrading: "Clear visual grading",
    visualGradingDesc:
      "Use a well-lit crop image with the harvested produce clearly visible for a more meaningful AGRIVA quality result.",
    analysisLabel: "Quality Analysis",
    analyzeRegisteredCrop: "Analyze a registered crop",
    analyzeDescription:
      "Choose your crop and upload a clear crop image. AGRIVA will organize the result into quality score, grade, ripeness, market suitability and visible defects.",
    imageTip:
      "For clearer results, keep the crop centered, well-lit and large enough to inspect.",
    selectedImage: "Selected image",
    resultLabel: "AGRIVA Quality Result",
    grade: "Grade",
    registeredCrop: "Registered crop",
    score: "Score",
    noDefects: "No visible defects were returned by the analysis.",
    modelNote: "Model Note",
    footer: "AGRIVA Quality Intelligence • Clear crop grading",
  },
  hi: {
    intelligence: "AGRIVA गुणवत्ता इंटेलिजेंस",
    visualGrading: "स्पष्ट दृश्य गुणवत्ता जांच",
    visualGradingDesc:
      "बेहतर AGRIVA गुणवत्ता परिणाम के लिए अच्छी रोशनी में ऐसी फसल की फोटो लें जिसमें उपज साफ दिखाई दे।",
    analysisLabel: "गुणवत्ता विश्लेषण",
    analyzeRegisteredCrop: "पंजीकृत फसल का विश्लेषण करें",
    analyzeDescription:
      "अपनी फसल चुनें और साफ तस्वीर अपलोड करें। AGRIVA गुणवत्ता स्कोर, ग्रेड, पकने की स्थिति, बाजार उपयुक्तता और दिखाई देने वाले दोष बताएगा।",
    imageTip:
      "बेहतर परिणाम के लिए फसल को तस्वीर के बीच में, अच्छी रोशनी में और स्पष्ट आकार में रखें।",
    selectedImage: "चुनी गई तस्वीर",
    resultLabel: "AGRIVA गुणवत्ता परिणाम",
    grade: "ग्रेड",
    registeredCrop: "पंजीकृत फसल",
    score: "स्कोर",
    noDefects: "विश्लेषण में कोई स्पष्ट दिखाई देने वाला दोष नहीं मिला।",
    modelNote: "मॉडल नोट",
    footer: "AGRIVA गुणवत्ता इंटेलिजेंस • स्पष्ट फसल ग्रेडिंग",
  },
  mr: {
    intelligence: "AGRIVA गुणवत्ता बुद्धिमत्ता",
    visualGrading: "स्पष्ट दृश्य गुणवत्ता तपासणी",
    visualGradingDesc:
      "अधिक अर्थपूर्ण AGRIVA गुणवत्ता निकालासाठी चांगल्या प्रकाशात काढलेला आणि उत्पादन स्पष्ट दिसणारा पीक फोटो वापरा.",
    analysisLabel: "गुणवत्ता विश्लेषण",
    analyzeRegisteredCrop: "नोंदणीकृत पिकाचे विश्लेषण करा",
    analyzeDescription:
      "तुमचे पीक निवडा आणि स्पष्ट फोटो अपलोड करा. AGRIVA गुणवत्ता गुण, ग्रेड, पिकलेपणा, बाजारासाठी योग्यता आणि दिसणारे दोष मांडेल.",
    imageTip:
      "अधिक स्पष्ट निकालासाठी पीक फोटोच्या मध्यभागी, चांगल्या प्रकाशात आणि तपासता येईल इतके मोठे ठेवा.",
    selectedImage: "निवडलेला फोटो",
    resultLabel: "AGRIVA गुणवत्ता निकाल",
    grade: "ग्रेड",
    registeredCrop: "नोंदणीकृत पीक",
    score: "गुण",
    noDefects: "विश्लेषणात कोणताही स्पष्ट दिसणारा दोष आढळला नाही.",
    modelNote: "मॉडेल नोंद",
    footer: "AGRIVA गुणवत्ता बुद्धिमत्ता • स्पष्ट पीक ग्रेडिंग",
  },
} as const;

function getLocaleKey(locale: string): LocaleKey {
  if (locale === "hi" || locale === "mr") {
    return locale;
  }

  return "en";
}

function localizeRipeness(
  value: string,
  locale: LocaleKey
) {
  const map: Record<
    string,
    Record<LocaleKey, string>
  > = {
    Optimal: {
      en: "Optimal",
      hi: "उत्तम",
      mr: "उत्तम",
    },
    "Nearly Ripe": {
      en: "Nearly Ripe",
      hi: "लगभग पकी",
      mr: "जवळपास पिकलेले",
    },
    Ripe: {
      en: "Ripe",
      hi: "पकी हुई",
      mr: "पिकलेले",
    },
    Overripe: {
      en: "Overripe",
      hi: "अधिक पकी",
      mr: "अतिपिकलेले",
    },
  };

  return map[value]?.[locale] || value;
}

function localizeMarketSuitability(
  value: string,
  locale: LocaleKey
) {
  const map: Record<
    string,
    Record<LocaleKey, string>
  > = {
    "Premium Market": {
      en: "Premium Market",
      hi: "प्रीमियम बाजार",
      mr: "प्रीमियम बाजार",
    },
    "General Market": {
      en: "General Market",
      hi: "सामान्य बाजार",
      mr: "सामान्य बाजार",
    },
    "Processing / Local Market": {
      en: "Processing / Local Market",
      hi: "प्रोसेसिंग / स्थानीय बाजार",
      mr: "प्रक्रिया / स्थानिक बाजार",
    },
  };

  return map[value]?.[locale] || value;
}

function localizeDefect(
  value: string,
  locale: LocaleKey
) {
  if (value === "No major visible defects") {
    if (locale === "hi") {
      return "कोई बड़ा दिखाई देने वाला दोष नहीं";
    }

    if (locale === "mr") {
      return "कोणताही मोठा दिसणारा दोष नाही";
    }
  }

  return value;
}

function localizeModelNote(
  value: string,
  locale: LocaleKey
) {
  if (
    value.includes(
      "Demo quality grading generated using deterministic AGRIVA rules"
    )
  ) {
    if (locale === "hi") {
      return "यह डेमो गुणवत्ता ग्रेडिंग निर्धारित AGRIVA नियमों से बनाई गई है। यह प्रशिक्षित विज़न मॉडल नहीं है।";
    }

    if (locale === "mr") {
      return "ही डेमो गुणवत्ता ग्रेडिंग निश्चित AGRIVA नियमांवर आधारित आहे. हे प्रशिक्षित व्हिजन मॉडेल नाही.";
    }
  }

  return value;
}


export default function QualityPage() {
  const t =
    useTranslations(
      "qualityPage"
    );

  const locale =
    getLocaleKey(
      useLocale()
    );

  const copy =
    QUALITY_COPY[locale];

  const [
    crops,
    setCrops,
  ] =
    useState<CropOption[]>([]);

  const [
    selectedCropId,
    setSelectedCropId,
  ] =
    useState("");

  const [
    loadingCrops,
    setLoadingCrops,
  ] =
    useState(true);

  const [
    file,
    setFile,
  ] =
    useState<File | null>(
      null
    );

  const [
    result,
    setResult,
  ] =
    useState<QualityResult | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");


  useEffect(() => {
    async function loadCrops() {
      const token =
        localStorage.getItem(
          "access_token"
        );

      if (!token) {
        setError(
          t("loginError")
        );
        setLoadingCrops(false);
        return;
      }

      try {
        const response =
          await fetch(
            `${API_URL}/api/crops`,
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
              cache:
                "no-store",
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            typeof data?.detail ===
              "string"
              ? data.detail
              : t(
                  "loadCropsFailed"
                )
          );
        }

        if (
          !Array.isArray(data)
        ) {
          throw new Error(
            t(
              "loadCropsFailed"
            )
          );
        }

        const cropList =
          data as CropOption[];

        setCrops(
          cropList
        );

        if (
          cropList.length > 0
        ) {
          setSelectedCropId(
            cropList[0].id
          );
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : t(
                "loadCropsFailed"
              )
        );
      } finally {
        setLoadingCrops(
          false
        );
      }
    }

    void loadCrops();
  }, [t]);


  function selectFile(
    event:
      ChangeEvent<HTMLInputElement>
  ) {
    const selectedFile =
      event.target
        .files?.[0] ||
      null;

    setFile(
      selectedFile
    );

    setResult(null);
    setError("");
  }


  async function analyzeQuality() {
    if (!selectedCropId) {
      setError(
        t(
          "selectCropError"
        )
      );
      return;
    }

    if (!file) {
      setError(
        t(
          "selectImageError"
        )
      );
      return;
    }

    const token =
      localStorage.getItem(
        "access_token"
      );

    if (!token) {
      setError(
        t("loginError")
      );
      return;
    }

    const formData =
      new FormData();

    formData.append(
      "crop_id",
      selectedCropId
    );

    formData.append(
      "file",
      file
    );

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response =
        await fetch(
          `${API_URL}/api/ai/crop-quality`,
          {
            method: "POST",
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
            body: formData,
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        let errorMessage =
          t(
            "analysisFailed"
          );

        if (
          typeof data?.detail ===
          "string"
        ) {
          errorMessage =
            data.detail
              .toLowerCase() ===
            "field required"
              ? t(
                  "fieldRequired"
                )
              : data.detail;
        } else if (
          Array.isArray(
            data?.detail
          )
        ) {
          errorMessage =
            data.detail
              .map(
                (
                  item: unknown
                ) => {
                  if (
                    typeof item ===
                      "object" &&
                    item !==
                      null &&
                    "msg" in
                      item
                  ) {
                    const message =
                      String(
                        (
                          item as {
                            msg: unknown;
                          }
                        ).msg
                      );

                    return message
                      .toLowerCase() ===
                      "field required"
                      ? t(
                          "fieldRequired"
                        )
                      : message;
                  }

                  return JSON.stringify(
                    item
                  );
                }
              )
              .join(", ");
        }

        throw new Error(
          errorMessage
        );
      }

      setResult(
        data as QualityResult
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t(
              "analysisFailed"
            )
      );
    } finally {
      setLoading(false);
    }
  }


  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* =====================================================
          HERO
      ====================================================== */}

      <section className="relative overflow-hidden border-b border-white/10 bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-950">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-emerald-400/10 blur-3xl" />

        <div className="absolute -bottom-44 left-1/3 h-96 w-96 rounded-full bg-green-400/10 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <Link
            href="/dashboard/farmer"
            className="inline-flex items-center gap-2 text-sm font-bold text-emerald-300 transition hover:text-white"
          >
            <ArrowLeft
              className="h-4 w-4"
            />

            {t(
              "backToDashboard"
            )}
          </Link>

          <div className="mt-8 grid items-end gap-8 lg:grid-cols-[1fr_320px]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-emerald-300">
                <Gem className="h-4 w-4" />

                {copy.intelligence}
              </div>

              <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-tight text-white md:text-5xl">
                {t("title")}
              </h1>

              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300 md:text-lg">
                {t("subtitle")}
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/10 p-5 text-white shadow-2xl shadow-black/20 backdrop-blur">
              <div className="flex items-start gap-3">
                <ScanLine className="mt-0.5 h-7 w-7 shrink-0 text-emerald-300" />

                <div>
                  <p className="font-black text-white">
                    {copy.visualGrading}
                  </p>

                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    {copy.visualGradingDesc}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* =====================================================
          INPUT PANEL
      ====================================================== */}

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-black/10 dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-[0.15em] text-emerald-800">
              <BadgeCheck className="h-4 w-4" />

              {copy.analysisLabel}
            </div>

            <h2 className="mt-3 text-2xl font-black text-slate-950 dark:text-white">
              {copy.analyzeRegisteredCrop}
            </h2>

            <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">
              {copy.analyzeDescription}
            </p>
          </div>


          <div className="mt-7">
            <label
              htmlFor="quality-crop-select"
              className="mb-2 block text-sm font-black text-slate-800 dark:text-slate-100"
            >
              {t(
                "registeredCrop"
              )}
            </label>

            {loadingCrops ? (
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-700">
                <Loader2 className="h-4 w-4 animate-spin text-emerald-700" />

                {t(
                  "loadingCrops"
                )}
              </div>
            ) : crops.length > 0 ? (
              <select
                id="quality-crop-select"
                value={
                  selectedCropId
                }
                onChange={(
                  event
                ) => {
                  setSelectedCropId(
                    event.target
                      .value
                  );

                  setResult(
                    null
                  );

                  setError("");
                }}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-base font-semibold text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-emerald-900/40"
              >
                {crops.map(
                  (crop) => (
                    <option
                      key={
                        crop.id
                      }
                      value={
                        crop.id
                      }
                    >
                      {crop.name}
                      {crop.variety
                        ? ` · ${crop.variety}`
                        : ""}
                      {crop.status
                        ? ` · ${crop.status}`
                        : ""}
                    </option>
                  )
                )}
              </select>
            ) : (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-900">
                {t(
                  "noCrops"
                )}
              </div>
            )}
          </div>


          <label className="mt-6 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/70 p-10 text-center transition hover:border-emerald-500 hover:bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white text-emerald-700 shadow-sm">
              <Camera
                className="h-8 w-8"
              />
            </div>

            <span className="mt-4 text-lg font-black text-slate-950">
              {t(
                "selectImage"
              )}
            </span>

            <span className="mt-2 text-sm font-semibold text-slate-600">
              {t(
                "fileTypes"
              )}
            </span>

            <span className="mt-2 max-w-xl text-xs font-medium leading-5 text-slate-500">
              {copy.imageTip}
            </span>

            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={
                selectFile
              }
              className="hidden"
            />
          </label>


          {file && (
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <FileImage className="h-5 w-5 shrink-0 text-emerald-700" />

              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                  {copy.selectedImage}
                </p>

                <p className="mt-1 truncate font-bold text-slate-900">
                  {t(
                    "selected",
                    {
                      name:
                        file.name,
                    }
                  )}
                </p>
              </div>
            </div>
          )}


          <button
            type="button"
            onClick={
              analyzeQuality
            }
            disabled={
              loading ||
              loadingCrops ||
              crops.length === 0 ||
              !selectedCropId
            }
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3.5 text-base font-black text-white shadow-lg shadow-emerald-900/10 transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Upload className="h-5 w-5" />
            )}

            {loading
              ? t(
                  "analyzing"
                )
              : t(
                  "analyze"
                )}
          </button>


          {error && (
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-900">
              <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />

              <p className="text-sm font-semibold leading-6">
                {error}
              </p>
            </div>
          )}
        </section>


        {/* =====================================================
            RESULT
        ====================================================== */}

        {result && (
          <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-black/10">
            <div className="border-b border-slate-200 bg-slate-50 p-6 sm:p-8">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
                    {copy.resultLabel}
                  </p>

                  <h2 className="mt-2 text-3xl font-black text-slate-950">
                    {copy.grade}{" "}
                    {result.grade}
                  </h2>

                  {result.registered_crop && (
                    <p className="mt-2 text-sm font-semibold text-slate-600">
                      {copy.registeredCrop}:{" "}
                      <span className="font-black text-slate-900">
                        {
                          result.registered_crop
                        }
                      </span>
                    </p>
                  )}
                </div>

                <div className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-800">
                  {copy.score}:{" "}
                  {Number(
                    result.quality_score ||
                      0
                  ).toFixed(0)}
                  /100
                </div>
              </div>
            </div>


            <div className="p-6 sm:p-8">
              {result.demo_prediction && (
                <div className="mb-7 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-950">
                  <div className="flex items-start gap-3">
                    <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />

                    <div>
                      <p className="font-black">
                        {t(
                          "demoPrediction"
                        )}
                      </p>

                      <p className="mt-2 text-sm font-semibold leading-6">
                        {t(
                          "demoDescription"
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}


              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <QualityMetric
                  label={t(
                    "qualityScore"
                  )}
                  value={`${Number(
                    result.quality_score ||
                      0
                  ).toFixed(0)}/100`}
                  icon={
                    <Gauge className="h-5 w-5" />
                  }
                />

                <QualityMetric
                  label={t(
                    "grade"
                  )}
                  value={
                    result.grade
                  }
                  icon={
                    <BadgeCheck className="h-5 w-5" />
                  }
                />

                <QualityMetric
                  label={t(
                    "ripeness"
                  )}
                  value={
                    localizeRipeness(
                      result.ripeness,
                      locale
                    )
                  }
                  icon={
                    <Leaf className="h-5 w-5" />
                  }
                />

                <QualityMetric
                  label={t(
                    "marketSuitability"
                  )}
                  value={
                    localizeMarketSuitability(
                      result.market_suitability,
                      locale
                    )
                  }
                  icon={
                    <ShoppingBasket className="h-5 w-5" />
                  }
                />
              </div>


              <div className="mt-8">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-700" />

                  <h3 className="text-xl font-black text-slate-950">
                    {t(
                      "detectedDefects"
                    )}
                  </h3>
                </div>

                {result.defects.length >
                0 ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {result.defects.map(
                      (
                        defect,
                        index
                      ) => (
                        <div
                          key={`${index}-${defect}`}
                          className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-700 text-xs font-black text-white">
                            {index + 1}
                          </span>

                          <p className="text-sm font-semibold leading-6 text-slate-800">
                            {
                              localizeDefect(
                                defect,
                                locale
                              )
                            }
                          </p>
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">
                    {copy.noDefects}
                  </div>
                )}
              </div>


              <div className="mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-600">
                  {copy.modelNote}
                </p>

                <p className="mt-2 text-sm font-semibold leading-6 text-slate-800">
                  {
                    localizeModelNote(
                      result.model_note,
                      locale
                    )
                  }
                </p>
              </div>
            </div>
          </section>
        )}


        <div className="mt-8 flex items-center justify-center gap-2 pb-4 text-xs font-semibold text-slate-500">
          <Sparkles className="h-4 w-4" />

          {copy.footer}
        </div>
      </div>
    </main>
  );
}


function QualityMetric({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-emerald-700">
        {icon}

        <p className="text-xs font-black uppercase tracking-[0.11em]">
          {label}
        </p>
      </div>

      <p className="mt-4 break-words text-xl font-black leading-7 text-slate-950">
        {value}
      </p>
    </article>
  );
}




