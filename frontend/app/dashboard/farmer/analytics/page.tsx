"use client";

import {
  Activity,
  ArrowLeft,
  BarChart3,
  CircleDollarSign,
  Loader2,
  PackageCheck,
  RefreshCw,
  ShoppingBasket,
  Sprout,
  TrendingUp,
  Users,
  WalletCards,
  Wheat,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";

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


type CropPerformance = {
  crop_name: string;
  revenue: number;
  quantity_sold_kg: number;
  orders: number;
};


type MonthlySale = {
  month: string;
  revenue: number;
  orders: number;
};


type BuyerDistribution = {
  buyer_id: string;
  buyer_name: string;
  revenue: number;
  orders: number;
};


type FarmHealth = {
  status: string;
  count: number;
};


type AnalyticsResponse = {
  period: Period;

  summary: AnalyticsSummary;

  financial_series: FinancialPoint[];

  crop_performance: CropPerformance[];

  monthly_sales: MonthlySale[];

  buyer_distribution: BuyerDistribution[];

  farm_health: FarmHealth[];
};


const PERIODS: {
  label: string;
  value: Period;
}[] = [
  {
    label: "Daily",
    value: "daily",
  },
  {
    label: "Weekly",
    value: "weekly",
  },
  {
    label: "Monthly",
    value: "monthly",
  },
  {
    label: "Yearly",
    value: "yearly",
  },
];


function money(value: number) {
  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }
  ).format(value);
}


function number(value: number) {
  return new Intl.NumberFormat(
    "en-IN",
    {
      maximumFractionDigits: 2,
    }
  ).format(value);
}


function percent(value: number) {
  return `${number(value)}%`;
}


export default function FarmerAnalyticsPage() {
  const router = useRouter();

  const [period, setPeriod] =
    useState<Period>("monthly");

  const [analytics, setAnalytics] =
    useState<AnalyticsResponse | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");


  const loadAnalytics = useCallback(
    async (selectedPeriod: Period) => {
      setLoading(true);
      setError("");

      const token =
        localStorage.getItem(
          "access_token"
        );

      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        const response = await fetch(
          `${API_URL}/api/analytics/farmer?period=${selectedPeriod}`,
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
            cache: "no-store",
          }
        );

        if (
          response.status === 401 ||
          response.status === 403
        ) {
          localStorage.removeItem(
            "access_token"
          );

          localStorage.removeItem(
            "refresh_token"
          );

          router.replace("/login");
          return;
        }

        const body = await response
          .json()
          .catch(() => null);

        if (!response.ok) {
          throw new Error(
            body?.detail ||
              "Unable to load analytics."
          );
        }

        setAnalytics(
          body as AnalyticsResponse
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Analytics request failed."
        );
      } finally {
        setLoading(false);
      }
    },
    [router]
  );


  useEffect(() => {
    void loadAnalytics(period);
  }, [period, loadAnalytics]);


  function changePeriod(
    value: Period
  ) {
    setPeriod(value);
  }


  if (
    loading &&
    analytics === null
  ) {
    return (
      <main
        className="
          flex min-h-screen
          items-center justify-center
          bg-slate-50
        "
      >
        <div
          className="
            flex items-center gap-3
            rounded-2xl bg-white
            px-6 py-5
            text-slate-600
            shadow-sm
          "
        >
          <Loader2
            className="
              h-5 w-5
              animate-spin
              text-emerald-700
            "
          />

          Loading AGRIVA Analytics...
        </div>
      </main>
    );
  }


  if (
    error &&
    analytics === null
  ) {
    return (
      <main
        className="
          flex min-h-screen
          items-center justify-center
          bg-slate-50 px-4
        "
      >
        <div
          className="
            w-full max-w-lg
            rounded-3xl
            border border-red-100
            bg-white p-8
            text-center shadow-sm
          "
        >
          <BarChart3
            className="
              mx-auto h-12 w-12
              text-red-500
            "
          />

          <h1
            className="
              mt-4 text-xl
              font-bold
              text-slate-900
            "
          >
            Analytics unavailable
          </h1>

          <p
            className="
              mt-2 text-sm
              text-slate-500
            "
          >
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              void loadAnalytics(
                period
              )
            }
            className="
              mt-6 rounded-xl
              bg-emerald-700
              px-5 py-3
              font-semibold
              text-white
              hover:bg-emerald-800
            "
          >
            Try Again
          </button>
        </div>
      </main>
    );
  }


  if (!analytics) {
    return null;
  }


  const summary =
    analytics.summary;


  const completionRate =
    summary.total_orders > 0
      ? (
          summary.completed_orders /
          summary.total_orders
        ) * 100
      : 0;


  return (
    <main
      className="
        min-h-screen
        bg-slate-50
        text-slate-900
      "
    >
      {/* HEADER */}

      <header
        className="
          border-b
          border-slate-200
          bg-white
        "
      >
        <div
          className="
            mx-auto flex
            max-w-7xl
            flex-col gap-5
            px-4 py-6
            sm:px-6
            lg:flex-row
            lg:items-center
            lg:justify-between
            lg:px-8
          "
        >
          <div
            className="
              flex items-center
              gap-4
            "
          >
            <button
              type="button"
              onClick={() =>
                router.push(
                  "/dashboard/farmer"
                )
              }
              className="
                flex h-11 w-11
                items-center
                justify-center
                rounded-xl
                border
                border-slate-200
                bg-white
                hover:bg-slate-50
              "
            >
              <ArrowLeft
                className="h-5 w-5"
              />
            </button>

            <div>
              <div
                className="
                  flex items-center
                  gap-2
                "
              >
                <BarChart3
                  className="
                    h-6 w-6
                    text-emerald-700
                  "
                />

                <h1
                  className="
                    text-2xl
                    font-bold
                  "
                >
                  AGRIVA Analytics
                </h1>
              </div>

              <p
                className="
                  mt-1 text-sm
                  text-slate-500
                "
              >
                Farmer income, sales and
                farm performance dashboard
              </p>
            </div>
          </div>


          <div
            className="
              flex flex-wrap
              items-center gap-2
            "
          >
            {PERIODS.map(
              (item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() =>
                    changePeriod(
                      item.value
                    )
                  }
                  className={
                    period ===
                    item.value
                      ? `
                        rounded-xl
                        bg-emerald-700
                        px-4 py-2
                        text-sm
                        font-semibold
                        text-white
                      `
                      : `
                        rounded-xl
                        border
                        border-slate-200
                        bg-white
                        px-4 py-2
                        text-sm
                        font-semibold
                        text-slate-600
                        hover:bg-slate-50
                      `
                  }
                >
                  {item.label}
                </button>
              )
            )}

            <button
              type="button"
              onClick={() =>
                void loadAnalytics(
                  period
                )
              }
              disabled={loading}
              className="
                flex h-10 w-10
                items-center
                justify-center
                rounded-xl
                border
                border-slate-200
                bg-white
                hover:bg-slate-50
                disabled:opacity-50
              "
            >
              <RefreshCw
                className={
                  loading
                    ? "h-4 w-4 animate-spin"
                    : "h-4 w-4"
                }
              />
            </button>
          </div>
        </div>
      </header>


      <div
        className="
          mx-auto max-w-7xl
          space-y-6
          px-4 py-8
          sm:px-6
          lg:px-8
        "
      >
        {error && (
          <div
            className="
              rounded-2xl
              border border-red-100
              bg-red-50
              px-5 py-4
              text-sm
              text-red-700
            "
          >
            {error}
          </div>
        )}


        {/* FINANCIAL CARDS */}

        <section
          className="
            grid gap-4
            sm:grid-cols-2
            xl:grid-cols-5
          "
        >
          <MetricCard
            title="Total Revenue"
            value={money(
              summary.total_revenue
            )}
            icon={
              <CircleDollarSign />
            }
          />

          <MetricCard
            title="Total Expenses"
            value={money(
              summary.total_expenses
            )}
            icon={
              <WalletCards />
            }
          />

          <MetricCard
            title="Net Profit"
            value={money(
              summary.net_profit
            )}
            icon={
              <TrendingUp />
            }
          />

          <MetricCard
            title="Profit Margin"
            value={percent(
              summary.profit_margin
            )}
            icon={
              <BarChart3 />
            }
          />

          <MetricCard
            title="ROI"
            value={percent(
              summary.roi
            )}
            icon={
              <Activity />
            }
          />
        </section>


        {/* OPERATION CARDS */}

        <section
          className="
            grid gap-4
            sm:grid-cols-2
            lg:grid-cols-3
            xl:grid-cols-6
          "
        >
          <SmallMetric
            title="Orders"
            value={String(
              summary.total_orders
            )}
            icon={<ShoppingBasket />}
          />

          <SmallMetric
            title="Completed"
            value={String(
              summary.completed_orders
            )}
            icon={<PackageCheck />}
          />

          <SmallMetric
            title="Completion"
            value={percent(
              completionRate
            )}
            icon={<Activity />}
          />

          <SmallMetric
            title="Quantity Sold"
            value={`${number(
              summary
                .total_quantity_sold_kg
            )} kg`}
            icon={<Wheat />}
          />

          <SmallMetric
            title="Farm Area"
            value={`${number(
              summary
                .total_farm_area_acres
            )} acres`}
            icon={<Sprout />}
          />

          <SmallMetric
            title="Active Listings"
            value={String(
              summary.active_listings
            )}
            icon={<BarChart3 />}
          />
        </section>


        {/* FINANCIAL CHART */}

        <section
          className="
            rounded-3xl
            border
            border-slate-200
            bg-white
            p-5
            shadow-sm
            sm:p-6
          "
        >
          <SectionTitle
            title="Revenue, Expenses & Profit"
            description={`Financial performance for the ${period} period`}
          />

          {analytics
            .financial_series
            .length > 0 ? (
            <div
              className="
                mt-6 h-[340px]
                w-full
              "
            >
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
                    strokeDasharray="3 3"
                  />

                  <XAxis
                    dataKey="label"
                  />

                  <YAxis />

                  <Tooltip />

                  <Legend />

                  <Line
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke="#059669"
                    strokeWidth={3}
                  />

                  <Line
                    type="monotone"
                    dataKey="expenses"
                    name="Expenses"
                    stroke="#dc2626"
                    strokeWidth={3}
                  />

                  <Line
                    type="monotone"
                    dataKey="profit"
                    name="Profit"
                    stroke="#2563eb"
                    strokeWidth={3}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState
              text="No financial data for this period."
            />
          )}
        </section>


        <div
          className="
            grid gap-6
            xl:grid-cols-2
          "
        >
          {/* CROP PERFORMANCE */}

          <section
            className="
              rounded-3xl
              border
              border-slate-200
              bg-white
              p-5
              shadow-sm
              sm:p-6
            "
          >
            <SectionTitle
              title="Crop Performance"
              description="Revenue generated by each crop"
            />

            {analytics
              .crop_performance
              .length > 0 ? (
              <div
                className="
                  mt-6 h-[320px]
                "
              >
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
                      strokeDasharray="3 3"
                    />

                    <XAxis
                      dataKey="crop_name"
                    />

                    <YAxis />

                    <Tooltip />

                    <Bar
                      dataKey="revenue"
                      name="Revenue"
                      fill="#059669"
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
                text="No completed crop sales yet."
              />
            )}
          </section>


          {/* MONTHLY SALES */}

          <section
            className="
              rounded-3xl
              border
              border-slate-200
              bg-white
              p-5
              shadow-sm
              sm:p-6
            "
          >
            <SectionTitle
              title="Monthly Sales"
              description="Revenue trend from completed orders"
            />

            {analytics
              .monthly_sales
              .length > 0 ? (
              <div
                className="
                  mt-6 h-[320px]
                "
              >
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
                      strokeDasharray="3 3"
                    />

                    <XAxis
                      dataKey="month"
                    />

                    <YAxis />

                    <Tooltip />

                    <Bar
                      dataKey="revenue"
                      name="Sales"
                      fill="#2563eb"
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
                text="No monthly sales data."
              />
            )}
          </section>
        </div>


        <div
          className="
            grid gap-6
            xl:grid-cols-2
          "
        >
          {/* BUYERS */}

          <section
            className="
              rounded-3xl
              border
              border-slate-200
              bg-white
              p-5
              shadow-sm
              sm:p-6
            "
          >
            <SectionTitle
              title="Buyer Distribution"
              description="Top buyers based on completed sales"
            />

            {analytics
              .buyer_distribution
              .length > 0 ? (
              <div
                className="
                  mt-5 space-y-3
                "
              >
                {analytics
                  .buyer_distribution
                  .map(
                    (
                      buyer,
                      index
                    ) => (
                      <div
                        key={
                          buyer.buyer_id
                        }
                        className="
                          flex
                          items-center
                          justify-between
                          rounded-2xl
                          bg-slate-50
                          p-4
                        "
                      >
                        <div
                          className="
                            flex
                            items-center
                            gap-3
                          "
                        >
                          <div
                            className="
                              flex h-10
                              w-10
                              items-center
                              justify-center
                              rounded-xl
                              bg-emerald-100
                              font-bold
                              text-emerald-700
                            "
                          >
                            {index + 1}
                          </div>

                          <div>
                            <p
                              className="
                                font-semibold
                                text-slate-800
                              "
                            >
                              {
                                buyer
                                  .buyer_name
                              }
                            </p>

                            <p
                              className="
                                text-xs
                                text-slate-500
                              "
                            >
                              {
                                buyer.orders
                              }{" "}
                              completed
                              orders
                            </p>
                          </div>
                        </div>

                        <p
                          className="
                            font-bold
                            text-emerald-700
                          "
                        >
                          {money(
                            buyer.revenue
                          )}
                        </p>
                      </div>
                    )
                  )}
              </div>
            ) : (
              <EmptyState
                text="No buyer sales data."
              />
            )}
          </section>


          {/* FARM HEALTH */}

          <section
            className="
              rounded-3xl
              border
              border-slate-200
              bg-white
              p-5
              shadow-sm
              sm:p-6
            "
          >
            <SectionTitle
              title="Farm Health"
              description="Crop health distribution"
            />

            {analytics
              .farm_health
              .length > 0 ? (
              <div
                className="
                  mt-5 h-[300px]
                "
              >
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
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label
                    >
                      {analytics
                        .farm_health
                        .map(
                          (
                            _,
                            index
                          ) => (
                            <Cell
                              key={
                                index
                              }
                              fill={
                                [
                                  "#059669",
                                  "#2563eb",
                                  "#f59e0b",
                                  "#dc2626",
                                  "#7c3aed",
                                ][
                                  index %
                                    5
                                ]
                              }
                            />
                          )
                        )}
                    </Pie>

                    <Tooltip />

                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState
                text="No crop health analysis available yet."
              />
            )}
          </section>
        </div>


        {/* CROP TABLE */}

        <section
          className="
            overflow-hidden
            rounded-3xl
            border
            border-slate-200
            bg-white
            shadow-sm
          "
        >
          <div className="p-6">
            <SectionTitle
              title="Crop Sales Details"
              description="Completed sales performance by crop"
            />
          </div>

          {analytics
            .crop_performance
            .length > 0 ? (
            <div
              className="
                overflow-x-auto
              "
            >
              <table
                className="
                  min-w-full
                  divide-y
                  divide-slate-200
                "
              >
                <thead
                  className="
                    bg-slate-50
                  "
                >
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

                <tbody
                  className="
                    divide-y
                    divide-slate-100
                  "
                >
                  {analytics
                    .crop_performance
                    .map(
                      (crop) => (
                        <tr
                          key={
                            crop.crop_name
                          }
                        >
                          <TableCell>
                            <div
                              className="
                                flex
                                items-center
                                gap-2
                                font-semibold
                              "
                            >
                              <Wheat
                                className="
                                  h-4 w-4
                                  text-emerald-700
                                "
                              />

                              {
                                crop.crop_name
                              }
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
                            <span
                              className="
                                font-bold
                                text-emerald-700
                              "
                            >
                              {money(
                                crop.revenue
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
              text="No crop sales available."
            />
          )}
        </section>


        <div
          className="
            flex items-center
            justify-center gap-2
            pb-4
            text-xs
            text-slate-400
          "
        >
          <Users
            className="h-4 w-4"
          />

          AGRIVA Farmer Analytics •
          Database-backed analytics
        </div>
      </div>
    </main>
  );
}


function MetricCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      className="
        rounded-3xl
        border
        border-slate-200
        bg-white
        p-5
        shadow-sm
      "
    >
      <div
        className="
          flex items-center
          justify-between
        "
      >
        <p
          className="
            text-sm
            font-medium
            text-slate-500
          "
        >
          {title}
        </p>

        <div
          className="
            flex h-10 w-10
            items-center
            justify-center
            rounded-xl
            bg-emerald-50
            text-emerald-700
          "
        >
          {icon}
        </div>
      </div>

      <p
        className="
          mt-5 text-2xl
          font-bold
          tracking-tight
        "
      >
        {value}
      </p>
    </div>
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
    <div
      className="
        rounded-2xl
        border
        border-slate-200
        bg-white
        p-4
      "
    >
      <div
        className="
          flex items-center
          gap-2
          text-emerald-700
        "
      >
        <div className="h-4 w-4">
          {icon}
        </div>

        <p
          className="
            text-xs
            font-semibold
            uppercase
            tracking-wide
          "
        >
          {title}
        </p>
      </div>

      <p
        className="
          mt-3 text-xl
          font-bold
          text-slate-800
        "
      >
        {value}
      </p>
    </div>
  );
}


function SectionTitle({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h2
        className="
          text-lg
          font-bold
          text-slate-900
        "
      >
        {title}
      </h2>

      <p
        className="
          mt-1 text-sm
          text-slate-500
        "
      >
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
    <div
      className="
        flex min-h-[220px]
        items-center
        justify-center
        p-6
        text-center
        text-sm
        text-slate-400
      "
    >
      {text}
    </div>
  );
}


function TableHeading({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <th
      className="
        px-6 py-4
        text-left
        text-xs
        font-bold
        uppercase
        tracking-wider
        text-slate-500
      "
    >
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
    <td
      className="
        whitespace-nowrap
        px-6 py-4
        text-sm
        text-slate-600
      "
    >
      {children}
    </td>
  );
}