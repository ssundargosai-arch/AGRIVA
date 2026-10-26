"use client";

import {
  ArrowLeft,
  BadgeIndianRupee,
  Calculator,
  History,
  Info,
  Loader2,
  Mic,
  RefreshCw,
  ShieldCheck,
  Sprout,
  TrendingUp,
  Truck,
  Volume2,
  Warehouse,
} from "lucide-react";
import {
  type FormEvent,
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

type Listing = {
  id: string;
  crop_id: string;
  crop: string;
  quantity_kg: number;
  quality_grade?: string | null;
  expected_price_per_kg: number;
  location?: string | null;
  status: string;
};

type Prediction = {
  id: string;
  crop_name: string;
  market_name: string;
  current_price_per_kg?: number | null;
  predicted_price_per_kg: number;
  expected_min_price?: number | null;
  expected_max_price?: number | null;
  confidence?: number | null;
  trend?: string | null;
  prediction_date: string;
};

type DecisionContext = {
  listing_id: string;
  crop_id: string;
  crop_name: string;
  listing_quantity_kg: number;
  listing_expected_price_per_kg: number;
  listing_quality_grade?: string | null;
  listing_location?: string | null;
  prediction_required: boolean;
  predictions: Prediction[];
};

type SaleDecision = {
  id: string;
  listing_id: string;
  prediction_id: string;
  crop_name: string;
  listing_location?: string | null;
  quantity_kg: number;
  holding_days: number;
  storage_cost_per_kg_per_day: number;
  storage_cost_total: number;
  transport_cost_now: number;
  transport_cost_later: number;
  expected_storage_loss_percent: number;
  other_holding_cost: number;
  storage_provider_name?: string | null;
  current_price_per_kg: number;
  current_price_source: string;
  future_price_per_kg: number;
  expected_min_price_per_kg?: number | null;
  expected_max_price_per_kg?: number | null;
  prediction_confidence?: number | null;
  prediction_trend?: string | null;
  quantity_after_loss_kg: number;
  sell_now_gross: number;
  sell_now_net: number;
  store_expected_gross: number;
  store_expected_net: number;
  store_min_net?: number | null;
  store_max_net?: number | null;
  expected_advantage: number;
  conservative_advantage?: number | null;
  break_even_future_price_per_kg: number;
  recommendation: string;
  recommendation_reason: string;
  mutates_listing: boolean;
  creates_order: boolean;
  creates_payment: boolean;
  price_guarantee: boolean;
  disclaimer: string;
  created_at: string;
};

type RecognitionEventLike = {
  results: ArrayLike<{
    0?: {
      transcript?: string;
    };
  }>;
};

type RecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult:
    | ((event: RecognitionEventLike) => void)
    | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type RecognitionConstructor =
  new () => RecognitionLike;

function localeName(locale: string) {
  return locale === "mr"
    ? "mr-IN"
    : locale === "hi"
      ? "hi-IN"
      : "en-IN";
}

function numberText(value: number, locale: string) {
  return new Intl.NumberFormat(
    localeName(locale),
    {
      maximumFractionDigits: 4,
    }
  ).format(value);
}

function money(value: number, locale: string) {
  return new Intl.NumberFormat(
    localeName(locale),
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }
  ).format(value);
}

function dateText(value: string, locale: string) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    localeName(locale),
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(parsed);
}

function errorText(
  body: unknown,
  fallback: string
) {
  if (
    body &&
    typeof body === "object" &&
    "detail" in body
  ) {
    const detail = (
      body as {detail?: unknown}
    ).detail;

    if (typeof detail === "string") {
      return detail;
    }

    if (
      detail &&
      typeof detail === "object" &&
      "message" in detail &&
      typeof (
        detail as {message?: unknown}
      ).message === "string"
    ) {
      return (
        detail as {message: string}
      ).message;
    }
  }

  return fallback;
}

function toLatinDigits(value: string) {
  const devanagari = "०१२३४५६७८९";

  return value.replace(
    /[०-९]/g,
    (digit) =>
      String(
        devanagari.indexOf(digit)
      )
  );
}

function spokenNumber(
  transcript: string,
  keywords: string[]
) {
  const normalized = toLatinDigits(
    transcript.toLowerCase()
  );

  for (const keyword of keywords) {
    const escaped = keyword.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

    const match = normalized.match(
      new RegExp(
        `${escaped}\\s*(?:is|है|आहे|=|:)?\\s*([0-9]+(?:[.,][0-9]+)?)`,
        "i"
      )
    );

    if (match?.[1]) {
      return match[1].replace(",", ".");
    }
  }

  return null;
}

function recommendationTone(
  recommendation: string
) {
  if (recommendation === "SELL_NOW") {
    return {
      outer:
        "!border-amber-300 !bg-amber-50",
      badge:
        "!bg-amber-800 !text-white",
      text:
        "!text-amber-950",
    };
  }

  if (recommendation === "STORE") {
    return {
      outer:
        "!border-emerald-300 !bg-emerald-50",
      badge:
        "!bg-emerald-800 !text-white",
      text:
        "!text-emerald-950",
    };
  }

  return {
    outer:
      "!border-blue-300 !bg-blue-50",
    badge:
      "!bg-blue-800 !text-white",
    text:
      "!text-blue-950",
  };
}

export default function SaleDecisionPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations(
    "sihSaleDecision"
  );

  const [listings, setListings] =
    useState<Listing[]>([]);
  const [context, setContext] =
    useState<DecisionContext | null>(null);
  const [historyRows, setHistoryRows] =
    useState<SaleDecision[]>([]);

  const [
    selectedListingId,
    setSelectedListingId,
  ] = useState("");
  const [
    selectedPredictionId,
    setSelectedPredictionId,
  ] = useState("");

  const [quantity, setQuantity] =
    useState("");
  const [holdingDays, setHoldingDays] =
    useState("14");
  const [storageRate, setStorageRate] =
    useState("");
  const [transportNow, setTransportNow] =
    useState("");
  const [
    transportLater,
    setTransportLater,
  ] = useState("");
  const [expectedLoss, setExpectedLoss] =
    useState("0");
  const [otherCost, setOtherCost] =
    useState("0");
  const [storageProvider, setStorageProvider] =
    useState("");

  const [loading, setLoading] =
    useState(true);
  const [
    contextLoading,
    setContextLoading,
  ] = useState(false);
  const [working, setWorking] =
    useState(false);
  const [listening, setListening] =
    useState(false);
  const [voiceTranscript, setVoiceTranscript] =
    useState("");
  const [error, setError] =
    useState("");
  const [result, setResult] =
    useState<SaleDecision | null>(null);

  const loadHistory = useCallback(
    async (
      headers: Record<string, string>
    ) => {
      const response = await fetch(
        `${API_URL}/api/sale-decision/history`,
        {
          headers,
          cache: "no-store",
        }
      );

      if (!response.ok) {
        return;
      }

      const body = await response
        .json()
        .catch(() => []);

      setHistoryRows(
        Array.isArray(body)
          ? body as SaleDecision[]
          : []
      );
    },
    []
  );

  const loadPage = useCallback(
    async () => {
      const token =
        localStorage.getItem(
          "access_token"
        );

      if (!token) {
        router.replace("/login");
        return;
      }

      setLoading(true);
      setError("");

      try {
        const headers = {
          Authorization:
            `Bearer ${token}`,
        };

        const [
          meResponse,
          listingsResponse,
        ] = await Promise.all([
          fetch(
            `${API_URL}/api/auth/me`,
            {
              headers,
              cache: "no-store",
            }
          ),
          fetch(
            `${API_URL}/api/marketplace/my-listings`,
            {
              headers,
              cache: "no-store",
            }
          ),
        ]);

        const me = await meResponse
          .json()
          .catch(() => null) as
            UserData | null;

        if (
          !meResponse.ok ||
          String(
            me?.role || ""
          ).toUpperCase() !==
            "FARMER"
        ) {
          throw new Error(
            t("farmerOnly")
          );
        }

        const listingBody =
          await listingsResponse
            .json()
            .catch(() => null);

        if (!listingsResponse.ok) {
          throw new Error(
            errorText(
              listingBody,
              t("loadError")
            )
          );
        }

        const activeListings = (
          listingBody as Listing[]
        ).filter(
          (item) =>
            item.status === "active" &&
            Number(
              item.quantity_kg
            ) > 0
        );

        setListings(activeListings);

        setSelectedListingId(
          (current) =>
            current ||
            activeListings[0]?.id ||
            ""
        );

        await loadHistory(
          headers
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
    },
    [loadHistory, router, t]
  );

  const loadContext = useCallback(
    async (listingId: string) => {
      const token =
        localStorage.getItem(
          "access_token"
        );

      if (!token) {
        router.replace("/login");
        return;
      }

      setContextLoading(true);
      setError("");
      setResult(null);

      try {
        const response = await fetch(
          `${API_URL}/api/sale-decision/context/${listingId}`,
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
            cache: "no-store",
          }
        );

        const body = await response
          .json()
          .catch(() => null);

        if (!response.ok) {
          throw new Error(
            errorText(
              body,
              t("contextError")
            )
          );
        }

        const next =
          body as DecisionContext;

        setContext(next);
        setQuantity(
          String(
            next.listing_quantity_kg
          )
        );
        setSelectedPredictionId(
          next.predictions[0]?.id ||
            ""
        );
      } catch (err) {
        setContext(null);
        setSelectedPredictionId("");
        setError(
          err instanceof Error
            ? err.message
            : t("contextError")
        );
      } finally {
        setContextLoading(false);
      }
    },
    [router, t]
  );

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  useEffect(() => {
    if (selectedListingId) {
      void loadContext(
        selectedListingId
      );
    }
  }, [
    selectedListingId,
    loadContext,
  ]);

  const selectedListing =
    useMemo(
      () =>
        listings.find(
          (item) =>
            item.id ===
            selectedListingId
        ) || null,
      [
        listings,
        selectedListingId,
      ]
    );

  const selectedPrediction =
    useMemo(
      () =>
        context?.predictions.find(
          (item) =>
            item.id ===
            selectedPredictionId
        ) || null,
      [
        context,
        selectedPredictionId,
      ]
    );

  const {
    visibleHistoryRows,
    hiddenLegacyCount,
  } = useMemo(() => {
    const visible: SaleDecision[] = [];
    let hidden = 0;

    for (const item of historyRows) {
      const listing = listings.find(
        (candidate) =>
          candidate.id === item.listing_id
      );

      if (
        !listing ||
        !Number.isFinite(
          listing.expected_price_per_kg
        ) ||
        listing.expected_price_per_kg <= 0
      ) {
        visible.push(item);
        continue;
      }

      const ask =
        listing.expected_price_per_kg;

      const currentRatio =
        item.current_price_per_kg /
        ask;

      const breakEvenRatio =
        item.break_even_future_price_per_kg /
        ask;

      const legacyUnitMismatch =
        Number.isFinite(currentRatio) &&
        Number.isFinite(breakEvenRatio) &&
        currentRatio >= 20 &&
        breakEvenRatio >= 20;

      if (legacyUnitMismatch) {
        hidden += 1;
        continue;
      }

      visible.push(item);
    }

    return {
      visibleHistoryRows: visible,
      hiddenLegacyCount: hidden,
    };
  }, [historyRows, listings]);

  async function evaluate(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const token =
      localStorage.getItem(
        "access_token"
      );

    if (
      !token ||
      !context ||
      !selectedPredictionId
    ) {
      setError(
        t("predictionRequired")
      );
      return;
    }

    if (
      storageRate.trim() === "" ||
      transportNow.trim() === "" ||
      transportLater.trim() === ""
    ) {
      setError(
        t("enterAssumptions")
      );
      return;
    }

    const numeric = {
      quantity: Number(quantity),
      holdingDays:
        Number(holdingDays),
      storageRate:
        Number(storageRate),
      transportNow:
        Number(transportNow),
      transportLater:
        Number(transportLater),
      expectedLoss:
        Number(expectedLoss),
      otherCost:
        Number(otherCost),
    };

    if (
      !Number.isFinite(
        numeric.quantity
      ) ||
      numeric.quantity <= 0 ||
      numeric.quantity >
        context.listing_quantity_kg ||
      !Number.isInteger(
        numeric.holdingDays
      ) ||
      numeric.holdingDays < 1 ||
      numeric.holdingDays > 365 ||
      !Number.isFinite(
        numeric.storageRate
      ) ||
      numeric.storageRate < 0 ||
      !Number.isFinite(
        numeric.transportNow
      ) ||
      numeric.transportNow < 0 ||
      !Number.isFinite(
        numeric.transportLater
      ) ||
      numeric.transportLater < 0 ||
      !Number.isFinite(
        numeric.expectedLoss
      ) ||
      numeric.expectedLoss < 0 ||
      numeric.expectedLoss > 50 ||
      !Number.isFinite(
        numeric.otherCost
      ) ||
      numeric.otherCost < 0
    ) {
      setError(
        t("invalidAssumptions")
      );
      return;
    }

    setWorking(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(
        `${API_URL}/api/sale-decision/evaluate`,
        {
          method: "POST",
          headers: {
            Authorization:
              `Bearer ${token}`,
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            listing_id:
              selectedListingId,
            prediction_id:
              selectedPredictionId,
            quantity_kg:
              numeric.quantity,
            holding_days:
              numeric.holdingDays,
            storage_cost_per_kg_per_day:
              numeric.storageRate,
            transport_cost_now:
              numeric.transportNow,
            transport_cost_later:
              numeric.transportLater,
            expected_storage_loss_percent:
              numeric.expectedLoss,
            other_holding_cost:
              numeric.otherCost,
            storage_provider_name:
              storageProvider.trim() ||
              null,
          }),
        }
      );

      const body = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          errorText(
            body,
            t("evaluateError")
          )
        );
      }

      const decision =
        body as SaleDecision;

      setResult(decision);

      const headers = {
        Authorization:
          `Bearer ${token}`,
      };
      await loadHistory(headers);

      window.setTimeout(() => {
        document
          .getElementById(
            "sale-decision-result"
          )
          ?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
      }, 50);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("evaluateError")
      );
    } finally {
      setWorking(false);
    }
  }

  function speakResult() {
    if (!result) {
      return;
    }

    if (
      typeof window ===
        "undefined" ||
      !(
        "speechSynthesis"
        in window
      )
    ) {
      setError(
        t("speechUnavailable")
      );
      return;
    }

    window.speechSynthesis.cancel();

    const utterance =
      new SpeechSynthesisUtterance(
        t("readResult", {
          crop:
            result.crop_name,
          recommendation:
            t(
              `recommendation.${result.recommendation}`
            ),
          sell:
            money(
              result.sell_now_net,
              locale
            ),
          store:
            money(
              result.store_expected_net,
              locale
            ),
          breakEven:
            money(
              result.break_even_future_price_per_kg,
              locale
            ),
        })
      );

    utterance.lang =
      localeName(locale);

    window.speechSynthesis.speak(
      utterance
    );
  }

  function startVoicePrefill() {
    if (
      typeof window ===
        "undefined"
    ) {
      return;
    }

    const speechWindow =
      window as Window & {
        webkitSpeechRecognition?:
          RecognitionConstructor;
        SpeechRecognition?:
          RecognitionConstructor;
      };

    const Recognition =
      speechWindow
        .SpeechRecognition ||
      speechWindow
        .webkitSpeechRecognition;

    if (!Recognition) {
      setError(
        t("speechUnavailable")
      );
      return;
    }

    const recognition =
      new Recognition();

    recognition.lang =
      localeName(locale);
    recognition.interimResults =
      false;
    recognition.continuous =
      false;

    recognition.onresult = (
      event
    ) => {
      const transcript =
        event.results[0]?.[0]
          ?.transcript || "";

      setVoiceTranscript(
        transcript
      );

      const parsed = {
        quantity: spokenNumber(
          transcript,
          [
            "quantity",
            "मात्रा",
            "प्रमाण",
          ]
        ),
        days: spokenNumber(
          transcript,
          [
            "days",
            "day",
            "दिन",
            "दिवस",
          ]
        ),
        storage: spokenNumber(
          transcript,
          [
            "storage",
            "भंडारण",
            "साठवण",
          ]
        ),
        now: spokenNumber(
          transcript,
          [
            "transport now",
            "अभी परिवहन",
            "आता वाहतूक",
          ]
        ),
        later: spokenNumber(
          transcript,
          [
            "transport later",
            "बाद परिवहन",
            "नंतर वाहतूक",
          ]
        ),
        loss: spokenNumber(
          transcript,
          [
            "loss",
            "हानि",
            "नुकसान",
          ]
        ),
      };

      if (parsed.quantity) {
        setQuantity(
          parsed.quantity
        );
      }
      if (parsed.days) {
        setHoldingDays(
          parsed.days
        );
      }
      if (parsed.storage) {
        setStorageRate(
          parsed.storage
        );
      }
      if (parsed.now) {
        setTransportNow(
          parsed.now
        );
      }
      if (parsed.later) {
        setTransportLater(
          parsed.later
        );
      }
      if (parsed.loss) {
        setExpectedLoss(
          parsed.loss
        );
      }
    };

    recognition.onerror = () => {
      setError(
        t("voiceError")
      );
    };

    recognition.onend = () => {
      setListening(false);
    };

    setError("");
    setListening(true);
    recognition.start();
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
    <main className="min-h-screen bg-[#f5f8f4] pb-24 text-slate-950">
      <style jsx global>{`
        .agriva-global-theme-toggle {
          display: none !important;
        }
      `}</style>

      <header className="sticky top-0 z-40 border-b border-emerald-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <button
            type="button"
            onClick={() =>
              router.push(
                "/dashboard/farmer"
              )
            }
            className="flex items-center gap-3"
          >
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-700 text-white">
              <Calculator className="h-6 w-6" />
            </span>

            <span className="text-left">
              <span className="block text-lg font-black">
                {t("title")}
              </span>
              <span className="block text-xs text-slate-500">
                {t("subtitle")}
              </span>
            </span>
          </button>

          <div className="flex items-center gap-2">
            <LanguageSelector />

            <button
              type="button"
              onClick={() =>
                void loadPage()
              }
              aria-label={t("refresh")}
              className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm"
            >
              <RefreshCw className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/dashboard/farmer"
                )
              }
              className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold sm:flex"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("dashboard")}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-700 p-6 text-white shadow-lg sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em]">
                <Sprout className="h-4 w-4" />
                {t("phase")}
              </div>

              <h1 className="mt-4 max-w-3xl text-3xl font-black leading-tight sm:text-4xl">
                {t("hero")}
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-emerald-50 sm:text-base">
                {t("heroText")}
              </p>
            </div>

            <div className="rounded-2xl bg-white/12 p-4 text-sm leading-6 backdrop-blur">
              <div className="flex gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
                <p>
                  <strong>
                    {t("decisionOnlyTitle")}
                  </strong>{" "}
                  {t("decisionOnlyText")}
                </p>
              </div>
            </div>
          </div>
        </section>

        {error && (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800"
          >
            {error}
          </div>
        )}

        {listings.length === 0 ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black">
              {t("noListings")}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {t("noListingsText")}
            </p>
            <button
              type="button"
              onClick={() =>
                router.push(
                  "/dashboard/farmer/sell"
                )
              }
              className="mt-4 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-black text-white"
            >
              {t("createListing")}
            </button>
          </section>
        ) : (
          <>
            <section className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
                <label className="text-sm font-black text-slate-800">
                  {t("selectListing")}
                </label>

                <select
                  value={selectedListingId}
                  onChange={(event) =>
                    setSelectedListingId(
                      event.target.value
                    )
                  }
                  className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-600"
                >
                  {listings.map(
                    (listing) => (
                      <option
                        key={listing.id}
                        value={listing.id}
                      >
                        {listing.crop} ·{" "}
                        {numberText(
                          listing.quantity_kg,
                          locale
                        )}{" "}
                        kg ·{" "}
                        {money(
                          listing.expected_price_per_kg,
                          locale
                        )}
                        /kg
                      </option>
                    )
                  )}
                </select>

                {selectedListing && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <MiniStat
                      label={t("availableQuantity")}
                      value={`${numberText(
                        selectedListing.quantity_kg,
                        locale
                      )} kg`}
                    />
                    <MiniStat
                      label={t("listingAsk")}
                      value={`${money(
                        selectedListing.expected_price_per_kg,
                        locale
                      )}/kg`}
                    />
                    <MiniStat
                      label={t("quality")}
                      value={
                        selectedListing.quality_grade ||
                        t("notAvailable")
                      }
                    />
                  </div>
                )}
              </div>

              <div className="rounded-3xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
                <div className="flex items-center gap-2 font-black text-blue-950">
                  <Info className="h-5 w-5" />
                  {t("assumptionsTitle")}
                </div>
                <p className="mt-2 text-sm leading-6 text-blue-900">
                  {t("assumptionsText")}
                </p>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black">
                    {t("predictionTitle")}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {t("predictionText")}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/dashboard/farmer/price"
                    )
                  }
                  className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-black text-emerald-800"
                >
                  <TrendingUp className="h-4 w-4" />
                  {t("openPricePrediction")}
                </button>
              </div>

              {contextLoading ? (
                <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-slate-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("loadingPrediction")}
                </div>
              ) : context?.predictions.length ? (
                <div className="mt-5 grid gap-3 lg:grid-cols-2">
                  {context.predictions.map(
                    (prediction) => {
                      const selected =
                        prediction.id ===
                        selectedPredictionId;

                      return (
                        <button
                          key={prediction.id}
                          type="button"
                          onClick={() => {
                            setSelectedPredictionId(
                              prediction.id
                            );
                            setResult(null);
                          }}
                          className={`rounded-2xl border p-4 text-left transition ${
                            selected
                              ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-100"
                              : "border-slate-200 bg-white hover:border-emerald-200"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-black">
                                {prediction.market_name}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {dateText(
                                  prediction.prediction_date,
                                  locale
                                )}
                              </p>
                            </div>

                            <span className="rounded-full !bg-slate-800 px-2.5 py-1 text-xs font-black !text-white shadow-sm">
                              {prediction.trend ||
                                t("notAvailable")}
                            </span>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-3">
                            <MiniStat
                              label={t("currentPrice")}
                              value={
                                prediction.current_price_per_kg !=
                                null
                                  ? `${money(
                                      prediction.current_price_per_kg,
                                      locale
                                    )}/kg`
                                  : t("notAvailable")
                              }
                            />
                            <MiniStat
                              label={t("futurePrice")}
                              value={`${money(
                                prediction.predicted_price_per_kg,
                                locale
                              )}/kg`}
                            />
                          </div>
                        </button>
                      );
                    }
                  )}
                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="font-black text-amber-950">
                    {t("noPrediction")}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-amber-900">
                    {t("noPredictionText")}
                  </p>
                </div>
              )}
            </section>

            <form
              onSubmit={evaluate}
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black">
                    {t("scenarioTitle")}
                  </h2>
                  <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                    {t("scenarioText")}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={startVoicePrefill}
                  disabled={listening}
                  className="flex min-h-11 items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-black text-violet-800 disabled:opacity-60"
                >
                  {listening ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                  {listening
                    ? t("listening")
                    : t("voicePrefill")}
                </button>
              </div>

              {voiceTranscript && (
                <div className="mt-4 rounded-2xl bg-violet-50 px-4 py-3 text-sm text-violet-900">
                  <strong>
                    {t("heard")}
                  </strong>{" "}
                  {voiceTranscript}
                </div>
              )}

              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field
                  label={t("quantity")}
                  suffix="kg"
                  value={quantity}
                  onChange={setQuantity}
                  min="0"
                  step="0.01"
                />
                <Field
                  label={t("holdingDays")}
                  suffix={t("days")}
                  value={holdingDays}
                  onChange={setHoldingDays}
                  min="1"
                  max="365"
                  step="1"
                />
                <Field
                  label={t("storageRate")}
                  suffix={t("perKgPerDay")}
                  value={storageRate}
                  onChange={setStorageRate}
                  min="0"
                  step="0.01"
                  placeholder={t("enterValue")}
                />
                <Field
                  label={t("transportNow")}
                  suffix="₹"
                  value={transportNow}
                  onChange={setTransportNow}
                  min="0"
                  step="0.01"
                  placeholder={t("enterValue")}
                />
                <Field
                  label={t("transportLater")}
                  suffix="₹"
                  value={transportLater}
                  onChange={setTransportLater}
                  min="0"
                  step="0.01"
                  placeholder={t("enterValue")}
                />
                <Field
                  label={t("expectedLoss")}
                  suffix="%"
                  value={expectedLoss}
                  onChange={setExpectedLoss}
                  min="0"
                  max="50"
                  step="0.1"
                />
                <Field
                  label={t("otherCost")}
                  suffix="₹"
                  value={otherCost}
                  onChange={setOtherCost}
                  min="0"
                  step="0.01"
                />

                <label className="sm:col-span-2">
                  <span className="text-sm font-black text-slate-800">
                    {t("storageProvider")}
                  </span>
                  <input
                    type="text"
                    value={storageProvider}
                    onChange={(event) =>
                      setStorageProvider(
                        event.target.value
                      )
                    }
                    maxLength={200}
                    placeholder={t("optional")}
                    className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-emerald-600"
                  />
                </label>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={
                    working ||
                    !selectedPrediction
                  }
                  className="flex min-h-12 items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-black text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {working ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Calculator className="h-4 w-4" />
                  )}
                  {working
                    ? t("comparing")
                    : t("compare")}
                </button>

                <p className="text-xs leading-5 text-slate-500">
                  {t("noTransaction")}
                </p>
              </div>
            </form>
          </>
        )}

        {result && (
          <section
            id="sale-decision-result"
            className="scroll-mt-24 space-y-5"
          >
            {(() => {
              const tone =
                recommendationTone(
                  result.recommendation
                );

              return (
                <div
                  className={`rounded-3xl border p-5 shadow-sm sm:p-6 ${tone.outer}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.12em] ${tone.badge}`}
                      >
                        {t(
                          `recommendation.${result.recommendation}`
                        )}
                      </span>

                      <h2
                        className={`mt-3 text-2xl font-black ${tone.text}`}
                      >
                        {t("resultTitle", {
                          crop:
                            result.crop_name,
                        })}
                      </h2>

                      <p
                        className={`mt-2 max-w-3xl text-sm leading-6 ${tone.text}`}
                      >
                        {result.recommendation_reason}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={speakResult}
                      className="flex items-center gap-2 rounded-xl border border-white/70 bg-white/80 px-4 py-2.5 text-sm font-black text-slate-800"
                    >
                      <Volume2 className="h-4 w-4" />
                      {t("readResultButton")}
                    </button>
                  </div>
                </div>
              );
            })()}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <ResultCard
                icon={
                  <BadgeIndianRupee className="h-5 w-5" />
                }
                label={t("sellNowNet")}
                value={money(
                  result.sell_now_net,
                  locale
                )}
                hint={`${money(
                  result.current_price_per_kg,
                  locale
                )}/kg`}
              />
              <ResultCard
                icon={
                  <Warehouse className="h-5 w-5" />
                }
                label={t("storeExpectedNet")}
                value={money(
                  result.store_expected_net,
                  locale
                )}
                hint={`${money(
                  result.future_price_per_kg,
                  locale
                )}/kg`}
              />
              <ResultCard
                icon={
                  <TrendingUp className="h-5 w-5" />
                }
                label={t("expectedAdvantage")}
                value={money(
                  result.expected_advantage,
                  locale
                )}
                hint={t("vsSellNow")}
              />
              <ResultCard
                icon={
                  <Calculator className="h-5 w-5" />
                }
                label={t("breakEven")}
                value={`${money(
                  result.break_even_future_price_per_kg,
                  locale
                )}/kg`}
                hint={t("breakEvenHint")}
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="font-black">
                  {t("rangeTitle")}
                </h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <MiniStat
                    label={t("lowerFuturePrice")}
                    value={
                      result.expected_min_price_per_kg !=
                      null
                        ? `${money(
                            result.expected_min_price_per_kg,
                            locale
                          )}/kg`
                        : t("notAvailable")
                    }
                  />
                  <MiniStat
                    label={t("upperFuturePrice")}
                    value={
                      result.expected_max_price_per_kg !=
                      null
                        ? `${money(
                            result.expected_max_price_per_kg,
                            locale
                          )}/kg`
                        : t("notAvailable")
                    }
                  />
                  <MiniStat
                    label={t("lowerStoreNet")}
                    value={
                      result.store_min_net !=
                      null
                        ? money(
                            result.store_min_net,
                            locale
                          )
                        : t("notAvailable")
                    }
                  />
                  <MiniStat
                    label={t("upperStoreNet")}
                    value={
                      result.store_max_net !=
                      null
                        ? money(
                            result.store_max_net,
                            locale
                          )
                        : t("notAvailable")
                    }
                  />
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="font-black">
                  {t("costTitle")}
                </h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <MiniStat
                    label={t("storageTotal")}
                    value={money(
                      result.storage_cost_total,
                      locale
                    )}
                  />
                  <MiniStat
                    label={t("transportNow")}
                    value={money(
                      result.transport_cost_now,
                      locale
                    )}
                  />
                  <MiniStat
                    label={t("transportLater")}
                    value={money(
                      result.transport_cost_later,
                      locale
                    )}
                  />
                  <MiniStat
                    label={t("quantityAfterLoss")}
                    value={`${numberText(
                      result.quantity_after_loss_kg,
                      locale
                    )} kg`}
                  />
                </div>
              </section>
            </div>

            <div className="rounded-2xl !border-emerald-300 !bg-emerald-50 p-4">
              <div className="flex gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                <div>
                  <p className="font-black !text-emerald-950">
                    {t("safetyTitle")}
                  </p>
                  <p className="mt-1 text-sm leading-6 !text-emerald-950">
                    {result.disclaimer}
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-slate-700" />
            <h2 className="text-xl font-black">
              {t("historyTitle")}
            </h2>
          </div>

          {hiddenLegacyCount > 0 && (
            <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-950">
              {t("legacyHidden", {
                count: hiddenLegacyCount,
              })}
            </div>
          )}

          {visibleHistoryRows.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600">
              {t("noHistory")}
            </p>
          ) : (
            <div className="mt-4 grid gap-3">
              {visibleHistoryRows
                .slice(0, 8)
                .map((item) => (
                  <article
                    key={item.id}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-black">
                          {item.crop_name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {dateText(
                            item.created_at,
                            locale
                          )}
                        </p>
                      </div>

                      <span className="rounded-full !bg-slate-800 px-2.5 py-1 text-xs font-black !text-white shadow-sm">
                        {t(
                          `recommendation.${item.recommendation}`
                        )}
                      </span>
                    </div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      <MiniStat
                        label={t("sellNowNet")}
                        value={money(
                          item.sell_now_net,
                          locale
                        )}
                      />
                      <MiniStat
                        label={t("storeExpectedNet")}
                        value={money(
                          item.store_expected_net,
                          locale
                        )}
                      />
                      <MiniStat
                        label={t("breakEven")}
                        value={`${money(
                          item.break_even_future_price_per_kg,
                          locale
                        )}/kg`}
                      />
                    </div>
                  </article>
                ))}
            </div>
          )}
        </section>

        <section className="rounded-3xl !border-slate-800 !bg-slate-950 p-5 !text-white shadow-lg">
          <div className="grid gap-4 sm:grid-cols-3">
            <SafetyItem
              icon={<Warehouse className="h-5 w-5" />}
              title={t("farmerInput")}
              text={t("farmerInputText")}
            />
            <SafetyItem
              icon={<Truck className="h-5 w-5" />}
              title={t("noAutoBooking")}
              text={t("noAutoBookingText")}
            />
            <SafetyItem
              icon={<ShieldCheck className="h-5 w-5" />}
              title={t("noGuarantee")}
              text={t("noGuaranteeText")}
            />
          </div>
        </section>
      </div>
    </main>
  );
}

function Field({
  label,
  suffix,
  value,
  onChange,
  min,
  max,
  step,
  placeholder,
}: {
  label: string;
  suffix: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  step?: string;
  placeholder?: string;
}) {
  return (
    <label>
      <span className="text-sm font-black text-slate-800">
        {label}
      </span>

      <div className="mt-2 flex min-h-12 overflow-hidden rounded-xl border border-slate-300 bg-white focus-within:border-emerald-600">
        <input
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          value={value}
          placeholder={placeholder}
          onChange={(event) =>
            onChange(
              event.target.value
            )
          }
          className="min-w-0 flex-1 bg-transparent px-3 text-sm font-semibold outline-none"
        />
        <span className="grid place-items-center border-l border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-500">
          {suffix}
        </span>
      </div>
    </label>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-xs font-bold !text-slate-600">
        {label}
      </p>
      <p className="mt-1 font-black !text-slate-950">
        {value}
      </p>
    </div>
  );
}

function ResultCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-emerald-700">
        {icon}
        <span className="text-xs font-black uppercase tracking-[0.08em]">
          {label}
        </span>
      </div>
      <p className="mt-3 text-2xl font-black">
        {value}
      </p>
      <p className="mt-1 text-xs text-slate-500">
        {hint}
      </p>
    </div>
  );
}

function SafetyItem({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl !bg-slate-800 p-4 ring-1 ring-white/10">
      <div className="flex items-center gap-2 font-black">
        {icon}
        {title}
      </div>
      <p className="mt-2 text-sm leading-6 !text-slate-200">
        {text}
      </p>
    </div>
  );
}
