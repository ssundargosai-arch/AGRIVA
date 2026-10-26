"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & {
    digest?: string;
  };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-lg">
        <h1 className="text-2xl font-bold text-red-600">
          Something went wrong
        </h1>

        <p className="mt-3 text-slate-600">
          AGRIVA encountered an unexpected error.
        </p>

        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-xl bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700"
        >
          Try Again
        </button>
      </div>
    </main>
  );
}