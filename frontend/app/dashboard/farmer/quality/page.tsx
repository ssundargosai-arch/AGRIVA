"use client";

import Link from "next/link";
import { ChangeEvent, useState } from "react";
import {
  ArrowLeft,
  Camera,
  Loader2,
  Upload,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000";

type QualityResult = {
  quality_score: number;
  grade: "A+" | "A" | "B" | "C";
  ripeness: string;
  defects: string[];
  market_suitability: string;
  demo_prediction: boolean;
  model_note: string;
};

export default function QualityPage() {
  const [file, setFile] =
    useState<File | null>(null);

  const [result, setResult] =
    useState<QualityResult | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  function selectFile(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const selectedFile =
      event.target.files?.[0] || null;

    setFile(selectedFile);
    setResult(null);
    setError("");
  }

  async function analyzeQuality() {
    if (!file) {
      setError(
        "Please select or capture a crop image."
      );
      return;
    }

    const token =
      localStorage.getItem("access_token");

    if (!token) {
      setError("Please login first.");
      return;
    }

    const formData = new FormData();

    formData.append(
      "file",
      file
    );

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/api/ai/crop-quality`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Quality analysis failed"
        );
      }

      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Quality analysis failed"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <Link
          href="/dashboard/farmer"
          className="inline-flex items-center gap-2 text-green-700"
        >
          <ArrowLeft size={18} />
          Farmer Dashboard
        </Link>

        <div className="mt-8">
          <h1 className="text-3xl font-bold text-slate-900">
            AGRIVA Quality Grading
          </h1>

          <p className="mt-2 text-slate-600">
            Upload or capture a crop image
            to estimate product quality.
          </p>
        </div>

        <section className="mt-8 rounded-2xl border bg-white p-6 shadow-sm">
          <label className="flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-green-200 bg-green-50/40 p-10">
            <Camera
              size={44}
              className="text-green-700"
            />

            <span className="mt-4 font-semibold">
              Select or capture crop image
            </span>

            <span className="mt-1 text-sm text-slate-500">
              JPG, JPEG or PNG
            </span>

            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={selectFile}
              className="hidden"
            />
          </label>

          {file && (
            <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm">
              Selected: {file.name}
            </div>
          )}

          <button
            type="button"
            onClick={analyzeQuality}
            disabled={loading}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-green-700 py-3 font-semibold text-white hover:bg-green-800 disabled:bg-slate-400"
          >
            {loading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Upload />
            )}

            {loading
              ? "Analyzing Quality..."
              : "Analyze Quality"}
          </button>

          {error && (
            <div className="mt-5 rounded-lg bg-red-50 p-3 text-red-700">
              {error}
            </div>
          )}
        </section>

        {result && (
          <section className="mt-8 rounded-2xl border bg-white p-6 shadow-sm">
            {result.demo_prediction && (
              <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
                <strong>
                  DEMO PREDICTION
                </strong>

                <p className="mt-1 text-sm">
                  This quality result is generated
                  by AGRIVA demo logic and is not
                  produced by a trained vision model.
                </p>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl bg-green-50 p-5">
                <p className="text-sm text-slate-500">
                  Quality Score
                </p>

                <p className="mt-2 text-3xl font-bold text-green-700">
                  {result.quality_score}
                </p>
              </div>

              <div className="rounded-xl bg-green-50 p-5">
                <p className="text-sm text-slate-500">
                  Grade
                </p>

                <p className="mt-2 text-3xl font-bold text-green-700">
                  {result.grade}
                </p>
              </div>

              <div className="rounded-xl bg-blue-50 p-5">
                <p className="text-sm text-slate-500">
                  Ripeness
                </p>

                <p className="mt-2 font-bold">
                  {result.ripeness}
                </p>
              </div>

              <div className="rounded-xl bg-purple-50 p-5">
                <p className="text-sm text-slate-500">
                  Market Suitability
                </p>

                <p className="mt-2 font-bold">
                  {result.market_suitability}
                </p>
              </div>
            </div>

            <h3 className="mt-7 text-lg font-bold">
              Detected Defects
            </h3>

            <ul className="mt-3 list-disc space-y-2 pl-5">
              {result.defects.map(
                (defect) => (
                  <li key={defect}>
                    {defect}
                  </li>
                )
              )}
            </ul>

            <p className="mt-6 text-xs text-slate-500">
              {result.model_note}
            </p>
          </section>
        )}
      </div>
    </main>
  );
}