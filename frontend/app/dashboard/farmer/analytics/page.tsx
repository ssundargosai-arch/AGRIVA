"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  Activity,
  ArrowLeft,
  BarChart3,
  Database,
  IndianRupee,
  Loader2,
  PackageCheck,
  RefreshCw,
  ShoppingBasket,
  Sparkles,
  Sprout,
  TrendingUp,
  Users,
  WalletCards,
  Wheat,
} from "lucide-react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";


const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000";


type Period =
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly";


type AnalyticsSummary = {
  total_revenue: number;
  total_expenses: number;
  net_profit: number;
  profit_margin: number;
  roi: number;

  total_orders: number;
  completed_orders: number;
  active_listings: number;
  total_quantity_sold_kg: number;
  total_farm_area_acres: number;
  total_crops: number;
};


type FinancialPoint = {
  label: string;
  revenue: number;
  expenses: number;
  profit: number;
};


type CropPerformanceItem = {
  crop_name: string;
  revenue: number;
  quantity_sold_kg: number;
  orders: number;
};


type MonthlySalesItem = {
  month: string;
  revenue: number;
  orders: number;
};


type BuyerDistributionItem = {
  buyer_id: string;
  buyer_name: string;
  revenue: number;
  orders: number;
};


type FarmHealthItem = {
  status: string;
  count: number;
};


type FarmerAnalyticsResponse = {
  period: string;
  summary: AnalyticsSummary;
  financial_series: FinancialPoint[];
  crop_performance: CropPerformanceItem[];
  monthly_sales: MonthlySalesItem[];
  buyer_distribution: BuyerDistributionItem[];
  farm_health: FarmHealthItem[];
};


const PERIODS: Array<{
  value: Period;
  label: string;
}> = [
  {
    value: "daily",
    label: "Daily",
  },
  {
    value: "weekly",
    label: "Weekly",
  },
  {
    value: "monthly",
    label: "Monthly",
  },
  {
    value: "yearly",
    label: "Yearly",
  },
];


const PIE_COLORS = [
  "#10b981",
  "#14b8a6",
  "#3b82f6",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
];


function money(
  value: number
) {
  return `₹${Number(
    value || 0
  ).toLocaleString(
    "en-IN",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }
  )}`;
}


function number(
  value: number
) {
  return Number(
    value || 0
  ).toLocaleString(
    "en-IN",
    {
      maximumFractionDigits: 2,
    }
  );
}


function percent(
  value: number
) {
  return `${Number(
    value || 0
  ).toFixed(2)}%`;
}


function getToken() {
  if (
    typeof window === "undefined"
  ) {
    return null;
  }

  return (
    localStorage.getItem(
      "access_token"
    ) ||
    localStorage.getItem(
      "token"
    )
  );
}


export default function FarmerAnalyticsPage() {
  const router =
    useRouter();

  const [
    period,
    setPeriod,
  ] = useState<Period>(
    "monthly"
  );

  const [
    analytics,
    setAnalytics,
  ] = useState<
    FarmerAnalyticsResponse | null
  >(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const loadAnalytics =
    useCallback(
      async (
        selectedPeriod: Period,
        options?: {
          quiet?: boolean;
        }
      ) => {
        const token =
          getToken();

        if (!token) {
          router.replace(
            "/login"
          );
          return;
        }

        if (
          options?.quiet
        ) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        try {
          const response =
            await fetch(
              `${API_URL}/api/analytics/farmer?period=${selectedPeriod}`,
              {
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },
                cache:
                  "no-store",
              }
            );

          const result =
            await response
              .json()
              .catch(
                () => null
              );

          if (
            response.status ===
              401 ||
            response.status ===
              403
          ) {
            localStorage.removeItem(
              "access_token"
            );

            localStorage.removeItem(
              "refresh_token"
            );

            localStorage.removeItem(
              "token"
            );

            router.replace(
              "/login"
            );

            return;
          }

          if (
            !response.ok
          ) {
            throw new Error(
              result?.detail ||
                "Unable to load AGRIVA analytics."
            );
          }

          const data =
            result as FarmerAnalyticsResponse;

          setAnalytics({
            ...data,

            financial_series:
              Array.isArray(
                data
                  ?.financial_series
              )
                ? data
                    .financial_series
                : [],

            crop_performance:
              Array.isArray(
                data
                  ?.crop_performance
              )
                ? data
                    .crop_performance
                : [],

            monthly_sales:
              Array.isArray(
                data
                  ?.monthly_sales
              )
                ? data
                    .monthly_sales
                : [],

            buyer_distribution:
              Array.isArray(
                data
                  ?.buyer_distribution
              )
                ? data
                    .buyer_distribution
                : [],

            farm_health:
              Array.isArray(
                data
                  ?.farm_health
              )
                ? data
                    .farm_health
                : [],
          });
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load AGRIVA analytics."
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [router]
    );


  useEffect(() => {
    const timer =
      window.setTimeout(
        () => {
          void loadAnalytics(
            period
          );
        },
        0
      );

    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, [
    period,
    loadAnalytics,
  ]);


  const completionRate =
    useMemo(() => {
      const summary =
        analytics?.summary;

      if (
        !summary ||
        summary.total_orders <=
          0
      ) {
        return 0;
      }

      return (
        summary.completed_orders /
        summary.total_orders
      ) * 100;
    }, [analytics]);


  const topBuyer =
    analytics
      ?.buyer_distribution?.[
      0
    ];


  const totalBuyerRevenue =
    useMemo(
      () =>
        analytics
          ?.buyer_distribution
          ?.reduce(
            (
              total,
              buyer
            ) =>
              total +
              Number(
                buyer.revenue ||
                  0
              ),
            0
          ) || 0,
      [analytics]
    );


  const performanceMessage =
    useMemo(() => {
      if (!analytics) {
        return "";
      }

      const summary =
        analytics.summary;

      if (
        summary.total_revenue <=
        0
      ) {
        return "No completed crop revenue is available for this period yet. AGRIVA will populate these insights as orders are completed.";
      }

      if (
        summary.net_profit > 0
      ) {
        return `Your farm is profitable in this period with a ${percent(
          summary.profit_margin
        )} margin. Compare crop performance and buyer concentration before your next selling decision.`;
      }

      if (
        summary.net_profit <
        0
      ) {
        return "Expenses are currently higher than recorded revenue for this period. Review high-cost activity and compare crop-level returns before the next sale.";
      }

      return "Revenue and recorded expenses are currently balanced. Use crop and buyer analytics to identify the next opportunity for margin improvement.";
    }, [analytics]);


  if (
    loading &&
    !analytics
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-slate-200 backdrop-blur">
          <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />

          <span className="font-semibold">
            Loading AGRIVA Analytics...
          </span>
        </div>
      </main>
    );
  }


  return (
    <main className="min-h-screen bg-slate-950">
      {/* =====================================================
          HERO — PRICE INTELLIGENCE VISUAL LANGUAGE
      ====================================================== */}

      <section className="relative overflow-hidden border-b border-white/10 bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-950">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="absolute -bottom-48 left-1/3 h-96 w-96 rounded-full bg-green-400/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Link
            href="/dashboard/farmer"
            className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-300 transition hover:text-white"
          >
            <ArrowLeft
              size={18}
            />

            Farmer Dashboard
          </Link>

          <div className="mt-8 grid items-end gap-8 lg:grid-cols-[1fr_auto]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">
                <Sparkles className="h-4 w-4" />

                AGRIVA Analytics Intelligence
              </div>

              <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-tight text-white md:text-5xl">
                Smart Farm Performance Analytics
              </h1>

              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300 md:text-lg">
                Understand revenue, expenses, profit, crop performance,
                buyer activity and farm health from one database-backed
                AGRIVA intelligence dashboard.
              </p>
            </div>

            <div className="hidden rounded-3xl border border-white/10 bg-white/5 p-5 text-white backdrop-blur lg:block">
              <div className="flex items-center gap-3">
                <Database className="h-8 w-8 text-emerald-400" />

                <div>
                  <p className="font-bold">
                    Database-backed Analytics
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Live AGRIVA farm & marketplace records
                  </p>
                </div>
              </div>
            </div>
          </div>


          {/* PERIOD CONTROL */}

          <div className="mt-8 flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-300">
                Analysis Period
              </p>

              <p className="mt-1 text-sm text-slate-400">
                Switch the time window without changing the underlying data source.
              </p>
            </div>

            <div className="inline-flex w-full flex-wrap gap-2 rounded-2xl border border-white/10 bg-white/5 p-1.5 backdrop-blur sm:w-auto">
              {PERIODS.map(
                (item) => {
                  const active =
                    item.value ===
                    period;

                  return (
                    <button
                      key={
                        item.value
                      }
                      type="button"
                      onClick={() =>
                        setPeriod(
                          item.value
                        )
                      }
                      className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                        active
                          ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-950/20"
                          : "text-slate-300 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {
                        item.label
                      }
                    </button>
                  );
                }
              )}
            </div>
          </div>
        </div>
      </section>


      {/* =====================================================
          CONTENT
      ====================================================== */}

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {error && (
          <section className="rounded-3xl border border-red-200 bg-red-50 p-5 text-red-800 shadow-sm">
            <p className="font-bold">
              Analytics unavailable
            </p>

            <p className="mt-1 text-sm">
              {error}
            </p>

            <button
              type="button"
              onClick={() =>
                void loadAnalytics(
                  period,
                  {
                    quiet:
                      true,
                  }
                )
              }
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-800"
            >
              <RefreshCw className="h-4 w-4" />

              Retry
            </button>
          </section>
        )}


        {analytics && (
          <>
            {/* OVERVIEW HEADER */}

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-black/10 md:p-7">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
                    Farm Intelligence Overview
                  </p>

                  <h2 className="mt-1 text-2xl font-black text-slate-950">
                    {PERIODS.find(
                      (item) =>
                        item.value ===
                        period
                    )?.label}{" "}
                    performance snapshot
                  </h2>

                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                    All figures below come from AGRIVA farm, crop,
                    listing and completed-order records.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    void loadAnalytics(
                      period,
                      {
                        quiet:
                          true,
                      }
                    )
                  }
                  disabled={
                    refreshing
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${
                      refreshing
                        ? "animate-spin"
                        : ""
                    }`}
                  />

                  {refreshing
                    ? "Refreshing..."
                    : "Refresh Data"}
                </button>
              </div>
            </section>


            {/* PRIMARY FINANCIAL METRICS */}

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <MetricCard
                title="Total Revenue"
                value={money(
                  analytics
                    .summary
                    .total_revenue
                )}
                helper="Completed crop sales"
                icon={
                  <IndianRupee />
                }
                emphasis
              />

              <MetricCard
                title="Total Expenses"
                value={money(
                  analytics
                    .summary
                    .total_expenses
                )}
                helper="Recorded farm expenses"
                icon={
                  <WalletCards />
                }
              />

              <MetricCard
                title="Net Profit"
                value={money(
                  analytics
                    .summary
                    .net_profit
                )}
                helper="Revenue minus expenses"
                icon={
                  <TrendingUp />
                }
              />

              <MetricCard
                title="Profit Margin"
                value={percent(
                  analytics
                    .summary
                    .profit_margin
                )}
                helper="Profit as share of revenue"
                icon={
                  <BarChart3 />
                }
              />

              <MetricCard
                title="ROI"
                value={percent(
                  analytics
                    .summary
                    .roi
                )}
                helper="Return on recorded expenses"
                icon={
                  <Activity />
                }
              />
            </section>


            {/* SMART RECOMMENDATION */}

            <section className="relative overflow-hidden rounded-3xl border border-emerald-800 bg-[#063d36] p-6 text-white shadow-xl shadow-black/20">
              <div className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-emerald-400/10 blur-3xl" />

              <div className="relative z-10 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-emerald-100">
                    <Sparkles className="h-4 w-4" />

                    AGRIVA Performance Insight
                  </div>

                  <h2 className="mt-4 text-2xl font-black">
                    What your farm numbers are saying
                  </h2>

                  <p className="mt-3 max-w-4xl leading-7 text-emerald-50/90">
                    {performanceMessage}
                  </p>
                </div>

                <div className="grid min-w-[220px] grid-cols-2 gap-3">
                  <DarkMetric
                    label="Margin"
                    value={percent(
                      analytics
                        .summary
                        .profit_margin
                    )}
                  />

                  <DarkMetric
                    label="Completion"
                    value={percent(
                      completionRate
                    )}
                  />
                </div>
              </div>
            </section>


            {/* OPERATION METRICS */}

            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <SmallMetric
                title="Orders"
                value={String(
                  analytics
                    .summary
                    .total_orders
                )}
                icon={
                  <ShoppingBasket />
                }
              />

              <SmallMetric
                title="Completed"
                value={String(
                  analytics
                    .summary
                    .completed_orders
                )}
                icon={
                  <PackageCheck />
                }
              />

              <SmallMetric
                title="Completion"
                value={percent(
                  completionRate
                )}
                icon={
                  <Activity />
                }
              />

              <SmallMetric
                title="Quantity Sold"
                value={`${number(
                  analytics
                    .summary
                    .total_quantity_sold_kg
                )} kg`}
                icon={
                  <Wheat />
                }
              />

              <SmallMetric
                title="Farm Area"
                value={`${number(
                  analytics
                    .summary
                    .total_farm_area_acres
                )} acres`}
                icon={
                  <Sprout />
                }
              />

              <SmallMetric
                title="Active Listings"
                value={String(
                  analytics
                    .summary
                    .active_listings
                )}
                icon={
                  <BarChart3 />
                }
              />
            </section>


            {/* FINANCIAL CHART */}

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-black/10 sm:p-7">
              <SectionTitle
                eyebrow="Financial Intelligence"
                title="Revenue, Expenses & Profit"
                description={`Financial movement for the ${period} analytics period.`}
              />

              {analytics
                .financial_series
                .length > 0 ? (
                <div className="mt-7 h-[360px] w-full">
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <LineChart
                      data={
                        analytics
                          .financial_series
                      }
                    >
                      <CartesianGrid
                        stroke="var(--agriva-border, #e2e8f0)"
                        strokeDasharray="4 4"
                        vertical={
                          false
                        }
                      />

                      <XAxis
                        dataKey="label"
                        stroke="var(--agriva-text-muted, #64748b)"
                        tickLine={
                          false
                        }
                        axisLine={
                          false
                        }
                      />

                      <YAxis
                        stroke="var(--agriva-text-muted, #64748b)"
                        tickLine={
                          false
                        }
                        axisLine={
                          false
                        }
                      />

                      <Tooltip
                        contentStyle={{
                          background:
                            "var(--agriva-surface, #ffffff)",
                          border:
                            "1px solid var(--agriva-border, #e2e8f0)",
                          borderRadius:
                            "16px",
                          color:
                            "var(--agriva-text, #0f172a)",
                        }}
                        formatter={(
                          value
                        ) =>
                          money(
                            Number(
                              value ||
                                0
                            )
                          )
                        }
                      />

                      <Legend />

                      <Line
                        type="monotone"
                        dataKey="revenue"
                        name="Revenue"
                        stroke="#10b981"
                        strokeWidth={
                          3
                        }
                        dot={{
                          r: 3,
                        }}
                        activeDot={{
                          r: 6,
                        }}
                      />

                      <Line
                        type="monotone"
                        dataKey="expenses"
                        name="Expenses"
                        stroke="#f59e0b"
                        strokeWidth={
                          3
                        }
                        dot={{
                          r: 3,
                        }}
                      />

                      <Line
                        type="monotone"
                        dataKey="profit"
                        name="Profit"
                        stroke="#3b82f6"
                        strokeWidth={
                          3
                        }
                        dot={{
                          r: 3,
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyState
                  text="No financial series is available for this period."
                />
              )}
            </section>


            {/* SALES + CROP PERFORMANCE */}

            <div className="grid gap-6 xl:grid-cols-2">
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-black/10 sm:p-7">
                <SectionTitle
                  eyebrow="Sales Intelligence"
                  title="Monthly Sales"
                  description="Revenue and completed order activity over time."
                />

                {analytics
                  .monthly_sales
                  .length > 0 ? (
                  <div className="mt-7 h-[320px]">
                    <ResponsiveContainer
                      width="100%"
                      height="100%"
                    >
                      <BarChart
                        data={
                          analytics
                            .monthly_sales
                        }
                      >
                        <CartesianGrid
                          stroke="var(--agriva-border, #e2e8f0)"
                          strokeDasharray="4 4"
                          vertical={
                            false
                          }
                        />

                        <XAxis
                          dataKey="month"
                          stroke="var(--agriva-text-muted, #64748b)"
                          tickLine={
                            false
                          }
                          axisLine={
                            false
                          }
                        />

                        <YAxis
                          stroke="var(--agriva-text-muted, #64748b)"
                          tickLine={
                            false
                          }
                          axisLine={
                            false
                          }
                        />

                        <Tooltip
                          contentStyle={{
                            background:
                              "var(--agriva-surface, #ffffff)",
                            border:
                              "1px solid var(--agriva-border, #e2e8f0)",
                            borderRadius:
                              "16px",
                            color:
                              "var(--agriva-text, #0f172a)",
                          }}
                          formatter={(
                            value,
                            name
                          ) =>
                            name ===
                            "Revenue"
                              ? money(
                                  Number(
                                    value ||
                                      0
                                  )
                                )
                              : Number(
                                  value ||
                                    0
                                )
                          }
                        />

                        <Legend />

                        <Bar
                          dataKey="revenue"
                          name="Revenue"
                          fill="#10b981"
                          radius={[
                            8,
                            8,
                            0,
                            0,
                          ]}
                        />

                        <Bar
                          dataKey="orders"
                          name="Orders"
                          fill="#0f766e"
                          radius={[
                            8,
                            8,
                            0,
                            0,
                          ]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState
                    text="No monthly sales are available for this period."
                  />
                )}
              </section>


              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-black/10 sm:p-7">
                <SectionTitle
                  eyebrow="Crop Intelligence"
                  title="Crop Performance"
                  description="Compare crop revenue and order activity."
                />

                {analytics
                  .crop_performance
                  .length > 0 ? (
                  <div className="mt-7 h-[320px]">
                    <ResponsiveContainer
                      width="100%"
                      height="100%"
                    >
                      <BarChart
                        data={
                          analytics
                            .crop_performance
                        }
                      >
                        <CartesianGrid
                          stroke="var(--agriva-border, #e2e8f0)"
                          strokeDasharray="4 4"
                          vertical={
                            false
                          }
                        />

                        <XAxis
                          dataKey="crop_name"
                          stroke="var(--agriva-text-muted, #64748b)"
                          tickLine={
                            false
                          }
                          axisLine={
                            false
                          }
                        />

                        <YAxis
                          stroke="var(--agriva-text-muted, #64748b)"
                          tickLine={
                            false
                          }
                          axisLine={
                            false
                          }
                        />

                        <Tooltip
                          contentStyle={{
                            background:
                              "var(--agriva-surface, #ffffff)",
                            border:
                              "1px solid var(--agriva-border, #e2e8f0)",
                            borderRadius:
                              "16px",
                            color:
                              "var(--agriva-text, #0f172a)",
                          }}
                          formatter={(
                            value,
                            name
                          ) =>
                            name ===
                            "Revenue"
                              ? money(
                                  Number(
                                    value ||
                                      0
                                  )
                                )
                              : Number(
                                  value ||
                                    0
                                )
                          }
                        />

                        <Legend />

                        <Bar
                          dataKey="revenue"
                          name="Revenue"
                          fill="#10b981"
                          radius={[
                            8,
                            8,
                            0,
                            0,
                          ]}
                        />

                        <Bar
                          dataKey="orders"
                          name="Orders"
                          fill="#3b82f6"
                          radius={[
                            8,
                            8,
                            0,
                            0,
                          ]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState
                    text="No crop sales performance is available yet."
                  />
                )}
              </section>
            </div>


            {/* BUYERS + FARM HEALTH */}

            <div className="grid gap-6 xl:grid-cols-2">
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-black/10 sm:p-7">
                <SectionTitle
                  eyebrow="Buyer Intelligence"
                  title="Buyer Distribution"
                  description="See which buyers contribute most to completed crop revenue."
                />

                {analytics
                  .buyer_distribution
                  .length > 0 ? (
                  <div className="mt-6 grid gap-6 lg:grid-cols-[230px_1fr] lg:items-center">
                    <div className="h-[230px]">
                      <ResponsiveContainer
                        width="100%"
                        height="100%"
                      >
                        <PieChart>
                          <Pie
                            data={
                              analytics
                                .buyer_distribution
                            }
                            dataKey="revenue"
                            nameKey="buyer_name"
                            innerRadius={
                              58
                            }
                            outerRadius={
                              90
                            }
                            paddingAngle={
                              3
                            }
                          >
                            {analytics
                              .buyer_distribution
                              .map(
                                (
                                  buyer,
                                  index
                                ) => (
                                  <Cell
                                    key={
                                      buyer
                                        .buyer_id
                                    }
                                    fill={
                                      PIE_COLORS[
                                        index %
                                          PIE_COLORS.length
                                      ]
                                    }
                                  />
                                )
                              )}
                          </Pie>

                          <Tooltip
                            contentStyle={{
                              background:
                                "var(--agriva-surface, #ffffff)",
                              border:
                                "1px solid var(--agriva-border, #e2e8f0)",
                              borderRadius:
                                "16px",
                              color:
                                "var(--agriva-text, #0f172a)",
                            }}
                            formatter={(
                              value
                            ) =>
                              money(
                                Number(
                                  value ||
                                    0
                                )
                              )
                            }
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="space-y-3">
                      {analytics
                        .buyer_distribution
                        .slice(
                          0,
                          5
                        )
                        .map(
                          (
                            buyer,
                            index
                          ) => {
                            const share =
                              totalBuyerRevenue >
                              0
                                ? (
                                    buyer.revenue /
                                    totalBuyerRevenue
                                  ) *
                                  100
                                : 0;

                            return (
                              <div
                                key={
                                  buyer
                                    .buyer_id
                                }
                                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="truncate font-bold text-slate-900">
                                      {
                                        buyer
                                          .buyer_name
                                      }
                                    </p>

                                    <p className="mt-1 text-xs text-slate-500">
                                      {
                                        buyer.orders
                                      }{" "}
                                      order
                                      {buyer.orders ===
                                      1
                                        ? ""
                                        : "s"}
                                    </p>
                                  </div>

                                  <span className="text-sm font-black text-emerald-700">
                                    {money(
                                      buyer.revenue
                                    )}
                                  </span>
                                </div>

                                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                                  <div
                                    className="h-full rounded-full"
                                    style={{
                                      width:
                                        `${Math.min(
                                          100,
                                          Math.max(
                                            0,
                                            share
                                          )
                                        )}%`,
                                      background:
                                        PIE_COLORS[
                                          index %
                                            PIE_COLORS.length
                                        ],
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          }
                        )}
                    </div>
                  </div>
                ) : (
                  <EmptyState
                    text="No completed buyer activity is available for this period."
                  />
                )}
              </section>


              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-black/10 sm:p-7">
                <SectionTitle
                  eyebrow="Crop Health Intelligence"
                  title="Farm Health"
                  description="Current crop-health status distribution recorded by AGRIVA."
                />

                {analytics
                  .farm_health
                  .length > 0 ? (
                  <div className="mt-6 grid gap-5 sm:grid-cols-[1fr_220px] sm:items-center">
                    <div className="space-y-3">
                      {analytics
                        .farm_health
                        .map(
                          (
                            item,
                            index
                          ) => (
                            <div
                              key={`${item.status}-${index}`}
                              className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4"
                            >
                              <div className="flex items-center gap-3">
                                <span
                                  className="h-3 w-3 rounded-full"
                                  style={{
                                    background:
                                      PIE_COLORS[
                                        index %
                                          PIE_COLORS.length
                                      ],
                                  }}
                                />

                                <span className="font-semibold capitalize text-slate-700">
                                  {
                                    item.status
                                  }
                                </span>
                              </div>

                              <span className="rounded-full bg-white px-3 py-1 text-sm font-black text-slate-900 shadow-sm">
                                {
                                  item.count
                                }
                              </span>
                            </div>
                          )
                        )}
                    </div>

                    <div className="h-[220px]">
                      <ResponsiveContainer
                        width="100%"
                        height="100%"
                      >
                        <PieChart>
                          <Pie
                            data={
                              analytics
                                .farm_health
                            }
                            dataKey="count"
                            nameKey="status"
                            innerRadius={
                              55
                            }
                            outerRadius={
                              85
                            }
                            paddingAngle={
                              3
                            }
                          >
                            {analytics
                              .farm_health
                              .map(
                                (
                                  item,
                                  index
                                ) => (
                                  <Cell
                                    key={`${item.status}-${index}`}
                                    fill={
                                      PIE_COLORS[
                                        index %
                                          PIE_COLORS.length
                                      ]
                                    }
                                  />
                                )
                              )}
                          </Pie>

                          <Tooltip
                            contentStyle={{
                              background:
                                "var(--agriva-surface, #ffffff)",
                              border:
                                "1px solid var(--agriva-border, #e2e8f0)",
                              borderRadius:
                                "16px",
                              color:
                                "var(--agriva-text, #0f172a)",
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                ) : (
                  <EmptyState
                    text="No crop-health analysis is available yet."
                  />
                )}
              </section>
            </div>


            {/* CROP SALES TABLE */}

            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-black/10">
              <div className="p-6 sm:p-7">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <SectionTitle
                    eyebrow="Sales Breakdown"
                    title="Crop Sales Details"
                    description="Completed sales performance by crop."
                  />

                  {topBuyer && (
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">
                        Top Buyer
                      </p>

                      <p className="mt-1 font-black text-slate-900">
                        {
                          topBuyer
                            .buyer_name
                        }
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {analytics
                .crop_performance
                .length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <TableHeading>
                          Crop
                        </TableHeading>

                        <TableHeading>
                          Orders
                        </TableHeading>

                        <TableHeading>
                          Quantity Sold
                        </TableHeading>

                        <TableHeading>
                          Revenue
                        </TableHeading>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {analytics
                        .crop_performance
                        .map(
                          (
                            crop
                          ) => (
                            <tr
                              key={
                                crop
                                  .crop_name
                              }
                              className="transition hover:bg-emerald-50/50"
                            >
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                                    <Wheat className="h-4 w-4" />
                                  </span>

                                  <span className="font-bold text-slate-900">
                                    {
                                      crop
                                        .crop_name
                                    }
                                  </span>
                                </div>
                              </TableCell>

                              <TableCell>
                                {
                                  crop.orders
                                }
                              </TableCell>

                              <TableCell>
                                {number(
                                  crop
                                    .quantity_sold_kg
                                )}{" "}
                                kg
                              </TableCell>

                              <TableCell>
                                <span className="font-black text-emerald-700">
                                  {money(
                                    crop
                                      .revenue
                                  )}
                                </span>
                              </TableCell>
                            </tr>
                          )
                        )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState
                  text="No crop sales are available for this period."
                />
              )}
            </section>


            <div className="flex items-center justify-center gap-2 pb-4 text-xs font-medium text-slate-400">
              <Users className="h-4 w-4" />

              AGRIVA Farmer Analytics • Database-backed intelligence
            </div>
          </>
        )}
      </div>
    </main>
  );
}


function MetricCard({
  title,
  value,
  helper,
  icon,
  emphasis = false,
}: {
  title: string;
  value: string;
  helper: string;
  icon: React.ReactNode;
  emphasis?: boolean;
}) {
  return (
    <article
      className={`relative overflow-hidden rounded-3xl border p-5 shadow-xl shadow-black/10 ${
        emphasis
          ? "border-emerald-300 bg-gradient-to-br from-emerald-50 via-white to-white dark:border-emerald-800 dark:from-[#0D2A1E] dark:via-[#0B2118] dark:to-[#0B2118]"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-emerald-500/5" />

      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">
            {title}
          </p>

          <p className="mt-4 text-2xl font-black tracking-tight text-slate-950">
            {value}
          </p>

          <p className="mt-2 text-xs leading-5 text-slate-400">
            {helper}
          </p>
        </div>

        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
          <span className="[&>svg]:h-5 [&>svg]:w-5">
            {icon}
          </span>
        </div>
      </div>
    </article>
  );
}


function SmallMetric({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-emerald-700">
        <span className="[&>svg]:h-4 [&>svg]:w-4">
          {icon}
        </span>

        <p className="text-xs font-black uppercase tracking-[0.11em]">
          {title}
        </p>
      </div>

      <p className="mt-3 text-xl font-black text-slate-900">
        {value}
      </p>
    </article>
  );
}


function DarkMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-emerald-200">
        {label}
      </p>

      <p className="mt-2 text-xl font-black text-white">
        {value}
      </p>
    </div>
  );
}


function SectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.17em] text-emerald-700">
        {eyebrow}
      </p>

      <h2 className="mt-1 text-xl font-black text-slate-950 sm:text-2xl">
        {title}
      </h2>

      <p className="mt-2 text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}


function EmptyState({
  text,
}: {
  text: string;
}) {
  return (
    <div className="mt-6 flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
      <div>
        <BarChart3 className="mx-auto h-8 w-8 text-emerald-600" />

        <p className="mt-4 text-sm font-semibold text-slate-500">
          {text}
        </p>
      </div>
    </div>
  );
}


function TableHeading({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-[0.12em] text-slate-500">
      {children}
    </th>
  );
}


function TableCell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
      {children}
    </td>
  );
}
