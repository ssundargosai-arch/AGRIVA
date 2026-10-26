"use client";

import {
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  IndianRupee,
  Loader2,
  MapPin,
  PackagePlus,
  Scale,
  Wheat,
  X,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { type ChangeEvent, useEffect, useMemo, useState } from "react";

import AgrivaAI from "@/app/components/AgrivaAI";
import FarmerBottomNav from "@/components/layout/FarmerBottomNav";
import FarmerPhase3Header from "@/components/phase3/FarmerPhase3Header";
import VoiceCapture from "@/components/phase3/VoiceCapture";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

type FarmerCrop = {
  id: string;
  name: string;
  variety: string | null;
  expected_harvest_date: string | null;
  expected_yield_kg: number | null;
};

type ImageFile = { file: File; previewUrl: string };
type UploadResponse = { urls?: string[]; detail?: string };

type Unit = "kg" | "quintal" | "ton";

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

function toKg(quantity: number, unit: Unit) {
  if (unit === "quintal") return quantity * 100;
  if (unit === "ton") return quantity * 1000;
  return quantity;
}

function money(value: number) {
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export default function SellCropPage() {
  const router = useRouter();
  const t = useTranslations("phase3Sell");
  const [crops, setCrops] = useState<FarmerCrop[]>([]);
  const [loadingCrops, setLoadingCrops] = useState(true);
  const [step, setStep] = useState(0);
  const [cropId, setCropId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState<Unit>("kg");
  const [quality, setQuality] = useState("A");
  const [location, setLocation] = useState("");
  const [harvestDate, setHarvestDate] = useState("");
  const [expectedPrice, setExpectedPrice] = useState("");
  const [images, setImages] = useState<ImageFile[]>([]);
  const [error, setError] = useState("");
  const [voiceMessage, setVoiceMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

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
        if (!response.ok) throw new Error(typeof body?.detail === "string" ? body.detail : t("loadCropsFailed"));
        setCrops(Array.isArray(body) ? body : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("loadCropsFailed"));
      } finally {
        setLoadingCrops(false);
      }
    }
    void loadCrops();
  }, [router, t]);

  useEffect(() => () => {
    images.forEach((item) => URL.revokeObjectURL(item.previewUrl));
  }, [images]);

  const selectedCrop = useMemo(() => crops.find((crop) => crop.id === cropId) || null, [crops, cropId]);
  const quantityNumber = Number(quantity);
  const quantityKg = Number.isFinite(quantityNumber) && quantityNumber > 0 ? toKg(quantityNumber, unit) : 0;
  const priceNumber = Number(expectedPrice);
  const estimatedTotal = quantityKg > 0 && Number.isFinite(priceNumber) && priceNumber > 0 ? quantityKg * priceNumber : 0;

  function chooseCrop(id: string) {
    setCropId(id);
    const crop = crops.find((item) => item.id === id);
    if (crop?.expected_harvest_date) setHarvestDate(crop.expected_harvest_date.slice(0, 10));
  }

  function validateCurrentStep() {
    setError("");
    if (step === 0 && !cropId) return t("cropRequired");
    if (step === 1 && (!Number.isFinite(quantityNumber) || quantityNumber <= 0)) return t("quantityRequired");
    if (step === 2 && location.trim().length < 2) return t("locationRequired");
    if (step === 2 && !harvestDate) return t("harvestDateRequired");
    if (step === 3 && (!Number.isFinite(priceNumber) || priceNumber <= 0)) return t("priceRequired");
    return "";
  }

  function next() {
    const validation = validateCurrentStep();
    if (validation) {
      setError(validation);
      return;
    }
    setError("");
    setStep((current) => Math.min(5, current + 1));
  }

  function previous() {
    setError("");
    setStep((current) => Math.max(0, current - 1));
  }

  function selectImages(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (files.length === 0) return;
    if (files.length > 5) {
      setError(t("maxPhotos"));
      return;
    }
    const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
    const invalid = files.find((file) => !allowed.has(file.type) || file.size > 10 * 1024 * 1024);
    if (invalid) {
      setError(t("invalidPhoto"));
      return;
    }
    images.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    setImages(files.map((file) => ({ file, previewUrl: URL.createObjectURL(file) })));
    setError("");
  }

  function removeImage(index: number) {
    setImages((current) => {
      const item = current[index];
      if (item) URL.revokeObjectURL(item.previewUrl);
      return current.filter((_, i) => i !== index);
    });
  }

  function handleVoice(transcript: string) {
    const normalized = transcript.toLocaleLowerCase();
    let matchedCrop: FarmerCrop | undefined;

    for (const [canonical, aliases] of Object.entries(CROP_ALIASES)) {
      if (aliases.some((alias) => normalized.includes(alias))) {
        matchedCrop = crops.find((crop) => crop.name.toLocaleLowerCase() === canonical);
        if (matchedCrop) break;
      }
    }
    matchedCrop ||= crops.find((crop) => normalized.includes(crop.name.toLocaleLowerCase()));
    if (matchedCrop) chooseCrop(matchedCrop.id);

    const quantityMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(क्विंटल|quintal|qtl|किलो|kg|टन|ton)/i);
    if (quantityMatch) {
      setQuantity(quantityMatch[1]);
      const spokenUnit = quantityMatch[2].toLocaleLowerCase();
      if (["क्विंटल", "quintal", "qtl"].includes(spokenUnit)) setUnit("quintal");
      else if (["टन", "ton"].includes(spokenUnit)) setUnit("ton");
      else setUnit("kg");
    }

    if (!matchedCrop && !quantityMatch) setVoiceMessage(t("voiceUnknown"));
    else if (!matchedCrop) setVoiceMessage(t("voiceNeedCrop"));
    else if (!quantityMatch) setVoiceMessage(t("voiceNeedQuantity"));
    else setVoiceMessage(t("voicePrefilled"));
  }

  async function publishListing() {
    if (!confirmed || !selectedCrop || quantityKg <= 0 || priceNumber <= 0 || location.trim().length < 2 || !harvestDate) {
      setError(t("reviewRequired"));
      return;
    }

    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      let imageUrls: string[] = [];
      if (images.length > 0) {
        const form = new FormData();
        images.forEach((item) => form.append("files", item.file));
        const uploadResponse = await fetch(`${API_URL}/api/marketplace/media/images`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        });
        const uploadBody = (await uploadResponse.json().catch(() => ({}))) as UploadResponse;
        if (!uploadResponse.ok) throw new Error(uploadBody.detail || t("uploadFailed"));
        imageUrls = uploadBody.urls || [];
      }

      const response = await fetch(`${API_URL}/api/marketplace/listings`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          crop_id: selectedCrop.id,
          quantity_kg: quantityKg,
          quality_grade: quality,
          expected_price_per_kg: priceNumber,
          location: location.trim(),
          harvest_date: harvestDate,
          images: imageUrls,
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(typeof body?.detail === "string" ? body.detail : t("publishFailed"));
      router.push("/dashboard/farmer/market#listings");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("publishFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  const steps = [t("stepCrop"), t("stepQuantity"), t("stepLocation"), t("stepPrice"), t("stepPhotos"), t("stepReview")];

  return (
    <div className="min-h-screen bg-[#F4F7F2] pb-24 text-slate-900">
      <FarmerPhase3Header title={t("title")} subtitle={t("subtitle")} backLabel={t("marketHub")} backHref="/dashboard/farmer/market" />
      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-[#D7E3DA] bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="text-sm font-black uppercase tracking-wider text-[#0F7A4A]">{t("progress")}</p><h1 className="mt-1 text-2xl font-black text-[#0F172A]">{steps[step]}</h1></div>
            <span className="rounded-full bg-[#E8F5EE] px-3 py-1 text-sm font-black text-[#0F7A4A]">{step + 1} / {steps.length}</span>
          </div>
          <div className="mt-4 grid grid-cols-6 gap-1.5" aria-hidden="true">{steps.map((_, index) => <span key={index} className={`h-2 rounded-full ${index <= step ? "bg-[#0F7A4A]" : "bg-slate-200"}`} />)}</div>

          <VoiceCapture className="mt-5" onTranscript={handleVoice} label={t("voiceButton")} listeningLabel={t("listening")} unsupportedLabel={t("voiceUnsupported")} />
          {voiceMessage ? <p className="mt-2 text-sm font-semibold text-[#0F7A4A]">{voiceMessage}</p> : null}

          <div className="mt-7 min-h-[320px]">
            {step === 0 ? (
              <Step icon={<Wheat />} title={t("cropQuestion")}>
                {loadingCrops ? <p className="flex items-center gap-2 text-slate-600"><Loader2 className="h-5 w-5 animate-spin" /> {t("loadingCrops")}</p> : crops.length === 0 ? <p className="rounded-xl bg-amber-50 p-4 text-amber-900">{t("noCrops")}</p> : <div className="grid gap-3 sm:grid-cols-2">{crops.map((crop) => <button type="button" key={crop.id} onClick={() => chooseCrop(crop.id)} className={`min-h-16 rounded-2xl border p-4 text-left ${cropId === crop.id ? "border-[#0F7A4A] bg-[#E8F5EE]" : "border-slate-200 bg-white"}`}><span className="font-black">{crop.name}</span>{crop.variety ? <span className="mt-1 block text-sm text-slate-600">{crop.variety}</span> : null}</button>)}</div>}
              </Step>
            ) : null}

            {step === 1 ? (
              <Step icon={<Scale />} title={t("quantityQuestion")}>
                <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
                  <Field label={t("quantity")}><input type="number" min="0.01" step="0.01" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="min-h-12 w-full rounded-xl border border-slate-300 px-3" /></Field>
                  <Field label={t("unit")}><select value={unit} onChange={(e) => setUnit(e.target.value as Unit)} className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3"><option value="kg">kg</option><option value="quintal">quintal</option><option value="ton">ton</option></select></Field>
                </div>
                <Field label={t("quality")}><select value={quality} onChange={(e) => setQuality(e.target.value)} className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3">{["A", "B", "C", "Premium", "Standard"].map((item) => <option key={item}>{item}</option>)}</select></Field>
                {quantityKg > 0 ? <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{t("backendQuantity")}: <strong>{quantityKg.toLocaleString("en-IN")} kg</strong></p> : null}
              </Step>
            ) : null}

            {step === 2 ? (
              <Step icon={<MapPin />} title={t("locationQuestion")}>
                <Field label={t("location")}><input value={location} onChange={(e) => setLocation(e.target.value)} placeholder={t("locationPlaceholder")} className="min-h-12 w-full rounded-xl border border-slate-300 px-3" /></Field>
                <Field label={t("harvestDate")}><input type="date" value={harvestDate} onChange={(e) => setHarvestDate(e.target.value)} className="min-h-12 w-full rounded-xl border border-slate-300 px-3" /></Field>
              </Step>
            ) : null}

            {step === 3 ? (
              <Step icon={<IndianRupee />} title={t("priceQuestion")}>
                <Field label={t("expectedRatePerKg")}><input type="number" min="0.01" step="0.01" value={expectedPrice} onChange={(e) => setExpectedPrice(e.target.value)} className="min-h-12 w-full rounded-xl border border-slate-300 px-3" /></Field>
                <button type="button" onClick={() => router.push("/dashboard/farmer/price#expected")} className="min-h-12 rounded-xl border border-[#BFDCC9] bg-[#E8F5EE] px-4 font-bold text-[#0F7A4A]">{t("checkExpectedPrice")}</button>
                <p className="mt-3 text-sm text-slate-600">{t("priceNote")}</p>
              </Step>
            ) : null}

            {step === 4 ? (
              <Step icon={<Camera />} title={t("photoQuestion")}>
                <label className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-xl bg-[#0F7A4A] px-4 font-bold text-white"><ImagePlus className="h-5 w-5" /> {t("choosePhotos")}<input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={selectImages} /></label>
                <p className="mt-2 text-sm text-slate-500">{t("photoHint")}</p>
                {images.length > 0 ? <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">{images.map((item, index) => <div key={`${item.file.name}-${index}`} className="relative overflow-hidden rounded-2xl border border-slate-200"><Image src={item.previewUrl} alt={t("photoAlt")} width={320} height={320} unoptimized className="aspect-square w-full object-cover" /><button type="button" onClick={() => removeImage(index)} className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-white text-red-600 shadow"><X className="h-4 w-4" /></button></div>)}</div> : null}
              </Step>
            ) : null}

            {step === 5 ? (
              <Step icon={<CheckCircle2 />} title={t("reviewTitle")}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Review label={t("crop")} value={selectedCrop?.name || "—"} />
                  <Review label={t("quantity")} value={`${quantity || "—"} ${unit}${quantityKg ? ` (${quantityKg.toLocaleString("en-IN")} kg)` : ""}`} />
                  <Review label={t("quality")} value={quality} />
                  <Review label={t("location")} value={location || "—"} />
                  <Review label={t("harvestDate")} value={harvestDate || "—"} />
                  <Review label={t("expectedRate")} value={priceNumber > 0 ? `${money(priceNumber)} / kg` : "—"} />
                </div>
                {estimatedTotal > 0 ? <div className="mt-4 rounded-2xl bg-[#E8F5EE] p-5"><p className="text-sm font-bold text-slate-600">{t("estimatedTotal")}</p><p className="mt-1 text-3xl font-black text-[#0F7A4A]">{money(estimatedTotal)}</p><p className="mt-1 text-xs text-slate-500">{t("estimatedTotalNote")}</p></div> : null}
                <label className="mt-5 flex items-start gap-3 rounded-2xl border border-[#BFDCC9] bg-[#F4F7F2] p-4"><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-1 h-5 w-5 accent-[#0F7A4A]" /><span className="font-semibold text-slate-800">{t("confirmQuestion")}</span></label>
              </Step>
            ) : null}
          </div>

          {error ? <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 font-semibold text-red-700">{error}</p> : null}

          <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-between">
            <button type="button" onClick={previous} disabled={step === 0 || submitting} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 font-bold text-slate-700 disabled:opacity-40"><ChevronLeft className="h-5 w-5" /> {t("back")}</button>
            {step < 5 ? <button type="button" onClick={next} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#0F7A4A] px-5 font-black text-white">{t("next")} <ChevronRight className="h-5 w-5" /></button> : <button type="button" onClick={() => void publishListing()} disabled={!confirmed || submitting} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#0F7A4A] px-5 font-black text-white disabled:opacity-50">{submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <PackagePlus className="h-5 w-5" />}{submitting ? t("publishing") : t("publish")}</button>}
          </div>
        </section>
      </main>
      <FarmerBottomNav
        onAlerts={() => router.push("/dashboard/farmer#important-alerts")}
        onProfile={() => router.push("/dashboard/farmer")}
      />
      <AgrivaAI />
    </div>
  );
}

function Step({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return <div><div className="mb-5 flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[#E8F5EE] text-[#0F7A4A]">{icon}</span><h2 className="text-xl font-black text-[#0F172A]">{title}</h2></div><div className="space-y-4">{children}</div></div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-2 block text-sm font-bold text-slate-700">{label}</span>{children}</label>; }
function Review({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-black uppercase tracking-wider text-slate-500">{label}</p><p className="mt-1 font-black text-[#0F172A]">{value}</p></div>; }
