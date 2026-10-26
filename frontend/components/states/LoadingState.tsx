"use client";

import { LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";

export default function LoadingState() {
  const t = useTranslations("states");
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-6 text-center" role="status" aria-live="polite">
      <LoaderCircle className="h-7 w-7 animate-spin text-green-700" aria-hidden="true" />
      <p className="text-base font-semibold text-slate-700">{t("loading")}</p>
    </div>
  );
}
