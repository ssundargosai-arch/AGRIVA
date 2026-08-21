"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import AgrivaAI from "@/app/components/AgrivaAI";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

// =========================================================
// TYPES
// =========================================================

type Farmer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
};

type Stats = {
  total_farms: number;
  total_crops: number;
  active_listings: number;
  pending_orders: number;
  total_income: number;
};

type Weather = {
  temperature: number;
  condition: string;
  humidity: number;
  rain_probability: number;
};

type Crop = {
  id?: string;
  name?: string;
  crop_name?: string;
  status?: string;
  quantity?: number;
};

type Order = {
  id?: string;
  status?: string;
  total_amount?: number;
  amount?: number;
};

type OrderStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "completed"
  | "cancelled";

type OrderItem = {
  id: string;
  crop_id: string;
  quantity_kg: number;
  price_per_kg: number;
};

type FarmerOrder = {
  id: string;
  listing_id: string;
  buyer_id: string;
  total_amount: number;
  status: OrderStatus;
  created_at: string;
  items: OrderItem[];
};

type Alert = {
  id?: string;
  title?: string;
  message?: string;
  type?: string;
};

type DashboardData = {
  farmer: Farmer;
  stats: Stats;
  weather: Weather;
  recent_crops: Crop[];
  recent_orders: Order[];
  alerts: Alert[];
};

type DashboardResponse = {
  success: boolean;
  data: DashboardData;
};

// =========================================================
// API
// =========================================================

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000";

// =========================================================
// FARMER DASHBOARD
// =========================================================

export default function FarmerDashboard() {
  const router = useRouter();

  const [dashboard, setDashboard] =
    useState<DashboardData | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [incomingOrders, setIncomingOrders] =
    useState<FarmerOrder[]>([]);

  const [ordersLoading, setOrdersLoading] =
    useState(true);

  const [ordersError, setOrdersError] =
    useState("");

  const [updatingOrderId, setUpdatingOrderId] =
    useState<string | null>(null);

  // =======================================================
  // LOAD DASHBOARD
  // =======================================================

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");

      const token =
        localStorage.getItem("access_token");

      if (!token) {
        router.replace("/login");
        return;
      }

      const response = await fetch(
        `${API_URL}/api/farmer/dashboard`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          cache: "no-store",
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");

          router.replace("/login");
          return;
        }

        if (response.status === 403) {
          throw new Error(
            "Farmer access required."
          );
        }

        throw new Error(
          `Dashboard request failed: ${response.status}`
        );
      }

      const result: DashboardResponse =
        await response.json();

      if (!result.success || !result.data) {
        throw new Error(
          "Invalid dashboard response."
        );
      }

      setDashboard(result.data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load dashboard."
      );
    } finally {
      setLoading(false);
    }
  }

  // =======================================================
  // LOAD INCOMING ORDERS
  // =======================================================

  async function loadIncomingOrders() {
    try {
      setOrdersLoading(true);
      setOrdersError("");

      const token =
        localStorage.getItem("access_token");

      if (!token) {
        setOrdersError(
          "Authentication token not found."
        );
        return;
      }

      const response = await fetch(
        `${API_URL}/api/orders/farmer/incoming`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }
      );

      const result =
        await response
          .json()
          .catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.detail ||
            "Unable to load incoming orders."
        );
      }

      setIncomingOrders(
        Array.isArray(result) ? result : []
      );
    } catch (err) {
      setOrdersError(
        err instanceof Error
          ? err.message
          : "Unable to load incoming orders."
      );
    } finally {
      setOrdersLoading(false);
    }
  }

  // =======================================================
  // UPDATE ORDER STATUS
  // =======================================================

  async function updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus
  ) {
    const token =
      localStorage.getItem("access_token");

    if (!token) {
      router.replace("/login");
      return;
    }

    setUpdatingOrderId(orderId);

    try {
      const response = await fetch(
        `${API_URL}/api/orders/${orderId}/status`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: newStatus,
          }),
        }
      );

      const result =
        await response
          .json()
          .catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.detail ||
            "Unable to update order status."
        );
      }

      setIncomingOrders((current) =>
        current.map((order) =>
          order.id === orderId
            ? {
                ...order,
                status: result.status,
              }
            : order
        )
      );

      await loadDashboard();
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Unable to update order."
      );
    } finally {
      setUpdatingOrderId(null);
    }
  }

  // =======================================================
  // INITIAL LOAD
  // =======================================================

  useEffect(() => {
    void loadDashboard();
    void loadIncomingOrders();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // =======================================================
  // HELPERS
  // =======================================================

  function scrollTo(id: string) {
    document
      .getElementById(id)
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  }

  function openAgrivaAI() {
    document
      .getElementById(
        "agriva-ai-launcher"
      )
      ?.click();
  }

  // =======================================================
  // LOADING
  // =======================================================

  if (loading) {
    return <DashboardSkeleton />;
  }

  // =======================================================
  // ERROR
  // =======================================================

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
            <h2 className="text-lg font-semibold text-red-700">
              Unable to load dashboard
            </h2>

            <p className="mt-2 text-sm text-red-600">
              {error}
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() =>
                  window.location.reload()
                }
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Try Again
              </button>

              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem(
                    "access_token"
                  );

                  localStorage.removeItem(
                    "refresh_token"
                  );

                  router.replace("/login");
                }}
                className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
              >
                Login Again
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // =======================================================
  // NO DATA
  // =======================================================

  if (!dashboard) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl border bg-white p-8 text-center">
            <h2 className="text-xl font-semibold">
              No dashboard data
            </h2>

            <p className="mt-2 text-slate-500">
              Dashboard information is currently unavailable.
            </p>
          </div>
        </div>
      </main>
    );
  }

  // =======================================================
  // DATA
  // =======================================================

  const {
    farmer,
    stats,
    weather,
    recent_crops,
    recent_orders,
    alerts,
  } = dashboard;

  const chartData = [
    {
      month: "Farms",
      value: stats.total_farms,
    },
    {
      month: "Crops",
      value: stats.total_crops,
    },
    {
      month: "Listings",
      value: stats.active_listings,
    },
    {
      month: "Orders",
      value: stats.pending_orders,
    },
  ];

  // =======================================================
  // UI
  // =======================================================

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">

        {/* =================================================
            DESKTOP SIDEBAR
        ================================================= */}

        <aside className="hidden w-64 shrink-0 border-r bg-white lg:block">
          <div className="border-b p-6">
            <h1 className="text-2xl font-bold text-green-700">
              AGRIVA
            </h1>

            <p className="text-xs text-slate-500">
              Farmer Dashboard
            </p>
          </div>

          <nav className="p-4">
            <NavItem
              label="Dashboard"
              active
              onClick={() =>
                router.push(
                  "/dashboard/farmer"
                )
              }
            />

            <NavItem
              label="My Farm"
              onClick={() =>
                router.push(
                  "/dashboard/farmer"
                )
              }
            />

            <NavItem
              label="AGRIVA Soil"
              onClick={() =>
                router.push(
                  "/dashboard/farmer"
                )
              }
            />

            <NavItem
              label="AGRIVA CropSense"
              onClick={() =>
                router.push(
                  "/dashboard/farmer/quality"
                )
              }
            />

            <NavItem
              label="AGRIVA AI"
              onClick={openAgrivaAI}
            />

            <NavItem
              label="AGRIVA Store"
              onClick={() =>
                router.push("/store")
              }
            />

            <NavItem
              label="AGRIVA Market"
              onClick={() =>
                router.push("/marketplace")
              }
            />

            <NavItem
              label="Crop Doctor"
              onClick={() =>
                router.push(
                  "/dashboard/farmer/crop-doctor"
                )
              }
            />

            <div className="my-4 border-t" />

            <NavItem
              label="Quality"
              onClick={() =>
                router.push(
                  "/dashboard/farmer/quality"
                )
              }
            />

            <NavItem
              label="Price Prediction"
              onClick={() =>
                router.push(
                  "/dashboard/farmer/price"
                )
              }
            />

            <NavItem
              label="Buyers"
              onClick={() =>
                router.push("/marketplace")
              }
            />

            <NavItem
              label="Orders"
              onClick={() =>
                scrollTo(
                  "incoming-orders"
                )
              }
            />

            <NavItem
              label="Transport"
              onClick={() =>
                router.push(
                  "/dashboard/farmer/transport"
                )
              }
            />

            <NavItem
              label="Payments"
              onClick={() =>
                scrollTo(
                  "incoming-orders"
                )
              }
            />

            <NavItem
              label="Weather"
              onClick={() =>
                router.push(
                  "/dashboard/farmer/weather"
                )
              }
            />

            <NavItem
              label="Insights"
              onClick={() =>
                scrollTo(
                  "farm-performance"
                )
              }
            />

            <NavItem
              label="Notifications"
              onClick={() =>
                scrollTo(
                  "notifications"
                )
              }
            />

            <NavItem
              label="Settings"
              onClick={() =>
                router.push(
                  "/dashboard/farmer"
                )
              }
            />
          </nav>
        </aside>

        {/* =================================================
            MAIN AREA
        ================================================= */}

        <div className="min-w-0 flex-1">
          <header className="border-b bg-white">
            <div className="flex items-center justify-between px-4 py-4 sm:px-6">
              <div>
                <h2 className="text-xl font-bold">
                  Welcome, {farmer.name}
                </h2>

                <p className="text-sm text-slate-500">
                  Manage your farm with AGRIVA
                </p>
              </div>

              <div className="hidden rounded-full bg-green-50 px-4 py-2 text-sm font-medium text-green-700 sm:block">
                {farmer.role}
              </div>
            </div>
          </header>

          <main className="mx-auto max-w-7xl space-y-6 p-4 pb-24 sm:p-6 lg:p-8 lg:pb-8">

            {/* =================================================
                STATS
            ================================================= */}

            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Farm Health"
                value={`${stats.total_farms}`}
                subtitle="Total farms"
                icon="🌱"
              />

              <StatCard
                title="Expected Revenue"
                value={`₹${stats.total_income.toLocaleString(
                  "en-IN"
                )}`}
                subtitle="Current income"
                icon="💰"
              />

              <StatCard
                title="Active Crops"
                value={`${stats.total_crops}`}
                subtitle="Registered crops"
                icon="🌾"
              />

              <StatCard
                title="Pending Orders"
                value={`${stats.pending_orders}`}
                subtitle="Orders awaiting action"
                icon="📦"
              />
            </section>

            {/* =================================================
                WEATHER + AI
            ================================================= */}

            <section className="grid gap-6 lg:grid-cols-2">

              {/* WEATHER */}

              <section
                onClick={() =>
                  router.push(
                    "/dashboard/farmer/weather"
                  )
                }
                className="cursor-pointer rounded-2xl border bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-green-300 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">
                      Weather Intelligence
                    </p>

                    <h3 className="mt-1 text-2xl font-bold">
                      {weather.temperature}°C
                    </h3>
                  </div>

                  <div className="text-4xl">
                    ☀️
                  </div>
                </div>

                <p className="mt-4 font-medium">
                  {weather.condition}
                </p>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <WeatherItem
                    label="Humidity"
                    value={`${weather.humidity}%`}
                  />

                  <WeatherItem
                    label="Rain Probability"
                    value={`${weather.rain_probability}%`}
                  />
                </div>

                <p className="mt-5 text-sm font-semibold text-green-700">
                  Open Weather Dashboard →
                </p>
              </section>

              {/* AGRIVA AI */}

              <section className="rounded-2xl border bg-white p-6 shadow-sm">
                <p className="text-sm text-slate-500">
                  AGRIVA AI Recommendation
                </p>

                <h3 className="mt-2 text-xl font-bold">
                  Smart Farming Assistant
                </h3>

                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Ask AGRIVA AI about crops,
                  soil, irrigation, weather,
                  market decisions and farming
                  recommendations.
                </p>

                <button
                  type="button"
                  onClick={openAgrivaAI}
                  className="mt-5 rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white hover:bg-green-700"
                >
                  Open AGRIVA AI
                </button>
              </section>
            </section>

            {/* =================================================
                PERFORMANCE
            ================================================= */}

            <section
              id="farm-performance"
              className="rounded-2xl border bg-white p-6 shadow-sm"
            >
              <div className="mb-6">
                <h3 className="text-lg font-bold">
                  Farm Performance
                </h3>

                <p className="text-sm text-slate-500">
                  Current dashboard metrics
                  from AGRIVA
                </p>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <LineChart
                    data={chartData}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                    />

                    <XAxis
                      dataKey="month"
                    />

                    <YAxis
                      allowDecimals={false}
                    />

                    <Tooltip />

                    <Line
                      type="monotone"
                      dataKey="value"
                      strokeWidth={3}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* =================================================
                RECENT DATA
            ================================================= */}

            <section className="grid gap-6 lg:grid-cols-2">
              <DataSection
                title="Recent Crops"
                emptyMessage="No crops have been added yet."
                isEmpty={
                  recent_crops.length ===
                  0
                }
              >
                {recent_crops.map(
                  (crop, index) => (
                    <div
                      key={
                        crop.id ??
                        index
                      }
                      className="flex items-center justify-between rounded-xl bg-slate-50 p-4"
                    >
                      <div>
                        <p className="font-semibold">
                          {crop.crop_name ??
                            crop.name ??
                            "Crop"}
                        </p>

                        <p className="text-sm text-slate-500">
                          {crop.status ??
                            "No status"}
                        </p>
                      </div>

                      {crop.quantity !==
                        undefined && (
                        <span className="text-sm text-slate-600">
                          {
                            crop.quantity
                          }
                        </span>
                      )}
                    </div>
                  )
                )}
              </DataSection>

              <DataSection
                title="Recent Orders"
                emptyMessage="No orders available."
                isEmpty={
                  recent_orders.length ===
                  0
                }
              >
                {recent_orders.map(
                  (order, index) => (
                    <div
                      key={
                        order.id ??
                        index
                      }
                      className="flex items-center justify-between rounded-xl bg-slate-50 p-4"
                    >
                      <div>
                        <p className="font-semibold">
                          Order #
                          {order.id?.slice(
                            0,
                            8
                          ) ??
                            index + 1}
                        </p>

                        <p className="text-sm capitalize text-slate-500">
                          {order.status ??
                            "Unknown status"}
                        </p>
                      </div>

                      {(order.total_amount !==
                        undefined ||
                        order.amount !==
                          undefined) && (
                        <span className="font-semibold">
                          ₹
                          {(
                            order.total_amount ??
                            order.amount ??
                            0
                          ).toLocaleString(
                            "en-IN"
                          )}
                        </span>
                      )}
                    </div>
                  )
                )}
              </DataSection>
            </section>

            {/* =================================================
                INCOMING ORDERS
            ================================================= */}

            <section
              id="incoming-orders"
              className="rounded-2xl border bg-white p-6 shadow-sm"
            >
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <h3 className="text-xl font-bold">
                    Incoming Orders
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Accept, reject or
                    complete marketplace
                    orders from buyers.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    void loadIncomingOrders()
                  }
                  disabled={
                    ordersLoading
                  }
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {ordersLoading
                    ? "Refreshing..."
                    : "Refresh Orders"}
                </button>
              </div>

              {ordersError && (
                <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {ordersError}
                </div>
              )}

              {ordersLoading ? (
                <div className="mt-6 rounded-xl bg-slate-50 p-8 text-center">
                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-green-600" />

                  <p className="mt-4 text-sm text-slate-500">
                    Loading incoming
                    orders...
                  </p>
                </div>
              ) : incomingOrders.length ===
                0 ? (
                <EmptyState
                  message="No incoming marketplace orders."
                />
              ) : (
                <div className="mt-6 space-y-4">
                  {incomingOrders.map(
                    (order) => {
                      const item =
                        order.items?.[0];

                      const isUpdating =
                        updatingOrderId ===
                        order.id;

                      return (
                        <article
                          key={order.id}
                          className="rounded-2xl border border-slate-200 bg-white p-5"
                        >
                          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-3">
                                <h4 className="font-bold">
                                  Order #
                                  {order.id.slice(
                                    0,
                                    8
                                  )}
                                </h4>

                                <OrderStatusBadge
                                  status={
                                    order.status
                                  }
                                />
                              </div>

                              <p className="mt-2 text-xs text-slate-500">
                                Buyer ID:{" "}
                                {order.buyer_id.slice(
                                  0,
                                  8
                                )}
                              </p>

                              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                <OrderMetric
                                  label="Quantity"
                                  value={
                                    item
                                      ? `${item.quantity_kg} kg`
                                      : "-"
                                  }
                                />

                                <OrderMetric
                                  label="Price"
                                  value={
                                    item
                                      ? `₹${item.price_per_kg}/kg`
                                      : "-"
                                  }
                                />

                                <OrderMetric
                                  label="Total"
                                  value={`₹${order.total_amount.toLocaleString(
                                    "en-IN"
                                  )}`}
                                />

                                <OrderMetric
                                  label="Created"
                                  value={new Date(
                                    order.created_at
                                  ).toLocaleDateString(
                                    "en-IN"
                                  )}
                                />
                              </div>
                            </div>

                            <div className="flex shrink-0 flex-wrap gap-2">
                              {order.status ===
                                "pending" && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void updateOrderStatus(
                                        order.id,
                                        "accepted"
                                      )
                                    }
                                    disabled={
                                      isUpdating
                                    }
                                    className="rounded-xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                                  >
                                    {isUpdating
                                      ? "Updating..."
                                      : "Accept"}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      void updateOrderStatus(
                                        order.id,
                                        "rejected"
                                      )
                                    }
                                    disabled={
                                      isUpdating
                                    }
                                    className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}

                              {order.status ===
                                "accepted" && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    void updateOrderStatus(
                                      order.id,
                                      "completed"
                                    )
                                  }
                                  disabled={
                                    isUpdating
                                  }
                                  className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                                >
                                  {isUpdating
                                    ? "Updating..."
                                    : "Complete"}
                                </button>
                              )}
                            </div>
                          </div>
                        </article>
                      );
                    }
                  )}
                </div>
              )}
            </section>

            {/* =================================================
                NOTIFICATIONS
            ================================================= */}

            <section
              id="notifications"
              className="rounded-2xl border bg-white p-6 shadow-sm"
            >
              <h3 className="text-lg font-bold">
                Notifications & Alerts
              </h3>

              {alerts.length === 0 ? (
                <EmptyState
                  message="No new notifications or alerts."
                />
              ) : (
                <div className="mt-4 space-y-3">
                  {alerts.map(
                    (alert, index) => (
                      <div
                        key={
                          alert.id ??
                          index
                        }
                        className="rounded-xl bg-slate-50 p-4"
                      >
                        <p className="font-semibold">
                          {alert.title ??
                            "AGRIVA Alert"}
                        </p>

                        <p className="mt-1 text-sm text-slate-600">
                          {alert.message ??
                            "No additional information."}
                        </p>
                      </div>
                    )
                  )}
                </div>
              )}
            </section>
          </main>

          {/* =================================================
              MOBILE NAV
          ================================================= */}

          <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-white lg:hidden">
            <div className="grid grid-cols-5">
              <MobileNavItem
                icon="🏠"
                label="Home"
                active
                onClick={() =>
                  router.push(
                    "/dashboard/farmer"
                  )
                }
              />

              <MobileNavItem
                icon="🌾"
                label="Farm"
                onClick={() =>
                  router.push(
                    "/dashboard/farmer"
                  )
                }
              />

              <MobileNavItem
                icon="🤖"
                label="AI"
                onClick={
                  openAgrivaAI
                }
              />

              <MobileNavItem
                icon="🌦️"
                label="Weather"
                onClick={() =>
                  router.push(
                    "/dashboard/farmer/weather"
                  )
                }
              />

              <MobileNavItem
                icon="🛒"
                label="Market"
                onClick={() =>
                  router.push(
                    "/marketplace"
                  )
                }
              />
            </div>
          </nav>
        </div>
      </div>

      {/* FLOATING AGRIVA AI */}

      <AgrivaAI />
    </div>
  );
}

// =========================================================
// NAV ITEM
// =========================================================

function NavItem({
  label,
  active = false,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`mb-1 w-full rounded-xl px-4 py-3 text-left text-sm font-medium transition ${
        active
          ? "bg-green-50 text-green-700"
          : "text-slate-600 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
}

// =========================================================
// MOBILE NAV ITEM
// =========================================================

function MobileNavItem({
  icon,
  label,
  active = false,
  onClick,
}: {
  icon: string;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-1 px-2 py-3 text-xs ${
        active
          ? "font-semibold text-green-700"
          : "text-slate-500"
      }`}
    >
      <span className="text-lg">
        {icon}
      </span>

      {label}
    </button>
  );
}

// =========================================================
// STAT CARD
// =========================================================

function StatCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: string;
}) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-2xl font-bold">
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {subtitle}
          </p>
        </div>

        <span className="text-2xl">
          {icon}
        </span>
      </div>
    </div>
  );
}

// =========================================================
// WEATHER ITEM
// =========================================================

function WeatherItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs text-slate-500">
        {label}
      </p>

      <p className="mt-1 font-semibold">
        {value}
      </p>
    </div>
  );
}

// =========================================================
// ORDER METRIC
// =========================================================

function OrderMetric({
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

      <p className="mt-1 text-sm font-semibold">
        {value}
      </p>
    </div>
  );
}

// =========================================================
// ORDER STATUS BADGE
// =========================================================

function OrderStatusBadge({
  status,
}: {
  status: OrderStatus;
}) {
  const className =
    status === "accepted"
      ? "bg-green-100 text-green-700"
      : status === "rejected"
        ? "bg-red-100 text-red-700"
        : status === "completed"
          ? "bg-blue-100 text-blue-700"
          : status === "cancelled"
            ? "bg-slate-200 text-slate-700"
            : "bg-amber-100 text-amber-700";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${className}`}
    >
      {status}
    </span>
  );
}

// =========================================================
// DATA SECTION
// =========================================================

function DataSection({
  title,
  emptyMessage,
  isEmpty,
  children,
}: {
  title: string;
  emptyMessage: string;
  isEmpty: boolean;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-white p-6 shadow-sm">
      <h3 className="text-lg font-bold">
        {title}
      </h3>

      {isEmpty ? (
        <EmptyState
          message={emptyMessage}
        />
      ) : (
        <div className="mt-4 space-y-3">
          {children}
        </div>
      )}
    </section>
  );
}

// =========================================================
// EMPTY STATE
// =========================================================

function EmptyState({
  message,
}: {
  message: string;
}) {
  return (
    <div className="mt-4 rounded-xl bg-slate-50 p-8 text-center">
      <div className="text-3xl">
        📭
      </div>

      <p className="mt-3 text-sm text-slate-500">
        {message}
      </p>
    </div>
  );
}

// =========================================================
// SKELETON
// =========================================================

function DashboardSkeleton() {
  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl animate-pulse space-y-6">
        <div className="h-10 w-72 rounded-lg bg-slate-200" />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map(
            (item) => (
              <div
                key={item}
                className="h-32 rounded-2xl bg-slate-200"
              />
            )
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-64 rounded-2xl bg-slate-200" />

          <div className="h-64 rounded-2xl bg-slate-200" />
        </div>

        <div className="h-80 rounded-2xl bg-slate-200" />
      </div>
    </main>
  );
}