"use client";

import { Bell, Leaf, LogOut, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";

import LanguageSwitcher from "@/components/language/LanguageSwitcher";

type FarmerHeaderProps = {
  farmerName?: string;
  farmerRole?: string;
  onLogout?: () => void;
  onNotifications?: () => void;
  onProfile?: () => void;
};

export default function FarmerHeader({
  farmerName,
  farmerRole,
  onLogout,
  onNotifications,
  onProfile,
}: FarmerHeaderProps) {
  const t = useTranslations("farmerHeader");
  const common = useTranslations("common");

  const initial = farmerName?.trim().charAt(0).toUpperCase() || "F";

  return (
    <header className="agriva-farmer-header sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-green-700 text-white">
            <Leaf className="h-7 w-7" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-xl font-black tracking-tight text-green-800">AGRIVA</span>
              <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-bold text-green-800">
                {t("contextLabel")}
              </span>
            </div>
            <p className="mt-0.5 text-sm leading-5 text-slate-600">{t("subtitle")}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <LanguageSwitcher />

          {onNotifications ? (
            <button
              type="button"
              onClick={onNotifications}
              className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-slate-700 transition hover:bg-green-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
              aria-label={t("notifications")}
              title={t("notifications")}
            >
              <Bell className="h-5 w-5" aria-hidden="true" />
            </button>
          ) : null}

          <button
            type="button"
            onClick={onProfile}
            className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
            aria-label={t("profile")}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 text-sm font-black text-green-800">
              {farmerName ? initial : <UserRound className="h-4 w-4" aria-hidden="true" />}
            </span>
            <span className="hidden max-w-32 sm:block">
              <span className="block truncate text-sm font-bold text-slate-800">
                {farmerName || t("profile")}
              </span>
              {farmerRole ? (
                <span className="block truncate text-xs text-slate-500">{farmerRole}</span>
              ) : null}
            </span>
          </button>

          {onLogout ? (
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 font-semibold text-red-700 transition hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              aria-label={common("logout")}
            >
              <LogOut className="h-5 w-5" aria-hidden="true" />
              <span className="hidden sm:inline">{common("logout")}</span>
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
