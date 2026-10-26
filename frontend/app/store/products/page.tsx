"use client";

import { useLocale, useTranslations } from "next-intl";

import Link from "next/link";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowLeft,
  Boxes,
  Loader2,
  PackageSearch,
  Search,
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

type Category = {
  id: string;
  name: string;
};

type LocalizedProductText = {
  name: string;
  description: string;
};

const PRODUCT_TRANSLATIONS: Record<
  string,
  {
    mr: LocalizedProductText;
    hi: LocalizedProductText;
  }
> = {
  "Agriculture Hand Tool Kit": {
    mr: {
      name: "शेतीसाठी हातसाधन संच",
      description: "शेतीच्या देखभालीसाठी आवश्यक हातसाधने.",
    },
    hi: {
      name: "कृषि हस्त उपकरण किट",
      description: "खेत की देखभाल के लिए आवश्यक हाथ के औजार।",
    },
  },
  "Battery Agriculture Sprayer": {
    mr: {
      name: "बॅटरी शेती फवारणी यंत्र",
      description: "खते आणि पीक संरक्षणासाठी रिचार्जेबल फवारणी यंत्र.",
    },
    hi: {
      name: "बैटरी कृषि स्प्रेयर",
      description: "उर्वरक और फसल सुरक्षा के लिए रिचार्जेबल स्प्रेयर।",
    },
  },
  "DAP Fertilizer 50kg": {
    mr: {
      name: "DAP खत 50 किलो",
      description: "पिकांच्या वाढीसाठी फॉस्फरसयुक्त खत.",
    },
    hi: {
      name: "DAP उर्वरक 50 किलो",
      description: "फसल की वृद्धि के लिए फॉस्फोरस युक्त उर्वरक।",
    },
  },
  "Drip Irrigation Kit": {
    mr: {
      name: "ठिबक सिंचन संच",
      description: "लहान शेतांसाठी पाण्याची बचत करणारी ठिबक सिंचन प्रणाली.",
    },
    hi: {
      name: "ड्रिप सिंचाई किट",
      description: "छोटे खेतों के लिए जल-कुशल ड्रिप सिंचाई प्रणाली।",
    },
  },
  "HD 2967 Wheat Seeds": {
    mr: {
      name: "HD 2967 गहू बियाणे",
      description: "रब्बी हंगाम आणि चिकणमातीसाठी योग्य उच्च उत्पादनक्षम गहू बियाणे.",
    },
    hi: {
      name: "HD 2967 गेहूं बीज",
      description: "रबी मौसम और दोमट मिट्टी के लिए उच्च उपज वाला गेहूं बीज।",
    },
  },
  "Hybrid Maize Seeds": {
    mr: {
      name: "संकरित मका बियाणे",
      description: "खरीप आणि रब्बी हंगामासाठी उच्च कार्यक्षम मका बियाणे.",
    },
    hi: {
      name: "हाइब्रिड मक्का बीज",
      description: "खरीफ और रबी मौसम के लिए उच्च प्रदर्शन वाला मक्का बीज।",
    },
  },
  "Mustard RH-749 Seeds": {
    mr: {
      name: "मोहरी RH-749 बियाणे",
      description: "रब्बी हंगाम आणि मध्यम सिंचनासाठी योग्य मोहरी बियाणे.",
    },
    hi: {
      name: "सरसों RH-749 बीज",
      description: "रबी मौसम और मध्यम सिंचाई के लिए उपयुक्त सरसों बीज।",
    },
  },
  "Neem Crop Protection Spray": {
    mr: {
      name: "नीम पीक संरक्षण फवारणी",
      description: "नीम-आधारित पीक संरक्षण उत्पादन.",
    },
    hi: {
      name: "नीम फसल सुरक्षा स्प्रे",
      description: "नीम आधारित फसल सुरक्षा उत्पाद।",
    },
  },
  "Pusa Basmati Rice Seeds": {
    mr: {
      name: "पुसा बासमती तांदूळ बियाणे",
      description: "खरीप हंगाम आणि सिंचित शेतांसाठी योग्य तांदूळ बियाणे.",
    },
    hi: {
      name: "पूसा बासमती धान बीज",
      description: "खरीफ मौसम और सिंचित खेतों के लिए उपयुक्त धान बीज।",
    },
  },
  "Urea Fertilizer 45kg": {
    mr: {
      name: "युरिया खत 45 किलो",
      description: "पिकांच्या शाकीय वाढीसाठी नायट्रोजनयुक्त खत.",
    },
    hi: {
      name: "यूरिया उर्वरक 45 किलो",
      description: "फसल की वानस्पतिक वृद्धि के लिए नाइट्रोजन उर्वरक।",
    },
  },
  "Vermicompost 25kg": {
    mr: {
      name: "गांडूळ खत 25 किलो",
      description: "मातीची सुपीकता आणि सेंद्रिय कार्बन सुधारण्यासाठी सेंद्रिय खत.",
    },
    hi: {
      name: "वर्मीकम्पोस्ट 25 किलो",
      description: "मिट्टी की उर्वरता और जैविक कार्बन सुधारने के लिए जैविक खाद।",
    },
  },
};

type ProductPageCopy = {
  loginFirst: string;
  unableToLoadCategories: string;
  unableToLoadProducts: string;
  unableToAddProduct: string;
  productAdded: string;
  loadingCatalog: string;
  noProducts: string;
  tryFilters: string;
  genericProduct: string;
  addingToCart: string;
};

const PRODUCT_PAGE_COPY: Record<"en" | "hi" | "mr", ProductPageCopy> = {
  en: {
    loginFirst: "Please login first.",
    unableToLoadCategories: "Unable to load categories.",
    unableToLoadProducts: "Unable to load products.",
    unableToAddProduct: "Unable to add product.",
    productAdded: "Product added to cart.",
    loadingCatalog: "Loading AGRIVA products...",
    noProducts: "No products found",
    tryFilters: "Try changing the search term or category filter.",
    genericProduct: "AGRIVA farming product",
    addingToCart: "Adding...",
  },
  hi: {
    loginFirst: "कृपया पहले लॉगिन करें।",
    unableToLoadCategories: "श्रेणियाँ लोड नहीं हो सकीं।",
    unableToLoadProducts: "उत्पाद लोड नहीं हो सके।",
    unableToAddProduct: "उत्पाद कार्ट में नहीं जोड़ा जा सका।",
    productAdded: "उत्पाद कार्ट में जोड़ दिया गया।",
    loadingCatalog: "AGRIVA उत्पाद लोड हो रहे हैं...",
    noProducts: "कोई उत्पाद नहीं मिला",
    tryFilters: "खोज शब्द या श्रेणी फ़िल्टर बदलकर देखें।",
    genericProduct: "AGRIVA कृषि उत्पाद",
    addingToCart: "जोड़ा जा रहा है...",
  },
  mr: {
    loginFirst: "कृपया प्रथम लॉगिन करा.",
    unableToLoadCategories: "श्रेणी लोड करता आली नाही.",
    unableToLoadProducts: "उत्पादने लोड करता आली नाहीत.",
    unableToAddProduct: "उत्पादन कार्टमध्ये जोडता आले नाही.",
    productAdded: "उत्पादन कार्टमध्ये जोडले.",
    loadingCatalog: "AGRIVA उत्पादने लोड होत आहेत...",
    noProducts: "कोणतीही उत्पादने सापडली नाहीत",
    tryFilters: "शोध शब्द किंवा श्रेणी फिल्टर बदलून पहा.",
    genericProduct: "AGRIVA शेती उत्पादन",
    addingToCart: "कार्टमध्ये जोडत आहे...",
  },
};

function getLocaleKey(locale: string): "en" | "hi" | "mr" {
  if (locale === "hi" || locale === "mr") {
    return locale;
  }
  return "en";
}

function localizeProduct(
  name: string,
  description: string | null | undefined,
  locale: string,
): LocalizedProductText {
  const cleanDescription = description?.trim() || "";
  const translated = PRODUCT_TRANSLATIONS[name];

  if (!translated || locale === "en") {
    return {
      name,
      description: cleanDescription,
    };
  }

  if (locale === "mr") {
    return translated.mr;
  }

  if (locale === "hi") {
    return translated.hi;
  }

  return {
    name,
    description: cleanDescription,
  };
}

export default function ProductsPage() {
  const t = useTranslations("store");
  const locale = useLocale();
  const copy = PRODUCT_PAGE_COPY[getLocaleKey(locale)];

  function localizeStoreCategory(name: string) {
    switch (name.trim().toLowerCase()) {
      case "seeds":
        return t("categorySeeds");
      case "fertilizers":
        return t("categoryFertilizers");
      case "crop protection":
        return t("categoryCropProtection");
      case "equipment":
        return t("categoryEquipment");
      case "irrigation":
        return t("categoryIrrigation");
      case "farming tools":
        return t("categoryFarmingTools");
      case "organic products":
        return t("categoryOrganic");
      default:
        return name;
    }
  }
  const [
    products,
    setProducts,
  ] = useState<Product[]>([]);

  const [
    categories,
    setCategories,
  ] = useState<Category[]>([]);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    categoryId,
    setCategoryId,
  ] = useState("");

  const [
    sort,
    setSort,
  ] = useState("name");

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    addingId,
    setAddingId,
  ] = useState<string | null>(
    null
  );

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  const queryString =
    useMemo(() => {
      const params =
        new URLSearchParams();

      if (search.trim()) {
        params.set(
          "search",
          search.trim()
        );
      }

      if (categoryId) {
        params.set(
          "category_id",
          categoryId
        );
      }

      params.set(
        "sort",
        sort
      );

      return params.toString();
    }, [
      search,
      categoryId,
      sort,
    ]);

  useEffect(() => {
    async function loadCategories() {
      try {
        const response =
          await fetch(
            `${API_URL}/api/store/categories`
          );

        if (!response.ok) {
          throw new Error(
            copy.unableToLoadCategories
          );
        }

        const data =
          await response.json();

        setCategories(
          data.categories || []
        );
      } catch (err) {
        console.error(err);
      }
    }

    void loadCategories();
  }, [copy.unableToLoadCategories]);

  useEffect(() => {
    const controller =
      new AbortController();

    const timer =
      window.setTimeout(
        async () => {
          setLoading(true);
          setError("");

          try {
            const response =
              await fetch(
                `${API_URL}/api/store/products?${queryString}`,
                {
                  signal:
                    controller.signal,
                  cache:
                    "no-store",
                }
              );

            if (!response.ok) {
              throw new Error(
                copy.unableToLoadProducts
              );
            }

            const data =
              await response.json();

            setProducts(
              data.products || []
            );
          } catch (err) {
            if (
              err instanceof
                DOMException &&
              err.name ===
                "AbortError"
            ) {
              return;
            }

            setError(
              err instanceof Error
                ? err.message
                : copy.unableToLoadProducts
            );
          } finally {
            if (
              !controller.signal
                .aborted
            ) {
              setLoading(false);
            }
          }
        },
        250
      );

    return () => {
      window.clearTimeout(
        timer
      );

      controller.abort();
    };
  }, [queryString, copy.unableToLoadProducts]);

  async function addToCart(
    productId: string
  ) {
    const token =
      localStorage.getItem(
        "access_token"
      );

    if (!token) {
      setMessage(
        copy.loginFirst
      );
      return;
    }

    setAddingId(productId);
    setMessage("");
    setError("");

    try {
      const response =
        await fetch(
          `${API_URL}/api/store/cart/items?product_id=${productId}&quantity=1`,
          {
            method: "POST",
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

      const data =
        await response
          .json()
          .catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            copy.unableToAddProduct
        );
      }

      setMessage(
        copy.productAdded
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : copy.unableToAddProduct
      );
    } finally {
      setAddingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950">
      <section className="relative overflow-hidden border-b border-white/10 bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-950">
        <div className="absolute -right-24 -top-28 h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link
              href="/store"
              className="inline-flex items-center gap-2 text-sm font-bold text-emerald-300 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />{t("storeBack")}</Link>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/store/seed-recommendation"
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-black text-emerald-200 hover:bg-emerald-400/15"
              >
                <Sparkles className="h-4 w-4" />{t("aiSeedFinder")}</Link>

              <Link
                href="/store/cart"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-black text-slate-950 hover:bg-emerald-400"
              >
                <ShoppingCart className="h-4 w-4" />{t("cart")}</Link>
            </div>
          </div>

          <div className="mt-9">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-emerald-300">
              <Sparkles className="h-4 w-4" />{t("storeIntelligence")}</div>

            <h1 className="mt-4 text-4xl font-black tracking-tight text-white md:text-5xl">{t("productsTitle")}</h1>

            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-300">
              {t("productsDescription")}
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-2xl shadow-black/20">
          <div className="flex items-center gap-2">
            <PackageSearch className="h-5 w-5 text-emerald-400" />

            <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-400">{t("productSearch")}</p>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_240px_220px]">
            <div className="relative">
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-500" />

              <input
                value={search}
                onChange={(
                  event
                ) =>
                  setSearch(
                    event.target
                      .value
                  )
                }
                placeholder={t("productSearchPlaceholder")}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-10 pr-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-emerald-500"
              />
            </div>

            <select
              value={categoryId}
              onChange={(
                event
              ) =>
                setCategoryId(
                  event.target.value
                )
              }
              className="rounded-xl border border-slate-300 !bg-white px-3 py-3 text-sm font-semibold !text-slate-900 outline-none [color-scheme:light] focus:border-emerald-500 dark:border-slate-700 dark:!bg-slate-950 dark:!text-slate-100 dark:[color-scheme:dark]"
            >
              <option value="">{t("allCategories")}</option>

              {categories.map(
                (category) => (
                  <option
                    key={
                      category.id
                    }
                    value={
                      category.id
                    }
                  >
                    {localizeStoreCategory(category.name)}
                  </option>
                )
              )}
            </select>

            <select
              value={sort}
              onChange={(
                event
              ) =>
                setSort(
                  event.target.value
                )
              }
              className="rounded-xl border border-slate-300 !bg-white px-3 py-3 text-sm font-semibold !text-slate-900 outline-none [color-scheme:light] focus:border-emerald-500 dark:border-slate-700 dark:!bg-slate-950 dark:!text-slate-100 dark:[color-scheme:dark]"
            >
              <option value="name">{t("sortName")}</option>

              <option value="price_low">{t("sortPriceLowHigh")}</option>

              <option value="price_high">{t("sortPriceHighLow")}</option>
            </select>
          </div>
        </section>

        {message && (
          <div className="mt-5 rounded-2xl border border-emerald-800 bg-emerald-950/60 p-4 text-sm font-semibold text-emerald-200">
            {message}
          </div>
        )}

        {error && (
          <div className="mt-5 rounded-2xl border border-red-900 bg-red-950/50 p-4 text-sm font-semibold text-red-200">
            {error}
          </div>
        )}

        <div className="mt-7 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-400">{t("storeCatalog")}</p>

            <h2 className="mt-1 text-2xl font-black text-white">
              {loading
                ? t("loadingProducts")
                : t("productsFound", {
                    count: products.length,
                  })}
            </h2>
          </div>

          <Boxes className="h-7 w-7 text-slate-600" />
        </div>

        {loading ? (
          <div className="mt-8 flex min-h-[280px] items-center justify-center rounded-3xl border border-slate-800 bg-slate-900">
            <div className="flex items-center gap-3 text-slate-300">
              <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
              {copy.loadingCatalog}
            </div>
          </div>
        ) : products.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-slate-700 bg-slate-900 p-12 text-center">
            <PackageSearch className="mx-auto h-10 w-10 text-emerald-400" />

            <h3 className="mt-4 text-xl font-black text-white">
              {copy.noProducts}
            </h3>

            <p className="mt-2 text-sm text-slate-400">
              {copy.tryFilters}
            </p>
          </div>
        ) : (
          <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map(
              (product) => {
                const inStock =
                  product.stock_quantity >
                  0;

                const displayProduct =
                  localizeProduct(
                    product.name,
                    product.description,
                    locale
                  );

                return (
                  <article
                    key={
                      product.id
                    }
                    className="group overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-xl shadow-black/10 transition hover:-translate-y-1 hover:border-emerald-800"
                  >
                    <div className="relative flex h-44 items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-950 to-slate-950">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.18),transparent_45%)]" />

                      <Sprout className="relative h-16 w-16 text-emerald-400" />

                      <span
                        className={`absolute right-3 top-3 rounded-full px-3 py-1 text-xs font-black ${
                          inStock
                            ? "bg-emerald-400/15 text-emerald-300"
                            : "bg-red-400/15 text-red-300"
                        }`}
                      >
                        {inStock
                          ? t("inStock")
                          : t("outOfStock")}
                      </span>
                    </div>

                    <div className="p-5">
                      <h3 className="text-lg font-black text-white">
                        {displayProduct.name}
                      </h3>

                      <p className="mt-2 min-h-12 text-sm leading-6 text-slate-400">
                        {displayProduct.description ||
                          copy.genericProduct}
                      </p>

                      <div className="mt-5 flex items-end justify-between gap-3 border-t border-slate-800 pt-4">
                        <div>
                          <p className="text-xs font-semibold text-slate-500">{t("priceLabel")}</p>

                          <p className="mt-1 text-2xl font-black text-emerald-400">
                            ₹
                            {Number(
                              product.price
                            ).toLocaleString(
                              "en-IN"
                            )}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-xs font-semibold text-slate-500">{t("availableLabel")}</p>

                          <p className="mt-1 font-black text-slate-200">
                            {
                              product.stock_quantity
                            }
                          </p>
                        </div>
                      </div>

                      <Link
                        href={`/store/products/${product.id}`}
                        className="mt-5 inline-flex w-full items-center justify-center rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-black text-slate-200 transition hover:border-emerald-700 hover:text-emerald-300"
                      >{t("viewDetails")}</Link>

                      <button
                        type="button"
                        onClick={() =>
                          void addToCart(
                            product.id
                          )
                        }
                        disabled={
                          !inStock ||
                          addingId ===
                            product.id
                        }
                        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                      >
                        {addingId ===
                        product.id ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {copy.addingToCart}
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="h-4 w-4" />
                            {inStock
                              ? t("addToCart")
                              : t("outOfStock")}
                          </>
                        )}
                      </button>
                    </div>
                  </article>
                );
              }
            )}
          </div>
        )}
      </div>
    </main>
  );
}
