"use client";

import {
  BarChart3,
  Bell,
  CloudSun,
  FlaskConical,
  Home,
  Menu,
  PackageSearch,
  ShoppingBasket,
  Sprout,
  Store,
  Tractor,
  Truck,
  Users,
  Scale,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

type DesktopFarmerNavProps = {
  onAlerts?: () => void;
};

function NavLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-12 items-center gap-3 rounded-xl px-3 py-2.5 text-base font-semibold transition ${
        active
          ? "bg-green-50 text-green-800"
          : "text-slate-700 hover:bg-slate-50 hover:text-green-800"
      }`}
    >
      <Icon className="h-5 w-5 shrink-0" aria-hidden={true} />
      <span>{label}</span>
    </Link>
  );
}

export default function DesktopFarmerNav({ onAlerts }: DesktopFarmerNavProps) {
  const pathname = usePathname();
  const nav = useTranslations("navigation");
  const feature = useTranslations("farmerFeatures");
  const fpo = useTranslations("sihFpo");
  const saleDecision = useTranslations("sihSaleDecision");

  const moreItems = [
    { href: "/dashboard/farmer/fpo", label: fpo("navFarmer"), icon: Users },
    { href: "/dashboard/farmer/sale-decision", label: saleDecision("navShort"), icon: Scale },
    { href: "/dashboard/farmer/soil", label: nav("soil"), icon: Sprout },
    { href: "/dashboard/farmer/quality", label: nav("quality"), icon: FlaskConical },
    { href: "/dashboard/farmer/weather", label: feature("weather"), icon: CloudSun },
    { href: "/dashboard/farmer/transport", label: feature("transport"), icon: Truck },
    { href: "/store", label: nav("store"), icon: ShoppingBasket },
    { href: "/dashboard/farmer/analytics", label: nav("analytics"), icon: BarChart3 },
  ];

  return (
    <aside className="agriva-sidebar hidden w-72 shrink-0 border-r bg-white md:block">
      <div className="sticky top-0 flex h-screen flex-col overflow-y-auto p-4">
        <div className="mb-3 px-2 pb-3">
          <p className="text-xs font-black uppercase tracking-[0.15em] text-green-700">AGRIVA</p>
          <p className="mt-1 text-sm leading-5 text-slate-500">{nav("farmerNavigation")}</p>
        </div>

        <nav className="space-y-1" aria-label={nav("farmerNavigation")}>
          <NavLink href="/" label={nav("home")} icon={Home} active={pathname === "/"} />
          <NavLink
            href="/dashboard/farmer"
            label={nav("myFarm")}
            icon={Tractor}
            active={pathname === "/dashboard/farmer"}
          />
          <NavLink
            href="/dashboard/farmer/market"
            label={nav("marketSell")}
            icon={PackageSearch}
            active={["/dashboard/farmer/market", "/dashboard/farmer/price", "/dashboard/farmer/sell", "/dashboard/farmer/transactions"].some((path) => pathname.startsWith(path))}
          />
          <NavLink
            href="/marketplace"
            label={nav("marketplace")}
            icon={Store}
            active={pathname.startsWith("/marketplace")}
          />

          <button
            type="button"
            onClick={onAlerts}
            className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-base font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-green-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
          >
            <Bell className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span>{nav("alerts")}</span>
          </button>
        </nav>

        <details className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-2">
          <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 rounded-xl px-3 py-2.5 text-base font-bold text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600">
            <Menu className="h-5 w-5" aria-hidden="true" />
            {nav("more")}
          </summary>
          <div className="mt-1 space-y-1 border-t border-slate-200 pt-2">
            {moreItems.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                active={pathname.startsWith(item.href)}
              />
            ))}
          </div>
        </details>
      </div>
    </aside>
  );
}


