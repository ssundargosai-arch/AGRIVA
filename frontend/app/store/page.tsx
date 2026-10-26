import Link from "next/link";
import { getTranslations } from "next-intl/server";

import {
  ArrowLeft,
  ArrowRight,
  Beaker,
  Droplets,
  Leaf,
  PackageCheck,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Sprout,
  Tractor,
  Wrench,
} from "lucide-react";

const categories = [
  {
    name: "Seeds",
    description:
      "High-quality seeds for seasonal and field crops.",
    icon: Sprout,
  },
  {
    name: "Fertilizers",
    description:
      "Balanced nutrition for healthier crop growth.",
    icon: Beaker,
  },
  {
    name: "Crop Protection",
    description:
      "Protection products for pests and diseases.",
    icon: ShieldCheck,
  },
  {
    name: "Equipment",
    description:
      "Reliable equipment for day-to-day farm work.",
    icon: Tractor,
  },
  {
    name: "Irrigation",
    description:
      "Efficient water-management essentials.",
    icon: Droplets,
  },
  {
    name: "Farming Tools",
    description:
      "Practical tools for field operations.",
    icon: Wrench,
  },
  {
    name: "Organic Products",
    description:
      "Sustainable inputs for eco-friendly farming.",
    icon: Leaf,
  },
];

export default async function StorePage() {
  const t = await getTranslations("store");

  function localizedCategoryName(name: string) {
    switch (name) {
      case "Seeds":
        return t("categorySeeds");
      case "Fertilizers":
        return t("categoryFertilizers");
      case "Crop Protection":
        return t("categoryCropProtection");
      case "Equipment":
        return t("categoryEquipment");
      case "Irrigation":
        return t("categoryIrrigation");
      case "Farming Tools":
        return t("categoryFarmingTools");
      case "Organic Products":
        return t("categoryOrganic");
      default:
        return name;
    }
  }

  function localizedCategoryDescription(name: string) {
    switch (name) {
      case "Seeds":
        return t("categorySeedsDesc");
      case "Fertilizers":
        return t("categoryFertilizersDesc");
      case "Crop Protection":
        return t("categoryCropProtectionDesc");
      case "Equipment":
        return t("categoryEquipmentDesc");
      case "Irrigation":
        return t("categoryIrrigationDesc");
      case "Farming Tools":
        return t("categoryFarmingToolsDesc");
      case "Organic Products":
        return t("categoryOrganicDesc");
      default:
        return "";
    }
  }
  return (
    <main className="min-h-screen bg-slate-950">
      <section className="relative overflow-hidden border-b border-white/10 bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-950">
        <div className="absolute -right-28 -top-32 h-96 w-96 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="absolute -bottom-44 left-1/3 h-96 w-96 rounded-full bg-green-400/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link
              href="/dashboard/farmer"
              className="inline-flex items-center gap-2 text-sm font-bold text-emerald-300 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("farmerDashboard")}
            </Link>

            <div className="flex gap-2">
              <Link
                href="/store/products"
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-white backdrop-blur transition hover:bg-white/10"
              >
                {t("products")}
              </Link>

              <Link
                href="/store/cart"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-black text-slate-950 transition hover:bg-emerald-400"
              >
                <ShoppingCart className="h-4 w-4" />
                {t("cart")}
              </Link>
            </div>
          </div>

          <div className="mt-12 grid items-end gap-8 lg:grid-cols-[1fr_360px]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-emerald-300">
                <Sparkles className="h-4 w-4" />
                {t("storeIntelligence")}
              </div>

              <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-tight text-white md:text-6xl">
                {t("heroTitle")}
                <span className="text-emerald-400">
                  {" "}
                  {t("heroHighlight")}
                </span>
              </h1>

              <p className="mt-5 max-w-3xl text-base leading-7 text-slate-300 md:text-lg">
                Discover seeds, fertilizers, crop protection,
                irrigation products, tools and farm equipment
                from the {t("ecosystem")}.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/store/products"
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-400"
                >
                  {t("exploreProducts")}
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <Link
                  href="/store/seed-recommendation"
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-300/20 bg-emerald-400/10 px-5 py-3 text-sm font-black text-emerald-100 transition hover:bg-emerald-400/15"
                >
                  <Sparkles className="h-4 w-4" />
                  {t("aiSeedFinder")}
                </Link>

                <Link
                  href="/store/checkout"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/10"
                >
                  <PackageCheck className="h-4 w-4" />
                  {t("checkout")}
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white shadow-2xl shadow-black/20 backdrop-blur">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-300">
                AGRIVA Store
              </p>

              <h2 className="mt-2 text-xl font-black">
                {t("smarterPurchases")}
              </h2>

              <div className="mt-5 space-y-4">
                <FeatureRow
                  icon={<ShieldCheck className="h-5 w-5" />}
                  title={t("trustedCatalog")}
                  text={t("trustedCatalogDesc")}
                />

                <FeatureRow
                  icon={<ShoppingCart className="h-5 w-5" />}
                  title={t("connectedCart")}
                  text={t("connectedCartDesc")}
                />

                <FeatureRow
                  icon={<Sparkles className="h-5 w-5" />}
                  title={t("ecosystem")}
                  text={t("ecosystemDesc")}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <section>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-400">
            {t("shopByCategory")}
          </p>

          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-3xl font-black text-white">
                {t("categoryTitle")}
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                {t("browseCategoriesDesc")}
              </p>
            </div>

            <Link
              href="/store/products"
              className="inline-flex items-center gap-2 text-sm font-black text-emerald-400 hover:text-emerald-300"
            >
              {t("viewAllProducts")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {categories.map((category) => {
              const Icon =
                category.icon;

              return (
                <Link
                  key={localizedCategoryName(category.name)}
                  href="/store/products"
                  className="group rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl shadow-black/10 transition hover:-translate-y-1 hover:border-emerald-700"
                >
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-400">
                    <Icon className="h-6 w-6" />
                  </div>

                  <h3 className="mt-5 text-lg font-black text-white">
                    {localizedCategoryName(category.name)}
                  </h3>

                  <p className="mt-2 min-h-12 text-sm leading-6 text-slate-400">
                    {localizedCategoryDescription(category.name)}
                  </p>

                  <div className="mt-5 flex items-center gap-2 text-sm font-black text-emerald-400">{t("browse")}<ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="mt-10 overflow-hidden rounded-3xl border border-emerald-900 bg-[#063d36] p-6 text-white shadow-2xl shadow-black/20 sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-emerald-100">
                <Sparkles className="h-4 w-4" />
                AGRIVA Smart Shopping
              </div>

              <h2 className="mt-4 text-2xl font-black sm:text-3xl">
                {t("shoppingTitle")}
              </h2>

              <p className="mt-3 max-w-3xl leading-7 text-emerald-50/90">
                Use AGRIVA insights for crop planning, quality,
                price intelligence and farm operationsï¿½then source
                the inputs you need from one connected store.
              </p>
            </div>

            <Link
              href="/store/products"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-emerald-950 transition hover:bg-emerald-50"
            >
              {t("startShopping")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

function FeatureRow({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-400/10 text-emerald-300">
        {icon}
      </div>

      <div>
        <p className="font-bold">
          {title}
        </p>

        <p className="mt-1 text-xs text-slate-400">
          {text}
        </p>
      </div>
    </div>
  );
}

