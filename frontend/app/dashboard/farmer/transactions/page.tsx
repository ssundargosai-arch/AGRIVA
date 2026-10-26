"use client";

import {
  CheckCircle2,
  IndianRupee,
  Loader2,
  PackageCheck,
  RefreshCw,
  Truck,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

import AgrivaAI from "@/app/components/AgrivaAI";
import FarmerBottomNav from "@/components/layout/FarmerBottomNav";
import FarmerPhase3Header from "@/components/phase3/FarmerPhase3Header";
import VoiceCapture from "@/components/phase3/VoiceCapture";
import {
  dateLocale,
  displayCropName,
  displayMassUnit,
  displayStatus,
} from "@/components/phase3/displayLabels";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

type Crop = { id: string; name: string };
type OrderItem = {
  id: string;
  crop_id: string;
  quantity_kg: number;
  price_per_kg: number;
};
type FarmerOrder = {
  id: string;
  listing_id: string;
  buyer_id: string;
  total_amount: number;
  status: string;
  created_at: string;
  items?: OrderItem[];
};

function money(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function shortId(value: string) {
  return `#${value.replaceAll("-", "").slice(-6).toUpperCase()}`;
}

export default function FarmerTransactionsPage() {
  const router = useRouter();
  const t = useTranslations("phase3Transactions");
  const locale = useLocale();
  const [orders, setOrders] = useState<FarmerOrder[]>([]);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState("");
  const [voiceMessage, setVoiceMessage] = useState("");

  const getToken = () =>
    typeof window === "undefined"
      ? null
      : localStorage.getItem("access_token") || localStorage.getItem("token");

  const loadData = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const [orderResponse, cropResponse] = await Promise.all([
        fetch(`${API_URL}/api/orders/farmer/incoming`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }),
        fetch(`${API_URL}/api/crops`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }),
      ]);

      if (orderResponse.status === 401 || cropResponse.status === 401) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("token");
        router.replace("/login");
        return;
      }

      const orderBody = await orderResponse.json().catch(() => null);
      const cropBody = await cropResponse.json().catch(() => null);
      if (!orderResponse.ok) {
        throw new Error(typeof orderBody?.detail === "string" ? orderBody.detail : t("loadError"));
      }

      setOrders(Array.isArray(orderBody) ? orderBody : []);
      setCrops(cropResponse.ok && Array.isArray(cropBody) ? cropBody : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [router, t]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const cropNames = useMemo(() => new Map(crops.map((crop) => [crop.id, crop.name])), [crops]);

  function statusLabel(status: string) {
    const localized = displayStatus(status, locale);
    if (localized !== status) return localized;

    const key = status.trim().toLowerCase();
    if (key === "pending") return t("statusPending");
    if (key === "accepted" || key === "confirmed") return t("statusAccepted");
    if (key === "completed") return t("statusCompleted");
    if (key === "rejected") return t("statusRejected");
    if (key === "cancelled" || key === "canceled") return t("statusCancelled");
    return status;
  }

  function statusClass(status: string) {
    const key = status.trim().toLowerCase();
    if (key === "completed" || key === "accepted" || key === "confirmed") {
      return "bg-emerald-50 text-emerald-800";
    }
    if (key === "rejected" || key === "cancelled" || key === "canceled") {
      return "bg-red-50 text-red-700";
    }
    return "bg-amber-50 text-amber-800";
  }

  async function changeStatus(order: FarmerOrder, nextStatus: "accepted" | "rejected") {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    const message = nextStatus === "accepted" ? t("confirmAccept") : t("confirmReject");
    if (!window.confirm(message)) return;

    setUpdatingId(order.id);
    try {
      const response = await fetch(`${API_URL}/api/orders/${order.id}/status`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(typeof body?.detail === "string" ? body.detail : t("updateFailed"));
      }
      setOrders((current) => current.map((item) => (item.id === order.id ? { ...item, ...body } : item)));
    } catch (err) {
      window.alert(err instanceof Error ? err.message : t("updateFailed"));
    } finally {
      setUpdatingId("");
    }
  }

  function handleVoice(transcript: string) {
    const value = transcript.toLocaleLowerCase();
    const has = (terms: string[]) => terms.some((term) => value.includes(term));

    if (has(["पेमेंट", "payment", "भुगतान"])) {
      setVoiceMessage(t("voicePayment"));
      document.getElementById("payment")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (has(["वाहतूक", "transport", "परिवहन"])) {
      setVoiceMessage(t("voiceTransport"));
      router.push("/dashboard/farmer/transport");
      return;
    }
    if (has(["व्यवहार", "ऑर्डर", "order", "transaction", "लेनदेन"])) {
      setVoiceMessage(t("voiceTransactions"));
      document.getElementById("records")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    setVoiceMessage(t("voiceUnknown"));
  }

  return (
    <div className="min-h-screen bg-[#F4F7F2] pb-24 text-slate-900">
      <FarmerPhase3Header
        title={t("title")}
        subtitle={t("subtitle")}
        backLabel={t("marketHub")}
        backHref="/dashboard/farmer/market"
      />

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-3xl bg-[#0F7A4A] p-5 text-white shadow-lg sm:p-7">
          <h1 className="text-3xl font-black">{t("heroTitle")}</h1>
          <p className="mt-2 max-w-2xl text-emerald-50">{t("heroDescription")}</p>
          <VoiceCapture
            className="mt-5"
            onTranscript={handleVoice}
            label={t("voiceButton")}
            listeningLabel={t("listening")}
            unsupportedLabel={t("voiceUnsupported")}
          />
          {voiceMessage ? <p className="mt-2 text-sm font-semibold text-emerald-50">{voiceMessage}</p> : null}
        </section>

        <section id="records" className="scroll-mt-24 rounded-3xl border border-[#D7E3DA] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black text-[#0F172A]">{t("recordsTitle")}</h2>
              <p className="mt-1 text-slate-600">{t("recordsDesc")}</p>
            </div>
            <button
              type="button"
              onClick={() => void loadData()}
              className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-[#D7E3DA] bg-white px-4 font-bold text-slate-700"
            >
              <RefreshCw className="h-4 w-4" /> {t("refresh")}
            </button>
          </div>

          {error ? (
            <p className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 font-semibold text-red-700">{error}</p>
          ) : loading ? (
            <p className="mt-5 flex items-center gap-2 text-slate-600"><Loader2 className="h-5 w-5 animate-spin" /> {t("loading")}</p>
          ) : orders.length === 0 ? (
            <p className="mt-5 rounded-2xl bg-[#F4F7F2] p-5 text-slate-700">{t("empty")}</p>
          ) : (
            <div className="mt-5 space-y-4">
              {orders.map((order) => {
                const firstItem = order.items?.[0];
                const cropName = firstItem ? cropNames.get(firstItem.crop_id) : undefined;
                const pending = order.status.toLowerCase() === "pending";
                return (
                  <article key={order.id} className="rounded-2xl border border-slate-200 p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-wider text-[#0F7A4A]">{t("transaction")} {shortId(order.id)}</p>
                        <h3 className="mt-1 text-xl font-black text-[#0F172A]">{cropName ? displayCropName(cropName, locale) : t("cropUnavailable")}</h3>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${statusClass(order.status)}`}>{statusLabel(order.status)}</span>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <Info label={t("quantity")} value={firstItem ? `${firstItem.quantity_kg.toLocaleString("en-IN")} ${displayMassUnit("kg", locale)}` : "—"} />
                      <Info label={t("rate")} value={firstItem ? `${money(firstItem.price_per_kg)} / ${displayMassUnit("kg", locale)}` : "—"} />
                      <Info label={t("total")} value={money(order.total_amount)} />
                      <Info label={t("date")} value={new Date(order.created_at).toLocaleDateString(dateLocale(locale))} />
                    </div>

                    {pending ? (
                      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                        <button
                          type="button"
                          disabled={updatingId === order.id}
                          onClick={() => void changeStatus(order, "accepted")}
                          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#0F7A4A] px-4 font-bold text-white disabled:opacity-50"
                        >
                          <CheckCircle2 className="h-5 w-5" /> {t("accept")}
                        </button>
                        <button
                          type="button"
                          disabled={updatingId === order.id}
                          onClick={() => void changeStatus(order, "rejected")}
                          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 font-bold text-red-700 disabled:opacity-50"
                        >
                          <XCircle className="h-5 w-5" /> {t("reject")}
                        </button>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-[#0F7A4A]"><PackageCheck className="h-5 w-5" /></span>
              <div>
                <h2 className="text-xl font-black text-emerald-950">{locale === "mr" ? "व्यवहार सुरक्षा आणि तक्रार मदत" : locale === "hi" ? "लेनदेन सुरक्षा और शिकायत सहायता" : "Transaction Safety & Complaint Help"}</h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-emerald-900">{locale === "mr" ? "खरेदीदार इतिहास, पेमेंट पुरावा, डिलिव्हरी नोंद पहा आणि तक्रार नोंदवा." : locale === "hi" ? "खरीदार इतिहास, भुगतान प्रमाण, डिलीवरी रिकॉर्ड देखें और शिकायत दर्ज करें।" : "Check buyer history, payment evidence, delivery records and raise or track complaints."}</p>
              </div>
            </div>
            <button type="button" onClick={() => router.push("/dashboard/farmer/transaction-assurance")} className="min-h-12 rounded-xl bg-[#0F7A4A] px-5 font-black text-white">{locale === "mr" ? "व्यवहार सुरक्षा उघडा" : locale === "hi" ? "लेनदेन सुरक्षा खोलें" : "Open Transaction Safety"}</button>
          </div>
        </section>

        <section id="payment" className="scroll-mt-24 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-amber-700"><IndianRupee className="h-5 w-5" /></span>
            <div>
              <h2 className="text-xl font-black">{t("paymentTitle")}</h2>
              <p className="mt-1 text-sm">{t("paymentUnavailable")}</p>
              <p className="mt-2 text-xs font-semibold">{t("paymentSafety")}</p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <Support
            icon={<Truck />}
            title={t("transportTitle")}
            text={t("transportDesc")}
            action={t("openTransport")}
            onClick={() => router.push("/dashboard/farmer/transport")}
          />
          <Support
            icon={<PackageCheck />}
            title={t("recordTransparency")}
            text={t("recordTransparencyDesc")}
          />
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

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-1 font-bold text-slate-900">{value}</p></div>;
}

function Support({ icon, title, text, action, onClick }: { icon: React.ReactNode; title: string; text: string; action?: string; onClick?: () => void }) {
  return (
    <article className="rounded-2xl border border-[#D7E3DA] bg-white p-5 shadow-sm">
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#E8F5EE] text-[#0F7A4A]">{icon}</span>
      <h3 className="mt-4 font-black text-[#0F172A]">{title}</h3>
      <p className="mt-1 text-sm text-slate-600">{text}</p>
      {onClick && action ? <button type="button" onClick={onClick} className="mt-4 min-h-11 font-bold text-[#0F7A4A]">{action}</button> : null}
    </article>
  );
}
