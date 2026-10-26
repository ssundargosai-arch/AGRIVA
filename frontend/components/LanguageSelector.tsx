"use client";

import { Languages } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

type Locale = "mr" | "hi" | "en";

function readLocale(): Locale {
  if (typeof document === "undefined") return "mr";
  const match = document.cookie.match(/(?:^|;\s*)AGRIVA_LOCALE=([^;]+)/);
  const value = match?.[1];
  return value === "hi" || value === "en" || value === "mr" ? value : "mr";
}

export default function LanguageSelector() {
  const router = useRouter();
  const t = useTranslations("common");
  const [locale, setLocale] = useState<Locale>("mr");

  useEffect(() => {
    setLocale(readLocale());
  }, []);

  function changeLanguage(value: Locale) {
    setLocale(value);
    document.cookie = `AGRIVA_LOCALE=${value}; path=/; max-age=31536000; SameSite=Lax`;
    try { localStorage.setItem("agriva-language", value); } catch {}
    window.location.reload();
  }

  return (
    <div className="flex min-h-11 items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2 shadow-sm">
      <Languages className="h-4 w-4 text-emerald-700" aria-hidden="true" />
      <select
        value={locale}
        onChange={(event) => changeLanguage(event.target.value as Locale)}
        className="bg-transparent text-sm font-semibold text-slate-700 outline-none"
        aria-label={t("selectLanguage")}
      >
        <option value="mr">{"\u092E\u0930\u093E\u0920\u0940"}</option>
        <option value="hi">{"\u0939\u093F\u0902\u0926\u0940"}</option>
        <option value="en">English</option>
      </select>
    </div>
  );
}



