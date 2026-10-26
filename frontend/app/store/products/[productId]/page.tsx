"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  PackageSearch,
  ShoppingCart,
  Sparkles,
  Sprout,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000";

type Product = {
  id: string;
  category_id: string;
  name: string;
  description?: string | null;
  price: number;
  stock_quantity: number;
};

type LocaleKey = "en" | "hi" | "mr";

type ProductDetailCopy = {
  unableToLoad: string;
  loginToAdd: string;
  unableToAdd: string;
  addedToCart: string;
  loading: string;
  backToProducts: string;
  cart: string;
  productNotFound: string;
  storeProduct: string;
  fallbackDescription: string;
  price: string;
  availableStock: string;
  adding: string;
  addToCart: string;
  outOfStock: string;
};

const COPY: Record<LocaleKey, ProductDetailCopy> = {
  en: {
    unableToLoad: "Unable to load product.",
    loginToAdd: "Please log in as a farmer to add products.",
    unableToAdd: "Unable to add product to cart.",
    addedToCart: "Product added to your AGRIVA cart.",
    loading: "Loading product details...",
    backToProducts: "Back to Products",
    cart: "Cart",
    productNotFound: "Product not found",
    storeProduct: "AGRIVA Store Product",
    fallbackDescription:
      "Farm input available through AGRIVA Store.",
    price: "Price",
    availableStock: "Available stock",
    adding: "Adding...",
    addToCart: "Add to Cart",
    outOfStock: "Out of Stock",
  },

  hi: {
    unableToLoad: "उत्पाद लोड नहीं हो सका।",
    loginToAdd:
      "उत्पाद जोड़ने के लिए किसान के रूप में लॉगिन करें।",
    unableToAdd: "उत्पाद कार्ट में नहीं जोड़ा जा सका।",
    addedToCart: "उत्पाद आपके AGRIVA कार्ट में जोड़ दिया गया।",
    loading: "उत्पाद विवरण लोड हो रहा है...",
    backToProducts: "उत्पादों पर वापस जाएँ",
    cart: "कार्ट",
    productNotFound: "उत्पाद नहीं मिला",
    storeProduct: "AGRIVA स्टोर उत्पाद",
    fallbackDescription:
      "यह कृषि सामग्री AGRIVA स्टोर के माध्यम से उपलब्ध है।",
    price: "कीमत",
    availableStock: "उपलब्ध स्टॉक",
    adding: "जोड़ा जा रहा है...",
    addToCart: "कार्ट में जोड़ें",
    outOfStock: "स्टॉक में नहीं",
  },

  mr: {
    unableToLoad: "उत्पादन लोड करता आले नाही.",
    loginToAdd:
      "उत्पादन जोडण्यासाठी शेतकरी म्हणून लॉगिन करा.",
    unableToAdd: "उत्पादन कार्टमध्ये जोडता आले नाही.",
    addedToCart: "उत्पादन तुमच्या AGRIVA कार्टमध्ये जोडले.",
    loading: "उत्पादनाचे तपशील लोड होत आहेत...",
    backToProducts: "उत्पादनांकडे परत जा",
    cart: "कार्ट",
    productNotFound: "उत्पादन सापडले नाही",
    storeProduct: "AGRIVA स्टोअर उत्पादन",
    fallbackDescription:
      "हे शेती साहित्य AGRIVA स्टोअरमधून उपलब्ध आहे.",
    price: "किंमत",
    availableStock: "उपलब्ध साठा",
    adding: "जोडत आहे...",
    addToCart: "कार्टमध्ये जोडा",
    outOfStock: "साठा उपलब्ध नाही",
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

function localizedApiError(
  detail: unknown,
  fallback: string,
  loginError?: string,
) {
  if (typeof detail !== "string") {
    return fallback;
  }

  const normalized = detail.toLowerCase();

  if (
    loginError &&
    (
      normalized.includes("invalid or expired token") ||
      normalized.includes("not authenticated") ||
      normalized.includes("could not validate credentials")
    )
  ) {
    return loginError;
  }

  return detail;
}

export default function ProductDetailsPage() {
  const params = useParams<{ productId: string }>();
  const productId = params.productId;

  const locale = getLocaleKey(useLocale());
  const copy = COPY[locale];

  const [product, setProduct] =
    useState<Product | null>(null);
  const [loading, setLoading] =
    useState(true);
  const [adding, setAdding] =
    useState(false);
  const [message, setMessage] =
    useState("");
  const [error, setError] =
    useState("");

  useEffect(() => {
    if (!productId) {
      setLoading(false);
      return;
    }

    const timer = window.setTimeout(() => {
      async function loadProduct() {
        try {
          setError("");

          const response = await fetch(
            `${API_URL}/api/store/products/${productId}`,
            {
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
                copy.unableToLoad,
              ),
            );
          }

          setProduct(data.product);
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

      void loadProduct();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [productId, copy.unableToLoad]);

  async function addToCart() {
    if (!product) {
      return;
    }

    const token = getToken();

    if (!token) {
      setError(copy.loginToAdd);
      return;
    }

    setAdding(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/api/store/cart/items?product_id=${product.id}&quantity=1`,
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
            copy.unableToAdd,
            copy.loginToAdd,
          ),
        );
      }

      setMessage(copy.addedToCart);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : copy.unableToAdd,
      );
    } finally {
      setAdding(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="flex items-center gap-3 text-slate-300">
          <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
          {copy.loading}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/store/products"
            className="inline-flex items-center gap-2 text-sm font-bold text-emerald-300 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            {copy.backToProducts}
          </Link>

          <Link
            href="/store/cart"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-black text-slate-950 hover:bg-emerald-400"
          >
            <ShoppingCart className="h-4 w-4" />
            {copy.cart}
          </Link>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-900 bg-red-950/50 p-4 text-sm font-semibold text-red-200">
            {error}
          </div>
        )}

        {message && (
          <div className="mt-6 rounded-2xl border border-emerald-800 bg-emerald-950/60 p-4 text-sm font-semibold text-emerald-200">
            {message}
          </div>
        )}

        {!product ? (
          <section className="mt-8 rounded-3xl border border-dashed border-slate-700 bg-slate-900 p-12 text-center">
            <PackageSearch className="mx-auto h-12 w-12 text-slate-500" />

            <h1 className="mt-4 text-2xl font-black text-white">
              {copy.productNotFound}
            </h1>
          </section>
        ) : (
          <section className="mt-8 grid overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl shadow-black/20 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="relative flex min-h-[330px] items-center justify-center bg-gradient-to-br from-emerald-950 to-slate-950">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.20),transparent_45%)]" />
              <Sprout className="relative h-28 w-28 text-emerald-400" />
            </div>

            <div className="p-7 sm:p-9">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-emerald-300">
                <Sparkles className="h-4 w-4" />
                {copy.storeProduct}
              </div>

              <h1 className="mt-5 text-3xl font-black text-white sm:text-4xl">
                {localizeProductName(
                  product.name,
                  locale,
                )}
              </h1>

              <p className="mt-4 leading-7 text-slate-400">
                {product.description ||
                  copy.fallbackDescription}
              </p>

              <div className="mt-7 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {copy.price}
                  </p>

                  <p className="mt-2 text-3xl font-black text-emerald-400">
                    ₹
                    {Number(
                      product.price,
                    ).toLocaleString(
                      "en-IN",
                    )}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {copy.availableStock}
                  </p>

                  <p className="mt-2 text-3xl font-black text-white">
                    {product.stock_quantity}
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={
                  adding ||
                  product.stock_quantity <= 0
                }
                onClick={() =>
                  void addToCart()
                }
                className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 font-black text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
              >
                {adding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShoppingCart className="h-4 w-4" />
                )}

                {product.stock_quantity > 0
                  ? adding
                    ? copy.adding
                    : copy.addToCart
                  : copy.outOfStock}
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
