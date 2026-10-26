"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Minus,
  Plus,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Trash2,
} from "lucide-react";

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
  total_items: number;
  total_amount: number;
};

type LocaleKey = "en" | "hi" | "mr";

type CartCopy = {
  loginToView: string;
  loginAgain: string;
  unableToLoad: string;
  unableToUpdate: string;
  unableToRemove: string;
  loadingCart: string;
  store: string;
  liveCart: string;
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
  browseProducts: string;
  each: string;
  viewProductDetails: string;
  decreaseQuantity: string;
  increaseQuantity: string;
  remove: string;
  itemSubtotal: string;
  cartSummary: string;
  totalItems: string;
  totalAmount: string;
  continueCheckout: string;
  continueShopping: string;
};

const COPY: Record<LocaleKey, CartCopy> = {
  en: {
    loginToView: "Please log in as a farmer to view your cart.",
    loginAgain: "Please log in again.",
    unableToLoad: "Unable to load your cart.",
    unableToUpdate: "Unable to update quantity.",
    unableToRemove: "Unable to remove product.",
    loadingCart: "Loading your AGRIVA cart...",
    store: "AGRIVA Store",
    liveCart: "Live PostgreSQL Cart",
    title: "Your Cart",
    description:
      "Change quantities, remove products and review the total before checkout.",
    emptyTitle: "Your cart is empty",
    emptyDescription:
      "Add seeds, fertilizers, tools or other farm inputs to continue.",
    browseProducts: "Browse Products",
    each: "each",
    viewProductDetails: "View product details",
    decreaseQuantity: "Decrease quantity",
    increaseQuantity: "Increase quantity",
    remove: "Remove",
    itemSubtotal: "Item subtotal",
    cartSummary: "Cart Summary",
    totalItems: "Total items",
    totalAmount: "Total amount",
    continueCheckout: "Continue to Checkout",
    continueShopping: "Continue Shopping",
  },

  hi: {
    loginToView: "अपना कार्ट देखने के लिए किसान के रूप में लॉगिन करें।",
    loginAgain: "कृपया फिर से लॉगिन करें।",
    unableToLoad: "आपका कार्ट लोड नहीं हो सका।",
    unableToUpdate: "मात्रा अपडेट नहीं की जा सकी।",
    unableToRemove: "उत्पाद हटाया नहीं जा सका।",
    loadingCart: "आपका AGRIVA कार्ट लोड हो रहा है...",
    store: "AGRIVA स्टोर",
    liveCart: "लाइव PostgreSQL कार्ट",
    title: "आपका कार्ट",
    description:
      "चेकआउट से पहले मात्रा बदलें, उत्पाद हटाएँ और कुल राशि देखें।",
    emptyTitle: "आपका कार्ट खाली है",
    emptyDescription:
      "आगे बढ़ने के लिए बीज, उर्वरक, औज़ार या अन्य कृषि सामग्री जोड़ें।",
    browseProducts: "उत्पाद देखें",
    each: "प्रति इकाई",
    viewProductDetails: "उत्पाद का विवरण देखें",
    decreaseQuantity: "मात्रा घटाएँ",
    increaseQuantity: "मात्रा बढ़ाएँ",
    remove: "हटाएँ",
    itemSubtotal: "वस्तु उप-योग",
    cartSummary: "कार्ट सारांश",
    totalItems: "कुल वस्तुएँ",
    totalAmount: "कुल राशि",
    continueCheckout: "चेकआउट पर जाएँ",
    continueShopping: "खरीदारी जारी रखें",
  },

  mr: {
    loginToView: "तुमचा कार्ट पाहण्यासाठी शेतकरी म्हणून लॉगिन करा.",
    loginAgain: "कृपया पुन्हा लॉगिन करा.",
    unableToLoad: "तुमचा कार्ट लोड करता आला नाही.",
    unableToUpdate: "प्रमाण अपडेट करता आले नाही.",
    unableToRemove: "उत्पादन काढता आले नाही.",
    loadingCart: "तुमचा AGRIVA कार्ट लोड होत आहे...",
    store: "AGRIVA स्टोअर",
    liveCart: "लाइव्ह PostgreSQL कार्ट",
    title: "तुमचा कार्ट",
    description:
      "चेकआउटपूर्वी प्रमाण बदला, उत्पादने काढा आणि एकूण रक्कम तपासा.",
    emptyTitle: "तुमचा कार्ट रिकामा आहे",
    emptyDescription:
      "पुढे जाण्यासाठी बियाणे, खते, साधने किंवा इतर शेती साहित्य जोडा.",
    browseProducts: "उत्पादने पहा",
    each: "प्रति नग",
    viewProductDetails: "उत्पादनाचे तपशील पहा",
    decreaseQuantity: "प्रमाण कमी करा",
    increaseQuantity: "प्रमाण वाढवा",
    remove: "काढा",
    itemSubtotal: "वस्तू उप-एकूण",
    cartSummary: "कार्ट सारांश",
    totalItems: "एकूण वस्तू",
    totalAmount: "एकूण रक्कम",
    continueCheckout: "चेकआउटकडे जा",
    continueShopping: "खरेदी सुरू ठेवा",
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
  return (
    localStorage.getItem("access_token") ||
    localStorage.getItem("token")
  );
}

export default function CartPage() {
  const locale = getLocaleKey(useLocale());
  const copy = COPY[locale];

  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] =
    useState<string | null>(null);
  const [error, setError] = useState("");

  async function loadCart() {
    const token = getToken();

    if (!token) {
      setError(copy.loginToView);
      setLoading(false);
      return;
    }

    try {
      setError("");

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
          typeof data?.detail === "string"
            ? data.detail
            : copy.unableToLoad,
        );
      }

      setCart(data.cart);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : copy.unableToLoad,
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadCart();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  async function updateQuantity(
    item: CartItem,
    quantity: number,
  ) {
    if (quantity < 1) {
      return;
    }

    const token = getToken();

    if (!token) {
      setError(copy.loginAgain);
      return;
    }

    setWorkingId(item.id);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/api/store/cart/items/${item.id}?quantity=${quantity}`,
        {
          method: "PATCH",
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
          typeof data?.detail === "string"
            ? data.detail
            : copy.unableToUpdate,
        );
      }

      setCart(data.cart);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : copy.unableToUpdate,
      );
    } finally {
      setWorkingId(null);
    }
  }

  async function removeItem(
    itemId: string,
  ) {
    const token = getToken();

    if (!token) {
      setError(copy.loginAgain);
      return;
    }

    setWorkingId(itemId);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/api/store/cart/items/${itemId}`,
        {
          method: "DELETE",
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
          typeof data?.detail === "string"
            ? data.detail
            : copy.unableToRemove,
        );
      }

      setCart(data.cart);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : copy.unableToRemove,
      );
    } finally {
      setWorkingId(null);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="flex items-center gap-3 text-slate-300">
          <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
          {copy.loadingCart}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950">
      <section className="relative overflow-hidden border-b border-white/10 bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-950">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <Link
            href="/store"
            className="inline-flex items-center gap-2 text-sm font-bold text-emerald-300 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            {copy.store}
          </Link>

          <div className="mt-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-emerald-300">
              <Sparkles className="h-4 w-4" />
              {copy.liveCart}
            </div>

            <h1 className="mt-4 text-4xl font-black text-white">
              {copy.title}
            </h1>

            <p className="mt-3 text-slate-300">
              {copy.description}
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 rounded-2xl border border-red-900 bg-red-950/50 p-4 text-sm font-semibold text-red-200">
            {error}
          </div>
        )}

        {!cart || cart.items.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-slate-700 bg-slate-900 p-10 text-center">
            <ShoppingBag className="mx-auto h-12 w-12 text-emerald-400" />

            <h2 className="mt-4 text-2xl font-black text-white">
              {copy.emptyTitle}
            </h2>

            <p className="mt-2 text-slate-400">
              {copy.emptyDescription}
            </p>

            <Link
              href="/store/products"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-black text-slate-950 hover:bg-emerald-400"
            >
              {copy.browseProducts}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </section>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_330px]">
            <section className="space-y-4">
              {cart.items.map((item) => {
                const working =
                  workingId === item.id;

                return (
                  <article
                    key={item.id}
                    className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl shadow-black/10"
                  >
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-lg font-black text-white">
                          {localizeProductName(
                            item.product_name,
                            locale,
                          )}
                        </p>

                        <p className="mt-1 text-sm text-slate-400">
                          ₹
                          {Number(
                            item.unit_price,
                          ).toLocaleString(
                            "en-IN",
                          )}{" "}
                          {copy.each}
                        </p>

                        <Link
                          href={`/store/products/${item.product_id}`}
                          className="mt-2 inline-flex text-xs font-black text-emerald-400 hover:text-emerald-300"
                        >
                          {
                            copy.viewProductDetails
                          }
                        </Link>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center rounded-xl border border-slate-700 bg-slate-950">
                          <button
                            type="button"
                            aria-label={
                              copy.decreaseQuantity
                            }
                            disabled={
                              working ||
                              item.quantity <= 1
                            }
                            onClick={() =>
                              void updateQuantity(
                                item,
                                item.quantity - 1,
                              )
                            }
                            className="grid h-10 w-10 place-items-center text-slate-300 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            <Minus className="h-4 w-4" />
                          </button>

                          <span className="min-w-10 text-center font-black text-white">
                            {item.quantity}
                          </span>

                          <button
                            type="button"
                            aria-label={
                              copy.increaseQuantity
                            }
                            disabled={working}
                            onClick={() =>
                              void updateQuantity(
                                item,
                                item.quantity + 1,
                              )
                            }
                            className="grid h-10 w-10 place-items-center text-slate-300 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>

                        <button
                          type="button"
                          disabled={working}
                          onClick={() =>
                            void removeItem(
                              item.id,
                            )
                          }
                          className="inline-flex h-10 items-center gap-2 rounded-xl border border-red-900 bg-red-950/40 px-3 text-sm font-black text-red-300 hover:bg-red-950/70 disabled:opacity-50"
                        >
                          {working ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}

                          {copy.remove}
                        </button>
                      </div>
                    </div>

                    <div className="mt-5 flex items-center justify-between border-t border-slate-800 pt-4">
                      <span className="text-sm text-slate-400">
                        {copy.itemSubtotal}
                      </span>

                      <span className="text-xl font-black text-emerald-400">
                        ₹
                        {Number(
                          item.subtotal,
                        ).toLocaleString(
                          "en-IN",
                        )}
                      </span>
                    </div>
                  </article>
                );
              })}
            </section>

            <aside className="h-fit rounded-3xl border border-emerald-900 bg-[#063d36] p-6 text-white shadow-2xl shadow-black/20">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-emerald-200" />

                <h2 className="text-xl font-black !text-white">
                  {copy.cartSummary}
                </h2>
              </div>

              <div className="mt-5 space-y-3 border-b border-white/10 pb-5 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="!text-emerald-100/90">
                    {copy.totalItems}
                  </span>

                  <span className="font-black !text-white">
                    {cart.total_items}
                  </span>
                </div>

                <div className="flex items-end justify-between gap-4">
                  <span className="!text-emerald-100/90">
                    {copy.totalAmount}
                  </span>

                  <span className="text-3xl font-black !text-white">
                    ₹
                    {Number(
                      cart.total_amount,
                    ).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              <Link
                href="/store/checkout"
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-emerald-950 hover:bg-emerald-50"
              >
                {copy.continueCheckout}
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                href="/store/products"
                className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-white/20 px-5 py-3 text-sm font-bold !text-white hover:bg-white/10"
              >
                {copy.continueShopping}
              </Link>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
