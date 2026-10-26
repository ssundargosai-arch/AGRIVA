"use client";

import Link from "next/link";

import {
  ChangeEvent,
  useEffect,
  useState,
} from "react";

import {
  Activity,
  ArrowLeft,
  Camera,
  CheckCircle2,
  CircleAlert,
  FileImage,
  Leaf,
  Loader2,
  Microscope,
  ShieldAlert,
  Sparkles,
  Stethoscope,
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


type DiseaseResult = {
  crop: string;
  possible_disease: string;
  confidence: number;
  severity: string;
  recommendations: string[];
  demo_prediction: boolean;
  model_note: string;
  crop_id?: string;
  registered_crop?: string;
  validation_note?: string;
};


function getApiErrorMessage(
  data: unknown,
  fallback: string
): string {
  if (
    typeof data === "object" &&
    data !== null &&
    "detail" in data
  ) {
    const detail = (
      data as {
        detail?: unknown;
      }
    ).detail;

    if (
      typeof detail === "string"
    ) {
      return detail;
    }

    if (
      Array.isArray(detail)
    ) {
      return detail
        .map(
          (item: unknown) => {
            if (
              typeof item ===
                "object" &&
              item !== null &&
              "msg" in item
            ) {
              return String(
                (
                  item as {
                    msg: unknown;
                  }
                ).msg
              );
            }

            if (
              typeof item ===
              "string"
            ) {
              return item;
            }

            try {
              return JSON.stringify(
                item
              );
            } catch {
              return String(item);
            }
          }
        )
        .join(", ");
    }

    if (
      detail !== undefined
    ) {
      try {
        return JSON.stringify(
          detail
        );
      } catch {
        return String(detail);
      }
    }
  }

  return fallback;
}


function severityClasses(
  severity: string
) {
  const value =
    severity
      .trim()
      .toLowerCase();

  if (
    value.includes("high") ||
    value.includes("severe")
  ) {
    return "border-red-200 bg-red-50 text-red-800";
  }

  if (
    value.includes("medium") ||
    value.includes("moderate")
  ) {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-800";
}


export default function CropDoctorPage() {
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
    useState<DiseaseResult | null>(
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
          "Please login first."
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

        const data: unknown =
          await response
            .json()
            .catch(
              () => null
            );

        if (!response.ok) {
          throw new Error(
            getApiErrorMessage(
              data,
              "Failed to load crops"
            )
          );
        }

        if (
          !Array.isArray(data)
        ) {
          throw new Error(
            "Invalid crop response"
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
            : "Failed to load crops"
        );
      } finally {
        setLoadingCrops(
          false
        );
      }
    }

    void loadCrops();
  }, []);


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


  async function analyzeCrop() {
    if (!selectedCropId) {
      setError(
        "Please select a registered crop."
      );
      return;
    }

    if (!file) {
      setError(
        "Please select or capture a clear crop image."
      );
      return;
    }

    const token =
      localStorage.getItem(
        "access_token"
      );

    if (!token) {
      setError(
        "Please login first."
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
          `${API_URL}/api/ai/crop-disease`,
          {
            method: "POST",
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
            body: formData,
          }
        );

      const data: unknown =
        await response
          .json()
          .catch(
            () => null
          );

      if (!response.ok) {
        throw new Error(
          getApiErrorMessage(
            data,
            "Crop analysis failed"
          )
        );
      }

      setResult(
        data as DiseaseResult
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Crop analysis failed"
      );
    } finally {
      setLoading(false);
    }
  }


  return (
    <main className="min-h-screen bg-slate-950">
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

            Farmer Dashboard
          </Link>

          <div className="mt-8 grid items-end gap-8 lg:grid-cols-[1fr_320px]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-emerald-200">
                <Stethoscope className="h-4 w-4" />

                AGRIVA Crop Doctor
              </div>

              <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-tight text-white md:text-5xl">
                Crop Health & Disease Intelligence
              </h1>

              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-200 md:text-lg">
                Select your registered crop and upload a clear
                crop or leaf image. AGRIVA will return a clearly
                structured crop-health analysis and practical
                next steps.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/10 p-5 text-white shadow-2xl shadow-black/20 backdrop-blur">
              <div className="flex items-start gap-3">
                <ShieldAlert className="mt-0.5 h-7 w-7 shrink-0 text-emerald-300" />

                <div>
                  <p className="font-black text-white">
                    Clear-image analysis
                  </p>

                  <p className="mt-2 text-sm leading-6 text-slate-200">
                    Use a close, well-lit crop or leaf photo.
                    Avoid people, documents and unrelated images.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* =====================================================
          ANALYSIS INPUT
      ====================================================== */}

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-black/10 sm:p-8">
          <div className="flex flex-col gap-2">
            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-[0.15em] text-emerald-800">
              <Microscope className="h-4 w-4" />

              Crop Analysis
            </div>

            <h2 className="text-2xl font-black text-slate-950">
              Tell AGRIVA which crop to inspect
            </h2>

            <p className="max-w-3xl text-sm leading-6 text-slate-600">
              Choose a crop registered in your farm profile, then
              upload a focused image showing the affected plant,
              leaf or crop area.
            </p>
          </div>


          <div className="mt-7">
            <label
              htmlFor="crop-select"
              className="mb-2 block text-sm font-black text-slate-800"
            >
              Registered Crop
            </label>

            {loadingCrops ? (
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-700">
                <Loader2 className="h-4 w-4 animate-spin text-emerald-700" />

                Loading crops...
              </div>
            ) : crops.length > 0 ? (
              <select
                id="crop-select"
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
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-base font-semibold text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
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
                No registered crops found. Add a crop to your
                farm before using AGRIVA Crop Doctor.
              </div>
            )}
          </div>


          <label className="mt-6 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/70 p-10 text-center transition hover:border-emerald-500 hover:bg-emerald-50">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white text-emerald-700 shadow-sm">
              <Camera
                className="h-8 w-8"
              />
            </div>

            <span className="mt-4 text-lg font-black text-slate-950">
              Select or capture crop image
            </span>

            <span className="mt-2 max-w-xl text-sm font-medium leading-6 text-slate-600">
              Upload a clear JPG, JPEG, PNG or supported image.
              Keep the crop or affected leaf clearly visible.
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
                  Selected image
                </p>

                <p className="mt-1 truncate font-bold text-slate-900">
                  {file.name}
                </p>
              </div>
            </div>
          )}


          <button
            type="button"
            onClick={
              analyzeCrop
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
              ? "Analyzing Crop..."
              : "Analyze Crop Health"}
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
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
                    Crop Doctor Result
                  </p>

                  <h2 className="mt-2 text-3xl font-black text-slate-950">
                    {result.possible_disease ||
                      "No disease name returned"}
                  </h2>

                  {result.registered_crop && (
                    <p className="mt-2 text-sm font-semibold text-slate-600">
                      Registered crop:{" "}
                      <span className="font-black text-slate-900">
                        {
                          result.registered_crop
                        }
                      </span>
                    </p>
                  )}
                </div>

                <div
                  className={`rounded-full border px-4 py-2 text-sm font-black ${severityClasses(
                    result.severity
                  )}`}
                >
                  Severity:{" "}
                  {result.severity}
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
                        DEMO PREDICTION
                      </p>

                      <p className="mt-2 text-sm font-semibold leading-6">
                        This result is generated by AGRIVA demo
                        logic and is not produced by a trained
                        disease-detection vision model.
                      </p>
                    </div>
                  </div>
                </div>
              )}


              <div className="grid gap-4 sm:grid-cols-3">
                <ResultMetric
                  label="Analyzed Crop"
                  value={
                    result.crop
                  }
                  icon={
                    <Leaf className="h-5 w-5" />
                  }
                />

                <ResultMetric
                  label="Confidence"
                  value={`${Number(
                    result.confidence ||
                      0
                  ).toFixed(0)}%`}
                  icon={
                    <Activity className="h-5 w-5" />
                  }
                />

                <ResultMetric
                  label="Severity"
                  value={
                    result.severity
                  }
                  icon={
                    <ShieldAlert className="h-5 w-5" />
                  }
                />
              </div>


              <div className="mt-8">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-700" />

                  <h3 className="text-xl font-black text-slate-950">
                    Recommended Next Steps
                  </h3>
                </div>

                <div className="mt-4 grid gap-3">
                  {result.recommendations.map(
                    (
                      recommendation,
                      index
                    ) => (
                      <div
                        key={`${index}-${recommendation}`}
                        className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-700 text-xs font-black text-white">
                          {index + 1}
                        </span>

                        <p className="text-sm font-semibold leading-6 text-slate-800">
                          {
                            recommendation
                          }
                        </p>
                      </div>
                    )
                  )}
                </div>
              </div>


              {result.validation_note && (
                <div className="mt-7 rounded-2xl border border-blue-200 bg-blue-50 p-5 text-blue-950">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-800">
                    Image Validation
                  </p>

                  <p className="mt-2 text-sm font-semibold leading-6">
                    {
                      result.validation_note
                    }
                  </p>
                </div>
              )}


              <div className="mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-600">
                  Model Note
                </p>

                <p className="mt-2 text-sm font-semibold leading-6 text-slate-800">
                  {
                    result.model_note
                  }
                </p>
              </div>
            </div>
          </section>
        )}


        <div className="mt-8 flex items-center justify-center gap-2 pb-4 text-xs font-semibold text-slate-400">
          <Sparkles className="h-4 w-4" />

          AGRIVA Crop Doctor • Crop-health intelligence
        </div>
      </div>
    </main>
  );
}


function ResultMetric({
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

        <p className="text-xs font-black uppercase tracking-[0.12em]">
          {label}
        </p>
      </div>

      <p className="mt-4 break-words text-xl font-black text-slate-950">
        {value}
      </p>
    </article>
  );
}
