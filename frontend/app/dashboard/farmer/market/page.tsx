"use client";

import {
  BadgeIndianRupee,
  Boxes,
  ChevronRight,
  CircleAlert,
  FileText,
  IndianRupee,
  Loader2,
  RefreshCw,
  Scale,
  Search,
  ShoppingBasket,
  Truck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

import AgrivaAI from "@/app/components/AgrivaAI";
import FarmerBottomNav from "@/components/layout/FarmerBottomNav";
import FarmerPhase3Header from "@/components/phase3/FarmerPhase3Header";
import VoiceCapture from "@/components/phase3/VoiceCapture";
import {
  displayCropName,
  displayDistanceUnit,
  displayMassUnit,
  displayStatus,
} from "@/components/phase3/displayLabels";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

type Listing = {
  id: string;
  crop_id: string;
  crop: string;
  quantity_kg: number;
  quality_grade: string | null;
  expected_price_per_kg: number;
  location: string;
  harvest_date: string | null;
  images: string[];
  status: string;
  created_at: string;
};

type BuyerMatch = {
  buyer_id: string;
  buyer_name: string;
  match_percentage: number;
  offer_price: number | null;
  demand_quantity: number | null;
  distance_km: number | null;
  buyer_rating: number | null;

  verification_status: string;
  verification_label: string;
  verification_note: string;
  agriva_verified: boolean;
};

type Order = {
  id: string;
  total_amount?: number;
  status?: string;
};

function money(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function shortId(value: string) {
  return `#${value.replaceAll("-", "").slice(-6).toUpperCase()}`;
}


function buyerVerificationLabel(
  status: string,
  locale: string
) {
  if (status === "AGRIVA_VERIFIED") {
    return "AGRIVA Verified";
  }

  if (status === "PENDING") {
    if (locale === "hi") return "AGRIVA समीक्षा लंबित";
    if (locale === "mr") return "AGRIVA पुनरावलोकन प्रलंबित";
    return "AGRIVA review pending";
  }

  if (status === "REJECTED") {
    if (locale === "hi") return "AGRIVA समीक्षा अस्वीकृत";
    if (locale === "mr") return "AGRIVA पुनरावलोकन नाकारले";
    return "AGRIVA review rejected";
  }

  if (locale === "hi") return "AGRIVA द्वारा सत्यापित नहीं";
  if (locale === "mr") return "AGRIVA कडून पडताळलेले नाही";
  return "Not verified by AGRIVA";
}


function buyerVerificationNote(
  status: string,
  locale: string
) {
  if (status === "AGRIVA_VERIFIED") {
    if (locale === "hi") {
      return "AGRIVA एडमिन ने जमा प्लेटफ़ॉर्म व्यवसाय दस्तावेज़ की समीक्षा की है। यह सरकारी KYC या बैंक सत्यापन नहीं है।";
    }

    if (locale === "mr") {
      return "AGRIVA अॅडमिनने सादर केलेल्या प्लॅटफॉर्म व्यवसाय दस्तऐवजाचे पुनरावलोकन केले आहे. हे सरकारी KYC किंवा बँक पडताळणी नाही.";
    }

    return "AGRIVA admin reviewed the submitted platform business document. This is not Government KYC or bank verification.";
  }

  if (status === "PENDING") {
    if (locale === "hi") {
      return "दस्तावेज़ AGRIVA एडमिन समीक्षा की प्रतीक्षा में हैं। स्वतंत्र सरकारी/KYC सत्यापन का दावा नहीं है।";
    }

    if (locale === "mr") {
      return "दस्तऐवज AGRIVA अॅडमिन पुनरावलोकनाच्या प्रतीक्षेत आहेत. स्वतंत्र सरकारी/KYC पडताळणीचा दावा नाही.";
    }

    return "Documents are awaiting AGRIVA admin review. No Government/KYC verification is claimed.";
  }

  if (locale === "hi") {
    return "इस खरीदार के लिए स्वतंत्र सरकारी, KYC या बैंक सत्यापन का दावा नहीं किया गया है।";
  }

  if (locale === "mr") {
    return "या खरेदीदारासाठी स्वतंत्र सरकारी, KYC किंवा बँक पडताळणीचा दावा केलेला नाही.";
  }

  return "No Government, KYC or bank verification is claimed for this buyer.";
}

export default function MarketHubPage() {
  const router = useRouter();
  const t = useTranslations("phase3Market");
  const locale = useLocale();
  const [listings, setListings] = useState<Listing[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedListingId, setSelectedListingId] = useState("");
  const [matches, setMatches] = useState<BuyerMatch[]>([]);
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchError, setMatchError] = useState("");
  const [voiceMessage, setVoiceMessage] = useState("");

  const token = () =>
    typeof window === "undefined"
      ? null
      : localStorage.getItem("access_token") || localStorage.getItem("token");

  const loadData = useCallback(async () => {
    const auth = token();
    if (!auth) {
      router.replace("/login");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [listingResponse, orderResponse] = await Promise.all([
        fetch(`${API_URL}/api/marketplace/my-listings`, {
          headers: { Authorization: `Bearer ${auth}` },
          cache: "no-store",
        }),
        fetch(`${API_URL}/api/orders/farmer/incoming`, {
          headers: { Authorization: `Bearer ${auth}` },
          cache: "no-store",
        }),
      ]);

      if (listingResponse.status === 401 || orderResponse.status === 401) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("token");
        router.replace("/login");
        return;
      }

      const listingBody = await listingResponse.json().catch(() => null);
      const orderBody = await orderResponse.json().catch(() => null);

      if (!listingResponse.ok) {
        throw new Error(typeof listingBody?.detail === "string" ? listingBody.detail : t("loadError"));
      }

      setListings(Array.isArray(listingBody) ? listingBody : []);
      setOrders(Array.isArray(orderBody) ? orderBody : []);

      if (Array.isArray(listingBody) && listingBody.length > 0) {
        setSelectedListingId((current) => current || listingBody[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [router, t]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const selectedListing = useMemo(
    () => listings.find((item) => item.id === selectedListingId) || null,
    [listings, selectedListingId],
  );

  async function findBuyers() {
    const auth = token();
    if (!auth) {
      router.replace("/login");
      return;
    }
    if (!selectedListingId) {
      setMatchError(t("selectListingFirst"));
      return;
    }

    setMatchLoading(true);
    setMatchError("");
    setMatches([]);

    try {
      const response = await fetch(
        `${API_URL}/api/marketplace/listings/${selectedListingId}/matches`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${auth}` },
        },
      );
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(typeof body?.detail === "string" ? body.detail : t("buyerError"));
      }
      setMatches(Array.isArray(body?.matches) ? body.matches : []);
    } catch (err) {
      setMatchError(err instanceof Error ? err.message : t("buyerError"));
    } finally {
      setMatchLoading(false);
    }
  }

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleVoice(text: string) {
    const value = text.toLocaleLowerCase();
    const has = (terms: string[]) => terms.some((term) => value.includes(term));

    if (has(["अंदाज", "अनुमान", "expected", "prediction"])) {
      setVoiceMessage(t("voiceExpected"));
      router.push("/dashboard/farmer/price#expected");
      return;
    }
    if (has(["बाजारभाव", "मंडी", "market price", "price"])) {
      setVoiceMessage(t("voicePrice"));
      router.push("/dashboard/farmer/price");
      return;
    }
    if (has(["विकाय", "बेच", "sell"])) {
      setVoiceMessage(t("voiceSell"));
      router.push("/dashboard/farmer/sell");
      return;
    }
    if (has(["खरेदीदार", "खरीदार", "buyer"])) {
      setVoiceMessage(t("voiceBuyers"));
      scrollTo("buyers");
      return;
    }
    if (has(["माझी विक्री", "मेरी बिक्री", "listing"])) {
      setVoiceMessage(t("voiceListings"));
      scrollTo("listings");
      return;
    }
    if (has(["व्यवहार", "लेनदेन", "order", "transaction", "पेमेंट", "payment"])) {
      setVoiceMessage(t("voiceTransactions"));
      router.push("/dashboard/farmer/transactions");
      return;
    }
    if (has(["साठवण", "भंडारण", "storage"])) {
      setVoiceMessage(t("voiceStorage"));
      scrollTo("support");
      return;
    }
    if (has(["वाहतूक", "परिवहन", "transport"])) {
      setVoiceMessage(t("voiceTransport"));
      router.push("/dashboard/farmer/transport");
      return;
    }

    setVoiceMessage(t("voiceUnknown"));
  }

  const activeListings = listings.filter((item) => item.status.toLowerCase() === "active").length;
  const pendingOrders = orders.filter((item) => (item.status || "").toLowerCase() === "pending").length;

  return (
    <div className="min-h-screen bg-[#F4F7F2] pb-28 text-slate-900">
      <FarmerPhase3Header title={t("title")} subtitle={t("subtitle")} backLabel={t("dashboard")} />

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-3xl bg-[#0F7A4A] p-5 text-white shadow-lg sm:p-7">
          <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.16em] text-emerald-100">{t("eyebrow")}</p>
              <h1 className="mt-2 text-3xl font-black sm:text-4xl">{t("heroTitle")}</h1>
              <p className="mt-2 max-w-2xl text-emerald-50">{t("heroDescription")}</p>
              <VoiceCapture
                className="mt-5"
                onTranscript={handleVoice}
                label={t("voiceButton")}
                listeningLabel={t("listening")}
                unsupportedLabel={t("voiceUnsupported")}
              />
              {voiceMessage ? <p className="mt-2 text-sm font-semibold text-emerald-50">{voiceMessage}</p> : null}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:w-[420px]">
              <Stat label={t("activeListings")} value={String(activeListings)} />
              <Stat label={t("pendingOrders")} value={String(pendingOrders)} />
              <Stat label={t("buyerMatches")} value={String(matches.length)} />
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-black text-[#0F172A]">{t("mainActions")}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Action icon={<IndianRupee />} title={t("marketPrice")} text={t("marketPriceDesc")} onClick={() => router.push("/dashboard/farmer/price")} />
            <Action icon={<BadgeIndianRupee />} title={t("expectedPrice")} text={t("expectedPriceDesc")} onClick={() => router.push("/dashboard/farmer/price#expected")} />
            <Action icon={<ShoppingBasket />} title={t("sellCrop")} text={t("sellCropDesc")} onClick={() => router.push("/dashboard/farmer/sell")} />
            <Action icon={<Search />} title={t("findBuyers")} text={t("findBuyersDesc")} onClick={() => scrollTo("buyers")} />
          </div>
        </section>

        {error ? (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800">
            <p className="font-bold">{error}</p>
            <button type="button" onClick={() => void loadData()} className="mt-3 inline-flex min-h-12 items-center gap-2 rounded-xl border border-red-200 bg-white px-4 font-bold">
              <RefreshCw className="h-4 w-4" /> {t("tryAgain")}
            </button>
          </section>
        ) : null}

        <section id="listings" className="scroll-mt-24 rounded-3xl border border-[#D7E3DA] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black text-[#0F172A]">{t("myListings")}</h2>
              <p className="mt-1 text-slate-600">{t("myListingsDesc")}</p>
            </div>
            <button type="button" onClick={() => router.push("/dashboard/farmer/sell")} className="min-h-12 rounded-xl bg-[#0F7A4A] px-4 font-bold text-white">
              + {t("sellCrop")}
            </button>
          </div>

          {loading ? (
            <div className="mt-5 flex items-center gap-2 text-slate-600"><Loader2 className="h-5 w-5 animate-spin" /> {t("loading")}</div>
          ) : listings.length === 0 ? (
            <div className="mt-5 rounded-2xl bg-[#F4F7F2] p-6 text-slate-700">{t("noListings")}</div>
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {listings.map((listing) => (
                <article key={listing.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider text-[#0F7A4A]">{shortId(listing.id)}</p>
                      <h3 className="mt-1 text-xl font-black">{displayCropName(listing.crop, locale)}</h3>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black uppercase text-emerald-800">{displayStatus(listing.status, locale)}</span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <Info label={t("quantity")} value={`${listing.quantity_kg.toLocaleString("en-IN")} ${displayMassUnit("kg", locale)}`} />
                    <Info label={t("expectedRate")} value={`${money(listing.expected_price_per_kg)} / ${displayMassUnit("kg", locale)}`} />
                    <Info label={t("quality")} value={listing.quality_grade || "—"} />
                    <Info label={t("location")} value={listing.location || "—"} />
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section id="buyers" className="scroll-mt-24 rounded-3xl border border-[#D7E3DA] bg-white p-5 shadow-sm sm:p-6">
          <div>
            <h2 className="text-2xl font-black text-[#0F172A]">{t("buyersTitle")}</h2>
            <p className="mt-1 text-slate-600">{t("buyersDesc")}</p>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">{t("selectListing")}</span>
              <select value={selectedListingId} onChange={(e) => setSelectedListingId(e.target.value)} className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3">
                <option value="">{t("selectListingPlaceholder")}</option>
                {listings.filter((item) => item.status.toLowerCase() === "active").map((item) => (
                  <option key={item.id} value={item.id}>{displayCropName(item.crop, locale)} — {item.location}</option>
                ))}
              </select>
            </label>
            <button type="button" onClick={() => void findBuyers()} disabled={matchLoading || !selectedListingId} className="min-h-12 self-end rounded-xl bg-[#0F7A4A] px-5 font-bold text-white disabled:opacity-50">
              {matchLoading ? t("searching") : t("findBuyers")}
            </button>
          </div>

          {selectedListing ? <p className="mt-3 text-sm text-slate-600">{t("matchingFor")}: <strong>{displayCropName(selectedListing.crop, locale)}</strong></p> : null}
          {matchError ? <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{matchError}</p> : null}

          {!matchLoading && matches.length === 0 && !matchError ? (
            <div className="mt-5 rounded-2xl bg-[#F4F7F2] p-5 text-slate-700">{t("noBuyerResults")}</div>
          ) : null}

          {matches.length > 0 ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {matches.map((match) => (
                <article key={match.buyer_id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider text-[#0F7A4A]">{t("buyer")}</p>
                      <h3 className="mt-1 text-lg font-black text-[#0F172A]">{match.buyer_name}</h3>
                      <span
                        className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-black ${
                          match.agriva_verified
                            ? "bg-emerald-100 text-emerald-800"
                            : match.verification_status === "PENDING"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {buyerVerificationLabel(
                          match.verification_status,
                          locale
                        )}
                      </span>
                    </div>
                    <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-black text-green-800">{Math.round(match.match_percentage)}%</span>
                  </div>
                  <div className="mt-4 space-y-2 text-sm text-slate-700">
                    {match.demand_quantity != null ? <p>{t("demand")}: {match.demand_quantity.toLocaleString("en-IN")} {displayMassUnit("kg", locale)}</p> : null}
                    {match.offer_price != null ? <p className="font-bold text-[#0F7A4A]">{t("displayedRate")}: {money(match.offer_price)} / {displayMassUnit("kg", locale)}</p> : null}
                    {match.distance_km != null ? <p>{t("distance")}: {match.distance_km.toLocaleString("en-IN", { maximumFractionDigits: 1 })} {displayDistanceUnit(locale)}</p> : null}
                  </div>
                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    {buyerVerificationNote(
                      match.verification_status,
                      locale
                    )}
                  </p>
                </article>
              ))}
            </div>
          ) : null}
        </section>

        <section id="support" className="scroll-mt-24 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Support icon={<Scale />} title={t("qualityDetails")} text={t("qualityDesc")} action={t("open")} onClick={() => router.push("/dashboard/farmer/quality")} />
          <Support icon={<Truck />} title={t("transport")} text={t("transportDesc")} action={t("open")} onClick={() => router.push("/dashboard/farmer/transport")} />
          <Support icon={<Boxes />} title={t("storage")} text={t("storageUnavailable")} />
          <Support icon={<FileText />} title={t("transactions")} text={t("transactionsDesc")} action={t("open")} onClick={() => router.push("/dashboard/farmer/transactions")} />
        </section>

        <section id="offers" className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
          <div className="flex items-start gap-3">
            <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <h2 className="font-black">{t("offersTitle")}</h2>
              <p className="mt-1 text-sm">{t("offersUnsupported")}</p>
            </div>
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

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-white/12 p-4 backdrop-blur"><p className="text-xs font-bold uppercase tracking-wider text-emerald-100">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></div>;
}

function Action({ icon, title, text, onClick }: { icon: React.ReactNode; title: string; text: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="min-h-40 rounded-2xl border border-[#D7E3DA] bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#0F7A4A] hover:shadow-md"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#E8F5EE] text-[#0F7A4A]">{icon}</span><h3 className="mt-4 text-lg font-black text-[#0F172A]">{title}</h3><p className="mt-1 text-sm text-slate-600">{text}</p></button>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-1 font-bold text-slate-900">{value}</p></div>;
}

function Support({ icon, title, text, action, onClick }: { icon: React.ReactNode; title: string; text: string; action?: string; onClick?: () => void }) {
  return <article className="rounded-2xl border border-[#D7E3DA] bg-white p-5 shadow-sm"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[#E8F5EE] text-[#0F7A4A]">{icon}</span><h3 className="mt-4 font-black text-[#0F172A]">{title}</h3><p className="mt-1 text-sm text-slate-600">{text}</p>{onClick && action ? <button type="button" onClick={onClick} className="mt-4 inline-flex min-h-11 items-center gap-1 font-bold text-[#0F7A4A]">{action}<ChevronRight className="h-4 w-4" /></button> : null}</article>;
}
