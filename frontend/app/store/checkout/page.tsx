"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CheckCircle,
  Loader2,
  ShoppingBag,
} from "lucide-react";
import { useRouter } from "next/navigation";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000";

type CartItem = {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
};

type Cart = {
  id: string;
  items: CartItem[];
  total?: number;
  total_amount?: number;
};

export default function CheckoutPage() {
  const router = useRouter();

  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function loadCart() {
      const token = localStorage.getItem("access_token");

      if (!token) {
        setError("Please login before checkout.");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `${API_URL}/api/store/cart`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.detail || "Unable to load cart"
          );
        }

        setCart(data.cart);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load cart"
        );
      } finally {
        setLoading(false);
      }
    }

    loadCart();
  }, []);

  const calculatedTotal =
    cart?.items.reduce(
      (sum, item) => sum + item.subtotal,
      0
    ) ?? 0;

  async function handleCheckout() {
    const token = localStorage.getItem("access_token");

    if (!token) {
      setError("Please login before checkout.");
      return;
    }

    if (!cart || cart.items.length === 0) {
      setError("Your cart is empty.");
      return;
    }

    setCheckingOut(true);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/api/store/checkout`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Checkout failed"
        );
      }

      setSuccess(true);
      setCart({
        ...cart,
        items: [],
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Checkout failed"
      );
    } finally {
      setCheckingOut(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 text-slate-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading checkout...
        </div>
      </main>
    );
  }

  if (success) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="w-full max-w-lg rounded-2xl border bg-white p-8 text-center shadow-sm">
          <CheckCircle className="mx-auto h-16 w-16 text-green-600" />

          <h1 className="mt-5 text-3xl font-bold text-slate-900">
            Order Placed!
          </h1>

          <p className="mt-3 text-slate-600">
            Your AGRIVA Store order was created successfully.
          </p>

          <button
            onClick={() => router.push("/store")}
            className="mt-7 rounded-lg bg-green-700 px-6 py-3 font-medium text-white hover:bg-green-800"
          >
            Continue Shopping
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <Link
          href="/store/cart"
          className="inline-flex items-center gap-2 text-slate-600 hover:text-green-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Cart
        </Link>

        <div className="mt-8">
          <h1 className="text-3xl font-bold text-slate-900">
            AGRIVA Checkout
          </h1>

          <p className="mt-2 text-slate-600">
            Review your order before placing it.
          </p>
        </div>

        {error && (
          <div className="mt-6 rounded-lg bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        <div className="mt-8 rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <ShoppingBag className="h-6 w-6 text-green-700" />

            <h2 className="text-xl font-semibold">
              Order Summary
            </h2>
          </div>

          {!cart || cart.items.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-slate-500">
                Your cart is empty.
              </p>

              <Link
                href="/store/products"
                className="mt-5 inline-block rounded-lg bg-green-700 px-5 py-2 text-white"
              >
                Browse Products
              </Link>
            </div>
          ) : (
            <>
              <div className="mt-6 divide-y">
                {cart.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-4"
                  >
                    <div>
                      <p className="font-medium text-slate-900">
                        {item.product_name}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        ₹{item.unit_price} × {item.quantity}
                      </p>
                    </div>

                    <p className="font-semibold">
                      ₹{item.subtotal}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex items-center justify-between border-t pt-5">
                <span className="text-lg font-semibold">
                  Total
                </span>

                <span className="text-2xl font-bold text-green-700">
                  ₹{calculatedTotal.toFixed(2)}
                </span>
              </div>

              <button
                onClick={handleCheckout}
                disabled={checkingOut}
                className="mt-7 flex w-full items-center justify-center gap-2 rounded-lg bg-green-700 px-5 py-3 font-semibold text-white hover:bg-green-800 disabled:bg-slate-400"
              >
                {checkingOut && (
                  <Loader2 className="h-5 w-5 animate-spin" />
                )}

                {checkingOut
                  ? "Placing Order..."
                  : "Place Order"}
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}