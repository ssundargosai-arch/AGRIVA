"use client";

import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { useRouter } from "next/navigation";

import {
  Activity,
  Bell,
  Bot,
  Boxes,
  Building2,
  CreditCard,
  IndianRupee,
  LayoutDashboard,
  ListChecks,
  Loader2,
  LogOut,
  MapPinned,
  Package,
  RefreshCw,
  ShoppingCart,
  Sprout,
  Store,
  UserCheck,
  Users,
  Wheat,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000";

/* =========================================================
   TYPES
========================================================= */

type UserData = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: string;
  is_active: boolean;
};

type DashboardStats = {
  total_users: number;
  total_farmers: number;
  total_buyers: number;
  total_products: number;
  total_listings: number;
  active_listings: number;
  total_orders: number;
  total_payments: number;
  revenue: number;
  ai_predictions: {
    total: number;
    price: number | null;
    quality: number | null;
    crop_health: number | null;
  };
  unread_notifications: number;
};

type Order = {
  id: string;
  listing_id: string;
  buyer_id: string;
  total_amount: number;
  status: string;
  created_at: string;
};

type DashboardResponse = {
  stats: DashboardStats;
  recent_orders: Order[];
};

type Farmer = {
  farmer_id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  village: string;
  district: string;
  state: string;
  language: string;
};

type Buyer = {
  buyer_id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  business_name: string;
  business_type: string;
  city: string;
  state: string;
};

type Product = {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  stock_quantity: number;
};

type Payment = {
  id: string;
  order_id: string;
  amount: number;
  payment_method: string;
  status: string;
};

type Listing = {
  id: string;
  crop_id: string;
  quantity_kg: number;
  expected_price_per_kg: number;
  quality_grade: string | null;
  location: string | null;
  harvest_date: string | null;
  images: string[] | null;
  status: string;
  created_at: string;
};

type Notification = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  is_read: boolean;
};

type AIStats = {
  total: number;
  price_predictions: number | null;
  quality_predictions: number | null;
  crop_health_analyses: number | null;
};

type RegionalActivity = {
  state: string;
  farmers: number;
  buyers: number | null;
};

type Section =
  | "overview"
  | "users"
  | "farmers"
  | "buyers"
  | "products"
  | "orders"
  | "payments"
  | "listings"
  | "notifications";

/* =========================================================
   COMPONENT
========================================================= */

export default function AdminDashboardPage() {
  const router = useRouter();
  
  const [section, setSection] =
    useState<Section>("overview");

  const [currentUser, setCurrentUser] =
    useState<UserData | null>(null);

  const [dashboard, setDashboard] =
    useState<DashboardResponse | null>(null);

  const [users, setUsers] =
    useState<UserData[]>([]);

  const [farmers, setFarmers] =
    useState<Farmer[]>([]);

  const [buyers, setBuyers] =
    useState<Buyer[]>([]);

  const [products, setProducts] =
    useState<Product[]>([]);

  const [orders, setOrders] =
    useState<Order[]>([]);

  const [payments, setPayments] =
    useState<Payment[]>([]);

  const [listings, setListings] =
    useState<Listing[]>([]);

  const [notifications, setNotifications] =
    useState<Notification[]>([]);

  const [aiStats, setAIStats] =
    useState<AIStats | null>(null);

  const [regionalActivity, setRegionalActivity] =
    useState<RegionalActivity[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [theme, setTheme] =
    useState<"light" | "dark">("light");

  useEffect(() => {
    const savedTheme =
      localStorage.getItem("agriva_theme");

    if (
      savedTheme === "light" ||
      savedTheme === "dark"
    ) {
      setTheme(savedTheme);
      return;
    }

    setTheme(
      window.matchMedia?.(
        "(prefers-color-scheme: dark)"
      ).matches
        ? "dark"
        : "light"
    );
  }, []);

  function toggleTheme() {
    setTheme((current) => {
      const next =
        current === "dark"
          ? "light"
          : "dark";

      localStorage.setItem(
        "agriva_theme",
        next
      );

      return next;
    });
  }

  /* =========================================================
     AUTH HELPERS
  ========================================================= */

  const getToken = () => {
    if (typeof window === "undefined") {
      return null;
    }

    return (
      localStorage.getItem("access_token") ||
      localStorage.getItem("token")
    );
  };

  const authorizedFetch = useCallback(
    async (
      path: string,
      options?: RequestInit
    ) => {
      const token = getToken();

      if (!token) {
        router.replace("/login");
        throw new Error(
          "Authentication required"
        );
      }

      const response = await fetch(
        `${API_URL}${path}`,
        {
          ...options,
          headers: {
            "Content-Type":
              "application/json",
            Authorization:
              `Bearer ${token}`,
            ...(options?.headers || {}),
          },
        }
      );

      if (response.status === 401) {
        localStorage.removeItem(
          "access_token"
        );

        localStorage.removeItem(
          "refresh_token"
        );

        localStorage.removeItem(
          "token"
        );

        router.replace("/login");

        throw new Error(
          "Session expired"
        );
      }

      if (response.status === 403) {
        throw new Error(
          "Admin access required"
        );
      }

      if (!response.ok) {
        let message =
          `Request failed (${response.status})`;

        try {
          const body =
            await response.json();

          if (body?.detail) {
            message = body.detail;
          }
        } catch {
          // Ignore invalid JSON response.
        }

        throw new Error(message);
      }

      return response.json();
    },
    [router]
  );

  /* =========================================================
     LOAD DATA
  ========================================================= */

  const loadAdminData = useCallback(
    async (silent = false) => {
      if (!silent) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError("");

      try {
        const me =
          (await authorizedFetch(
            "/api/auth/me"
          )) as UserData;

        if (me.role !== "ADMIN") {
          if (me.role === "FARMER") {
            router.replace(
              "/dashboard/farmer"
            );
          } else if (
            me.role === "BUYER"
          ) {
            router.replace(
              "/dashboard/buyer"
            );
          } else {
            router.replace("/login");
          }

          return;
        }

        setCurrentUser(me);

        const [
          dashboardData,
          usersData,
          farmersData,
          buyersData,
          productsData,
          ordersData,
          paymentsData,
          listingsData,
          notificationsData,
        ] = await Promise.all([
          authorizedFetch(
            "/api/admin/dashboard"
          ),
          authorizedFetch(
            "/api/admin/users"
          ),
          authorizedFetch(
            "/api/admin/farmers"
          ),
          authorizedFetch(
            "/api/admin/buyers"
          ),
          authorizedFetch(
            "/api/admin/products"
          ),
          authorizedFetch(
            "/api/admin/orders"
          ),
          authorizedFetch(
            "/api/admin/payments"
          ),
          authorizedFetch(
            "/api/admin/listings"
          ),
          authorizedFetch(
            "/api/admin/notifications"
          ),
        ]);

        const normalizedUsers =
          extractArray<unknown>(
            usersData,
            ["users", "data", "items"]
          )
            .map((value, index) => {
              if (!isRecord(value)) {
                return null;
              }

              return {
                id: toText(
                  value.id,
                  `user-${index}`
                ),
                full_name: toText(
                  value.full_name ?? value.name,
                  "User"
                ),
                email: toText(
                  value.email,
                  "—"
                ),
                phone: toNullableText(
                  value.phone
                ),
                role: toText(
                  value.role,
                  "USER"
                ),
                is_active: toBoolean(
                  value.is_active,
                  true
                ),
              } satisfies UserData;
            })
            .filter(
              (value): value is UserData =>
                value !== null
            );

        const usersById = new Map(
          normalizedUsers.map((user) => [
            user.id,
            user,
          ])
        );

        const normalizedFarmers =
          extractArray<unknown>(
            farmersData,
            ["farmers", "data", "items"]
          )
            .map((value, index) => {
              if (!isRecord(value)) {
                return null;
              }

              const userId = toText(
                value.user_id
              );
              const user =
                usersById.get(userId);

              return {
                farmer_id: toText(
                  value.farmer_id ?? value.id,
                  `farmer-${index}`
                ),
                user_id: userId,
                name: toText(
                  value.name ??
                    value.full_name ??
                    user?.full_name,
                  "Farmer"
                ),
                email: toText(
                  value.email ?? user?.email,
                  "—"
                ),
                phone: toNullableText(
                  value.phone ?? user?.phone
                ),
                is_active: toBoolean(
                  value.is_active ??
                    user?.is_active,
                  true
                ),
                village: toText(
                  value.village,
                  "—"
                ),
                district: toText(
                  value.district,
                  "—"
                ),
                state: toText(
                  value.state,
                  "—"
                ),
                language: toText(
                  value.language,
                  "—"
                ),
              } satisfies Farmer;
            })
            .filter(
              (value): value is Farmer =>
                value !== null
            );

        const normalizedBuyers =
          extractArray<unknown>(
            buyersData,
            ["buyers", "data", "items"]
          )
            .map((value, index) => {
              if (!isRecord(value)) {
                return null;
              }

              const userId = toText(
                value.user_id
              );
              const user =
                usersById.get(userId);

              return {
                buyer_id: toText(
                  value.buyer_id ?? value.id,
                  `buyer-${index}`
                ),
                user_id: userId,
                name: toText(
                  value.name ??
                    value.full_name ??
                    user?.full_name,
                  "Buyer"
                ),
                email: toText(
                  value.email ?? user?.email,
                  "—"
                ),
                phone: toNullableText(
                  value.phone ?? user?.phone
                ),
                is_active: toBoolean(
                  value.is_active ??
                    user?.is_active,
                  true
                ),
                business_name: toText(
                  value.business_name,
                  "—"
                ),
                business_type: toText(
                  value.business_type,
                  "—"
                ),
                city: toText(
                  value.city,
                  "—"
                ),
                state: toText(
                  value.state,
                  "—"
                ),
              } satisfies Buyer;
            })
            .filter(
              (value): value is Buyer =>
                value !== null
            );

        const normalizedProducts =
          extractArray<unknown>(
            productsData,
            ["products", "data", "items"]
          )
            .map((value, index) => {
              if (!isRecord(value)) {
                return null;
              }

              return {
                id: toText(
                  value.id,
                  `product-${index}`
                ),
                category_id: toText(
                  value.category_id
                ),
                name: toText(
                  value.name,
                  "Unnamed product"
                ),
                description: toNullableText(
                  value.description
                ),
                price: toNumber(
                  value.price,
                  0
                ),
                stock_quantity: toNumber(
                  value.stock_quantity,
                  0
                ),
              } satisfies Product;
            })
            .filter(
              (value): value is Product =>
                value !== null
            );

        const normalizedOrders =
          extractArray<unknown>(
            ordersData,
            ["orders", "data", "items"]
          )
            .map((value, index) => {
              if (!isRecord(value)) {
                return null;
              }

              return {
                id: toText(
                  value.id,
                  `order-${index}`
                ),
                listing_id: toText(
                  value.listing_id
                ),
                buyer_id: toText(
                  value.buyer_id
                ),
                total_amount: toNumber(
                  value.total_amount ??
                    value.amount,
                  0
                ),
                status: toText(
                  value.status,
                  "unknown"
                ),
                created_at: toText(
                  value.created_at
                ),
              } satisfies Order;
            })
            .filter(
              (value): value is Order =>
                value !== null
            );

        const normalizedPayments =
          extractArray<unknown>(
            paymentsData,
            ["payments", "data", "items"]
          )
            .map((value, index) => {
              if (!isRecord(value)) {
                return null;
              }

              return {
                id: toText(
                  value.id,
                  `payment-${index}`
                ),
                order_id: toText(
                  value.order_id
                ),
                amount: toNumber(
                  value.amount,
                  0
                ),
                payment_method: toText(
                  value.payment_method ??
                    value.method,
                  "—"
                ),
                status: toText(
                  value.status,
                  "unknown"
                ),
              } satisfies Payment;
            })
            .filter(
              (value): value is Payment =>
                value !== null
            );

        const normalizedListings =
          extractArray<unknown>(
            listingsData,
            ["listings", "data", "items"]
          )
            .map((value, index) => {
              if (!isRecord(value)) {
                return null;
              }

              return {
                id: toText(
                  value.id,
                  `listing-${index}`
                ),
                crop_id: toText(
                  value.crop_id
                ),
                quantity_kg: toNumber(
                  value.quantity_kg,
                  0
                ),
                expected_price_per_kg:
                  toNumber(
                    value.expected_price_per_kg,
                    0
                  ),
                quality_grade: toNullableText(
                  value.quality_grade
                ),
                location: toNullableText(
                  value.location
                ),
                harvest_date: toNullableText(
                  value.harvest_date
                ),
                images: toStringArray(
                  value.images
                ),
                status: toText(
                  value.status,
                  "unknown"
                ),
                created_at: toText(
                  value.created_at
                ),
              } satisfies Listing;
            })
            .filter(
              (value): value is Listing =>
                value !== null
            );

        const normalizedNotifications =
          extractArray<unknown>(
            notificationsData,
            ["notifications", "data", "items"]
          )
            .map((value, index) => {
              if (!isRecord(value)) {
                return null;
              }

              return {
                id: toText(
                  value.id,
                  `notification-${index}`
                ),
                user_id: toText(
                  value.user_id
                ),
                title: toText(
                  value.title,
                  "Notification"
                ),
                message: toText(
                  value.message
                ),
                is_read: toBoolean(
                  value.is_read,
                  false
                ),
              } satisfies Notification;
            })
            .filter(
              (value): value is Notification =>
                value !== null
            );

        const rawDashboard =
          isRecord(dashboardData)
            ? dashboardData
            : {};

        const rawStatsValue =
          rawDashboard.stats ??
          rawDashboard.statistics;

        const rawStats =
          isRecord(rawStatsValue)
            ? rawStatsValue
            : {};

        const rawAI =
          rawStats.ai_predictions;

        let aiTotal = 0;
        let aiPrice: number | null = null;
        let aiQuality: number | null = null;
        let aiCropHealth: number | null = null;

        if (
          typeof rawAI === "number" ||
          typeof rawAI === "string"
        ) {
          aiTotal = toNumber(rawAI, 0);
        } else if (isRecord(rawAI)) {
          aiTotal = toNumber(
            rawAI.total,
            0
          );

          aiPrice = toOptionalNumber(
            rawAI.price ??
              rawAI.price_predictions
          );

          aiQuality = toOptionalNumber(
            rawAI.quality ??
              rawAI.quality_predictions
          );

          aiCropHealth = toOptionalNumber(
            rawAI.crop_health ??
              rawAI.crop_health_analyses
          );
        }

        const normalizedAIStats: AIStats = {
          total: aiTotal,
          price_predictions: aiPrice,
          quality_predictions: aiQuality,
          crop_health_analyses:
            aiCropHealth,
        };

        const rawRegions =
          extractArray<unknown>(
            rawDashboard.regional_activity ??
              rawDashboard.regions ??
              [],
            [
              "regional_activity",
              "regions",
              "data",
              "items",
            ]
          );

        const normalizedRegions =
          rawRegions
            .map((value) => {
              if (!isRecord(value)) {
                return null;
              }

              const stateValue =
                value.state ??
                value.region ??
                value.name;

              if (
                typeof stateValue !== "string"
              ) {
                return null;
              }

              return {
                state: stateValue,
                farmers: toNumber(
                  value.farmers,
                  0
                ),
                buyers: toOptionalNumber(
                  value.buyers
                ),
              } satisfies RegionalActivity;
            })
            .filter(
              (
                value
              ): value is RegionalActivity =>
                value !== null
            );

        const rawRecentOrders =
          extractArray<Order>(
            rawDashboard.recent_orders ??
              [],
            [
              "recent_orders",
              "orders",
              "data",
              "items",
            ]
          );

        const recentOrders =
          rawRecentOrders.length > 0
            ? rawRecentOrders
            : [...normalizedOrders]
                .sort(
                  (a, b) =>
                    new Date(
                      b.created_at
                    ).getTime() -
                    new Date(
                      a.created_at
                    ).getTime()
                )
                .slice(0, 5);

        const normalizedStats: DashboardStats = {
          total_users: toNumber(
            rawStats.total_users,
            normalizedUsers.length
          ),
          total_farmers: toNumber(
            rawStats.total_farmers,
            normalizedFarmers.length
          ),
          total_buyers: toNumber(
            rawStats.total_buyers,
            normalizedBuyers.length
          ),
          total_products: toNumber(
            rawStats.total_products,
            normalizedProducts.length
          ),
          total_listings: toNumber(
            rawStats.total_listings ??
              rawStats.listings,
            normalizedListings.length
          ),
          active_listings: toNumber(
            rawStats.active_listings,
            normalizedListings.filter(
              (listing) =>
                listing.status
                  ?.toLowerCase() ===
                "active"
            ).length
          ),
          total_orders: toNumber(
            rawStats.total_orders ??
              rawStats.orders,
            normalizedOrders.length
          ),
          total_payments: toNumber(
            rawStats.total_payments,
            normalizedPayments.length
          ),
          revenue: toNumber(
            rawStats.revenue,
            0
          ),
          ai_predictions: {
            total: normalizedAIStats.total,
            price:
              normalizedAIStats
                .price_predictions,
            quality:
              normalizedAIStats
                .quality_predictions,
            crop_health:
              normalizedAIStats
                .crop_health_analyses,
          },
          unread_notifications: toNumber(
            rawStats.unread_notifications,
            normalizedNotifications.filter(
              (notification) =>
                !notification.is_read
            ).length
          ),
        };

        const normalizedDashboard: DashboardResponse = {
          stats: normalizedStats,
          recent_orders: recentOrders,
        };

        setDashboard(
          normalizedDashboard
        );

        setUsers(normalizedUsers);
        setFarmers(normalizedFarmers);
        setBuyers(normalizedBuyers);
        setProducts(normalizedProducts);
        setOrders(normalizedOrders);
        setPayments(normalizedPayments);
        setListings(normalizedListings);
        setNotifications(
          normalizedNotifications
        );
        setAIStats(normalizedAIStats);
        setRegionalActivity(
          normalizedRegions
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load admin dashboard"
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      authorizedFetch,
      router,
    ]
  );

  useEffect(() => {
    void loadAdminData();
  }, [loadAdminData]);

  /* =========================================================
     LOGOUT
  ========================================================= */

  function logout() {
    localStorage.removeItem(
      "access_token"
    );

    localStorage.removeItem(
      "refresh_token"
    );

    localStorage.removeItem("token");

    router.replace("/login");
  }

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">

        <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
          <a
            href="/dashboard/admin/buyer-verification"
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-black text-emerald-800 transition hover:bg-emerald-100"
          >
            ✓ Buyer Verification Review
          </a>
        </div>
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-emerald-700" />

          <p className="mt-4 text-sm text-slate-500">
            Loading AGRIVA Admin...
          </p>
        </div>
      </main>
    );
  }

  /* =========================================================
     ERROR WITHOUT DASHBOARD
  ========================================================= */

  if (!dashboard) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-lg rounded-3xl bg-white p-8 text-center shadow-sm">
          <Activity className="mx-auto h-12 w-12 text-red-400" />

          <h1 className="mt-4 text-2xl font-bold">
            Admin Dashboard Error
          </h1>

          <p className="mt-2 text-sm text-red-600">
            {error ||
              "Unable to load dashboard."}
          </p>

          <button
            type="button"
            onClick={() =>
              void loadAdminData()
            }
            className="mt-6 rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  const stats = dashboard.stats;

  /* =========================================================
     PAGE
  ========================================================= */

  return (
    <main
      className={`agriva-role-dashboard agriva-admin min-h-screen ${
        theme === "dark"
          ? "agriva-dark bg-slate-950 text-slate-100"
          : "bg-[#f6f8f5] text-slate-900"
      }`}
    >
      {/* HEADER */}

      <header className="agriva-role-topbar border-b bg-white">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-4 lg:px-8">
          <div>
            <div className="flex items-center gap-2">
              <Sprout className="h-7 w-7 text-emerald-700" />

              <h1 className="text-xl font-bold text-slate-900">
                AGRIVA Admin
              </h1>
            </div>

            <p className="mt-1 text-xs text-slate-500">
              Platform management and analytics
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                void loadAdminData(true)
              }
              disabled={refreshing}
              className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  refreshing
                    ? "animate-spin"
                    : ""
                }`}
              />

              Refresh
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              title={
                theme === "dark"
                  ? "Light mode"
                  : "Dark mode"
              }
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              {theme === "dark"
                ? "☀️ Light"
                : "🌙 Dark"}
            </button>

            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold">
                {currentUser?.full_name}
              </p>

              <p className="text-xs text-slate-500">
                Administrator
              </p>
            </div>

            <button
              type="button"
              onClick={logout}
              className="rounded-xl bg-red-50 p-2.5 text-red-600 hover:bg-red-100"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1600px] gap-6 px-4 py-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:px-8">
        {/* SIDEBAR */}

        <aside className="h-fit rounded-2xl bg-white p-3 shadow-sm">
          <nav className="space-y-1">
            <NavButton
              active={
                section === "overview"
              }
              icon={
                <LayoutDashboard className="h-4 w-4" />
              }
              label="Overview"
              onClick={() =>
                setSection("overview")
              }
            />

            <NavButton
              active={
                section === "users"
              }
              icon={
                <Users className="h-4 w-4" />
              }
              label="Users"
              onClick={() =>
                setSection("users")
              }
            />

            <NavButton
              active={
                section === "farmers"
              }
              icon={
                <Wheat className="h-4 w-4" />
              }
              label="Farmers"
              onClick={() =>
                setSection("farmers")
              }
            />

            <NavButton
              active={
                section === "buyers"
              }
              icon={
                <Building2 className="h-4 w-4" />
              }
              label="Buyers"
              onClick={() =>
                setSection("buyers")
              }
            />

            <NavButton
              active={
                section === "products"
              }
              icon={
                <Boxes className="h-4 w-4" />
              }
              label="Products"
              onClick={() =>
                setSection("products")
              }
            />

            <NavButton
              active={
                section === "orders"
              }
              icon={
                <ShoppingCart className="h-4 w-4" />
              }
              label="Orders"
              onClick={() =>
                setSection("orders")
              }
            />

            <NavButton
              active={
                section === "payments"
              }
              icon={
                <CreditCard className="h-4 w-4" />
              }
              label="Payments"
              onClick={() =>
                setSection("payments")
              }
            />

            <NavButton
              active={
                section === "listings"
              }
              icon={
                <ListChecks className="h-4 w-4" />
              }
              label="Listings"
              onClick={() =>
                setSection("listings")
              }
            />

                        <NavButton
              active={false}
              icon={
                <ListChecks className="h-4 w-4" />
              }
              label="Grievances"
              onClick={() =>
                router.push(
                  "/dashboard/admin/grievances"
                )
              }
            />
<NavButton
              active={
                section ===
                "notifications"
              }
              icon={
                <Bell className="h-4 w-4" />
              }
              label="Notifications"
              onClick={() =>
                setSection(
                  "notifications"
                )
              }
            />
          </nav>

          <div className="agriva-admin-side mt-4 rounded-2xl p-4 text-white">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-100">
              AGRIVA Mission
            </p>

            <p className="mt-2 text-sm font-black">
              AI-powered sustainable agriculture at scale.
            </p>

            <div className="mt-3 text-xs text-emerald-50/90">
              🌱 Farmers • 🤝 Buyers • 🤖 AI
            </div>
          </div>
        </aside>

        {/* CONTENT */}

        <section className="min-w-0">
          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {section === "overview" && (
            <>
              <section className="agriva-role-hero relative mb-6 overflow-hidden rounded-[28px] border border-emerald-100 shadow-sm">
                <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/80 to-white/15" />

                <div className="relative z-10 max-w-3xl px-6 py-8 sm:px-8">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
                    AGRIVA Intelligence Console
                  </p>

                  <h2 className="mt-3 text-3xl font-black text-slate-950">
                    Sustainable Agriculture, Powered by Data 🌍
                  </h2>

                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    Monitor farmers, buyers, marketplace activity, AI predictions and platform growth from one control center.
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <span className="agriva-role-badge">🤖 AI Insights</span>
                    <span className="agriva-role-badge">📊 Live Platform Data</span>
                    <span className="agriva-role-badge">🌱 Sustainable Growth</span>
                  </div>
                </div>
              </section>

              <div>
                <h2 className="text-3xl font-bold text-slate-900">
                  Admin Overview
                </h2>

                <p className="mt-1 text-slate-500">
                  Monitor AGRIVA platform activity and performance.
                </p>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  label="Farmers"
                  value={
                    stats.total_farmers
                  }
                  icon={
                    <Wheat className="h-6 w-6 text-emerald-600" />
                  }
                />

                <StatCard
                  label="Buyers"
                  value={
                    stats.total_buyers
                  }
                  icon={
                    <Building2 className="h-6 w-6 text-blue-600" />
                  }
                />

                <StatCard
                  label="Listings"
                  value={
                    stats.total_listings
                  }
                  icon={
                    <Store className="h-6 w-6 text-orange-600" />
                  }
                />

                <StatCard
                  label="Orders"
                  value={
                    stats.total_orders
                  }
                  icon={
                    <ShoppingCart className="h-6 w-6 text-violet-600" />
                  }
                />

                <StatCard
                  label="Revenue"
                  value={`₹${stats.revenue.toLocaleString(
                    "en-IN"
                  )}`}
                  icon={
                    <IndianRupee className="h-6 w-6 text-emerald-700" />
                  }
                />

                <StatCard
                  label="AI Predictions"
                  value={
                    stats.ai_predictions
                      .total
                  }
                  icon={
                    <Bot className="h-6 w-6 text-purple-600" />
                  }
                />

                <StatCard
                  label="Products"
                  value={
                    stats.total_products
                  }
                  icon={
                    <Package className="h-6 w-6 text-cyan-600" />
                  }
                />

                <StatCard
                  label="Payments"
                  value={
                    stats.total_payments
                  }
                  icon={
                    <CreditCard className="h-6 w-6 text-pink-600" />
                  }
                />
              </div>

              <div className="mt-6 grid gap-6 xl:grid-cols-2">
                {/* AI */}

                <div className="rounded-2xl bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-purple-600" />

                    <h3 className="text-lg font-bold">
                      AI Activity
                    </h3>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <InfoBox
                      label="Price Predictions"
                      value={formatOptionalCount(
                        aiStats
                          ?.price_predictions ??
                          stats
                            .ai_predictions
                            .price
                      )}
                    />

                    <InfoBox
                      label="Quality Predictions"
                      value={formatOptionalCount(
                        aiStats
                          ?.quality_predictions ??
                          stats
                            .ai_predictions
                            .quality
                      )}
                    />

                    <InfoBox
                      label="Crop Health"
                      value={formatOptionalCount(
                        aiStats
                          ?.crop_health_analyses ??
                          stats
                            .ai_predictions
                            .crop_health
                      )}
                    />

                    <InfoBox
                      label="Total AI"
                      value={String(
                        aiStats?.total ??
                          stats
                            .ai_predictions
                            .total
                      )}
                    />
                  </div>
                </div>

                {/* REGIONS */}

                <div className="rounded-2xl bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-2">
                    <MapPinned className="h-5 w-5 text-blue-600" />

                    <h3 className="text-lg font-bold">
                      Regional Activity
                    </h3>
                  </div>

                  <div className="mt-5 space-y-3">
                    {regionalActivity.length ===
                    0 ? (
                      <p className="text-sm text-slate-500">
                        No regional activity.
                      </p>
                    ) : (
                      regionalActivity.map(
                        (region) => (
                          <div
                            key={
                              region.state
                            }
                            className="rounded-xl bg-slate-50 p-4"
                          >
                            <p className="font-semibold">
                              {
                                region.state
                              }
                            </p>

                            <div className="mt-2 flex gap-5 text-sm text-slate-600">
                              <span>
                                Farmers:{" "}
                                {
                                  region.farmers
                                }
                              </span>

                              <span>
                                Buyers:{" "}
                                {
                                  region.buyers ??
                                  "—"
                                }
                              </span>
                            </div>
                          </div>
                        )
                      )
                    )}
                  </div>
                </div>
              </div>

              {/* RECENT ORDERS */}

              <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
                <h3 className="text-lg font-bold">
                  Recent Orders
                </h3>

                <div className="mt-5 overflow-x-auto">
                  <table className="w-full min-w-[700px] text-left text-sm">
                    <thead className="border-b text-xs uppercase text-slate-500">
                      <tr>
                        <th className="pb-3">
                          Order
                        </th>
                        <th className="pb-3">
                          Buyer
                        </th>
                        <th className="pb-3">
                          Amount
                        </th>
                        <th className="pb-3">
                          Status
                        </th>
                        <th className="pb-3">
                          Date
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {dashboard.recent_orders.map(
                        (order) => (
                          <tr
                            key={
                              order.id
                            }
                            className="border-b last:border-0"
                          >
                            <td className="py-4 font-medium">
                              #
                              {order.id.slice(
                                0,
                                8
                              )}
                            </td>

                            <td className="py-4">
                              {order.buyer_id.slice(
                                0,
                                8
                              )}
                            </td>

                            <td className="py-4">
                              ₹
                              {order.total_amount.toLocaleString(
                                "en-IN"
                              )}
                            </td>

                            <td className="py-4">
                              <StatusBadge
                                status={
                                  order.status
                                }
                              />
                            </td>

                            <td className="py-4">
                              {formatDate(
                                order.created_at
                              )}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* USERS */}

          {section === "users" && (
            <ManagementSection
              title="Users"
              subtitle="Manage all AGRIVA user accounts."
            >
              <div className="grid gap-4 lg:grid-cols-2">
                {users.map((user) => (
                  <article
                    key={user.id}
                    className="rounded-2xl bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-bold">
                          {user.full_name}
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
                          {user.email}
                        </p>
                      </div>

                      <RoleBadge
                        role={user.role}
                      />
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <span
                        className={`text-sm font-semibold ${
                          user.is_active
                            ? "text-emerald-600"
                            : "text-red-600"
                        }`}
                      >
                        {user.is_active
                          ? "Active"
                          : "Inactive"}
                      </span>

                      <span className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-400">
                        Read only
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </ManagementSection>
          )}

          {/* FARMERS */}

          {section === "farmers" && (
            <ManagementSection
              title="Farmers"
              subtitle={`${farmers.length} registered farmers`}
            >
              <div className="grid gap-4 lg:grid-cols-2">
                {farmers.map(
                  (farmer) => (
                    <article
                      key={
                        farmer.farmer_id
                      }
                      className="rounded-2xl bg-white p-5 shadow-sm"
                    >
                      <div className="flex items-start gap-3">
                        <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700">
                          <Wheat className="h-5 w-5" />
                        </div>

                        <div>
                          <h3 className="font-bold">
                            {farmer.name}
                          </h3>

                          <p className="text-sm text-slate-500">
                            {farmer.email}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <InfoBox
                          label="Village"
                          value={
                            farmer.village
                          }
                        />

                        <InfoBox
                          label="District"
                          value={
                            farmer.district
                          }
                        />

                        <InfoBox
                          label="State"
                          value={
                            farmer.state
                          }
                        />

                        <InfoBox
                          label="Language"
                          value={
                            farmer.language
                          }
                        />
                      </div>
                    </article>
                  )
                )}
              </div>
            </ManagementSection>
          )}

          {/* BUYERS */}

          {section === "buyers" && (
            <ManagementSection
              title="Buyers"
              subtitle={`${buyers.length} registered buyers`}
            >
              <div className="grid gap-4 lg:grid-cols-2">
                {buyers.map(
                  (buyer) => (
                    <article
                      key={
                        buyer.buyer_id
                      }
                      className="rounded-2xl bg-white p-5 shadow-sm"
                    >
                      <h3 className="font-bold">
                        {
                          buyer.business_name
                        }
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        {buyer.name} ·{" "}
                        {
                          buyer.business_type
                        }
                      </p>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <InfoBox
                          label="City"
                          value={buyer.city}
                        />

                        <InfoBox
                          label="State"
                          value={buyer.state}
                        />

                        <InfoBox
                          label="Email"
                          value={buyer.email}
                        />

                        <InfoBox
                          label="Status"
                          value={
                            buyer.is_active
                              ? "Active"
                              : "Inactive"
                          }
                        />
                      </div>
                    </article>
                  )
                )}
              </div>
            </ManagementSection>
          )}

          {/* PRODUCTS */}

          {section === "products" && (
            <ManagementSection
              title="Products"
              subtitle={`${products.length} store products`}
            >
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {products.map(
                  (product) => (
                    <article
                      key={product.id}
                      className="rounded-2xl bg-white p-5 shadow-sm"
                    >
                      <Package className="h-7 w-7 text-emerald-600" />

                      <h3 className="mt-4 font-bold">
                        {product.name}
                      </h3>

                      <p className="mt-2 line-clamp-2 text-sm text-slate-500">
                        {
                          product.description
                        }
                      </p>

                      <div className="mt-4 flex items-center justify-between">
                        <span className="font-bold text-emerald-700">
                          ₹
                          {product.price.toLocaleString(
                            "en-IN"
                          )}
                        </span>

                        <span className="text-sm text-slate-500">
                          Stock:{" "}
                          {
                            product.stock_quantity
                          }
                        </span>
                      </div>
                    </article>
                  )
                )}
              </div>
            </ManagementSection>
          )}

          {/* ORDERS */}

          {section === "orders" && (
            <ManagementSection
              title="Orders"
              subtitle={`${orders.length} marketplace orders`}
            >
              <DataTable>
                <thead>
                  <tr>
                    <TableHead>
                      Order
                    </TableHead>
                    <TableHead>
                      Buyer
                    </TableHead>
                    <TableHead>
                      Amount
                    </TableHead>
                    <TableHead>
                      Status
                    </TableHead>
                    <TableHead>
                      Date
                    </TableHead>
                  </tr>
                </thead>

                <tbody>
                  {orders.map(
                    (order) => (
                      <tr
                        key={order.id}
                        className="border-b last:border-0"
                      >
                        <TableCell>
                          #
                          {order.id.slice(
                            0,
                            8
                          )}
                        </TableCell>

                        <TableCell>
                          {order.buyer_id.slice(
                            0,
                            8
                          )}
                        </TableCell>

                        <TableCell>
                          ₹
                          {order.total_amount.toLocaleString(
                            "en-IN"
                          )}
                        </TableCell>

                        <TableCell>
                          <StatusBadge
                            status={
                              order.status
                            }
                          />
                        </TableCell>

                        <TableCell>
                          {formatDate(
                            order.created_at
                          )}
                        </TableCell>
                      </tr>
                    )
                  )}
                </tbody>
              </DataTable>
            </ManagementSection>
          )}

          {/* PAYMENTS */}

          {section === "payments" && (
            <ManagementSection
              title="Payments"
              subtitle={`${payments.length} payment records`}
            >
              <DataTable>
                <thead>
                  <tr>
                    <TableHead>
                      Payment
                    </TableHead>
                    <TableHead>
                      Order
                    </TableHead>
                    <TableHead>
                      Method
                    </TableHead>
                    <TableHead>
                      Amount
                    </TableHead>
                    <TableHead>
                      Status
                    </TableHead>
                  </tr>
                </thead>

                <tbody>
                  {payments.map(
                    (payment) => (
                      <tr
                        key={
                          payment.id
                        }
                        className="border-b last:border-0"
                      >
                        <TableCell>
                          #
                          {payment.id.slice(
                            0,
                            8
                          )}
                        </TableCell>

                        <TableCell>
                          {payment.order_id.slice(
                            0,
                            8
                          )}
                        </TableCell>

                        <TableCell>
                          {
                            payment.payment_method
                          }
                        </TableCell>

                        <TableCell>
                          ₹
                          {payment.amount.toLocaleString(
                            "en-IN"
                          )}
                        </TableCell>

                        <TableCell>
                          <StatusBadge
                            status={
                              payment.status
                            }
                          />
                        </TableCell>
                      </tr>
                    )
                  )}
                </tbody>
              </DataTable>
            </ManagementSection>
          )}

          {/* LISTINGS */}

          {section === "listings" && (
            <ManagementSection
              title="Listings"
              subtitle={`${listings.length} crop listings`}
            >
              <div className="grid gap-4 lg:grid-cols-2">
                {listings.map(
                  (listing) => (
                    <article
                      key={
                        listing.id
                      }
                      className="rounded-2xl bg-white p-5 shadow-sm"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm text-slate-500">
                            Listing #
                            {listing.id.slice(
                              0,
                              8
                            )}
                          </p>

                          <p className="mt-1 text-xl font-bold">
                            {
                              listing.quantity_kg
                            }{" "}
                            kg
                          </p>
                        </div>

                        <StatusBadge
                          status={
                            listing.status
                          }
                        />
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <InfoBox
                          label="Quality"
                          value={
                            listing.quality_grade ||
                            "-"
                          }
                        />

                        <InfoBox
                          label="Price / kg"
                          value={`₹${listing.expected_price_per_kg}`}
                        />

                        <InfoBox
                          label="Location"
                          value={
                            listing.location ||
                            "-"
                          }
                        />

                        <InfoBox
                          label="Harvest"
                          value={
                            listing.harvest_date ||
                            "-"
                          }
                        />
                      </div>
                    </article>
                  )
                )}
              </div>
            </ManagementSection>
          )}

          {/* NOTIFICATIONS */}

          {section ===
            "notifications" && (
            <ManagementSection
              title="Notifications"
              subtitle={`${notifications.length} notifications`}
            >
              {notifications.length ===
              0 ? (
                <EmptyState
                  icon={
                    <Bell className="h-10 w-10" />
                  }
                  title="No notifications"
                  message="Admin notifications will appear here."
                />
              ) : (
                <div className="space-y-4">
                  {notifications.map(
                    (notification) => (
                      <article
                        key={
                          notification.id
                        }
                        className="rounded-2xl bg-white p-5 shadow-sm"
                      >
                        <div className="flex items-start gap-3">
                          <Bell className="mt-1 h-5 w-5 text-emerald-600" />

                          <div>
                            <h3 className="font-bold">
                              {
                                notification.title
                              }
                            </h3>

                            <p className="mt-1 text-sm text-slate-500">
                              {
                                notification.message
                              }
                            </p>
                          </div>
                        </div>
                      </article>
                    )
                  )}
                </div>
              )}
            </ManagementSection>
          )}
        </section>
      </div>

      <style jsx global>{`
        .agriva-role-dashboard {
          background:
            radial-gradient(circle at 85% 0%, rgba(20,184,166,.07), transparent 34%),
            #f6f8f5;
        }

        .agriva-role-topbar {
          background: rgba(255,255,255,.92) !important;
          backdrop-filter: blur(16px);
        }

        .agriva-role-hero {
          min-height: 230px;
          background:
            url("/images/agriva-farm-hero.svg")
            center 44% / cover no-repeat;
        }

        .agriva-role-badge {
          display: inline-flex;
          border: 1px solid rgba(16,185,129,.18);
          border-radius: 9999px;
          background: rgba(255,255,255,.84);
          padding: .5rem .8rem;
          font-size: .75rem;
          font-weight: 800;
          color: #166534;
          box-shadow: 0 5px 18px rgba(15,118,110,.06);
        }

        .agriva-admin-side {
          background:
            linear-gradient(150deg,#047857,#065f46);
          box-shadow: 0 14px 32px rgba(4,120,87,.16);
        }

        .agriva-role-stat {
          position: relative;
          overflow: hidden;
          box-shadow: 0 10px 28px rgba(15,77,45,.05);
        }

        .agriva-role-stat::before {
          content: "";
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 4px;
          background: linear-gradient(180deg,#22c55e,#0ea5e9);
        }

        .agriva-role-dashboard.agriva-dark {
          background: #07120d !important;
          color: #e8f3eb !important;
        }

        .agriva-dark .agriva-role-topbar,
        .agriva-dark .bg-white,
        .agriva-dark .agriva-role-stat {
          background: #0d2015 !important;
          border-color: #244734 !important;
        }

        .agriva-dark .agriva-role-hero {
          box-shadow: inset 0 0 0 999px rgba(3,18,10,.24);
        }

        .agriva-dark .text-slate-950,
        .agriva-dark .text-slate-900,
        .agriva-dark .text-slate-800,
        .agriva-dark .text-slate-700 {
          color: #edf8f0 !important;
        }

        .agriva-dark .text-slate-600,
        .agriva-dark .text-slate-500,
        .agriva-dark .text-slate-400 {
          color: #9fb9a6 !important;
        }

        .agriva-dark .bg-slate-50,
        .agriva-dark .bg-slate-100 {
          background: #122a1b !important;
        }

        .agriva-dark .border-slate-200,
        .agriva-dark .border-emerald-100 {
          border-color: #28513a !important;
        }
      `}</style>
    </main>
  );
}

/* =========================================================
   HELPERS
========================================================= */

function NavButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
        active
          ? "bg-emerald-50 text-emerald-700"
          : "text-slate-600 hover:bg-slate-50"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
}) {
  return (
    <div className="agriva-role-stat rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">
        {label}
      </p>

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-2xl font-bold text-slate-900">
          {value}
        </p>

        {icon}
      </div>
    </div>
  );
}

function InfoBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-xs text-slate-500">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-semibold text-slate-800">
        {value}
      </p>
    </div>
  );
}

function ManagementSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <>
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-slate-900">
          {title}
        </h2>

        <p className="mt-1 text-slate-500">
          {subtitle}
        </p>
      </div>

      {children}
    </>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const normalized =
    status.toLowerCase();

  const className =
    normalized === "active" ||
    normalized === "paid" ||
    normalized === "completed"
      ? "bg-emerald-100 text-emerald-700"
      : normalized === "accepted"
        ? "bg-blue-100 text-blue-700"
        : normalized === "refunded"
          ? "bg-violet-100 text-violet-700"
          : normalized === "cancelled" ||
              normalized === "rejected" ||
              normalized === "failed"
            ? "bg-red-100 text-red-700"
            : "bg-amber-100 text-amber-700";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${className}`}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}

function RoleBadge({
  role,
}: {
  role: string;
}) {
  const className =
    role === "ADMIN"
      ? "bg-purple-100 text-purple-700"
      : role === "FARMER"
        ? "bg-emerald-100 text-emerald-700"
        : "bg-blue-100 text-blue-700";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${className}`}
    >
      {role}
    </span>
  );
}

function DataTable({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl bg-white p-5 shadow-sm">
      <table className="w-full min-w-[700px] text-left text-sm">
        {children}
      </table>
    </div>
  );
}

function TableHead({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <th className="border-b pb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
      {children}
    </th>
  );
}

function TableCell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <td className="py-4 text-slate-700">
      {children}
    </td>
  );
}

function EmptyState({
  icon,
  title,
  message,
}: {
  icon: ReactNode;
  title: string;
  message: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
      <div className="flex justify-center text-slate-300">
        {icon}
      </div>

      <h3 className="mt-4 font-bold text-slate-800">
        {title}
      </h3>

      <p className="mt-1 text-sm text-slate-500">
        {message}
      </p>
    </div>
  );
}

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function toText(
  value: unknown,
  fallback = ""
): string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || fallback;
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  return fallback;
}

function toNullableText(
  value: unknown
): string | null {
  const text = toText(value);
  return text || null;
}

function toBoolean(
  value: unknown,
  fallback = false
): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  if (typeof value === "string") {
    const normalized =
      value.trim().toLowerCase();

    if (
      normalized === "true" ||
      normalized === "1" ||
      normalized === "yes"
    ) {
      return true;
    }

    if (
      normalized === "false" ||
      normalized === "0" ||
      normalized === "no"
    ) {
      return false;
    }
  }

  return fallback;
}

function toStringArray(
  value: unknown
): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  return value
    .map((item) => toText(item))
    .filter(Boolean);
}

function extractArray<T>(
  value: unknown,
  keys: string[]
): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }

  if (!isRecord(value)) {
    return [];
  }

  for (const key of keys) {
    const candidate = value[key];

    if (Array.isArray(candidate)) {
      return candidate as T[];
    }
  }

  return [];
}

function toNumber(
  value: unknown,
  fallback = 0
) {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (
    typeof value === "string" &&
    value.trim() !== ""
  ) {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function toOptionalNumber(
  value: unknown
): number | null {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (
    typeof value === "string" &&
    value.trim() !== ""
  ) {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function formatOptionalCount(
  value: number | null | undefined
) {
  return value == null
    ? "—"
    : String(value);
}

function formatDate(
  value: string
) {
  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return value;
  }

  return date.toLocaleString(
    "en-IN",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  );
}
