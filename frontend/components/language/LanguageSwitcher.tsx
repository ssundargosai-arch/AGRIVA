"use client";

import { Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

type Locale = "mr" | "hi" | "en";

const STORAGE_KEY = "agriva-language";
const COOKIE_KEY = "AGRIVA_LOCALE";
const SUPPORTED_LOCALES: Locale[] = ["mr", "hi", "en"];

function isSupportedLocale(value: string | null): value is Locale {
  return value !== null && SUPPORTED_LOCALES.includes(value as Locale);
}

function writeLocaleCookie(locale: Locale) {
  document.cookie = `${COOKIE_KEY}=${locale}; path=/; max-age=31536000; SameSite=Lax`;
}

export default function LanguageSwitcher() {
  const router = useRouter();
  const locale = useLocale() as Locale;
  const t = useTranslations("common");

  useEffect(() => {
    try {
      const savedLocale = window.localStorage.getItem(STORAGE_KEY);

      if (isSupportedLocale(savedLocale)) {
        if (savedLocale !== locale) {
          writeLocaleCookie(savedLocale);
          router.refresh();
        }
        return;
      }

      window.localStorage.setItem(STORAGE_KEY, locale);
      writeLocaleCookie(locale);
    } catch {
      // Cookie-based locale still works when localStorage is unavailable.
    }
  }, [locale, router]);

  function changeLanguage(nextLocale: Locale) {
    try {
      window.localStorage.setItem(STORAGE_KEY, nextLocale);
    } catch {
      // Keep language switching functional even if storage is blocked.
    }

    writeLocaleCookie(nextLocale);
    router.refresh();
  }

  return (
    <label className="agriva-language-switcher inline-flex min-h-12 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700">
      <Languages className="h-5 w-5 shrink-0 text-green-700" aria-hidden="true" />
      <span className="sr-only">{t("selectLanguage")}</span>
      <select
        value={locale}
        onChange={(event) => changeLanguage(event.target.value as Locale)}
        className="min-w-0 bg-transparent text-base font-semibold outline-none"
        aria-label={t("selectLanguage")}
      >
        <option value="mr">मराठी</option>
        <option value="hi">हिंदी</option>
        <option value="en">English</option>
      </select>
    </label>
  );
}
