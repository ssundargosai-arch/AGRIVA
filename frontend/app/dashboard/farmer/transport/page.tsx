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
  useTranslations,
} from "next-intl";

import {
  ArrowLeft,
  BadgeIndianRupee,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Loader2,
  MapPinned,
  PackageCheck,
  RefreshCw,
  Route,
  Sparkles,
  Truck,
  UserRound,
} from "lucide-react";


const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000";


type OrderItem = {
  id?: string;
  crop_id?: string;
  quantity_kg?: number;
  price_per_kg?: number;
};


type FarmerOrder = {
  id: string;
  listing_id?: string;
  buyer_id?: string;
  total_amount?: number;
  status?: string;
  created_at?: string;
  items?: OrderItem[];
};


const LIFECYCLE = [
  "confirmed",
  "processing",
  "ready_for_pickup",
  "in_transit",
  "delivered",
] as const;


function normalizeStatus(
  status?: string
) {
  return (
    status ||
    "pending"
  )
    .trim()
    .toLowerCase()
    .replaceAll("-", "_")
    .replaceAll(" ", "_");
}


function shortId(
  value?: string
) {
  if (!value) {
    return "—";
  }

  return value.length > 10
    ? `${value.slice(
        0,
        8
      )}…`
    : value;
}


function money(
  value?: number
) {
  return `₹${Number(
    value || 0
  ).toLocaleString(
    "en-IN",
    {
      maximumFractionDigits:
        2,
    }
  )}`;
}


function orderQuantity(
  order: FarmerOrder
) {
  return (
    order.items?.reduce(
      (
        total,
        item
      ) =>
        total +
        Number(
          item.quantity_kg ||
            0
        ),
      0
    ) || 0
  );
}


function lifecycleIndex(
  status?: string
) {
  const current =
    normalizeStatus(status);

  if (
    current ===
      "delivered" ||
    current ===
      "completed"
  ) {
    return 5;
  }

  if (
    current ===
      "in_transit" ||
    current ===
      "transit"
  ) {
    return 4;
  }

  if (
    current ===
      "ready_for_pickup" ||
    current ===
      "ready" ||
    current ===
      "picked_up"
  ) {
    return 3;
  }

  if (
    current ===
      "processing"
  ) {
    return 2;
  }

  if (
    current ===
      "accepted" ||
    current ===
      "confirmed"
  ) {
    return 1;
  }

  return 0;
}


function statusClass(
  status?: string
) {
  const current =
    normalizeStatus(status);

  if (
    current ===
      "delivered" ||
    current ===
      "completed"
  ) {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (
    current ===
      "in_transit" ||
    current ===
      "processing" ||
    current ===
      "ready_for_pickup"
  ) {
    return "border-blue-200 bg-blue-50 text-blue-800";
  }

  if (
    current ===
      "cancelled" ||
    current ===
      "rejected"
  ) {
    return "border-red-200 bg-red-50 text-red-800";
  }

  if (
    current ===
      "accepted" ||
    current ===
      "confirmed"
  ) {
    return "border-teal-200 bg-teal-50 text-teal-800";
  }

  return "border-amber-200 bg-amber-50 text-amber-900";
}


export default function FarmerTransportPage() {
  const router =
    useRouter();

  const t =
    useTranslations(
      "transportPage"
    );

  const [
    orders,
    setOrders,
  ] =
    useState<FarmerOrder[]>([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");


  const text =
    useCallback(
      (
        key: string,
        fallback: string
      ) => {
        try {
          return t.has(key)
            ? t(key)
            : fallback;
        } catch {
          return fallback;
        }
      },
      [t]
    );


  const loadOrders =
    useCallback(
      async (
        quiet = false
      ) => {
        const token =
          localStorage.getItem(
            "access_token"
          );

        if (!token) {
          router.replace(
            "/login"
          );
          return;
        }

        if (quiet) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        try {
          const response =
            await fetch(
              `${API_URL}/api/orders/farmer/incoming`,
              {
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },
                cache:
                  "no-store",
              }
            );

          const body =
            await response
              .json()
              .catch(
                () => null
              );

          if (
            response.status ===
              401
          ) {
            localStorage.removeItem(
              "access_token"
            );

            localStorage.removeItem(
              "refresh_token"
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
              typeof body?.detail ===
                "string"
                ? body.detail
                : text(
                    "unableToLoadOrders",
                    "Unable to load transport orders."
                  )
            );
          }

          const list =
            Array.isArray(body)
              ? body
              : Array.isArray(
                    body?.orders
                  )
                ? body.orders
                : Array.isArray(
                      body?.data
                    )
                  ? body.data
                  : [];

          setOrders(
            list as FarmerOrder[]
          );
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : text(
                  "unableToLoadOrders",
                  "Unable to load transport orders."
                )
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [
        router,
        text,
      ]
    );


  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);


  const summary =
    useMemo(() => {
      const total =
        orders.length;

      const delivered =
        orders.filter(
          (order) => {
            const status =
              normalizeStatus(
                order.status
              );

            return (
              status ===
                "delivered" ||
              status ===
                "completed"
            );
          }
        ).length;

      const active =
        orders.filter(
          (order) => {
            const status =
              normalizeStatus(
                order.status
              );

            return [
              "accepted",
              "confirmed",
              "processing",
              "ready_for_pickup",
              "in_transit",
            ].includes(
              status
            );
          }
        ).length;

      const totalValue =
        orders.reduce(
          (
            sum,
            order
          ) =>
            sum +
            Number(
              order.total_amount ||
                0
            ),
          0
        );

      return {
        total,
        active,
        delivered,
        totalValue,
      };
    }, [orders]);


  function statusLabel(
    status?: string
  ) {
    const current =
      normalizeStatus(
        status
      );

    const map:
      Record<
        string,
        [string, string]
      > = {
      pending: [
        "statusPending",
        "Pending",
      ],

      accepted: [
        "statusAccepted",
        "Accepted",
      ],

      confirmed: [
        "confirmed",
        "Confirmed",
      ],

      processing: [
        "statusProcessing",
        "Processing",
      ],

      ready_for_pickup: [
        "statusReady",
        "Ready for Pickup",
      ],

      in_transit: [
        "statusInTransit",
        "In Transit",
      ],

      delivered: [
        "delivered",
        "Delivered",
      ],

      completed: [
        "statusCompleted",
        "Completed",
      ],

      cancelled: [
        "statusCancelled",
        "Cancelled",
      ],

      rejected: [
        "statusCancelled",
        "Rejected",
      ],
    };

    const pair =
      map[current];

    if (!pair) {
      return (
        status ||
        "Pending"
      );
    }

    return text(
      pair[0],
      pair[1]
    );
  }


  function lifecycleLabel(
    stage:
      (typeof LIFECYCLE)[number]
  ) {
    const map:
      Record<
        (typeof LIFECYCLE)[number],
        [string, string]
      > = {
      confirmed: [
        "confirmed",
        "Confirmed",
      ],

      processing: [
        "processing",
        "Processing",
      ],

      ready_for_pickup: [
        "readyForPickup",
        "Ready for Pickup",
      ],

      in_transit: [
        "inTransit",
        "In Transit",
      ],

      delivered: [
        "delivered",
        "Delivered",
      ],
    };

    const pair =
      map[stage];

    return text(
      pair[0],
      pair[1]
    );
  }


  return (
    <main className="min-h-screen bg-slate-950">
      {/* =====================================================
          PRICE-INTELLIGENCE STYLE HERO
      ====================================================== */}

      <section className="relative overflow-hidden border-b border-white/10 bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-950">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-emerald-400/10 blur-3xl" />

        <div className="absolute -bottom-48 left-1/3 h-96 w-96 rounded-full bg-green-400/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Link
            href="/dashboard/farmer"
            className="inline-flex items-center gap-2 text-sm font-bold text-emerald-300 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />

            Farmer Dashboard
          </Link>

          <div className="mt-8 grid items-end gap-8 lg:grid-cols-[1fr_340px]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-emerald-200">
                <Sparkles className="h-4 w-4" />

                AGRIVA Transport Intelligence
              </div>

              <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-tight text-white md:text-5xl">
                {text(
                  "title",
                  "AGRIVA Transport"
                )}
              </h1>

              <p className="mt-4 max-w-3xl text-base font-medium leading-7 text-slate-200 md:text-lg">
                {text(
                  "subtitle",
                  "Track farmer orders and delivery progress from confirmation to final delivery."
                )}
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/10 p-5 text-white shadow-2xl shadow-black/20 backdrop-blur">
              <div className="flex items-start gap-3">
                <Route className="mt-0.5 h-8 w-8 shrink-0 text-emerald-300" />

                <div>
                  <p className="font-black text-white">
                    Delivery lifecycle
                  </p>

                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-200">
                    Follow order progress through confirmation,
                    processing, pickup, transit and delivery.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* =====================================================
          CONTENT
      ====================================================== */}

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* SUMMARY */}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Transport Orders"
            value={String(
              summary.total
            )}
            helper="Orders visible to this farmer"
            icon={
              <Truck className="h-5 w-5" />
            }
          />

          <SummaryCard
            label="Active Deliveries"
            value={String(
              summary.active
            )}
            helper="Accepted or moving through delivery"
            icon={
              <MapPinned className="h-5 w-5" />
            }
          />

          <SummaryCard
            label="Delivered"
            value={String(
              summary.delivered
            )}
            helper="Completed delivery lifecycle"
            icon={
              <PackageCheck className="h-5 w-5" />
            }
          />

          <SummaryCard
            label="Order Value"
            value={money(
              summary.totalValue
            )}
            helper="Combined value of visible orders"
            icon={
              <BadgeIndianRupee className="h-5 w-5" />
            }
          />
        </section>


        {/* MANAGEMENT HEADER */}

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-black/10 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.17em] text-emerald-700">
                Transport Management
              </p>

              <h2 className="mt-2 text-2xl font-black text-slate-950">
                {text(
                  "managementTitle",
                  "Transport Management"
                )}
              </h2>

              <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-600">
                {text(
                  "managementSubtitle",
                  "Track order progress from confirmation through pickup, transit and delivery."
                )}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                void loadOrders(
                  true
                )
              }
              disabled={
                refreshing
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-800 transition hover:border-emerald-300 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
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
                : "Refresh Orders"}
            </button>
          </div>
        </section>


        {/* ERROR */}

        {error && (
          <section className="mt-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-900">
            <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-black">
                Transport data unavailable
              </p>

              <p className="mt-1 text-sm font-semibold leading-6">
                {error}
              </p>
            </div>
          </section>
        )}


        {/* LOADING */}

        {loading ? (
          <section className="mt-6 flex min-h-[280px] items-center justify-center rounded-3xl border border-slate-200 bg-white shadow-xl shadow-black/10">
            <div className="text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-700" />

              <p className="mt-4 text-sm font-bold text-slate-700">
                {text(
                  "loadingOrders",
                  "Loading transport orders..."
                )}
              </p>
            </div>
          </section>
        ) : orders.length ===
          0 ? (
          <section className="mt-6 flex min-h-[300px] items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-xl shadow-black/10">
            <div>
              <Truck className="mx-auto h-12 w-12 text-emerald-700" />

              <h3 className="mt-5 text-xl font-black text-slate-950">
                {text(
                  "noOrders",
                  "No transport orders"
                )}
              </h3>

              <p className="mx-auto mt-2 max-w-xl text-sm font-medium leading-6 text-slate-600">
                Orders will appear here when buyers place
                marketplace orders for your crops.
              </p>
            </div>
          </section>
        ) : (
          <section className="mt-6 grid gap-6">
            {orders.map(
              (order) => {
                const progress =
                  lifecycleIndex(
                    order.status
                  );

                const cancelled =
                  [
                    "cancelled",
                    "rejected",
                  ].includes(
                    normalizeStatus(
                      order.status
                    )
                  );

                return (
                  <article
                    key={
                      order.id
                    }
                    className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-black/10"
                  >
                    {/* ORDER HEADER */}

                    <div className="border-b border-slate-200 bg-slate-50 p-5 sm:p-6">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.15em] text-emerald-700">
                            {text(
                              "order",
                              "Order"
                            )}{" "}
                            #{shortId(
                              order.id
                            )}
                          </p>

                          <h3 className="mt-2 text-xl font-black text-slate-950">
                            Crop delivery order
                          </h3>

                          <p className="mt-2 text-sm font-medium text-slate-600">
                            Created{" "}
                            {order.created_at
                              ? new Date(
                                  order.created_at
                                ).toLocaleString(
                                  "en-IN"
                                )
                              : "date unavailable"}
                          </p>
                        </div>

                        <span
                          className={`w-fit rounded-full border px-4 py-2 text-sm font-black ${statusClass(
                            order.status
                          )}`}
                        >
                          {statusLabel(
                            order.status
                          )}
                        </span>
                      </div>
                    </div>


                    <div className="p-5 sm:p-6">
                      {/* ORDER DETAILS */}

                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <InfoCard
                          label={text(
                            "buyer",
                            "Buyer"
                          )}
                          value={shortId(
                            order.buyer_id
                          )}
                          icon={
                            <UserRound className="h-5 w-5" />
                          }
                        />

                        <InfoCard
                          label={text(
                            "amount",
                            "Amount"
                          )}
                          value={money(
                            order.total_amount
                          )}
                          icon={
                            <BadgeIndianRupee className="h-5 w-5" />
                          }
                        />

                        <InfoCard
                          label="Quantity"
                          value={`${orderQuantity(
                            order
                          ).toLocaleString(
                            "en-IN"
                          )} kg`}
                          icon={
                            <PackageCheck className="h-5 w-5" />
                          }
                        />

                        <InfoCard
                          label="Current Status"
                          value={statusLabel(
                            order.status
                          )}
                          icon={
                            <Clock3 className="h-5 w-5" />
                          }
                        />
                      </div>


                      {/* DELIVERY LIFECYCLE */}

                      <div className="mt-7 rounded-3xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
                        <div className="flex items-center gap-2">
                          <Route className="h-5 w-5 text-emerald-700" />

                          <h4 className="text-lg font-black text-slate-950">
                            {text(
                              "lifecycle",
                              "Transport Lifecycle"
                            )}
                          </h4>
                        </div>

                        {cancelled ? (
                          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-900">
                            This order is cancelled or rejected, so
                            its delivery lifecycle is not active.
                          </div>
                        ) : (
                          <div className="mt-6 grid gap-3 md:grid-cols-5">
                            {LIFECYCLE.map(
                              (
                                stage,
                                index
                              ) => {
                                const step =
                                  index +
                                  1;

                                const complete =
                                  progress >=
                                  step;

                                const current =
                                  progress ===
                                  step &&
                                  progress <
                                    5;

                                return (
                                  <div
                                    key={
                                      stage
                                    }
                                    className={`relative rounded-2xl border p-4 ${
                                      complete
                                        ? "border-emerald-200 bg-emerald-50"
                                        : "border-slate-200 bg-white"
                                    }`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div
                                        className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${
                                          complete
                                            ? "bg-emerald-700 text-white"
                                            : "bg-slate-200 text-slate-600"
                                        }`}
                                      >
                                        {complete ? (
                                          <CheckCircle2 className="h-5 w-5" />
                                        ) : (
                                          <span className="text-xs font-black">
                                            {
                                              step
                                            }
                                          </span>
                                        )}
                                      </div>

                                      <div className="min-w-0">
                                        <p
                                          className={`text-sm font-black leading-5 ${
                                            complete
                                              ? "text-emerald-900"
                                              : "text-slate-700"
                                          }`}
                                        >
                                          {lifecycleLabel(
                                            stage
                                          )}
                                        </p>

                                        {current && (
                                          <p className="mt-1 text-xs font-bold text-emerald-700">
                                            Current stage
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                            )}
                          </div>
                        )}

                        {progress >=
                          5 && (
                          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
                            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

                            <p className="text-sm font-bold leading-6">
                              {text(
                                "deliveryCompleted",
                                "Delivery completed"
                              )}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                );
              }
            )}
          </section>
        )}


        {/* BACKEND ROLE NOTE */}

        <section className="mt-6 rounded-3xl border border-emerald-900 bg-[#063d36] p-6 text-white shadow-xl shadow-black/20">
          <div className="flex items-start gap-3">
            <Truck className="mt-0.5 h-7 w-7 shrink-0 text-emerald-300" />

            <div>
              <p className="text-xs font-black uppercase tracking-[0.15em] text-emerald-200">
                AGRIVA Delivery Intelligence
              </p>

              <h3 className="mt-2 text-xl font-black text-white">
                Farmer-side delivery visibility
              </h3>

              <p className="mt-2 max-w-4xl text-sm font-semibold leading-7 text-emerald-50/90">
                This dashboard shows the farmer&apos;s marketplace
                order lifecycle. Transport booking itself is
                managed by the buyer-side transport flow, while
                the farmer can monitor order progress here.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}


function SummaryCard({
  label,
  value,
  helper,
  icon,
}: {
  label: string;
  value: string;
  helper: string;
  icon: React.ReactNode;
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-black/10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-slate-600">
            {label}
          </p>

          <p className="mt-3 break-words text-2xl font-black text-slate-950">
            {value}
          </p>

          <p className="mt-2 text-xs font-medium leading-5 text-slate-500">
            {helper}
          </p>
        </div>

        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
          {icon}
        </div>
      </div>
    </article>
  );
}


function InfoCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-emerald-700">
        {icon}

        <p className="text-xs font-black uppercase tracking-[0.11em]">
          {label}
        </p>
      </div>

      <p className="mt-3 break-words text-base font-black text-slate-950">
        {value}
      </p>
    </div>
  );
}
