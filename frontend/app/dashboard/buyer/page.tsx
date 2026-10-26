"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useRouter } from "next/navigation";

import {
  CheckCircle2,
  Circle,
  CreditCard,
  Heart,
  Loader2,
  LogOut,
  MapPin,
  PackageCheck,
  RefreshCw,
  Search,
  ShoppingBasket,
  Store,
  Truck,
  User,
  Users,
  WalletCards,
  Wheat,
  X,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000";

function getToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return (
    localStorage.getItem("access_token") ||
    localStorage.getItem("token")
  );
}

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

type Listing = {
  id: string;
  crop_id: string;
  crop: string;
  quantity_kg: number;
  quality_grade: string | null;
  expected_price_per_kg: number;
  location: string | null;
  harvest_date: string | null;
  images: string[] | null;
  status: string;
  created_at: string;
};

type OrderItem = {
  id: string;
  crop_id: string;
  quantity_kg: number;
  price_per_kg: number;
};

type Order = {
  id: string;
  listing_id: string;
  buyer_id: string;
  total_amount: number;
  status: string;
  created_at: string;
  items: OrderItem[];
};

type Transaction = {
  id: string;
  payment_id: string;
  transaction_reference: string;
  amount: number;
  status: string;
  created_at: string;
};

type Payment = {
  id: string;
  order_id: string;
  amount: number;
  payment_method: string;
  status: string;
  transaction: Transaction | null;
};

type TransportBooking = {
  id: string;
  order_id: string;
  vehicle_type: string;
  pickup_location: string;
  delivery_location: string;
  estimated_cost: number;
  status: string;
};

type OrderTrackingEvent = {
  id: string;
  order_id: string;
  status: string;
  message: string | null;
  created_at: string;
};

type TransportStatus =
  | "requested"
  | "confirmed"
  | "picked_up"
  | "in_transit"
  | "delivered"
  | "cancelled";

/* =========================================================
   PAGE
========================================================= */

export default function BuyerDashboardPage() {
  const router = useRouter();

  /* -------------------------------------------------------
     MAIN DATA
  ------------------------------------------------------- */

  const [user, setUser] =
    useState<UserData | null>(null);

  const [listings, setListings] =
    useState<Listing[]>([]);

  const [favorites, setFavorites] =
    useState<string[]>([]);

  const [orders, setOrders] =
    useState<Order[]>([]);

  const [payments, setPayments] =
    useState<Payment[]>([]);

  const [
    transportBookings,
    setTransportBookings,
  ] = useState<TransportBooking[]>([]);

  /* -------------------------------------------------------
     PAGE STATE
  ------------------------------------------------------- */

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [theme, setTheme] =
    useState<"light" | "dark">("light");

  /* -------------------------------------------------------
     ORDER MODAL
  ------------------------------------------------------- */

  const [
    orderingListing,
    setOrderingListing,
  ] = useState<Listing | null>(null);

  const [orderQuantity, setOrderQuantity] =
    useState("5");

  const [placingOrder, setPlacingOrder] =
    useState(false);

  /* -------------------------------------------------------
     PAYMENT MODAL
  ------------------------------------------------------- */

  const [payingOrder, setPayingOrder] =
    useState<Order | null>(null);

  const [paymentMethod, setPaymentMethod] =
    useState("upi");

  const [
    processingPayment,
    setProcessingPayment,
  ] = useState(false);

  const [
    refundingPaymentId,
    setRefundingPaymentId,
  ] = useState<string | null>(null);

  /* -------------------------------------------------------
     TRANSPORT MODAL
  ------------------------------------------------------- */

  const [
    transportOrder,
    setTransportOrder,
  ] = useState<Order | null>(null);

  const [vehicleType, setVehicleType] =
    useState("Mini Truck");

  const [
    pickupLocation,
    setPickupLocation,
  ] = useState(
    "Prayagraj, Uttar Pradesh"
  );

  const [
    deliveryLocation,
    setDeliveryLocation,
  ] = useState("");

  const [
    transportCost,
    setTransportCost,
  ] = useState("850");

  const [
    bookingTransport,
    setBookingTransport,
  ] = useState(false);

  const [
    updatingTransportId,
    setUpdatingTransportId,
  ] = useState<string | null>(null);

  /* -------------------------------------------------------
     PHASE 11 TRACKING
  ------------------------------------------------------- */

  const [
    trackingOrder,
    setTrackingOrder,
  ] = useState<Order | null>(null);

  const [
    trackingEvents,
    setTrackingEvents,
  ] = useState<OrderTrackingEvent[]>([]);

  const [
    trackingLoading,
    setTrackingLoading,
  ] = useState(false);

  const [
    trackingError,
    setTrackingError,
  ] = useState("");

  /* =========================================================
     INITIAL LOAD
  ========================================================= */

  useEffect(() => {
    void initializeDashboard();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  async function initializeDashboard() {
    setLoading(true);
    setError("");

    const token =
      getToken();

    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/auth/me`,
        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
          cache: "no-store",
        }
      );

      if (!response.ok) {
        logout();
        return;
      }

      const me: UserData =
        await response.json();

      const role =
        String(me.role).toUpperCase();

      if (role !== "BUYER") {
        setUser(null);

        if (role === "FARMER") {
          router.replace(
            "/dashboard/farmer"
          );
        } else if (role === "ADMIN") {
          router.replace(
            "/dashboard/admin"
          );
        } else {
          router.replace("/login");
        }

        return;
      }

      setUser(me);

      await refreshBuyerData(token);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load buyer dashboard."
      );
    } finally {
      setLoading(false);
    }
  }

  /* =========================================================
     REFRESH
  ========================================================= */

  async function refreshBuyerData(
    suppliedToken?: string
  ) {
    const token =
      suppliedToken ||
      getToken();

    if (!token) {
      return;
    }

    await Promise.all([
      loadListings(),
      loadFavorites(token),
      loadOrders(token),
      loadPayments(token),
      loadTransportBookings(token),
    ]);
  }

  /* =========================================================
     LOAD LISTINGS
  ========================================================= */

  async function loadListings() {
    const response = await fetch(
      `${API_URL}/api/marketplace/listings`,
      {
        cache: "no-store",
      }
    );

    if (!response.ok) {
      throw new Error(
        "Unable to load marketplace."
      );
    }

    const data: Listing[] =
      await response.json();

    setListings(data);
  }

  /* =========================================================
     LOAD FAVORITES
  ========================================================= */

  async function loadFavorites(
    token: string
  ) {
    const response = await fetch(
      `${API_URL}/api/marketplace/favorites`,
      {
        headers: {
          Authorization:
            `Bearer ${token}`,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return;
    }

    const data: Listing[] =
      await response.json();

    setFavorites(
      data.map(
        (listing) => listing.id
      )
    );
  }

  /* =========================================================
     LOAD ORDERS
  ========================================================= */

  async function loadOrders(
    token: string
  ) {
    const response = await fetch(
      `${API_URL}/api/orders/my-orders`,
      {
        headers: {
          Authorization:
            `Bearer ${token}`,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return;
    }

    const data: Order[] =
      await response.json();

    setOrders(data);
  }

  /* =========================================================
     LOAD PAYMENTS
  ========================================================= */

  async function loadPayments(
    token: string
  ) {
    const response = await fetch(
      `${API_URL}/api/payments/my-payments`,
      {
        headers: {
          Authorization:
            `Bearer ${token}`,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return;
    }

    const data: Payment[] =
      await response.json();

    setPayments(data);
  }

  /* =========================================================
     LOAD TRANSPORT
  ========================================================= */

  async function loadTransportBookings(
    token: string
  ) {
    const response = await fetch(
      `${API_URL}/api/transport/my-bookings`,
      {
        headers: {
          Authorization:
            `Bearer ${token}`,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return;
    }

    const data: TransportBooking[] =
      await response.json();

    setTransportBookings(data);
  }

  /* =========================================================
     FAVORITES
  ========================================================= */

  async function toggleFavorite(
    listingId: string
  ) {
    const token =
      getToken();

    if (!token) {
      router.replace("/login");
      return;
    }

    const isFavorite =
      favorites.includes(listingId);

    try {
      const response = await fetch(
        `${API_URL}/api/marketplace/favorites/${listingId}`,
        {
          method: isFavorite
            ? "DELETE"
            : "POST",

          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

      const body = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          body?.detail ||
            "Unable to update favorite."
        );
      }

      setFavorites((current) =>
        isFavorite
          ? current.filter(
              (id) =>
                id !== listingId
            )
          : [
              ...current,
              listingId,
            ]
      );
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Favorite update failed."
      );
    }
  }

  /* =========================================================
     CREATE ORDER
  ========================================================= */

  function openOrderModal(
    listing: Listing
  ) {
    setOrderingListing(listing);
    setOrderQuantity("5");
  }

  function closeOrderModal() {
    if (placingOrder) {
      return;
    }

    setOrderingListing(null);
  }

  async function placeOrder() {
    const token =
      getToken();

    if (!token) {
      router.replace("/login");
      return;
    }

    if (!orderingListing) {
      return;
    }

    const quantity =
      Number(orderQuantity);

    if (
      !Number.isFinite(quantity) ||
      quantity <= 0
    ) {
      alert(
        "Enter a valid quantity."
      );

      return;
    }

    if (
      quantity >
      orderingListing.quantity_kg
    ) {
      alert(
        "Requested quantity is greater than available stock."
      );

      return;
    }

    setPlacingOrder(true);

    try {
      const response = await fetch(
        `${API_URL}/api/orders`,
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${token}`,

            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            listing_id:
              orderingListing.id,

            quantity_kg:
              quantity,
          }),
        }
      );

      const body = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          body?.detail ||
            "Unable to place order."
        );
      }

      setOrderingListing(null);

      await refreshBuyerData(token);
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Order creation failed."
      );
    } finally {
      setPlacingOrder(false);
    }
  }

  /* =========================================================
     PAYMENT
  ========================================================= */

  function openPaymentModal(
    order: Order
  ) {
    setPayingOrder(order);
    setPaymentMethod("upi");
  }

  function closePaymentModal() {
    if (processingPayment) {
      return;
    }

    setPayingOrder(null);
  }

  async function payForOrder() {
    const token =
      getToken();

    if (!token || !payingOrder) {
      return;
    }

    setProcessingPayment(true);

    try {
      /* ---------------------------------------------
         CREATE PAYMENT
      --------------------------------------------- */

      const createResponse =
        await fetch(
          `${API_URL}/api/payments`,
          {
            method: "POST",

            headers: {
              Authorization:
                `Bearer ${token}`,

              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              order_id:
                payingOrder.id,

              payment_method:
                paymentMethod,
            }),
          }
        );

      const createResult =
        await createResponse
          .json()
          .catch(() => null);

      if (!createResponse.ok) {
        throw new Error(
          createResult?.detail ||
            "Unable to create payment."
        );
      }

      const payment =
        createResult as Payment;

      /* ---------------------------------------------
         DEMO PAYMENT COMPLETE
      --------------------------------------------- */

      if (
        payment.status === "pending"
      ) {
        const paidResponse =
          await fetch(
            `${API_URL}/api/payments/${payment.id}/status`,
            {
              method: "PATCH",

              headers: {
                Authorization:
                  `Bearer ${token}`,

                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                status: "paid",
              }),
            }
          );

        const paidResult =
          await paidResponse
            .json()
            .catch(() => null);

        if (!paidResponse.ok) {
          throw new Error(
            paidResult?.detail ||
              "Unable to complete payment."
          );
        }
      }

      setPayingOrder(null);

      await refreshBuyerData(token);
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Payment failed."
      );
    } finally {
      setProcessingPayment(false);
    }
  }

  /* =========================================================
     REFUND
  ========================================================= */

  async function refundPayment(
    payment: Payment
  ) {
    const token =
      getToken();

    if (!token) {
      return;
    }

    const confirmed =
      window.confirm(
        "Refund this payment?"
      );

    if (!confirmed) {
      return;
    }

    setRefundingPaymentId(
      payment.id
    );

    try {
      const response = await fetch(
        `${API_URL}/api/payments/${payment.id}/status`,
        {
          method: "PATCH",

          headers: {
            Authorization:
              `Bearer ${token}`,

            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            status: "refunded",
          }),
        }
      );

      const body = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          body?.detail ||
            "Unable to refund payment."
        );
      }

      await refreshBuyerData(token);
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Refund failed."
      );
    } finally {
      setRefundingPaymentId(null);
    }
  }

  /* =========================================================
     TRANSPORT BOOKING
  ========================================================= */

  function openTransportModal(
    order: Order
  ) {
    setTransportOrder(order);

    setVehicleType(
      "Mini Truck"
    );

    setPickupLocation(
      "Prayagraj, Uttar Pradesh"
    );

    setDeliveryLocation("");

    setTransportCost("850");
  }

  function closeTransportModal() {
    if (bookingTransport) {
      return;
    }

    setTransportOrder(null);
  }

  async function bookTransport() {
    const token =
      getToken();

    if (
      !token ||
      !transportOrder
    ) {
      return;
    }

    const cost =
      Number(transportCost);

    if (!vehicleType.trim()) {
      alert(
        "Select vehicle type."
      );

      return;
    }

    if (!pickupLocation.trim()) {
      alert(
        "Enter pickup location."
      );

      return;
    }

    if (
      !deliveryLocation.trim()
    ) {
      alert(
        "Enter delivery location."
      );

      return;
    }

    if (
      !Number.isFinite(cost) ||
      cost < 0
    ) {
      alert(
        "Enter valid transport cost."
      );

      return;
    }

    setBookingTransport(true);

    try {
      const response = await fetch(
        `${API_URL}/api/transport`,
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${token}`,

            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            order_id:
              transportOrder.id,

            vehicle_type:
              vehicleType.trim(),

            pickup_location:
              pickupLocation.trim(),

            delivery_location:
              deliveryLocation.trim(),

            estimated_cost: cost,
          }),
        }
      );

      const body = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          body?.detail ||
            "Unable to book transport."
        );
      }

      setTransportOrder(null);

      await refreshBuyerData(token);
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Transport booking failed."
      );
    } finally {
      setBookingTransport(false);
    }
  }

  /* =========================================================
     TRANSPORT STATUS
  ========================================================= */

  async function updateTransportStatus(
    booking: TransportBooking,
    newStatus: TransportStatus
  ) {
    const token =
      getToken();

    if (!token) {
      return;
    }

    setUpdatingTransportId(
      booking.id
    );

    try {
      const response = await fetch(
        `${API_URL}/api/transport/${booking.id}/status`,
        {
          method: "PATCH",

          headers: {
            Authorization:
              `Bearer ${token}`,

            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            status: newStatus,
          }),
        }
      );

      const body = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          body?.detail ||
            "Unable to update transport."
        );
      }

      await refreshBuyerData(token);

      if (
        trackingOrder &&
        trackingOrder.id ===
          booking.order_id
      ) {
        await loadOrderTracking(
          trackingOrder
        );
      }
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Transport update failed."
      );
    } finally {
      setUpdatingTransportId(null);
    }
  }

  /* =========================================================
     PHASE 11 ORDER TRACKING
  ========================================================= */

  async function loadOrderTracking(
    order: Order
  ) {
    const token =
      getToken();

    if (!token) {
      router.replace("/login");
      return;
    }

    setTrackingOrder(order);
    setTrackingLoading(true);
    setTrackingError("");

    try {
      const response = await fetch(
        `${API_URL}/api/orders/${order.id}/tracking`,
        {
          method: "GET",

          headers: {
            Authorization:
              `Bearer ${token}`,
          },

          cache: "no-store",
        }
      );

      const result = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.detail ||
            "Unable to load order tracking."
        );
      }

      setTrackingEvents(
        Array.isArray(result)
          ? result
          : []
      );
    } catch (err) {
      setTrackingEvents([]);

      setTrackingError(
        err instanceof Error
          ? err.message
          : "Unable to load tracking."
      );
    } finally {
      setTrackingLoading(false);
    }
  }

  function closeTrackingModal() {
    if (trackingLoading) {
      return;
    }

    setTrackingOrder(null);
    setTrackingEvents([]);
    setTrackingError("");
  }

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
    localStorage.removeItem("user");

    router.replace("/login");
  }

  /* =========================================================
     DERIVED DATA
  ========================================================= */

  const filteredListings =
    useMemo(() => {
      const value =
        search
          .trim()
          .toLowerCase();

      return listings.filter(
        (listing) => {
          if (
            listing.status !==
            "active"
          ) {
            return false;
          }

          if (!value) {
            return true;
          }

          return (
            listing.crop
              .toLowerCase()
              .includes(value) ||

            (
              listing.location || ""
            )
              .toLowerCase()
              .includes(value) ||

            (
              listing.quality_grade ||
              ""
            )
              .toLowerCase()
              .includes(value)
          );
        }
      );
    }, [listings, search]);

  const totalSpent =
    useMemo(
      () =>
        payments
          .filter(
            (payment) =>
              payment.status ===
              "paid"
          )
          .reduce(
            (sum, payment) =>
              sum +
              payment.amount,
            0
          ),
      [payments]
    );

  const activeOrders =
    orders.filter(
      (order) =>
        ![
          "completed",
          "cancelled",
          "rejected",
        ].includes(
          order.status
        )
    ).length;

  function findPayment(
    orderId: string
  ) {
    return payments.find(
      (payment) =>
        payment.order_id ===
        orderId
    );
  }

  function findBooking(
    orderId: string
  ) {
    return transportBookings.find(
      (booking) =>
        booking.order_id ===
        orderId
    );
  }

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-emerald-600" />

          <p className="mt-4 text-slate-500">
            Loading buyer dashboard...
          </p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-emerald-600" />

          <p className="mt-4 text-slate-500">
            Redirecting to your dashboard...
          </p>
        </div>
      </main>
    );
  }

  /* =========================================================
     UI
  ========================================================= */

  return (
    <main
      className={`agriva-role-dashboard agriva-buyer min-h-screen ${
        theme === "dark"
          ? "agriva-dark bg-slate-950 text-slate-100"
          : "bg-[#f6f8f5] text-slate-900"
      }`}
    >
      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="agriva-role-topbar border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <button
            onClick={() =>
              router.push("/")
            }
            className="flex items-center gap-2 text-2xl font-black text-emerald-700"
          >
            <Wheat className="h-7 w-7" />

            AGRIVA
          </button>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-900">
                {user?.full_name ||
                  "AGRIVA Buyer"}
              </p>

              <p className="text-xs text-slate-500">
                {user?.email}
              </p>
            </div>

            <div className="rounded-xl bg-emerald-50 p-2 text-emerald-700">
              <User className="h-5 w-5" />
            </div>

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

            <button
              onClick={logout}
              title="Logout"
              className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-100"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <section className="agriva-role-hero relative overflow-hidden rounded-[28px] border border-emerald-100 shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/78 to-white/15" />

          <div className="relative z-10 max-w-3xl px-6 py-9 sm:px-8">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
              AGRIVA Market Intelligence
            </p>

            <h1 className="mt-3 text-3xl font-black text-slate-950 sm:text-4xl">
              Welcome, {user?.full_name || "AGRIVA Buyer"} 🛒
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              Discover trusted farm produce, track orders, payments and transport — all from one sustainable marketplace.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="agriva-role-badge">🌾 Direct from Farmers</span>
              <span className="agriva-role-badge">🤖 AI Assisted</span>
              <span className="agriva-role-badge">♻️ Sustainable Supply</span>
            </div>
          </div>
        </section>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* =================================================
            TITLE
        ================================================= */}

        <section>
          <h1 className="text-3xl font-black text-slate-900">
            Buyer Dashboard
          </h1>

          <p className="mt-2 text-slate-500">
            Marketplace, orders,
            payments, transport and
            Phase 11 order tracking.
          </p>

          <a
            href="/dashboard/buyer/verification"
            className="mt-5 inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-black text-emerald-800 transition hover:bg-emerald-100"
          >
            ✓ Buyer Verification
          </a>

          {error && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}
        </section>

        {/* =================================================
            STATS
        ================================================= */}

        <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="My Orders"
            value={orders.length}
            icon={
              <ShoppingBasket className="h-7 w-7 text-emerald-600" />
            }
          />

          <StatCard
            label="Active Orders"
            value={activeOrders}
            icon={
              <PackageCheck className="h-7 w-7 text-blue-600" />
            }
          />

          <StatCard
            label="Favorites"
            value={favorites.length}
            icon={
              <Heart className="h-7 w-7 text-red-500" />
            }
          />

          <StatCard
            label="Total Paid"
            value={`₹${totalSpent.toFixed(
              2
            )}`}
            icon={
              <WalletCards className="h-7 w-7 text-violet-600" />
            }
          />
        </section>

        {/* =================================================
            MARKETPLACE
        ================================================= */}

        <section className="mt-12">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                Marketplace
              </h2>

              <p className="mt-1 text-slate-500">
                Buy crops directly from
                AGRIVA farmers.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/dashboard/buyer/fpo"
                )
              }
              className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-800 hover:bg-blue-100"
            >
              <Users className="h-4 w-4" />
              FPO Bulk Lots
            </button>

            <button
              onClick={() =>
                router.push(
                  "/marketplace"
                )
              }
              className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
            >
              <Store className="h-4 w-4" />

              Full Marketplace
            </button>
          </div>

          <div className="relative mt-6 max-w-lg">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search crop, location or quality..."
              className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-12 pr-4 outline-none focus:border-emerald-500"
            />
          </div>

          {filteredListings.length ===
          0 ? (
            <EmptyCard
              icon={
                <Wheat className="h-12 w-12 text-slate-300" />
              }
              title="No crops found"
              message="No active marketplace listing matches your search."
            />
          ) : (
            <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredListings.map(
                (listing) => {
                  const favorite =
                    favorites.includes(
                      listing.id
                    );

                  return (
                    <article
                      key={listing.id}
                      className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm text-slate-500">
                            Crop
                          </p>

                          <h3 className="mt-1 text-xl font-bold text-slate-900">
                            {listing.crop}
                          </h3>
                        </div>

                        <button
                          onClick={() =>
                            void toggleFavorite(
                              listing.id
                            )
                          }
                          className={`rounded-xl p-2 ${
                            favorite
                              ? "bg-red-50 text-red-500"
                              : "bg-slate-50 text-slate-400"
                          }`}
                        >
                          <Heart
                            className="h-5 w-5"
                            fill={
                              favorite
                                ? "currentColor"
                                : "none"
                            }
                          />
                        </button>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <InfoBox
                          label="Available"
                          value={`${listing.quantity_kg} kg`}
                        />

                        <InfoBox
                          label="Price"
                          value={`₹${listing.expected_price_per_kg}/kg`}
                        />

                        <InfoBox
                          label="Quality"
                          value={
                            listing.quality_grade ||
                            "-"
                          }
                        />

                        <InfoBox
                          label="Location"
                          value={
                            listing.location ||
                            "-"
                          }
                        />
                      </div>

                      {listing.location && (
                        <p className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                          <MapPin className="h-4 w-4" />

                          {listing.location}
                        </p>
                      )}

                      <button
                        onClick={() =>
                          openOrderModal(
                            listing
                          )
                        }
                        className="mt-5 w-full rounded-xl bg-emerald-700 px-4 py-3 font-semibold text-white hover:bg-emerald-800"
                      >
                        Place Order
                      </button>
                    </article>
                  );
                }
              )}
            </div>
          )}
        </section>

        {/* =================================================
            ORDERS
        ================================================= */}

        <section className="mt-12">
          <h2 className="text-2xl font-bold text-slate-900">
            My Orders
          </h2>

          <p className="mt-1 text-slate-500">
            View order, payment,
            transport and tracking
            status.
          </p>

          {orders.length === 0 ? (
            <EmptyCard
              icon={
                <ShoppingBasket className="h-12 w-12 text-slate-300" />
              }
              title="No orders yet"
              message="Place your first marketplace order."
            />
          ) : (
            <div className="mt-6 space-y-4">
              {orders.map((order) => {
                const item =
                  order.items?.[0];

                const payment =
                  findPayment(
                    order.id
                  );

                const booking =
                  findBooking(
                    order.id
                  );

                const isPaid =
                  payment?.status ===
                  "paid";

                return (
                  <article
                    key={order.id}
                    className="rounded-2xl bg-white p-6 shadow-sm"
                  >
                    <div className="flex flex-col justify-between gap-5 lg:flex-row">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="font-bold text-slate-900">
                            Order #
                            {order.id.slice(
                              0,
                              8
                            )}
                          </h3>

                          <StatusBadge
                            status={
                              order.status
                            }
                          />

                          {payment && (
                            <PaymentBadge
                              status={
                                payment.status
                              }
                            />
                          )}
                        </div>

                        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                          <InfoBox
                            label="Quantity"
                            value={
                              item
                                ? `${item.quantity_kg} kg`
                                : "-"
                            }
                          />

                          <InfoBox
                            label="Price"
                            value={
                              item
                                ? `₹${item.price_per_kg}/kg`
                                : "-"
                            }
                          />

                          <InfoBox
                            label="Total"
                            value={`₹${order.total_amount}`}
                          />

                          <InfoBox
                            label="Date"
                            value={new Date(
                              order.created_at
                            ).toLocaleDateString(
                              "en-IN"
                            )}
                          />
                        </div>

                        {payment?.transaction && (
                          <div className="mt-4 rounded-xl bg-emerald-50 p-4">
                            <p className="text-xs text-emerald-700">
                              Transaction
                              Reference
                            </p>

                            <p className="mt-1 break-all text-sm font-semibold text-emerald-900">
                              {
                                payment
                                  .transaction
                                  .transaction_reference
                              }
                            </p>
                          </div>
                        )}

                        {booking && (
                          <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="font-semibold text-blue-900">
                                  Transport:{" "}
                                  {
                                    booking.vehicle_type
                                  }
                                </p>

                                <p className="mt-1 text-sm text-blue-700">
                                  {
                                    booking.pickup_location
                                  }{" "}
                                  →{" "}
                                  {
                                    booking.delivery_location
                                  }
                                </p>
                              </div>

                              <TransportBadge
                                status={
                                  booking.status
                                }
                              />
                            </div>

                            <p className="mt-3 text-sm text-blue-700">
                              Estimated
                              cost: ₹
                              {
                                booking.estimated_cost
                              }
                            </p>
                          </div>
                        )}
                      </div>

                      {/* ACTIONS */}

                      <div className="flex shrink-0 flex-wrap gap-2">
                        {/* PHASE 11 TRACKING */}

                        <button
                          type="button"
                          onClick={() =>
                            void loadOrderTracking(
                              order
                            )
                          }
                          className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
                        >
                          <PackageCheck className="h-4 w-4" />

                          Track Order
                        </button>

                        {/* PAYMENT */}

                        {order.status ===
                          "accepted" &&
                          (!payment ||
                            payment.status ===
                              "pending") && (
                            <button
                              onClick={() =>
                                openPaymentModal(
                                  order
                                )
                              }
                              className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
                            >
                              <CreditCard className="h-4 w-4" />

                              Pay Now
                            </button>
                          )}

                        {/* TRANSPORT */}

                        {order.status ===
                          "accepted" &&
                          isPaid &&
                          !booking && (
                            <button
                              onClick={() =>
                                openTransportModal(
                                  order
                                )
                              }
                              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                            >
                              <Truck className="h-4 w-4" />

                              Book Transport
                            </button>
                          )}

                        {/* TRANSPORT PROGRESS */}

                        {booking &&
                          getTransportNextStatus(
                            booking.status
                          ) && (
                            <button
                              onClick={() => {
                                const next =
                                  getTransportNextStatus(
                                    booking.status
                                  );

                                if (next) {
                                  void updateTransportStatus(
                                    booking,
                                    next
                                  );
                                }
                              }}
                              disabled={
                                updatingTransportId ===
                                booking.id
                              }
                              className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
                            >
                              {updatingTransportId ===
                              booking.id
                                ? "Updating..."
                                : transportActionLabel(
                                    booking.status
                                  )}
                            </button>
                          )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* =================================================
            PAYMENTS
        ================================================= */}

        <section className="mt-12">
          <h2 className="text-2xl font-bold text-slate-900">
            Payments
          </h2>

          <p className="mt-1 text-slate-500">
            Demo payment and refund
            history.
          </p>

          {payments.length === 0 ? (
            <EmptyCard
              icon={
                <WalletCards className="h-12 w-12 text-slate-300" />
              }
              title="No payments"
              message="Payments appear after an accepted order is paid."
            />
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {payments.map(
                (payment) => (
                  <article
                    key={payment.id}
                    className="rounded-2xl bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm text-slate-500">
                          Payment #
                          {payment.id.slice(
                            0,
                            8
                          )}
                        </p>

                        <p className="mt-1 text-xl font-bold">
                          ₹
                          {
                            payment.amount
                          }
                        </p>
                      </div>

                      <PaymentBadge
                        status={
                          payment.status
                        }
                      />
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <InfoBox
                        label="Method"
                        value={
                          payment.payment_method
                        }
                      />

                      <InfoBox
                        label="Transaction"
                        value={
                          payment
                            .transaction
                            ?.status ||
                          "-"
                        }
                      />
                    </div>

                    {payment.transaction && (
                      <p className="mt-4 break-all text-xs text-slate-500">
                        {
                          payment
                            .transaction
                            .transaction_reference
                        }
                      </p>
                    )}

                    {payment.status ===
                      "paid" && (
                      <button
                        onClick={() =>
                          void refundPayment(
                            payment
                          )
                        }
                        disabled={
                          refundingPaymentId ===
                          payment.id
                        }
                        className="mt-4 w-full rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        {refundingPaymentId ===
                        payment.id
                          ? "Refunding..."
                          : "Refund Payment"}
                      </button>
                    )}
                  </article>
                )
              )}
            </div>
          )}
        </section>

        {/* =================================================
            TRANSPORT
        ================================================= */}

        <section className="mt-12 pb-12">
          <h2 className="text-2xl font-bold text-slate-900">
            Transport Tracking
          </h2>

          <p className="mt-1 text-slate-500">
            Track crop delivery from
            pickup to destination.
          </p>

          {transportBookings.length ===
          0 ? (
            <EmptyCard
              icon={
                <Truck className="h-12 w-12 text-slate-300" />
              }
              title="No transport bookings"
              message="Book transport after payment is completed."
            />
          ) : (
            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              {transportBookings.map(
                (booking) => (
                  <article
                    key={booking.id}
                    className="rounded-2xl bg-white p-6 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm text-slate-500">
                          {
                            booking.vehicle_type
                          }
                        </p>

                        <h3 className="mt-1 font-bold">
                          {
                            booking.pickup_location
                          }{" "}
                          →{" "}
                          {
                            booking.delivery_location
                          }
                        </h3>
                      </div>

                      <TransportBadge
                        status={
                          booking.status
                        }
                      />
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <InfoBox
                        label="Estimated Cost"
                        value={`₹${booking.estimated_cost}`}
                      />

                      <InfoBox
                        label="Order"
                        value={booking.order_id.slice(
                          0,
                          8
                        )}
                      />
                    </div>
                  </article>
                )
              )}
            </div>
          )}
        </section>
      </div>

      {/* =====================================================
          ORDER MODAL
      ===================================================== */}

      {orderingListing && (
        <ModalWrapper>
          <ModalHeader
            title="Place Order"
            onClose={closeOrderModal}
          />

          <p className="mt-1 text-slate-500">
            {orderingListing.crop} · ₹
            {
              orderingListing.expected_price_per_kg
            }
            /kg
          </p>

          <div className="mt-6">
            <label className="text-sm font-medium text-slate-700">
              Quantity (kg)
            </label>

            <input
              type="number"
              min="1"
              max={
                orderingListing.quantity_kg
              }
              value={orderQuantity}
              onChange={(event) =>
                setOrderQuantity(
                  event.target.value
                )
              }
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500"
            />

            <p className="mt-2 text-xs text-slate-500">
              Available:{" "}
              {
                orderingListing.quantity_kg
              }{" "}
              kg
            </p>
          </div>

          <div className="mt-5 rounded-xl bg-emerald-50 p-4">
            <p className="text-sm text-emerald-700">
              Estimated Total
            </p>

            <p className="mt-1 text-2xl font-bold text-emerald-800">
              ₹
              {(
                Number(
                  orderQuantity ||
                    0
                ) *
                orderingListing.expected_price_per_kg
              ).toFixed(2)}
            </p>
          </div>

          <ModalActions
            cancelLabel="Cancel"
            confirmLabel={
              placingOrder
                ? "Placing..."
                : "Confirm Order"
            }
            loading={placingOrder}
            onCancel={
              closeOrderModal
            }
            onConfirm={() =>
              void placeOrder()
            }
          />
        </ModalWrapper>
      )}

      {/* =====================================================
          PAYMENT MODAL
      ===================================================== */}

      {payingOrder && (
        <ModalWrapper>
          <ModalHeader
            title="Make Payment"
            onClose={closePaymentModal}
          />

          <p className="mt-1 text-slate-500">
            Order #
            {payingOrder.id.slice(
              0,
              8
            )}
          </p>

          <div className="mt-6 rounded-xl bg-violet-50 p-5">
            <p className="text-sm text-violet-700">
              Amount
            </p>

            <p className="mt-1 text-3xl font-bold text-violet-900">
              ₹
              {
                payingOrder.total_amount
              }
            </p>
          </div>

          <div className="mt-5">
            <label className="text-sm font-medium text-slate-700">
              Payment Method
            </label>

            <select
              value={paymentMethod}
              onChange={(event) =>
                setPaymentMethod(
                  event.target.value
                )
              }
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-violet-500"
            >
              <option value="upi">
                UPI
              </option>

              <option value="card">
                Card
              </option>

              <option value="netbanking">
                Net Banking
              </option>

              <option value="wallet">
                Wallet
              </option>
            </select>
          </div>

          <div className="mt-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-700">
            DEMO_MODE is enabled. No
            real payment or raw card
            information is stored.
          </div>

          <ModalActions
            cancelLabel="Cancel"
            confirmLabel={
              processingPayment
                ? "Processing..."
                : `Pay ₹${payingOrder.total_amount}`
            }
            loading={
              processingPayment
            }
            onCancel={
              closePaymentModal
            }
            onConfirm={() =>
              void payForOrder()
            }
          />
        </ModalWrapper>
      )}

      {/* =====================================================
          TRANSPORT MODAL
      ===================================================== */}

      {transportOrder && (
        <ModalWrapper>
          <ModalHeader
            title="Book Transport"
            onClose={
              closeTransportModal
            }
          />

          <p className="mt-1 text-slate-500">
            Order #
            {transportOrder.id.slice(
              0,
              8
            )}
          </p>

          <div className="mt-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700">
                Vehicle Type
              </label>

              <select
                value={vehicleType}
                onChange={(event) =>
                  setVehicleType(
                    event.target.value
                  )
                }
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
              >
                <option value="Pickup">
                  Pickup
                </option>

                <option value="Mini Truck">
                  Mini Truck
                </option>

                <option value="Tractor">
                  Tractor
                </option>

                <option value="Truck">
                  Truck
                </option>

                <option value="Refrigerated Truck">
                  Refrigerated Truck
                </option>
              </select>
            </div>

            <FormField
              label="Pickup Location"
              value={
                pickupLocation
              }
              onChange={
                setPickupLocation
              }
              placeholder="Pickup location"
            />

            <FormField
              label="Delivery Location"
              value={
                deliveryLocation
              }
              onChange={
                setDeliveryLocation
              }
              placeholder="Delivery location"
            />

            <FormField
              label="Estimated Cost"
              value={
                transportCost
              }
              onChange={
                setTransportCost
              }
              placeholder="850"
              type="number"
            />
          </div>

          <ModalActions
            cancelLabel="Cancel"
            confirmLabel={
              bookingTransport
                ? "Booking..."
                : "Confirm Transport"
            }
            loading={
              bookingTransport
            }
            onCancel={
              closeTransportModal
            }
            onConfirm={() =>
              void bookTransport()
            }
          />
        </ModalWrapper>
      )}

      {/* =====================================================
          PHASE 11 TRACKING MODAL
      ===================================================== */}

      {trackingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-emerald-600">
                  AGRIVA Order Tracking
                </p>

                <h2 className="mt-1 text-2xl font-bold text-slate-900">
                  Order #
                  {trackingOrder.id.slice(
                    0,
                    8
                  )}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Current order status:{" "}
                  <span className="font-semibold capitalize">
                    {
                      trackingOrder.status
                    }
                  </span>
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeTrackingModal
                }
                disabled={
                  trackingLoading
                }
                className="rounded-xl bg-slate-100 p-2 text-slate-600 hover:bg-slate-200 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {trackingLoading ? (
              <div className="py-14 text-center">
                <Loader2 className="mx-auto h-9 w-9 animate-spin text-emerald-600" />

                <p className="mt-3 text-sm text-slate-500">
                  Loading tracking
                  history...
                </p>
              </div>
            ) : trackingError ? (
              <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {trackingError}
              </div>
            ) : trackingEvents.length ===
              0 ? (
              <div className="mt-6 rounded-2xl bg-slate-50 p-10 text-center">
                <Circle className="mx-auto h-10 w-10 text-slate-300" />

                <p className="mt-4 font-semibold text-slate-700">
                  No tracking events
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Tracking events will
                  appear after order
                  updates.
                </p>
              </div>
            ) : (
              <div className="mt-8">
                {trackingEvents.map(
                  (
                    event,
                    index
                  ) => {
                    const isLast =
                      index ===
                      trackingEvents.length -
                        1;

                    return (
                      <div
                        key={event.id}
                        className="relative flex gap-4"
                      >
                        <div className="flex w-9 shrink-0 flex-col items-center">
                          <div className="z-10 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                            <CheckCircle2 className="h-5 w-5" />
                          </div>

                          {!isLast && (
                            <div className="min-h-[76px] w-0.5 flex-1 bg-emerald-200" />
                          )}
                        </div>

                        <div className="pb-7">
                          <p className="font-bold capitalize text-slate-900">
                            {formatTrackingStatus(
                              event.status
                            )}
                          </p>

                          <p className="mt-1 text-sm text-slate-600">
                            {event.message ||
                              "Order status updated"}
                          </p>

                          <p className="mt-2 text-xs text-slate-400">
                            {formatDateTime(
                              event.created_at
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() =>
                void loadOrderTracking(
                  trackingOrder
                )
              }
              disabled={
                trackingLoading
              }
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {trackingLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />

                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />

                  Refresh Tracking
                </>
              )}
            </button>
          </div>
        </div>
      )}

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
          min-height: 240px;
          background:
            url("/images/agriva-farm-hero.svg")
            center 48% / cover no-repeat;
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
          box-shadow: inset 0 0 0 999px rgba(3,18,10,.23);
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

        .agriva-dark .border-slate-100,
        .agriva-dark .border-slate-200,
        .agriva-dark .border-emerald-100 {
          border-color: #28513a !important;
        }
      `}</style>
    </main>
  );
}

/* =========================================================
   TRANSPORT HELPERS
========================================================= */

function getTransportNextStatus(
  currentStatus: string
): TransportStatus | null {
  switch (currentStatus) {
    case "requested":
      return "confirmed";

    case "confirmed":
      return "picked_up";

    case "picked_up":
      return "in_transit";

    case "in_transit":
      return "delivered";

    default:
      return null;
  }
}

function transportActionLabel(
  status: string
) {
  switch (status) {
    case "requested":
      return "Confirm Transport";

    case "confirmed":
      return "Mark Picked Up";

    case "picked_up":
      return "Mark In Transit";

    case "in_transit":
      return "Mark Delivered";

    default:
      return "Update";
  }
}

/* =========================================================
   TRACKING HELPERS
========================================================= */

function formatTrackingStatus(
  status: string
) {
  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function formatDateTime(
  dateValue: string
) {
  const date =
    new Date(dateValue);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return dateValue;
  }

  return date.toLocaleString(
    "en-IN",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  );
}

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number | string;
  icon: ReactNode;
}) {
  return (
    <div className="agriva-role-stat rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">
        {label}
      </p>

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-2xl font-bold">
          {value}
        </p>

        {icon}
      </div>
    </div>
  );
}


/* =========================================================
   INFO BOX
========================================================= */

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

      <p className="mt-1 font-semibold capitalize">
        {value}
      </p>
    </div>
  );
}

/* =========================================================
   EMPTY CARD
========================================================= */

function EmptyCard({
  icon,
  title,
  message,
}: {
  icon: ReactNode;
  title: string;
  message: string;
}) {
  return (
    <div className="mt-6 rounded-2xl bg-white p-10 text-center shadow-sm">
      <div className="flex justify-center">
        {icon}
      </div>

      <p className="mt-4 font-semibold">
        {title}
      </p>

      <p className="mt-1 text-sm text-slate-500">
        {message}
      </p>
    </div>
  );
}

/* =========================================================
   ORDER STATUS BADGE
========================================================= */

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const className =
    status === "accepted"
      ? "bg-emerald-100 text-emerald-700"
      : status ===
          "completed"
        ? "bg-blue-100 text-blue-700"
        : status ===
            "rejected"
          ? "bg-red-100 text-red-700"
          : status ===
              "cancelled"
            ? "bg-slate-200 text-slate-700"
            : "bg-amber-100 text-amber-700";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${className}`}
    >
      {status.replaceAll(
        "_",
        " "
      )}
    </span>
  );
}

/* =========================================================
   PAYMENT BADGE
========================================================= */

function PaymentBadge({
  status,
}: {
  status: string;
}) {
  const className =
    status === "paid" ||
    status === "completed"
      ? "bg-violet-100 text-violet-700"
      : status ===
          "failed"
        ? "bg-red-100 text-red-700"
        : status ===
            "refunded"
          ? "bg-slate-200 text-slate-700"
          : "bg-amber-100 text-amber-700";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${className}`}
    >
      Payment:{" "}
      {status.replaceAll(
        "_",
        " "
      )}
    </span>
  );
}

/* =========================================================
   TRANSPORT BADGE
========================================================= */

function TransportBadge({
  status,
}: {
  status: string;
}) {
  const className =
    status === "delivered"
      ? "bg-emerald-100 text-emerald-700"
      : status ===
          "in_transit"
        ? "bg-blue-100 text-blue-700"
        : status ===
            "cancelled"
          ? "bg-red-100 text-red-700"
          : "bg-amber-100 text-amber-700";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${className}`}
    >
      {status.replaceAll(
        "_",
        " "
      )}
    </span>
  );
}

/* =========================================================
   MODAL WRAPPER
========================================================= */

function ModalWrapper({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8">
      <div className="max-h-full w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
        {children}
      </div>
    </div>
  );
}

/* =========================================================
   MODAL HEADER
========================================================= */

function ModalHeader({
  title,
  onClose,
}: {
  title: string;
  onClose: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <h2 className="text-2xl font-bold">
        {title}
      </h2>

      <button
        type="button"
        onClick={onClose}
        className="rounded-lg bg-slate-100 p-2 text-slate-500 hover:bg-slate-200"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

/* =========================================================
   MODAL ACTIONS
========================================================= */

function ModalActions({
  cancelLabel,
  confirmLabel,
  loading,
  onCancel,
  onConfirm,
}: {
  cancelLabel: string;
  confirmLabel: string;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="mt-6 flex gap-3">
      <button
        type="button"
        onClick={onCancel}
        disabled={loading}
        className="flex-1 rounded-xl border px-4 py-3 font-semibold text-slate-700 disabled:opacity-50"
      >
        {cancelLabel}
      </button>

      <button
        type="button"
        onClick={onConfirm}
        disabled={loading}
        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
      >
        {loading && (
          <Loader2 className="h-4 w-4 animate-spin" />
        )}

        {confirmLabel}
      </button>
    </div>
  );
}

/* =========================================================
   FORM FIELD
========================================================= */

function FormField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        placeholder={placeholder}
        className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500"
      />
    </div>
  );
}
