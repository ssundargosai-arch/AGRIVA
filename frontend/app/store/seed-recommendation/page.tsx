"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { FormEvent, useState } from "react";
import {
  ArrowLeft,
  Loader2,
  ShoppingCart,
  Sparkles,
  Sprout,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000";

type Recommendation = {
  product_id: string;
  name: string;
  price: number;
  stock_quantity: number;
  suitability_percentage: number;
  reason: string;
};

type LocaleKey = "en" | "hi" | "mr";

type Copy = {
  store: string;
  cart: string;
  smartRecommendation: string;
  title: string;
  description: string;
  disclaimer: string;
  crop: string;
  soilType: string;
  season: string;
  location: string;
  defaultCrop: string;
  defaultSoil: string;
  defaultSeason: string;
  defaultLocation: string;
  findingSeeds: string;
  findRecommendedSeeds: string;
  recommendedSeedsEyebrow: string;
  runRecommendation: string;
  stock: string;
  suitability: string;
  viewDetails: string;
  addToCart: string;
  addingToCart: string;
  outOfStock: string;
  loginFarmer: string;
  loginAgain: string;
  unableToRecommend: string;
  unableToAdd: string;
  addedToCart: string;
  resultCount: (count: number) => string;
};

const COPY: Record<LocaleKey, Copy> = {
  en: {
    store: "AGRIVA Store",
    cart: "Cart",
    smartRecommendation: "AGRIVA Smart Recommendation",
    title: "Find suitable seeds for your farm",
    description:
      "Enter crop, soil, season and location to rank seed products currently available in AGRIVA Store.",
    disclaimer:
      "This is a rule-based store recommendation using product descriptions and availability. It is not a trained agronomy model or a guarantee of crop performance.",
    crop: "Crop",
    soilType: "Soil type",
    season: "Season",
    location: "Location",
    defaultCrop: "Wheat",
    defaultSoil: "Loamy",
    defaultSeason: "Rabi",
    defaultLocation: "Maharashtra",
    findingSeeds: "Finding seeds...",
    findRecommendedSeeds: "Find Recommended Seeds",
    recommendedSeedsEyebrow: "AGRIVA AI Recommended Seeds",
    runRecommendation: "Run a recommendation to see results",
    stock: "Stock",
    suitability: "Suitability",
    viewDetails: "View Details",
    addToCart: "Add to Cart",
    addingToCart: "Adding...",
    outOfStock: "Out of stock",
    loginFarmer:
      "Please log in as a farmer to use seed recommendations.",
    loginAgain: "Please log in again.",
    unableToRecommend:
      "Unable to generate seed recommendations.",
    unableToAdd: "Unable to add seed to cart.",
    addedToCart: "Recommended seed added to your cart.",
    resultCount: (count) =>
      `${count} recommended seed${count === 1 ? "" : "s"}`,
  },

  hi: {
    store: "AGRIVA स्टोर",
    cart: "कार्ट",
    smartRecommendation: "AGRIVA स्मार्ट बीज सुझाव",
    title: "अपने खेत के लिए उपयुक्त बीज खोजें",
    description:
      "AGRIVA स्टोर में उपलब्ध बीजों को क्रम देने के लिए फसल, मिट्टी, मौसम और स्थान दर्ज करें।",
    disclaimer:
      "यह उत्पाद विवरण और उपलब्धता पर आधारित नियम-आधारित स्टोर सुझाव है। यह प्रशिक्षित कृषि-विज्ञान मॉडल नहीं है और फसल प्रदर्शन की गारंटी नहीं देता।",
    crop: "फसल",
    soilType: "मिट्टी का प्रकार",
    season: "मौसम",
    location: "स्थान",
    defaultCrop: "गेहूं",
    defaultSoil: "दोमट",
    defaultSeason: "रबी",
    defaultLocation: "महाराष्ट्र",
    findingSeeds: "बीज खोजे जा रहे हैं...",
    findRecommendedSeeds: "सुझाए गए बीज खोजें",
    recommendedSeedsEyebrow: "AGRIVA AI द्वारा सुझाए गए बीज",
    runRecommendation: "परिणाम देखने के लिए सुझाव चलाएँ",
    stock: "स्टॉक",
    suitability: "उपयुक्तता",
    viewDetails: "विवरण देखें",
    addToCart: "कार्ट में जोड़ें",
    addingToCart: "जोड़ा जा रहा है...",
    outOfStock: "स्टॉक में नहीं",
    loginFarmer:
      "बीज सुझाव का उपयोग करने के लिए किसान के रूप में लॉगिन करें।",
    loginAgain: "कृपया फिर से लॉगिन करें।",
    unableToRecommend: "बीज सुझाव तैयार नहीं किए जा सके।",
    unableToAdd: "बीज कार्ट में नहीं जोड़ा जा सका।",
    addedToCart: "सुझाया गया बीज कार्ट में जोड़ दिया गया।",
    resultCount: (count) => `${count} सुझाए गए बीज`,
  },

  mr: {
    store: "AGRIVA स्टोअर",
    cart: "कार्ट",
    smartRecommendation: "AGRIVA स्मार्ट बियाणे शिफारस",
    title: "तुमच्या शेतासाठी योग्य बियाणे शोधा",
    description:
      "AGRIVA स्टोअरमध्ये उपलब्ध बियाण्यांची शिफारस मिळवण्यासाठी पीक, माती, हंगाम आणि ठिकाण भरा.",
    disclaimer:
      "ही उत्पादनांचे वर्णन आणि उपलब्धता यांवर आधारित नियमाधारित स्टोअर शिफारस आहे. हे प्रशिक्षित कृषी मॉडेल नाही आणि पीक उत्पादनाची हमी देत नाही.",
    crop: "पीक",
    soilType: "मातीचा प्रकार",
    season: "हंगाम",
    location: "ठिकाण",
    defaultCrop: "गहू",
    defaultSoil: "लोम माती",
    defaultSeason: "रब्बी",
    defaultLocation: "महाराष्ट्र",
    findingSeeds: "बियाणे शोधत आहे...",
    findRecommendedSeeds: "शिफारस केलेली बियाणे शोधा",
    recommendedSeedsEyebrow: "AGRIVA AI शिफारस केलेली बियाणे",
    runRecommendation: "निकाल पाहण्यासाठी शिफारस चालवा",
    stock: "साठा",
    suitability: "योग्यता",
    viewDetails: "तपशील पहा",
    addToCart: "कार्टमध्ये जोडा",
    addingToCart: "कार्टमध्ये जोडत आहे...",
    outOfStock: "साठा उपलब्ध नाही",
    loginFarmer:
      "बियाणे शिफारस वापरण्यासाठी शेतकरी म्हणून लॉगिन करा.",
    loginAgain: "कृपया पुन्हा लॉगिन करा.",
    unableToRecommend: "बियाण्यांची शिफारस तयार करता आली नाही.",
    unableToAdd: "बियाणे कार्टमध्ये जोडता आले नाही.",
    addedToCart: "शिफारस केलेले बियाणे कार्टमध्ये जोडले.",
    resultCount: (count) => `${count} शिफारस केलेली बियाणे`,
  },
};

const PRODUCT_NAMES: Record<
  string,
  Partial<Record<LocaleKey, string>>
> = {
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
  "Pusa Basmati Rice Seeds": {
    hi: "पूसा बासमती धान बीज",
    mr: "पुसा बासमती तांदूळ बियाणे",
  },
};

function getLocaleKey(locale: string): LocaleKey {
  if (locale === "hi" || locale === "mr") {
    return locale;
  }

  return "en";
}

function getToken() {
  return (
    localStorage.getItem("access_token") ||
    localStorage.getItem("token")
  );
}

function normalizeKnownValue(
  value: string,
  field: "crop" | "soil" | "season" | "location",
) {
  const cleaned = value.trim().toLowerCase();

  const maps: Record<
    typeof field,
    Record<string, string>
  > = {
    crop: {
      wheat: "Wheat",
      "गेहूं": "Wheat",
      "गेहूँ": "Wheat",
      "गहू": "Wheat",
      rice: "Rice",
      "धान": "Rice",
      "चावल": "Rice",
      "तांदूळ": "Rice",
      maize: "Maize",
      corn: "Maize",
      "मक्का": "Maize",
      "मका": "Maize",
      mustard: "Mustard",
      "सरसों": "Mustard",
      "मोहरी": "Mustard",
    },
    soil: {
      loamy: "Loamy",
      loam: "Loamy",
      "दोमट": "Loamy",
      "लोम माती": "Loamy",
      clay: "Clay",
      "चिकनी": "Clay",
      "चिकणमाती": "Clay",
      sandy: "Sandy",
      "रेतीली": "Sandy",
      "वालुकामय": "Sandy",
      black: "Black",
      "काली": "Black",
      "काळी": "Black",
    },
    season: {
      rabi: "Rabi",
      "रबी": "Rabi",
      "रब्बी": "Rabi",
      kharif: "Kharif",
      "खरीफ": "Kharif",
      "खरीप": "Kharif",
      zaid: "Zaid",
      "जायद": "Zaid",
      "उन्हाळी": "Zaid",
    },
    location: {
      maharashtra: "Maharashtra",
      "महाराष्ट्र": "Maharashtra",
    },
  };

  return maps[field][cleaned] || value.trim();
}

function localizeProductName(
  name: string,
  locale: LocaleKey,
) {
  return PRODUCT_NAMES[name]?.[locale] || name;
}

export default function SeedRecommendationPage() {
  const locale = getLocaleKey(useLocale());
  const copy = COPY[locale];

  const [crop, setCrop] = useState(copy.defaultCrop);
  const [soilType, setSoilType] = useState(copy.defaultSoil);
  const [season, setSeason] = useState(copy.defaultSeason);
  const [location, setLocation] =
    useState(copy.defaultLocation);

  const [recommendations, setRecommendations] =
    useState<Recommendation[]>([]);

  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] =
    useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function submit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const token = getToken();

    if (!token) {
      setError(copy.loginFarmer);
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const params = new URLSearchParams({
        crop: normalizeKnownValue(crop, "crop"),
        soil_type: normalizeKnownValue(
          soilType,
          "soil",
        ),
        season: normalizeKnownValue(
          season,
          "season",
        ),
        location: normalizeKnownValue(
          location,
          "location",
        ),
      });

      const response = await fetch(
        `${API_URL}/api/store/ai/seed-recommendation?${params.toString()}`,
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
            : copy.unableToRecommend,
        );
      }

      setRecommendations(
        Array.isArray(data?.recommendations)
          ? data.recommendations
          : [],
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : copy.unableToRecommend,
      );
    } finally {
      setLoading(false);
    }
  }

  async function addToCart(
    productId: string,
  ) {
    const token = getToken();

    if (!token) {
      setError(copy.loginAgain);
      return;
    }

    setAddingId(productId);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/api/store/cart/items?product_id=${productId}&quantity=1`,
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
          typeof data?.detail === "string"
            ? data.detail
            : copy.unableToAdd,
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
      setAddingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950">
      <section className="border-b border-white/10 bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-950">
        <div className="mx-auto max-w-6xl px-4 py-9 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/store"
              className="inline-flex items-center gap-2 text-sm font-bold text-emerald-300 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              {copy.store}
            </Link>

            <Link
              href="/store/cart"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-black text-slate-950 hover:bg-emerald-400"
            >
              <ShoppingCart className="h-4 w-4" />
              {copy.cart}
            </Link>
          </div>

          <div className="mt-9 max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-emerald-300">
              <Sparkles className="h-4 w-4" />
              {copy.smartRecommendation}
            </div>

            <h1 className="mt-4 text-4xl font-black text-white md:text-5xl">
              {copy.title}
            </h1>

            <p className="mt-3 leading-7 text-slate-300">
              {copy.description}
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-9 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-amber-900/70 bg-amber-950/30 p-4 text-sm leading-6 text-amber-100">
          {copy.disclaimer}
        </div>

        <form
          onSubmit={submit}
          className="mt-6 grid gap-4 rounded-3xl border border-slate-800 bg-slate-900 p-6 md:grid-cols-2"
        >
          <Field
            label={copy.crop}
            value={crop}
            onChange={setCrop}
            placeholder={copy.defaultCrop}
          />

          <Field
            label={copy.soilType}
            value={soilType}
            onChange={setSoilType}
            placeholder={copy.defaultSoil}
          />

          <Field
            label={copy.season}
            value={season}
            onChange={setSeason}
            placeholder={copy.defaultSeason}
          />

          <Field
            label={copy.location}
            value={location}
            onChange={setLocation}
            placeholder={copy.defaultLocation}
          />

          <button
            type="submit"
            disabled={
              loading ||
              !crop.trim() ||
              !soilType.trim() ||
              !season.trim() ||
              !location.trim()
            }
            className="md:col-span-2 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 font-black text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}

            {loading
              ? copy.findingSeeds
              : copy.findRecommendedSeeds}
          </button>
        </form>

        {error && (
          <div className="mt-5 rounded-2xl border border-red-900 bg-red-950/50 p-4 text-sm font-semibold text-red-200">
            {error}
          </div>
        )}

        {message && (
          <div className="mt-5 rounded-2xl border border-emerald-800 bg-emerald-950/60 p-4 text-sm font-semibold text-emerald-200">
            {message}
          </div>
        )}

        <section className="mt-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-400">
                {copy.recommendedSeedsEyebrow}
              </p>

              <h2 className="mt-1 text-2xl font-black text-white">
                {recommendations.length === 0
                  ? copy.runRecommendation
                  : copy.resultCount(
                      recommendations.length,
                    )}
              </h2>
            </div>

            <Sprout className="h-8 w-8 text-emerald-500" />
          </div>

          {recommendations.length > 0 && (
            <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {recommendations.map((item) => {
                const inStock =
                  item.stock_quantity > 0;

                return (
                  <article
                    key={item.product_id}
                    className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl shadow-black/10"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-black text-white">
                          {localizeProductName(
                            item.name,
                            locale,
                          )}
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
                          {copy.stock}:{" "}
                          {item.stock_quantity}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-emerald-500/10 px-3 py-2 text-center">
                        <p className="text-2xl font-black text-emerald-400">
                          {
                            item.suitability_percentage
                          }
                          %
                        </p>

                        <p className="text-[10px] font-black uppercase tracking-wider text-emerald-300/80">
                          {copy.suitability}
                        </p>
                      </div>
                    </div>

                    <p className="mt-5 min-h-16 text-sm leading-6 text-slate-400">
                      {item.reason}
                    </p>

                    <p className="mt-5 text-2xl font-black text-emerald-400">
                      ₹
                      {Number(
                        item.price,
                      ).toLocaleString("en-IN")}
                    </p>

                    <div className="mt-5 grid gap-2">
                      <Link
                        href={`/store/products/${item.product_id}`}
                        className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-black text-slate-200 hover:border-emerald-700"
                      >
                        {copy.viewDetails}
                      </Link>

                      <button
                        type="button"
                        disabled={
                          addingId ===
                            item.product_id ||
                          !inStock
                        }
                        onClick={() =>
                          void addToCart(
                            item.product_id,
                          )
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-black text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {addingId ===
                        item.product_id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ShoppingCart className="h-4 w-4" />
                        )}

                        {addingId ===
                        item.product_id
                          ? copy.addingToCart
                          : inStock
                            ? copy.addToCart
                            : copy.outOfStock}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-black !text-slate-700 dark:!text-slate-200">
        {label}
      </span>

      <input
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        className="mt-2 w-full rounded-xl border border-slate-300 !bg-white px-4 py-3 text-sm font-medium !text-slate-950 outline-none placeholder:!text-slate-400 focus:border-emerald-500 dark:border-slate-700 dark:!bg-slate-950 dark:!text-white dark:placeholder:!text-slate-600"
      />
    </label>
  );
}
