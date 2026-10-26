"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CheckCircle,
  Loader2,
  LockKeyhole,
  PackageCheck,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000";

type CartItem = {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
};

type Cart = {
  id: string;
  items: CartItem[];
  total?: number;
  total_amount?: number;
};

type LocaleKey = "en" | "hi" | "mr";

type CheckoutCopy = {
  loginError: string;
  loadCartError: string;
  emptyCart: string;
  checkoutFailed: string;
  loading: string;
  orderConfirmed: string;
  orderPlaced: string;
  orderSuccess: string;
  continueShopping: string;
  backToCart: string;
  secureCheckout: string;
  title: string;
  subtitle: string;
  store: string;
  orderSummary: string;
  browseProducts: string;
  secureSummary: string;
  total: string;
  reviewMessage: string;
  placingOrder: string;
  placeOrder: string;
};

const COPY: Record<LocaleKey, CheckoutCopy> = {
  en: {
    loginError: "Please log in as a farmer to continue.",
    loadCartError: "Unable to load your cart.",
    emptyCart: "Your cart is empty.",
    checkoutFailed: "Unable to place your order.",
    loading: "Loading checkout...",
    orderConfirmed: "Order Confirmed",
    orderPlaced: "Order placed successfully",
    orderSuccess:
      "Your AGRIVA Store order has been confirmed. You can continue shopping for more farm inputs.",
    continueShopping: "Continue Shopping",
    backToCart: "Back to Cart",
    secureCheckout: "Secure AGRIVA Checkout",
    title: "Checkout",
    subtitle:
      "Review your order and place it securely through AGRIVA Store.",
    store: "AGRIVA Store",
    orderSummary: "Order Summary",
    browseProducts: "Browse Products",
    secureSummary: "Secure Summary",
    total: "Total",
    reviewMessage:
      "Review quantities and prices before placing your AGRIVA Store order.",
    placingOrder: "Placing Order...",
    placeOrder: "Place Order",
  },

  hi: {
    loginError: "आगे बढ़ने के लिए किसान के रूप में लॉगिन करें।",
    loadCartError: "आपका कार्ट लोड नहीं हो सका।",
    emptyCart: "आपका कार्ट खाली है।",
    checkoutFailed: "आपका ऑर्डर नहीं किया जा सका।",
    loading: "चेकआउट लोड हो रहा है...",
    orderConfirmed: "ऑर्डर की पुष्टि हो गई",
    orderPlaced: "ऑर्डर सफलतापूर्वक किया गया",
    orderSuccess:
      "आपका AGRIVA स्टोर ऑर्डर कन्फर्म हो गया है। आप अन्य कृषि सामग्री की खरीदारी जारी रख सकते हैं।",
    continueShopping: "खरीदारी जारी रखें",
    backToCart: "कार्ट पर वापस जाएँ",
    secureCheckout: "सुरक्षित AGRIVA चेकआउट",
    title: "चेकआउट",
    subtitle:
      "अपने ऑर्डर की जाँच करें और AGRIVA स्टोर के माध्यम से सुरक्षित रूप से ऑर्डर करें।",
    store: "AGRIVA स्टोर",
    orderSummary: "ऑर्डर सारांश",
    browseProducts: "उत्पाद देखें",
    secureSummary: "सुरक्षित सारांश",
    total: "कुल",
    reviewMessage:
      "AGRIVA स्टोर ऑर्डर करने से पहले मात्रा और कीमतों की जाँच करें।",
    placingOrder: "ऑर्डर किया जा रहा है...",
    placeOrder: "ऑर्डर करें",
  },

  mr: {
    loginError: "पुढे जाण्यासाठी शेतकरी म्हणून लॉगिन करा.",
    loadCartError: "तुमचा कार्ट लोड करता आला नाही.",
    emptyCart: "तुमचा कार्ट रिकामा आहे.",
    checkoutFailed: "तुमची ऑर्डर करता आली नाही.",
    loading: "चेकआउट लोड होत आहे...",
    orderConfirmed: "ऑर्डरची पुष्टी झाली",
    orderPlaced: "ऑर्डर यशस्वीपणे नोंदवली",
    orderSuccess:
      "तुमची AGRIVA स्टोअर ऑर्डर निश्चित झाली आहे. तुम्ही इतर शेती साहित्याची खरेदी सुरू ठेवू शकता.",
    continueShopping: "खरेदी सुरू ठेवा",
    backToCart: "कार्टकडे परत जा",
    secureCheckout: "सुरक्षित AGRIVA चेकआउट",
    title: "चेकआउट",
    subtitle:
      "तुमची ऑर्डर तपासा आणि AGRIVA स्टोअरमधून सुरक्षितपणे ऑर्डर नोंदवा.",
    store: "AGRIVA स्टोअर",
    orderSummary: "ऑर्डर सारांश",
    browseProducts: "उत्पादने पहा",
    secureSummary: "सुरक्षित सारांश",
    total: "एकूण",
    reviewMessage:
      "AGRIVA स्टोअर ऑर्डर नोंदवण्यापूर्वी प्रमाण आणि किंमती तपासा.",
    placingOrder: "ऑर्डर नोंदवत आहे...",
    placeOrder: "ऑर्डर नोंदवा",
  },
};

const PRODUCT_NAMES: Record<
  string,
  Partial<Record<LocaleKey, string>>
> = {
  "Agriculture Hand Tool Kit": {
    hi: "कृषि हस्त उपकरण किट",
    mr: "शेतीसाठी हातसाधन संच",
  },
  "Battery Agriculture Sprayer": {
    hi: "बैटरी कृषि स्प्रेयर",
    mr: "बॅटरी शेती फवारणी यंत्र",
  },
  "DAP Fertilizer 50kg": {
    hi: "DAP उर्वरक 50 किलो",
    mr: "DAP खत 50 किलो",
  },
  "Drip Irrigation Kit": {
    hi: "ड्रिप सिंचाई किट",
    mr: "ठिबक सिंचन संच",
  },
  "HD 2967 Wheat Seeds": {
    hi: "HD 2967 गेहूं बीज",
    mr: "HD 2967 गहू बियाणे",
  },
  "Hybrid Maize Seeds": {
    hi: "हाइब्रिड मक्का बीज",
    mr: "संकरित मका बियाणे",
  },
  "Mustard RH-749 Seeds": {
    hi: "सरसों RH-749 बीज",
    mr: "मोहरी RH-749 बियाणे",
  },
  "Neem Crop Protection Spray": {
    hi: "नीम फसल सुरक्षा स्प्रे",
    mr: "नीम पीक संरक्षण फवारणी",
  },
  "Pusa Basmati Rice Seeds": {
    hi: "पूसा बासमती धान बीज",
    mr: "पुसा बासमती तांदूळ बियाणे",
  },
  "Urea Fertilizer 45kg": {
    hi: "यूरिया उर्वरक 45 किलो",
    mr: "युरिया खत 45 किलो",
  },
  "Vermicompost 25kg": {
    hi: "वर्मीकम्पोस्ट 25 किलो",
    mr: "गांडूळ खत 25 किलो",
  },
};

function getLocaleKey(locale: string): LocaleKey {
  if (locale === "hi" || locale === "mr") {
    return locale;
  }
  return "en";
}

function localizeProductName(
  name: string,
  locale: LocaleKey,
) {
  return PRODUCT_NAMES[name]?.[locale] || name;
}

function getToken() {
  return localStorage.getItem("access_token");
}

function localizedApiError(
  detail: unknown,
  fallback: string,
  loginError: string,
) {
  if (typeof detail !== "string") {
    return fallback;
  }

  const normalized = detail.toLowerCase();

  if (
    normalized.includes("invalid or expired token") ||
    normalized.includes("not authenticated") ||
    normalized.includes("could not validate credentials")
  ) {
    return loginError;
  }

  return detail;
}

export default function CheckoutPage() {
  const router = useRouter();
  const locale = getLocaleKey(useLocale());
  const copy = COPY[locale];

  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      async function loadCart() {
        const token = getToken();

        if (!token) {
          setError(copy.loginError);
          setLoading(false);
          return;
        }

        try {
          const response = await fetch(
            `${API_URL}/api/store/cart`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
              cache: "no-store",
            },
          );

          const data = await response
            .json()
            .catch(() => null);

          if (!response.ok) {
            throw new Error(
              localizedApiError(
                data?.detail,
                copy.loadCartError,
                copy.loginError,
              ),
            );
          }

          setCart(data.cart);
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : copy.loadCartError,
          );
        } finally {
          setLoading(false);
        }
      }

      void loadCart();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [copy.loadCartError, copy.loginError]);

  const calculatedTotal =
    cart?.items.reduce(
      (sum, item) => sum + item.subtotal,
      0,
    ) ?? 0;

  async function handleCheckout() {
    const token = getToken();

    if (!token) {
      setError(copy.loginError);
      return;
    }

    if (!cart || cart.items.length === 0) {
      setError(copy.emptyCart);
      return;
    }

    setCheckingOut(true);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/api/store/checkout`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          localizedApiError(
            data?.detail,
            copy.checkoutFailed,
            copy.loginError,
          ),
        );
      }

      setSuccess(true);

      setCart({
        ...cart,
        items: [],
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : copy.checkoutFailed,
      );
    } finally {
      setCheckingOut(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-slate-200 backdrop-blur">
          <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
          {copy.loading}
        </div>
      </main>
    );
  }

  if (success) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
        <div className="w-full max-w-lg rounded-3xl border border-emerald-900 bg-slate-900 p-8 text-center shadow-2xl shadow-black/30">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-500/10">
            <CheckCircle className="h-12 w-12 text-emerald-400" />
          </div>

          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-800 bg-emerald-950/60 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-emerald-300">
            <PackageCheck className="h-4 w-4" />
            {copy.orderConfirmed}
          </div>

          <h1 className="mt-4 text-3xl font-black text-white">
            {copy.orderPlaced}
          </h1>

          <p className="mt-3 leading-7 text-slate-400">
            {copy.orderSuccess}
          </p>

          <button
            type="button"
            onClick={() => router.push("/store")}
            className="mt-7 rounded-xl bg-emerald-500 px-6 py-3 font-black text-slate-950 transition hover:bg-emerald-400"
          >
            {copy.continueShopping}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950">
      <section className="relative overflow-hidden border-b border-white/10 bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-950">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl" />

        <div className="relative mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <Link
            href="/store/cart"
            className="inline-flex items-center gap-2 text-sm font-bold text-emerald-300 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            {copy.backToCart}
          </Link>

          <div className="mt-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-emerald-300">
              <Sparkles className="h-4 w-4" />
              {copy.secureCheckout}
            </div>

            <h1 className="mt-4 text-4xl font-black text-white">
              {copy.title}
            </h1>

            <p className="mt-3 text-slate-300">
              {copy.subtitle}
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 rounded-2xl border border-red-900 bg-red-950/50 p-4 text-sm font-semibold text-red-200">
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-black/20">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-400">
                <ShoppingBag className="h-5 w-5" />
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-400">
                  {copy.store}
                </p>

                <h2 className="mt-1 text-xl font-black text-white">
                  {copy.orderSummary}
                </h2>
              </div>
            </div>

            {!cart || cart.items.length === 0 ? (
              <div className="py-12 text-center">
                <ShoppingBag className="mx-auto h-10 w-10 text-slate-600" />

                <p className="mt-4 text-slate-400">
                  {copy.emptyCart}
                </p>

                <Link
                  href="/store/products"
                  className="mt-5 inline-flex rounded-xl bg-emerald-500 px-5 py-3 text-sm font-black text-slate-950 hover:bg-emerald-400"
                >
                  {copy.browseProducts}
                </Link>
              </div>
            ) : (
              <div className="mt-6 divide-y divide-slate-800">
                {cart.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-4 py-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-bold text-white">
                        {localizeProductName(
                          item.product_name,
                          locale,
                        )}
                      </p>

                      <p className="mt-1 text-sm text-slate-400">
                        ₹
                        {Number(
                          item.unit_price,
                        ).toLocaleString("en-IN")}{" "}
                        × {item.quantity}
                      </p>
                    </div>

                    <p className="font-black text-emerald-400">
                      ₹
                      {Number(
                        item.subtotal,
                      ).toLocaleString("en-IN")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <aside className="h-fit rounded-3xl border border-emerald-900 bg-[#063d36] p-6 text-white shadow-2xl shadow-black/20">
            <div className="flex items-center gap-2 text-emerald-200">
              <LockKeyhole className="h-4 w-4" />

              <span className="text-xs font-black uppercase tracking-[0.14em]">
                {copy.secureSummary}
              </span>
            </div>

            <div className="mt-5 flex items-end justify-between gap-4 border-b border-white/10 pb-5">
              <span className="text-sm text-emerald-100/80">
                {copy.total}
              </span>

              <span className="text-3xl font-black">
                ₹
                {calculatedTotal.toLocaleString(
                  "en-IN",
                  {
                    maximumFractionDigits: 2,
                  },
                )}
              </span>
            </div>

            <p className="mt-4 text-xs leading-6 text-emerald-50/70">
              {copy.reviewMessage}
            </p>

            <button
              type="button"
              onClick={() => void handleCheckout()}
              disabled={
                checkingOut ||
                !cart ||
                cart.items.length === 0
              }
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-emerald-950 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {checkingOut && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}

              {checkingOut
                ? copy.placingOrder
                : copy.placeOrder}
            </button>
          </aside>
        </div>
      </div>
    </main>
  );
}
