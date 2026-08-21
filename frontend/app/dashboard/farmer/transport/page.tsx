"use client";

import {
  useEffect,
  useState,
} from "react";
import {
  ArrowLeft,
  Loader2,
  MapPin,
  PackageCheck,
  Truck,
} from "lucide-react";
import { useRouter } from "next/navigation";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000";

type FarmerOrder = {
  id: string;
  listing_id: string;
  buyer_id: string;
  total_amount: number;
  status: string;
  created_at: string;
};

export default function FarmerTransportPage() {
  const router = useRouter();

  const [orders, setOrders] =
    useState<FarmerOrder[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    void loadOrders();
  }, []);

  async function loadOrders() {
    const token =
      localStorage.getItem(
        "access_token"
      );

    if (!token) {
      router.replace("/login");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/api/orders/farmer/incoming`,
        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
          cache: "no-store",
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result?.detail ||
            "Unable to load orders"
        );
      }

      setOrders(
        Array.isArray(result)
          ? result
          : []
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load transport"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-5">
          <button
            onClick={() =>
              router.push(
                "/dashboard/farmer"
              )
            }
            className="rounded-xl border p-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div>
            <h1 className="text-2xl font-black">
              AGRIVA Transport
            </h1>

            <p className="text-sm text-slate-500">
              Farmer transport and delivery
              tracking
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="rounded-3xl bg-gradient-to-r from-emerald-700 to-green-600 p-8 text-white">
          <Truck className="h-10 w-10" />

          <h2 className="mt-4 text-3xl font-black">
            Transport Management
          </h2>

          <p className="mt-2 text-emerald-100">
            Track pickup, destination and
            delivery progress.
          </p>
        </div>

        {error && (
          <div className="mt-6 rounded-xl bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          </div>
        ) : orders.length === 0 ? (
          <div className="mt-8 rounded-2xl bg-white p-12 text-center shadow-sm">
            <Truck className="mx-auto h-12 w-12 text-slate-300" />

            <p className="mt-4 font-semibold">
              No transport orders
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            {orders.map((order) => (
              <article
                key={order.id}
                className="rounded-2xl bg-white p-6 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs text-slate-500">
                      Order
                    </p>

                    <h3 className="mt-1 font-bold">
                      #{order.id.slice(0, 8)}
                    </h3>
                  </div>

                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold capitalize text-emerald-700">
                    {order.status}
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <InfoBox
                    label="Amount"
                    value={`₹${order.total_amount}`}
                  />

                  <InfoBox
                    label="Buyer"
                    value={
                      order.buyer_id.slice(
                        0,
                        8
                      )
                    }
                  />
                </div>

                <div className="mt-5 rounded-xl bg-slate-50 p-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-emerald-600" />

                    <p className="text-sm font-semibold">
                      Transport lifecycle
                    </p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    <TimelineStep
                      label="Confirmed"
                    />

                    <TimelineStep
                      label="Processing"
                    />

                    <TimelineStep
                      label="Ready for Pickup"
                    />

                    <TimelineStep
                      label="In Transit"
                    />

                    <TimelineStep
                      label="Delivered"
                    />
                  </div>
                </div>

                {order.status ===
                  "completed" && (
                  <div className="mt-4 flex items-center gap-2 rounded-xl bg-blue-50 p-3 text-sm font-medium text-blue-700">
                    <PackageCheck className="h-5 w-5" />
                    Delivery completed
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function TimelineStep({
  label,
}: {
  label: string;
}) {
  return (
    <span className="rounded-full border border-slate-200 bg-white px-3 py-2">
      {label}
    </span>
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

      <p className="mt-1 font-bold">
        {value}
      </p>
    </div>
  );
}