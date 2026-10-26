"use client";

import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  CloudSun,
  Leaf,
  ShoppingBag,
  Sprout,
  Store,
} from "lucide-react";
import { useTranslations } from "next-intl";

import LanguageSelector from "@/components/LanguageSelector";

export default function HomePage() {
  const t = useTranslations();

  const features = [
    {
      title: t("ai.title"),
      description: t("ai.subtitle"),
      icon: BrainCircuit,
      href: "/dashboard/farmer",
    },
    {
      title: t("soil.title"),
      description: t("soil.subtitle"),
      icon: Sprout,
      href: "/dashboard/farmer",
    },
    {
      title: t("marketplace.title"),
      description: t("marketplace.subtitle"),
      icon: Store,
      href: "/marketplace",
    },
    {
      title: t("weather.title"),
      description: t("weather.forecast"),
      icon: CloudSun,
      href: "/dashboard/farmer/weather",
    },
    {
      title: t("store.title"),
      description: t("store.subtitle"),
      icon: ShoppingBag,
      href: "/store",
    },
    {
      title: t("analytics.title"),
      description: t("dashboard.viewAnalytics"),
      icon: BarChart3,
      href: "/dashboard/farmer/analytics",
    },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 via-white to-white text-slate-900">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-green-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-2"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-600 text-white">
              <Leaf className="h-6 w-6" />
            </div>

            <span className="text-2xl font-bold tracking-tight text-green-700">
              {t("common.appName")}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-7 lg:flex">
            <Link
              href="/"
              className="font-medium text-green-700 transition hover:text-green-800"
            >
              {t("navigation.home")}
            </Link>

            <Link
              href="/marketplace"
              className="font-medium text-slate-600 transition hover:text-green-700"
            >
              {t("navigation.marketplace")}
            </Link>

            <Link
              href="/store"
              className="font-medium text-slate-600 transition hover:text-green-700"
            >
              {t("navigation.store")}
            </Link>

            <Link
              href="/dashboard/farmer/weather"
              className="font-medium text-slate-600 transition hover:text-green-700"
            >
              {t("navigation.weather")}
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block">
              <LanguageSelector />
            </div>

            <Link
              href="/login"
              className="rounded-xl border border-green-600 px-4 py-2 text-sm font-semibold text-green-700 transition hover:bg-green-50"
            >
              {t("login.login")}
            </Link>
          </div>
        </div>

        {/* Mobile language selector */}
        <div className="border-t border-green-50 px-4 py-3 sm:hidden">
          <LanguageSelector />
        </div>
      </header>

      {/* Hero */}
      <section className="agriva-home-hero relative overflow-hidden">
        <div className="absolute -left-32 top-20 h-72 w-72 rounded-full bg-green-100/70 blur-3xl" />
        <div className="absolute -right-32 top-0 h-72 w-72 rounded-full bg-emerald-100/70 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 md:py-28 lg:grid-cols-2 lg:px-8">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-700">
              <Sprout className="h-4 w-4" />
              {t("dashboard.aiRecommendation")}
            </div>

            <h1 className="max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              {t("dashboard.welcome")}
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
              {t("dashboard.subtitle")}
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-3.5 font-semibold text-white shadow-lg shadow-green-600/20 transition hover:bg-green-700"
              >
                {t("navigation.dashboard")}
                <ArrowRight className="h-5 w-5" />
              </Link>

              <Link
                href="/marketplace"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3.5 font-semibold text-slate-700 transition hover:border-green-300 hover:bg-green-50"
              >
                {t("navigation.marketplace")}
              </Link>
            </div>
          </div>

          {/* Hero Card */}
          <div className="relative">
            <div className="rounded-3xl border border-green-100 bg-white p-6 shadow-2xl shadow-green-900/10 sm:p-8">
              <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    {t("dashboard.title")}
                  </p>

                  <h2 className="mt-1 text-2xl font-bold text-green-700">
                    {t("common.appName")}
                  </h2>
                </div>

                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-100">
                  <Leaf className="h-7 w-7 text-green-700" />
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4">
                <DashboardPreviewCard
                  title={t("dashboard.totalFarms")}
                  value="3"
                />

                <DashboardPreviewCard
                  title={t("dashboard.activeCrops")}
                  value="8"
                />

                <DashboardPreviewCard
                  title={t("dashboard.totalOrders")}
                  value="13"
                />

                <DashboardPreviewCard
                  title={t("dashboard.totalIncome")}
                  value="₹2,240"
                />
              </div>

              <div className="mt-6 rounded-2xl bg-green-50 p-5">
                <div className="flex items-center gap-3">
                  <BrainCircuit className="h-6 w-6 text-green-700" />

                  <h3 className="font-semibold text-green-800">
                    {t("dashboard.aiRecommendation")}
                  </h3>
                </div>

                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {t("ai.subtitle")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-y border-slate-100 bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <span className="text-sm font-bold uppercase tracking-wider text-green-600">
              {t("common.appName")}
            </span>

            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              {t("ai.title")}
            </h2>

            <p className="mt-4 text-lg text-slate-600">
              {t("ai.subtitle")}
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <Link
                  key={feature.title}
                  href={feature.href}
                  className="group rounded-2xl border border-slate-200 bg-white p-6 transition duration-200 hover:-translate-y-1 hover:border-green-200 hover:shadow-xl"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 transition group-hover:bg-green-600">
                    <Icon className="h-6 w-6 text-green-700 transition group-hover:text-white" />
                  </div>

                  <h3 className="mt-5 text-xl font-bold text-slate-900">
                    {feature.title}
                  </h3>

                  <p className="mt-3 min-h-[48px] text-sm leading-6 text-slate-600">
                    {feature.description}
                  </p>

                  <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-green-700">
                    {t("common.view")}

                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Marketplace */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 rounded-3xl bg-green-700 px-6 py-12 text-white sm:px-10 lg:grid-cols-2 lg:px-14">
            <div>
              <Store className="h-10 w-10" />

              <h2 className="mt-5 text-3xl font-bold sm:text-4xl">
                {t("marketplace.title")}
              </h2>

              <p className="mt-4 max-w-xl text-lg leading-8 text-green-50">
                {t("marketplace.subtitle")}
              </p>

              <Link
                href="/marketplace"
                className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-green-700 transition hover:bg-green-50"
              >
                {t("navigation.marketplace")}
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <InfoCard
                title={t("marketplace.availableCrops")}
                value="Fresh Crops"
              />

              <InfoCard
                title={t("marketplace.buyers")}
                value="Direct Buyers"
              />

              <InfoCard
                title={t("marketplace.bestMatch")}
                value="AI Matching"
              />

              <InfoCard
                title={t("marketplace.pricePerKg")}
                value="Better Prices"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Store */}
      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <ShoppingBag className="mx-auto h-10 w-10 text-green-700" />

            <h2 className="mt-4 text-3xl font-bold text-slate-900">
              {t("store.title")}
            </h2>

            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
              {t("store.subtitle")}
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <StoreCategory
              title={t("store.seeds")}
              description={t("store.products")}
            />

            <StoreCategory
              title={t("store.fertilizers")}
              description={t("store.products")}
            />

            <StoreCategory
              title={t("store.organicProducts")}
              description={t("store.products")}
            />
          </div>

          <div className="mt-10 text-center">
            <Link
              href="/store"
              className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-6 py-3 font-semibold text-white transition hover:bg-green-700"
            >
              {t("navigation.store")}
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="rounded-3xl border border-green-100 bg-green-50 px-6 py-12 text-center sm:px-12">
            <Leaf className="mx-auto h-12 w-12 text-green-700" />

            <h2 className="mt-5 text-3xl font-bold text-slate-900">
              {t("dashboard.welcome")}
            </h2>

            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
              {t("dashboard.subtitle")}
            </p>

            <Link
              href="/login"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-green-600 px-7 py-3.5 font-semibold text-white transition hover:bg-green-700"
            >
              {t("login.login")}
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 px-4 py-8 sm:px-6 md:flex-row lg:px-8">
          <div className="flex items-center gap-2">
            <Leaf className="h-6 w-6 text-green-700" />

            <span className="text-xl font-bold text-green-700">
              {t("common.appName")}
            </span>
          </div>

          <p className="text-center text-sm text-slate-500">
            Empowering Farmers, Connecting Markets.
          </p>

          <div className="flex gap-5 text-sm">
            <Link
              href="/marketplace"
              className="text-slate-500 hover:text-green-700"
            >
              {t("navigation.marketplace")}
            </Link>

            <Link
              href="/store"
              className="text-slate-500 hover:text-green-700"
            >
              {t("navigation.store")}
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

function DashboardPreviewCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <p className="text-xs font-medium text-slate-500 sm:text-sm">
        {title}
      </p>

      <p className="mt-2 text-xl font-bold text-slate-900 sm:text-2xl">
        {value}
      </p>
    </div>
  );
}

function InfoCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-white/10 p-5 backdrop-blur">
      <p className="text-sm text-green-100">
        {title}
      </p>

      <p className="mt-2 text-xl font-bold">
        {value}
      </p>
    </div>
  );
}

function StoreCategory({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center transition hover:border-green-200 hover:shadow-lg">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-green-100">
        <Sprout className="h-6 w-6 text-green-700" />
      </div>

      <h3 className="mt-4 text-xl font-bold text-slate-900">
        {title}
      </h3>

      <p className="mt-2 text-sm text-slate-600">
        {description}
      </p>
    </div>
  );
}