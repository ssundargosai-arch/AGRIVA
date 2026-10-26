"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Loader2,
  PackageCheck,
  ShoppingBag,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000";

type OrderItem = {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
};

type StoreOrder = {
  id: string;
  total_amount: number;
  status: string;
  created_at: string;
  items: OrderItem[];
};

type LocaleKey = "en" | "hi" | "mr";

type OrdersCopy = {
  loadError: string;
  loginError: string;
  loading: string;
  backToStore: string;
  title: string;
  subtitle: string;
  empty: string;
  continueShopping: string;
  orderId: string;
  date: string;
  items: string;
  quantity: string;
  price: string;
  subtotal: string;
  pending: string;
  confirmed: string;
  processing: string;
  shipped: string;
  delivered: string;
  completed: string;
  cancelled: string;
  failed: string;
};

const COPY: Record<LocaleKey, OrdersCopy> = {
  en: {
    loadError: "Unable to load your orders.",
    loginError: "Please log in as a farmer to view your orders.",
    loading: "Loading your AGRIVA orders...",
    backToStore: "Back to AGRIVA Store",
    title: "Your Orders",
    subtitle:
      "Review your AGRIVA Store order history, totals and item details.",
    empty: "You have not placed any AGRIVA Store orders yet.",
    continueShopping: "Continue Shopping",
    orderId: "Order ID",
    date: "Date",
    items: "Items",
    quantity: "Quantity",
    price: "Price",
    subtotal: "Subtotal",
    pending: "Pending",
    confirmed: "Confirmed",
    processing: "Processing",
    shipped: "Shipped",
    delivered: "Delivered",
    completed: "Completed",
    cancelled: "Cancelled",
    failed: "Failed",
  },

  hi: {
    loadError: "आपके ऑर्डर लोड नहीं हो सके।",
    loginError: "अपने ऑर्डर देखने के लिए किसान के रूप में लॉगिन करें।",
    loading: "आपके AGRIVA ऑर्डर लोड हो रहे हैं...",
    backToStore: "AGRIVA स्टोर पर वापस जाएँ",
    title: "आपके ऑर्डर",
    subtitle:
      "अपने AGRIVA स्टोर ऑर्डर का इतिहास, कुल राशि और उत्पाद विवरण देखें।",
    empty: "आपने अभी तक कोई AGRIVA स्टोर ऑर्डर नहीं किया है।",
    continueShopping: "खरीदारी जारी रखें",
    orderId: "ऑर्डर आईडी",
    date: "तारीख",
    items: "उत्पाद",
    quantity: "मात्रा",
    price: "कीमत",
    subtotal: "उप-योग",
    pending: "लंबित",
    confirmed: "पुष्टि हुई",
    processing: "प्रक्रिया में",
    shipped: "भेजा गया",
    delivered: "डिलीवर हुआ",
    completed: "पूर्ण",
    cancelled: "रद्द",
    failed: "असफल",
  },

  mr: {
    loadError: "तुमच्या ऑर्डर लोड करता आल्या नाहीत.",
    loginError: "तुमच्या ऑर्डर पाहण्यासाठी शेतकरी म्हणून लॉगिन करा.",
    loading: "तुमच्या AGRIVA ऑर्डर लोड होत आहेत...",
    backToStore: "AGRIVA स्टोअरकडे परत जा",
    title: "तुमच्या ऑर्डर",
    subtitle:
      "तुमच्या AGRIVA स्टोअर ऑर्डरचा इतिहास, एकूण रक्कम आणि उत्पादन तपशील पहा.",
    empty: "तुम्ही अजून कोणतीही AGRIVA स्टोअर ऑर्डर केलेली नाही.",
    continueShopping: "खरेदी सुरू ठेवा",
    orderId: "ऑर्डर आयडी",
    date: "दिनांक",
    items: "उत्पादने",
    quantity: "प्रमाण",
    price: "किंमत",
    subtotal: "उप-एकूण",
    pending: "प्रलंबित",
    confirmed: "पुष्टी झाली",
    processing: "प्रक्रियेत",
    shipped: "पाठवले",
    delivered: "पोहोचवले",
    completed: "पूर्ण",
    cancelled: "रद्द",
    failed: "अयशस्वी",
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

function localizeStatus(
  status: string,
  copy: OrdersCopy,
) {
  const key = status.trim().toLowerCase();

  const statusMap: Record<string, string> = {
    pending: copy.pending,
    confirmed: copy.confirmed,
    processing: copy.processing,
    shipped: copy.shipped,
    delivered: copy.delivered,
    completed: copy.completed,
    cancelled: copy.cancelled,
    canceled: copy.cancelled,
    failed: copy.failed,
  };

  return statusMap[key] || status;
}

function dateLocale(locale: LocaleKey) {
  if (locale === "hi") return "hi-IN";
  if (locale === "mr") return "mr-IN";
  return "en-IN";
}

function getToken() {
  return (
    localStorage.getItem("access_token") ||
    localStorage.getItem("token")
  );
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

export default function StoreOrdersPage() {
  const locale = getLocaleKey(useLocale());
  const copy = COPY[locale];

  const [orders, setOrders] =
    useState<StoreOrder[]>([]);
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      async function loadOrders() {
        const token = getToken();

        if (!token) {
          setError(copy.loginError);
          setLoading(false);
          return;
        }

        try {
          const response = await fetch(
            `${API_URL}/api/store/orders`,
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
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
                copy.loadError,
                copy.loginError,
              ),
            );
          }

          setOrders(
            Array.isArray(data?.orders)
              ? data.orders
              : [],
          );
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : copy.loadError,
          );
        } finally {
          setLoading(false);
        }
      }

      void loadOrders();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [copy.loadError, copy.loginError]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 text-slate-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          {copy.loading}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <Link
          href="/store"
          className="inline-flex items-center gap-2 text-slate-600 hover:text-green-700"
        >
          <ArrowLeft className="h-4 w-4" />
          {copy.backToStore}
        </Link>

        <div className="mt-8">
          <div className="flex items-center gap-3">
            <ShoppingBag className="h-8 w-8 text-green-700" />

            <h1 className="text-3xl font-bold text-slate-900">
              {copy.title}
            </h1>
          </div>

          <p className="mt-2 text-slate-600">
            {copy.subtitle}
          </p>
        </div>

        {error && (
          <div className="mt-6 rounded-xl bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {orders.length === 0 ? (
          <div className="mt-8 rounded-2xl border bg-white p-10 text-center shadow-sm">
            <PackageCheck className="mx-auto h-12 w-12 text-slate-300" />

            <p className="mt-4 text-slate-500">
              {copy.empty}
            </p>

            <Link
              href="/store/products"
              className="mt-6 inline-flex rounded-xl bg-green-700 px-5 py-3 font-semibold text-white hover:bg-green-800"
            >
              {copy.continueShopping}
            </Link>
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            {orders.map((order) => (
              <article
                key={order.id}
                className="rounded-2xl border bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs text-slate-500">
                      {copy.orderId}
                    </p>

                    <p className="mt-1 font-semibold text-slate-900">
                      {order.id}
                    </p>

                    <p className="mt-2 text-sm text-slate-500">
                      {copy.date}:{" "}
                      {new Date(
                        order.created_at,
                      ).toLocaleString(
                        dateLocale(locale),
                      )}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-700">
                      {localizeStatus(
                        order.status,
                        copy,
                      )}
                    </span>

                    <p className="mt-3 text-2xl font-bold text-green-700">
                      ₹
                      {Number(
                        order.total_amount,
                      ).toLocaleString(
                        "en-IN",
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        },
                      )}
                    </p>
                  </div>
                </div>

                <div className="mt-6 overflow-x-auto rounded-xl border">
                  <div className="min-w-[640px]">
                    <div className="grid grid-cols-4 gap-3 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-500">
                      <span>{copy.items}</span>
                      <span>{copy.quantity}</span>
                      <span>{copy.price}</span>
                      <span className="text-right">
                        {copy.subtotal}
                      </span>
                    </div>

                    <div className="divide-y">
                      {order.items.map((item) => (
                        <div
                          key={item.id}
                          className="grid grid-cols-4 gap-3 px-4 py-4 text-sm"
                        >
                          <span className="font-medium">
                            {localizeProductName(
                              item.product_name,
                              locale,
                            )}
                          </span>

                          <span>
                            {item.quantity}
                          </span>

                          <span>
                            ₹
                            {Number(
                              item.unit_price,
                            ).toLocaleString(
                              "en-IN",
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              },
                            )}
                          </span>

                          <span className="text-right font-semibold">
                            ₹
                            {Number(
                              item.subtotal,
                            ).toLocaleString(
                              "en-IN",
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              },
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
