"use client";

import { ArrowLeft, Leaf, Moon, Sun } from "lucide-react";
import Link from "next/link";

import LanguageSelector from "@/components/LanguageSelector";
import { useTheme } from "@/app/components/ThemeProvider";

type Props = {
  title: string;
  subtitle: string;
  backLabel: string;
  backHref?: string;
  showThemeControl?: boolean;
};

export default function FarmerPhase3Header({
  title,
  subtitle,
  backLabel,
  backHref = "/dashboard/farmer",
  showThemeControl = false,
}: Props) {
  const { theme, mounted, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 border-b border-[#D7E3DA] bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#0F7A4A] text-white shadow-sm">
            <Leaf className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-black text-[#0F172A] sm:text-xl">{title}</p>
            <p className="truncate text-xs text-slate-600 sm:text-sm">{subtitle}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <LanguageSelector />
          {showThemeControl && mounted ? (
            <button
              type="button"
              onClick={toggleTheme}
              className="grid h-12 w-12 place-items-center rounded-xl border border-[#D7E3DA] bg-white text-slate-700 shadow-sm transition hover:bg-[#F4F7F2]"
              aria-label="Toggle AGRIVA color theme"
              title={theme === "dark" ? "Light mode" : "Dark mode"}
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          ) : null}
          <Link
            href={backHref}
            className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-[#D7E3DA] bg-white px-3 font-semibold text-slate-700 transition hover:bg-[#F4F7F2]"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="hidden sm:inline">{backLabel}</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
