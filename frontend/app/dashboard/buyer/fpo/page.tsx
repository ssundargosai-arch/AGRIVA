"use client";

import {
  ArrowLeft,
  IndianRupee,
  Loader2,
  MapPin,
  Package,
  RefreshCw,
  Search,
  Users,
  Volume2,
} from "lucide-react";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {useRouter} from "next/navigation";
import {useLocale, useTranslations} from "next-intl";

import LanguageSelector from "@/components/LanguageSelector";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000"
).replace(/\/$/, "");

type UserData = {
  role?: string;
};

type Contribution = {
  id: string;
  farmer_profile_id: string;
  farmer_name: string;
  listing_id: string;
  quantity_kg: number;
  listing_available_quantity_kg: number;
  status: string;
  created_at: string;
};

type Lot = {
  id: string;
  group_id: string;
  group_name: string;
  crop_name: string;
  quality_grade?: string | null;
  target_price_per_kg: number;
  location?: string | null;
  notes?: string | null;
  status: string;
  aggregated_quantity_kg: number;
  contribution_count: number;
  inventory_reserved: boolean;
  created_at: string;
  published_at?: string | null;
  contributions: Contribution[];
};

function localeName(locale: string) {
  return locale === "mr"
    ? "mr-IN"
    : locale === "hi"
      ? "hi-IN"
      : "en-IN";
}

function numberText(value: number, locale: string) {
  return new Intl.NumberFormat(localeName(locale), {
    maximumFractionDigits: 2,
  }).format(value);
}

function money(value: number, locale: string) {
  return new Intl.NumberFormat(localeName(locale), {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

export default function BuyerFpoPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("sihFpo");

  const [lots, setLots] = useState<Lot[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadLots = useCallback(async () => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      router.replace("/login");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const meResponse = await fetch(
        `${API_URL}/api/auth/me`,
        {headers, cache: "no-store"}
      );
      const me = await meResponse
        .json()
        .catch(() => null) as UserData | null;

      if (
        !meResponse.ok ||
        String(me?.role || "").toUpperCase() !== "BUYER"
      ) {
        throw new Error(t("buyerOnly"));
      }

      const response = await fetch(
        `${API_URL}/api/fpo/lots`,
        {headers, cache: "no-store"}
      );
      const body = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          typeof body?.detail === "string"
            ? body.detail
            : t("loadError")
        );
      }

      setLots(
        (body as Lot[]).filter(
          (lot) => lot.status === "published"
        )
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("loadError")
      );
    } finally {
      setLoading(false);
    }
  }, [router, t]);

  useEffect(() => {
    void loadLots();
  }, [loadLots]);

  const filteredLots = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return lots;
    }

    return lots.filter((lot) =>
      [
        lot.group_name,
        lot.crop_name,
        lot.quality_grade || "",
        lot.location || "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [lots, search]);

  const totalQuantity = useMemo(
    () =>
      lots.reduce(
        (sum, lot) =>
          sum + Number(lot.aggregated_quantity_kg),
        0
      ),
    [lots]
  );

  function speakLot(lot: Lot) {
    if (
      typeof window === "undefined" ||
      !("speechSynthesis" in window)
    ) {
      setError(t("speechUnavailable"));
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(
      t("readBuyerLot", {
        group: lot.group_name,
        crop: lot.crop_name,
        quantity: numberText(
          lot.aggregated_quantity_kg,
          locale
        ),
        rate: money(
          lot.target_price_per_kg,
          locale
        ),
        location:
          lot.location || t("notAvailable"),
      })
    );

    utterance.lang = localeName(locale);
    window.speechSynthesis.speak(utterance);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f8f4]">
        <div className="flex items-center gap-3 rounded-2xl bg-white px-6 py-4 font-semibold text-slate-700 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-emerald-700" />
          {t("loading")}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f8f4] pb-16 text-slate-950">
      <style jsx global>{`
        .agriva-global-theme-toggle {
          display: none !important;
        }
      `}</style>

      <header className="sticky top-0 z-40 border-b border-emerald-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <button
            type="button"
            onClick={() => router.push("/dashboard/buyer")}
            className="flex items-center gap-3"
          >
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-700 text-white">
              <Users className="h-6 w-6" />
            </span>
            <span className="text-left">
              <span className="block text-lg font-black">
                {t("buyerTitle")}
              </span>
              <span className="block text-xs text-slate-500">
                {t("buyerSubtitle")}
              </span>
            </span>
          </button>

          <div className="flex items-center gap-2">
            <LanguageSelector />
            <button
              type="button"
              onClick={() => router.push("/dashboard/buyer")}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">
                {t("dashboard")}
              </span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6">
        <section className="rounded-[2rem] bg-emerald-800 p-6 text-white shadow-xl sm:p-10">
          <p className="text-xs font-black tracking-[0.22em] text-emerald-100">
            AGRIVA BULK MARKET LINK
          </p>
          <h1 className="mt-3 max-w-4xl text-3xl font-black sm:text-5xl">
            {t("buyerHero")}
          </h1>
          <p className="mt-4 max-w-3xl leading-7 text-emerald-50">
            {t("buyerHeroText")}
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Summary
              label={t("publishedLots")}
              value={numberText(lots.length, locale)}
            />
            <Summary
              label={t("publishedQuantity")}
              value={`${numberText(
                totalQuantity,
                locale
              )} kg`}
            />
          </div>
        </section>

        <section className="rounded-3xl border border-blue-200 bg-blue-50 p-5 text-sm leading-6 text-blue-950">
          <strong>{t("discoveryOnlyTitle")}</strong>{" "}
          {t("discoveryOnlyText")}
        </section>

        {error && (
          <section className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-800">
            {error}
          </section>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-full max-w-xl">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder={t("searchPlaceholder")}
              className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-12 pr-4 outline-none focus:border-emerald-500"
            />
          </div>

          <button
            type="button"
            onClick={() => void loadLots()}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold"
          >
            <RefreshCw className="h-4 w-4" />
            {t("refresh")}
          </button>
        </div>

        {filteredLots.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">
            {t("noPublishedLots")}
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredLots.map((lot) => (
              <article
                key={lot.id}
                className="rounded-[2rem] border border-emerald-100 bg-white p-6 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-emerald-700">
                      {t("publishedFpoLot")}
                    </p>
                    <h2 className="mt-1 text-2xl font-black">
                      {lot.crop_name}
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={() => speakLot(lot)}
                    className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200"
                    aria-label={t("listen")}
                  >
                    <Volume2 className="h-4 w-4" />
                  </button>
                </div>

                <p className="mt-3 flex items-center gap-2 text-sm font-bold text-slate-700">
                  <Users className="h-4 w-4 text-emerald-700" />
                  {lot.group_name}
                </p>

                <p className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                  <MapPin className="h-4 w-4" />
                  {lot.location || t("notAvailable")}
                </p>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <Info
                    icon={<Package className="h-4 w-4" />}
                    label={t("aggregatedQuantity")}
                    value={`${numberText(
                      lot.aggregated_quantity_kg,
                      locale
                    )} kg`}
                  />
                  <Info
                    icon={
                      <IndianRupee className="h-4 w-4" />
                    }
                    label={t("targetRate")}
                    value={`${money(
                      lot.target_price_per_kg,
                      locale
                    )}/kg`}
                  />
                  <Info
                    icon={<Package className="h-4 w-4" />}
                    label={t("quality")}
                    value={
                      lot.quality_grade ||
                      t("notAvailable")
                    }
                  />
                  <Info
                    icon={<Users className="h-4 w-4" />}
                    label={t("contributions")}
                    value={numberText(
                      lot.contribution_count,
                      locale
                    )}
                  />
                </div>

                <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-xs leading-5 text-slate-600">
                  {t("buyerLotSafety")}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function Summary({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-white/10 p-4">
      <p className="text-xs font-bold text-emerald-100">
        {label}
      </p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </div>
  );
}

function Info({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="flex items-center gap-2 text-xs font-bold text-slate-500">
        {icon}
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-black text-slate-900">
        {value}
      </p>
    </div>
  );
}
