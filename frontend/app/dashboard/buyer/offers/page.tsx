"use client";

import {
  ArrowLeft,
  BadgeIndianRupee,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Loader2,
  MapPin,
  MessageSquareText,
  Moon,
  Package,
  RefreshCw,
  Send,
  Sprout,
  Sun,
  Volume2,
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

type Listing = {
  id: string;
  crop_id: string;
  crop: string;
  quantity_kg: number;
  quality_grade?: string | null;
  expected_price_per_kg: number;
  location?: string | null;
  harvest_date?: string | null;
  status: string;
  created_at?: string;
};

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

function money(value: number, locale: string) {
  return new Intl.NumberFormat(
    locale === "mr"
      ? "mr-IN"
      : locale === "hi"
        ? "hi-IN"
        : "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }
  ).format(value);
}

function numberText(value: number, locale: string) {
  return new Intl.NumberFormat(
    locale === "mr"
      ? "mr-IN"
      : locale === "hi"
        ? "hi-IN"
        : "en-IN",
    {
      maximumFractionDigits: 2,
    }
  ).format(value);
}

export default function BuyerOffersPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("sihOffers");
  const {theme, toggleTheme} = useTheme();

  const [listings, setListings] = useState<Listing[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [selected, setSelected] =
    useState<Listing | null>(null);
  const [quantity, setQuantity] = useState("");
  const [rate, setRate] = useState("");
  const [message, setMessage] = useState("");

  const loadData = useCallback(async () => {
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
          !== "BUYER"
      ) {
        throw new Error(t("buyerOnly"));
      }

      const [listingResponse, offerResponse] =
        await Promise.all([
          fetch(
            `${API_URL}/api/marketplace/listings`,
            {cache: "no-store"}
          ),
          fetch(
            `${API_URL}/api/offers/my-offers`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
              cache: "no-store",
            }
          ),
        ]);

      const listingBody = await listingResponse
        .json()
        .catch(() => null);

      const offerBody = await offerResponse
        .json()
        .catch(() => null);

      if (!listingResponse.ok) {
        throw new Error(
          listingBody?.detail ||
          t("loadError")
        );
      }

      if (!offerResponse.ok) {
        throw new Error(
          offerBody?.detail ||
          t("loadError")
        );
      }

      setListings(
        (listingBody as Listing[]).filter(
          (item) =>
            item.status === "active" &&
            item.quantity_kg > 0
        )
      );
      setOffers(offerBody as Offer[]);
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
    void loadData();
  }, [loadData]);

  const openOffer = (listing: Listing) => {
    setSelected(listing);
    setQuantity(
      String(
        Math.min(
          Number(listing.quantity_kg),
          100
        )
      )
    );
    setRate(
      String(
        listing.expected_price_per_kg
      )
    );
    setMessage("");
    setError("");
    setSuccess("");

    window.setTimeout(() => {
      document
        .getElementById("send-offer-form")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 50);
  };

  const estimatedTotal = useMemo(() => {
    const q = Number(quantity);
    const p = Number(rate);

    if (
      !Number.isFinite(q) ||
      !Number.isFinite(p) ||
      q <= 0 ||
      p <= 0
    ) {
      return 0;
    }

    return q * p;
  }, [quantity, rate]);

  async function submitOffer(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const token =
      localStorage.getItem("access_token");

    if (!token || !selected) {
      router.replace("/login");
      return;
    }

    const q = Number(quantity);
    const p = Number(rate);

    if (
      !Number.isFinite(q) ||
      q <= 0 ||
      q > selected.quantity_kg
    ) {
      setError(t("invalidQuantity"));
      return;
    }

    if (
      !Number.isFinite(p) ||
      p <= 0
    ) {
      setError(t("invalidPrice"));
      return;
    }

    const confirmed = window.confirm(
      t("sendConfirm", {
        crop: selected.crop,
        quantity: numberText(q, locale),
        rate: money(p, locale),
        total: money(q * p, locale),
      })
    );

    if (!confirmed) {
      return;
    }

    setWorkingId("new");
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `${API_URL}/api/offers`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            listing_id: selected.id,
            quantity_kg: q,
            offer_price_per_kg: p,
            message:
              message.trim() || null,
          }),
        }
      );

      const body = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          body?.detail ||
          t("sendError")
        );
      }

      setSuccess(t("sent"));
      setSelected(null);
      setMessage("");
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("sendError")
      );
    } finally {
      setWorkingId("");
    }
  }

  async function respondToCounter(
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
        ? t("acceptCounterConfirm", {
            crop: offer.crop,
            rate: money(
              offer.counter_price_per_kg ||
                offer.effective_price_per_kg,
              locale
            ),
            total: money(
              offer.total_amount,
              locale
            ),
          })
        : t("rejectCounterConfirm", {
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
          ? t("counterAccepted")
          : t("counterRejected")
      );

      await loadData();
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

    const text = t("readBuyerOffer", {
      crop: offer.crop,
      quantity: numberText(
        offer.quantity_kg,
        locale
      ),
      rate: money(
        offer.effective_price_per_kg,
        locale
      ),
      status: t(
        `status.${offer.status}`
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
                "/dashboard/buyer"
              )
            }
            className="flex items-center gap-3"
          >
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-700 text-white shadow-sm">
              <Sprout className="h-6 w-6" />
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
                  "/dashboard/buyer"
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

      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6">
        <section className="rounded-[2rem] bg-emerald-800 p-6 text-white shadow-xl sm:p-10">
          <p className="text-xs font-black tracking-[0.22em] text-emerald-100">
            AGRIVA MARKET LINK
          </p>
          <h1 className="mt-3 max-w-4xl text-3xl font-black leading-tight sm:text-5xl">
            {t("buyerHero")}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-emerald-50 sm:text-lg">
            {t("buyerHeroText")}
          </p>

          <div className="mt-6 rounded-2xl border border-emerald-500/40 bg-emerald-900/40 p-4 text-sm leading-6 text-emerald-50">
            {t("safetyNote")}
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

        <section>
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black">
                {t("availableCrops")}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                {t("availableCropsText")}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                void loadData()
              }
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold"
            >
              <RefreshCw className="h-4 w-4" />
              {t("refresh")}
            </button>
          </div>

          {listings.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">
              {t("noListings")}
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {listings.map((listing) => (
                <article
                  key={listing.id}
                  className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider text-emerald-700">
                        {t("activeListing")}
                      </p>
                      <h3 className="mt-1 text-2xl font-black">
                        {listing.crop}
                      </h3>
                    </div>

                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-black text-emerald-700">
                      {money(
                        listing.expected_price_per_kg,
                        locale
                      )}
                      /kg
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                    <Info
                      icon={<Package className="h-4 w-4" />}
                      label={t("availableQuantity")}
                      value={`${numberText(
                        listing.quantity_kg,
                        locale
                      )} kg`}
                    />
                    <Info
                      icon={<MapPin className="h-4 w-4" />}
                      label={t("location")}
                      value={
                        listing.location ||
                        t("notAvailable")
                      }
                    />
                    <Info
                      icon={<Sprout className="h-4 w-4" />}
                      label={t("quality")}
                      value={
                        listing.quality_grade ||
                        t("notAvailable")
                      }
                    />
                    <Info
                      icon={<BadgeIndianRupee className="h-4 w-4" />}
                      label={t("farmerExpectedRate")}
                      value={money(
                        listing.expected_price_per_kg,
                        locale
                      )}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      openOffer(listing)
                    }
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-4 py-3.5 font-black text-white shadow-sm hover:bg-emerald-800"
                  >
                    <Send className="h-5 w-5" />
                    {t("sendOffer")}
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

        {selected && (
          <section
            id="send-offer-form"
            className="scroll-mt-28 rounded-[2rem] border border-emerald-200 bg-white p-6 shadow-sm sm:p-8"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-emerald-700">
                  {t("offerReview")}
                </p>
                <h2 className="mt-2 text-3xl font-black">
                  {selected.crop}
                </h2>
                <p className="mt-2 text-slate-600">
                  {selected.location ||
                    t("notAvailable")}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelected(null)
                }
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold"
              >
                {t("close")}
              </button>
            </div>

            <form
              onSubmit={submitOffer}
              className="mt-7 grid gap-5 md:grid-cols-2"
            >
              <label className="block">
                <span className="mb-2 block text-sm font-black">
                  {t("requestedQuantity")}
                </span>
                <input
                  value={quantity}
                  onChange={(event) =>
                    setQuantity(
                      event.target.value
                    )
                  }
                  inputMode="decimal"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-emerald-500"
                  placeholder="100"
                />
                <span className="mt-1 block text-xs text-slate-500">
                  {t("maxAvailable", {
                    quantity: numberText(
                      selected.quantity_kg,
                      locale
                    ),
                  })}
                </span>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-black">
                  {t("offeredRate")}
                </span>
                <input
                  value={rate}
                  onChange={(event) =>
                    setRate(
                      event.target.value
                    )
                  }
                  inputMode="decimal"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-emerald-500"
                  placeholder="28"
                />
                <span className="mt-1 block text-xs text-slate-500">
                  {t("expectedRateHint", {
                    rate: money(
                      selected.expected_price_per_kg,
                      locale
                    ),
                  })}
                </span>
              </label>

              <label className="md:col-span-2">
                <span className="mb-2 block text-sm font-black">
                  {t("messageOptional")}
                </span>
                <textarea
                  value={message}
                  onChange={(event) =>
                    setMessage(
                      event.target.value
                    )
                  }
                  rows={3}
                  maxLength={500}
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-emerald-500"
                  placeholder={t(
                    "messagePlaceholder"
                  )}
                />
              </label>

              <div className="md:col-span-2 rounded-2xl bg-emerald-50 p-5">
                <p className="text-sm font-bold text-emerald-800">
                  {t("estimatedTotal")}
                </p>
                <p className="mt-1 text-3xl font-black text-emerald-900">
                  {money(
                    estimatedTotal,
                    locale
                  )}
                </p>
                <p className="mt-2 text-xs leading-5 text-emerald-800">
                  {t("estimateDisclaimer")}
                </p>
              </div>

              <button
                type="submit"
                disabled={workingId === "new"}
                className="md:col-span-2 flex items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-5 py-4 font-black text-white disabled:opacity-60"
              >
                {workingId === "new" ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
                {t("confirmAndSend")}
              </button>
            </form>
          </section>
        )}

        <section>
          <div className="mb-5">
            <h2 className="text-2xl font-black">
              {t("myOffers")}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {t("myOffersText")}
            </p>
          </div>

          {offers.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">
              {t("noBuyerOffers")}
            </div>
          ) : (
            <div className="space-y-4">
              {offers.map((offer) => (
                <article
                  key={offer.id}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
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

                  <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Metric
                      label={t("quantity")}
                      value={`${numberText(
                        offer.quantity_kg,
                        locale
                      )} kg`}
                    />
                    <Metric
                      label={t("yourOffer")}
                      value={money(
                        offer.offer_price_per_kg,
                        locale
                      )}
                    />
                    <Metric
                      label={t("farmerCounter")}
                      value={
                        offer.counter_price_per_kg
                          ? money(
                              offer.counter_price_per_kg,
                              locale
                            )
                          : "—"
                      }
                    />
                    <Metric
                      label={t("estimatedTotal")}
                      value={money(
                        offer.total_amount,
                        locale
                      )}
                    />
                  </div>

                  {offer.counter_message && (
                    <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
                      <strong>
                        {t("farmerMessage")}:
                      </strong>{" "}
                      {offer.counter_message}
                    </div>
                  )}

                  {offer.status ===
                    "countered" && (
                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        type="button"
                        disabled={
                          workingId === offer.id
                        }
                        onClick={() =>
                          void respondToCounter(
                            offer,
                            "accept"
                          )
                        }
                        className="flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 font-black text-white disabled:opacity-60"
                      >
                        <CheckCircle2 className="h-5 w-5" />
                        {t("acceptCounter")}
                      </button>

                      <button
                        type="button"
                        disabled={
                          workingId === offer.id
                        }
                        onClick={() =>
                          void respondToCounter(
                            offer,
                            "reject"
                          )
                        }
                        className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 py-3 font-black text-red-700 disabled:opacity-60"
                      >
                        <XCircle className="h-5 w-5" />
                        {t("rejectCounter")}
                      </button>
                    </div>
                  )}

                  {offer.order_id && (
                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          "/dashboard/buyer"
                        )
                      }
                      className="mt-5 flex items-center gap-2 font-black text-emerald-700"
                    >
                      {t("viewPurchase")}
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Info({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <div className="flex items-center gap-2 text-xs font-bold text-emerald-700">
        {icon}
        {label}
      </div>
      <p className="mt-2 break-words font-black">
        {value}
      </p>
    </div>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-bold text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-lg font-black">
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
