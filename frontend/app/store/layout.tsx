import type { ReactNode } from "react";

import LanguageSelector from "@/components/LanguageSelector";

export default function StoreLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <div className="sticky top-0 z-[70] border-b border-emerald-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-end px-4 py-2 sm:px-6 lg:px-8">
          <LanguageSelector />
        </div>
      </div>

      <div className="pb-20">
        {children}
      </div>

      <style>{`
        body .agriva-global-theme-toggle {
          left: auto !important;
          right: 1rem !important;
          bottom: 1rem !important;
          width: 3rem !important;
          height: 3rem !important;
          min-width: 3rem !important;
          padding: 0 !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          border-radius: 9999px !important;
          z-index: 60 !important;
        }

        body
          .agriva-global-theme-toggle
          .agriva-theme-toggle-label {
          display: none !important;
        }

        @media (max-width: 640px) {
          body .agriva-global-theme-toggle {
            right: 0.75rem !important;
            bottom: 0.75rem !important;
          }
        }
      `}</style>
    </>
  );
}
