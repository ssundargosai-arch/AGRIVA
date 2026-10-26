"use client";

import { Bell, Home, IndianRupee, Tractor, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

type FarmerBottomNavProps = {
  onAlerts?: () => void;
  onProfile?: () => void;
};

function ItemContent({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <>
      <Icon className="h-5 w-5" aria-hidden={true} />
      <span className="max-w-full text-center text-[11px] font-bold leading-4 sm:text-xs">{label}</span>
    </>
  );
}

export default function FarmerBottomNav({ onAlerts, onProfile }: FarmerBottomNavProps) {
  const pathname = usePathname();
  const nav = useTranslations("navigation");

  const linkClass = (active: boolean) =>
    `flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 px-1 py-2 text-center transition ${
      active ? "text-green-800" : "text-slate-600 hover:text-green-800"
    }`;

  return (
    <nav
      className="farmer-bottom-nav fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur md:hidden"
      aria-label={nav("farmerNavigation")}
    >
      <div className="grid grid-cols-5">
        <Link href="/" className={linkClass(pathname === "/")} aria-current={pathname === "/" ? "page" : undefined}>
          <ItemContent icon={Home} label={nav("home")} />
        </Link>
        <Link
          href="/dashboard/farmer"
          className={linkClass(pathname === "/dashboard/farmer")}
          aria-current={pathname === "/dashboard/farmer" ? "page" : undefined}
        >
          <ItemContent icon={Tractor} label={nav("myFarm")} />
        </Link>
        <Link
          href="/dashboard/farmer/market"
          className={linkClass(["/dashboard/farmer/market", "/dashboard/farmer/price", "/dashboard/farmer/sell", "/dashboard/farmer/transactions", "/dashboard/farmer/fpo", "/dashboard/farmer/sale-decision"].some((path) => pathname.startsWith(path)))}
          aria-current={["/dashboard/farmer/market", "/dashboard/farmer/price", "/dashboard/farmer/sell", "/dashboard/farmer/transactions", "/dashboard/farmer/fpo"].some((path) => pathname.startsWith(path)) ? "page" : undefined}
        >
          <ItemContent icon={IndianRupee} label={nav("marketSellShort")} />
        </Link>
        <button type="button" onClick={onAlerts} className={linkClass(false)} aria-label={nav("alerts")}>
          <ItemContent icon={Bell} label={nav("alerts")} />
        </button>
        <button type="button" onClick={onProfile} className={linkClass(false)} aria-label={nav("profile")}>
          <ItemContent icon={UserRound} label={nav("profile")} />
        </button>
      </div>
    </nav>
  );
}
