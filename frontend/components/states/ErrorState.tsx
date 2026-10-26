"use client";

import { CircleAlert, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";

export default function ErrorState({ onRetry, network = false }: { onRetry?: () => void; network?: boolean }) {
  const t = useTranslations("states");
  const common = useTranslations("common");

  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center" role="alert">
      <CircleAlert className="mx-auto h-8 w-8 text-red-700" aria-hidden="true" />
      <h2 className="mt-3 text-lg font-black text-slate-900">{t("errorTitle")}</h2>
      <p className="mx-auto mt-2 max-w-xl text-base leading-6 text-slate-700">
        {network ? t("networkError") : t("errorDescription")}
      </p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex min-h-12 items-center gap-2 rounded-xl bg-green-700 px-5 py-3 font-bold text-white hover:bg-green-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2"
        >
          <RotateCcw className="h-5 w-5" aria-hidden="true" />
          {common("tryAgain")}
        </button>
      ) : null}
    </div>
  );
}
