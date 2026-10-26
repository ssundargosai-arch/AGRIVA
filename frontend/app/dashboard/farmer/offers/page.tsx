"use client";

import {
  ArrowLeft,
  BadgeIndianRupee,
  CheckCircle2,
  ChevronRight,
  Loader2,
  MessageSquareText,
  Moon,
  RefreshCw,
  Sprout,
  Sun,
  Volume2,
  Users,
  XCircle,
} from "lucide-react";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {useRouter} from "next/navigation";
import {
  useLocale,
  useTranslations,
} from "next-intl";

import LanguageSelector from "@/components/LanguageSelector";
import {useTheme} from "@/app/components/ThemeProvider";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000"
).replace(/\/$/, "");

type Offer = {
  id: string;
  listing_id: string;
  buyer_id: string;
  buyer_business_name: string;
  crop: string;
  listing_location?: string | null;
  quantity_kg: number;
  listing_expected_price_per_kg: number;
  offer_price_per_kg: number;
  counter_price_per_kg?: number | null;
  effective_price_per_kg: number;
  total_amount: number;
  price_difference_per_kg: number;
  status: string;
  message?: string | null;
  counter_message?: string | null;
  order_id?: string | null;
  created_at: string;
  updated_at: string;
};

type UserData = {
  role?: string;
};

function formatLocale(locale: string) {
  return locale === "mr"
    ? "mr-IN"
    : locale === "hi"
      ? "hi-IN"
      : "en-IN";
}

function money(value: number, locale: string) {
  return new Intl.NumberFormat(
    formatLocale(locale),
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }
  ).format(value);
}

function numberText(value: number, locale: string) {
  return new Intl.NumberFormat(
    formatLocale(locale),
    {
      maximumFractionDigits: 2,
    }
  ).format(value);
}

export default function FarmerOffersPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("sihOffers");
  const fpo = useTranslations("sihFpo");
  const saleDecision = useTranslations("sihSaleDecision");
  const {theme, toggleTheme} = useTheme();

  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [countering, setCountering] =
    useState<Offer | null>(null);
  const [counterRate, setCounterRate] =
    useState("");
  const [counterMessage, setCounterMessage] =
    useState("");

  const loadOffers = useCallback(async () => {
    const token =
      localStorage.getItem("access_token");

    if (!token) {
      router.replace("/login");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const meResponse = await fetch(
        `${API_URL}/api/auth/me`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }
      );

      const me = await meResponse
        .json()
        .catch(() => null) as UserData | null;

      if (
        !meResponse.ok ||
        String(me?.role || "").toUpperCase()
          !== "FARMER"
      ) {
        throw new Error(t("farmerOnly"));
      }

      const response = await fetch(
        `${API_URL}/api/offers/farmer/received`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }
      );

      const body = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          body?.detail ||
          t("loadError")
        );
      }

      setOffers(body as Offer[]);
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
    void loadOffers();
  }, [loadOffers]);

  const pendingCount = useMemo(
    () =>
      offers.filter(
        (offer) =>
          offer.status === "pending"
      ).length,
    [offers]
  );

  const bestOpenOffer = useMemo(() => {
    const open = offers.filter(
      (offer) =>
        offer.status === "pending"
    );

    if (open.length === 0) {
      return null;
    }

    return [...open].sort(
      (a, b) =>
        b.offer_price_per_kg -
        a.offer_price_per_kg
    )[0];
  }, [offers]);

  async function farmerAction(
    offer: Offer,
    action: "accept" | "reject"
  ) {
    const token =
      localStorage.getItem("access_token");

    if (!token) {
      router.replace("/login");
      return;
    }

    const confirmed = window.confirm(
      action === "accept"
        ? t("farmerAcceptConfirm", {
            buyer:
              offer.buyer_business_name,
            crop: offer.crop,
            quantity: numberText(
              offer.quantity_kg,
              locale
            ),
            rate: money(
              offer.offer_price_per_kg,
              locale
            ),
            total: money(
              offer.total_amount,
              locale
            ),
          })
        : t("farmerRejectConfirm", {
            buyer:
              offer.buyer_business_name,
            crop: offer.crop,
          })
    );

    if (!confirmed) {
      return;
    }

    setWorkingId(offer.id);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `${API_URL}/api/offers/${offer.id}/${action}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const body = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          body?.detail ||
          t("actionError")
        );
      }

      setSuccess(
        action === "accept"
          ? t("farmerAccepted")
          : t("farmerRejected")
      );

      await loadOffers();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("actionError")
      );
    } finally {
      setWorkingId("");
    }
  }

  function openCounter(offer: Offer) {
    setCountering(offer);
    setCounterRate(
      String(
        offer.listing_expected_price_per_kg
      )
    );
    setCounterMessage("");
    setError("");
    setSuccess("");

    window.setTimeout(() => {
      document
        .getElementById(
          "counter-offer-form"
        )
        ?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
    }, 50);
  }

  async function submitCounter(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const token =
      localStorage.getItem("access_token");

    if (!token || !countering) {
      router.replace("/login");
      return;
    }

    const price = Number(counterRate);

    if (
      !Number.isFinite(price) ||
      price <= 0
    ) {
      setError(t("invalidPrice"));
      return;
    }

    const total =
      countering.quantity_kg * price;

    const confirmed = window.confirm(
      t("counterConfirm", {
        buyer:
          countering.buyer_business_name,
        crop: countering.crop,
        rate: money(price, locale),
        total: money(total, locale),
      })
    );

    if (!confirmed) {
      return;
    }

    setWorkingId(countering.id);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `${API_URL}/api/offers/${countering.id}/counter`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            counter_price_per_kg:
              price,
            message:
              counterMessage.trim() ||
              null,
          }),
        }
      );

      const body = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          body?.detail ||
          t("actionError")
        );
      }

      setCountering(null);
      setCounterMessage("");
      setSuccess(t("counterSent"));
      await loadOffers();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("actionError")
      );
    } finally {
      setWorkingId("");
    }
  }

  function speakOffer(offer: Offer) {
    if (
      typeof window === "undefined" ||
      !("speechSynthesis" in window)
    ) {
      setError(t("speechUnavailable"));
      return;
    }

    window.speechSynthesis.cancel();

    const text = t("readFarmerOffer", {
      buyer:
        offer.buyer_business_name,
      crop: offer.crop,
      quantity: numberText(
        offer.quantity_kg,
        locale
      ),
      rate: money(
        offer.offer_price_per_kg,
        locale
      ),
      total: money(
        offer.total_amount,
        locale
      ),
    });

    const utterance =
      new SpeechSynthesisUtterance(text);

    utterance.lang =
      locale === "mr"
        ? "mr-IN"
        : locale === "hi"
          ? "hi-IN"
          : "en-IN";

    window.speechSynthesis.speak(
      utterance
    );
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
            onClick={() =>
              router.push(
                "/dashboard/farmer"
              )
            }
            className="flex items-center gap-3"
          >
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-700 text-white shadow-sm">
              <Sprout className="h-6 w-6" />
            </span>
            <span className="text-left">
              <span className="block text-lg font-black">
                {t("farmerTitle")}
              </span>
              <span className="block text-xs text-slate-500">
                {t("farmerSubtitle")}
              </span>
            </span>
          </button>

          <div className="flex items-center gap-2">
            <LanguageSelector />

            <button
              type="button"
              onClick={() =>
                router.push("/dashboard/farmer/fpo")
              }
              className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-black text-emerald-800"
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">
                {fpo("navFarmer")}
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                router.push("/dashboard/farmer/sale-decision")
              }
              className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm font-black text-amber-900"
            >
              <BadgeIndianRupee className="h-4 w-4" />
              <span className="hidden md:inline">
                {saleDecision("navShort")}
              </span>
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={t("toggleTheme")}
              className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm"
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
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

      <div className="mx-auto max-w-7xl space-y-7 px-4 py-8 sm:px-6">
        <section className="rounded-[2rem] bg-emerald-800 p-6 text-white shadow-xl sm:p-10">
          <p className="text-xs font-black tracking-[0.22em] text-emerald-100">
            AGRIVA MARKET LINK
          </p>
          <h1 className="mt-3 max-w-4xl text-3xl font-black sm:text-5xl">
            {t("farmerHero")}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-emerald-50 sm:text-lg">
            {t("farmerHeroText")}
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Summary
              label={t("totalOffers")}
              value={numberText(
                offers.length,
                locale
              )}
            />
            <Summary
              label={t("pendingOffers")}
              value={numberText(
                pendingCount,
                locale
              )}
            />
            <Summary
              label={t("bestOpenRate")}
              value={
                bestOpenOffer
                  ? money(
                      bestOpenOffer
                        .offer_price_per_kg,
                      locale
                    )
                  : "—"
              }
            />
          </div>
        </section>

        {(error || success) && (
          <section
            className={`rounded-2xl border px-5 py-4 text-sm font-semibold ${
              error
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}
          >
            {error || success}
          </section>
        )}

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black">
              {t("offersReceived")}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {t("compareText")}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              void loadOffers()
            }
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold"
          >
            <RefreshCw className="h-4 w-4" />
            {t("refresh")}
          </button>
        </div>

        {offers.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <MessageSquareText className="mx-auto h-10 w-10 text-slate-400" />
            <h3 className="mt-4 text-xl font-black">
              {t("noFarmerOffers")}
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              {t("noFarmerOffersText")}
            </p>
          </section>
        ) : (
          <div className="space-y-5">
            {offers.map((offer) => {
              const difference =
                offer.offer_price_per_kg -
                offer.listing_expected_price_per_kg;

              return (
                <article
                  key={offer.id}
                  className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-2xl font-black">
                          {offer.crop}
                        </h3>
                        <StatusBadge
                          label={t(
                            `status.${offer.status}`
                          )}
                          status={offer.status}
                        />
                      </div>

                      <p className="mt-2 text-sm text-slate-600">
                        {t("buyer")}:{" "}
                        <strong>
                          {
                            offer.buyer_business_name
                          }
                        </strong>
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        {offer.listing_location ||
                          t("notAvailable")}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        speakOffer(offer)
                      }
                      className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold"
                    >
                      <Volume2 className="h-4 w-4" />
                      {t("listen")}
                    </button>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    <Metric
                      label={t("quantity")}
                      value={`${numberText(
                        offer.quantity_kg,
                        locale
                      )} kg`}
                    />
                    <Metric
                      label={t(
                        "farmerExpectedRate"
                      )}
                      value={money(
                        offer.listing_expected_price_per_kg,
                        locale
                      )}
                    />
                    <Metric
                      label={t("buyerOfferRate")}
                      value={money(
                        offer.offer_price_per_kg,
                        locale
                      )}
                    />
                    <Metric
                      label={t("difference")}
                      value={`${difference >= 0 ? "+" : ""}${money(
                        difference,
                        locale
                      )}`}
                      good={difference >= 0}
                      bad={difference < 0}
                    />
                    <Metric
                      label={t("estimatedTotal")}
                      value={money(
                        offer.total_amount,
                        locale
                      )}
                    />
                  </div>

                  {offer.message && (
                    <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                      <strong>
                        {t("buyerMessage")}:
                      </strong>{" "}
                      {offer.message}
                    </div>
                  )}

                  {offer.counter_price_per_kg && (
                    <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
                      <strong>
                        {t("yourCounter")}:
                      </strong>{" "}
                      {money(
                        offer.counter_price_per_kg,
                        locale
                      )}
                      /kg
                      {offer.counter_message
                        ? ` — ${offer.counter_message}`
                        : ""}
                    </div>
                  )}

                  {offer.status === "pending" && (
                    <div className="mt-6 grid gap-3 sm:grid-cols-3">
                      <button
                        type="button"
                        disabled={
                          workingId === offer.id
                        }
                        onClick={() =>
                          void farmerAction(
                            offer,
                            "accept"
                          )
                        }
                        className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-5 py-3.5 font-black text-white disabled:opacity-60"
                      >
                        <CheckCircle2 className="h-5 w-5" />
                        {t("acceptOffer")}
                      </button>

                      <button
                        type="button"
                        disabled={
                          workingId === offer.id
                        }
                        onClick={() =>
                          openCounter(offer)
                        }
                        className="flex items-center justify-center gap-2 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-3.5 font-black text-amber-900 disabled:opacity-60"
                      >
                        <BadgeIndianRupee className="h-5 w-5" />
                        {t("counterOffer")}
                      </button>

                      <button
                        type="button"
                        disabled={
                          workingId === offer.id
                        }
                        onClick={() =>
                          void farmerAction(
                            offer,
                            "reject"
                          )
                        }
                        className="flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-5 py-3.5 font-black text-red-700 disabled:opacity-60"
                      >
                        <XCircle className="h-5 w-5" />
                        {t("rejectOffer")}
                      </button>
                    </div>
                  )}

                  {offer.status ===
                    "countered" && (
                    <p className="mt-5 rounded-2xl bg-blue-50 p-4 text-sm font-semibold text-blue-800">
                      {t("waitingBuyer")}
                    </p>
                  )}

                  {offer.order_id && (
                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          "/dashboard/farmer/transactions"
                        )
                      }
                      className="mt-5 flex items-center gap-2 font-black text-emerald-700"
                    >
                      {t("viewTransaction")}
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {countering && (
          <section
            id="counter-offer-form"
            className="scroll-mt-28 rounded-[2rem] border border-amber-200 bg-white p-6 shadow-sm sm:p-8"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-amber-700">
                  {t("counterOffer")}
                </p>
                <h2 className="mt-2 text-3xl font-black">
                  {countering.crop}
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  {t("buyer")}:{" "}
                  {
                    countering.buyer_business_name
                  }
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setCountering(null)
                }
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold"
              >
                {t("close")}
              </button>
            </div>

            <form
              onSubmit={submitCounter}
              className="mt-6 grid gap-5 md:grid-cols-2"
            >
              <label>
                <span className="mb-2 block text-sm font-black">
                  {t("counterRate")}
                </span>
                <input
                  value={counterRate}
                  onChange={(event) =>
                    setCounterRate(
                      event.target.value
                    )
                  }
                  inputMode="decimal"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-amber-500"
                />
              </label>

              <div className="rounded-2xl bg-amber-50 p-4">
                <p className="text-xs font-bold text-amber-800">
                  {t("counterTotal")}
                </p>
                <p className="mt-2 text-2xl font-black text-amber-950">
                  {money(
                    countering.quantity_kg *
                      (Number(
                        counterRate
                      ) || 0),
                    locale
                  )}
                </p>
              </div>

              <label className="md:col-span-2">
                <span className="mb-2 block text-sm font-black">
                  {t("messageOptional")}
                </span>
                <textarea
                  value={counterMessage}
                  onChange={(event) =>
                    setCounterMessage(
                      event.target.value
                    )
                  }
                  maxLength={500}
                  rows={3}
                  className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-amber-500"
                  placeholder={t(
                    "counterMessagePlaceholder"
                  )}
                />
              </label>

              <button
                type="submit"
                disabled={
                  workingId ===
                  countering.id
                }
                className="md:col-span-2 flex items-center justify-center gap-2 rounded-2xl bg-amber-600 px-5 py-4 font-black text-white disabled:opacity-60"
              >
                {workingId ===
                countering.id ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <BadgeIndianRupee className="h-5 w-5" />
                )}
                {t("confirmCounter")}
              </button>
            </form>

            <p className="mt-4 text-xs leading-5 text-slate-500">
              {t("counterSafety")}
            </p>
          </section>
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
      <p className="mt-1 text-2xl font-black">
        {value}
      </p>
    </div>
  );
}

function Metric({
  label,
  value,
  good = false,
  bad = false,
}: {
  label: string;
  value: string;
  good?: boolean;
  bad?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-bold text-slate-500">
        {label}
      </p>
      <p
        className={`mt-2 text-lg font-black ${
          good
            ? "text-emerald-700"
            : bad
              ? "text-red-700"
              : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function StatusBadge({
  status,
  label,
}: {
  status: string;
  label: string;
}) {
  const className =
    status === "accepted"
      ? "bg-emerald-100 text-emerald-800"
      : status === "countered"
        ? "bg-amber-100 text-amber-800"
        : status === "rejected" ||
            status === "withdrawn" ||
            status === "counter_rejected"
          ? "bg-red-100 text-red-800"
          : "bg-blue-100 text-blue-800";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black ${className}`}
    >
      {label}
    </span>
  );
}
