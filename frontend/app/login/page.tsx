"use client";

import { FormEvent, useState } from "react";
import { Leaf, Loader2, Lock, Mail } from "lucide-react";
import { useRouter } from "next/navigation";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState(
    "farmer@agriva.demo"
  );

  const [password, setPassword] = useState(
    "Farmer@123"
  );

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  async function handleLogin(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      // Clear any old session before login
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");

      const response = await fetch(
        `${API_URL}/api/auth/login`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            email: email.trim(),
            password,
          }),
        }
      );

      const data = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.detail || "Login failed"
        );
      }

      if (!data?.access_token) {
        throw new Error(
          "Access token not returned by server"
        );
      }

      // Save fresh JWT tokens
      localStorage.setItem(
        "access_token",
        data.access_token
      );

      if (data.refresh_token) {
        localStorage.setItem(
          "refresh_token",
          data.refresh_token
        );
      }

      // Verify current authenticated user
      const meResponse = await fetch(
        `${API_URL}/api/auth/me`,
        {
          method: "GET",

          headers: {
            Authorization:
              `Bearer ${data.access_token}`,
          },

          cache: "no-store",
        }
      );

      const user = await meResponse
        .json()
        .catch(() => null);

      if (!meResponse.ok) {
        localStorage.removeItem(
          "access_token"
        );

        localStorage.removeItem(
          "refresh_token"
        );

        throw new Error(
          user?.detail ||
            "Unable to get user information"
        );
      }

      const role = String(
        user?.role || ""
      ).toUpperCase();

      // Redirect according to role
      if (role === "FARMER") {
        router.replace(
          "/dashboard/farmer"
        );

        return;
      }

      if (role === "BUYER") {
        router.replace(
          "/dashboard/buyer"
        );

        return;
      }

      if (role === "ADMIN") {
        router.replace(
          "/dashboard/admin"
        );

        return;
      }

      throw new Error(
        `Unknown user role: ${role || "missing"}`
      );

    } catch (err) {
      console.error(
        "AGRIVA login error:",
        err
      );

      localStorage.removeItem(
        "access_token"
      );

      localStorage.removeItem(
        "refresh_token"
      );

      setError(
        err instanceof Error
          ? err.message
          : "Login failed"
      );

    } finally {
      setLoading(false);
    }
  }

  function useFarmerDemo() {
    setEmail(
      "farmer@agriva.demo"
    );

    setPassword(
      "Farmer@123"
    );

    setError("");
  }

  function useBuyerDemo() {
    setEmail(
      "buyer@agriva.demo"
    );

    setPassword(
      "Buyer@123"
    );

    setError("");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">

      <div className="w-full max-w-md">

        {/* Logo */}

        <div className="mb-8 text-center">

          <a
            href="/"
            className="inline-flex items-center gap-2 text-3xl font-black text-emerald-700"
          >
            <Leaf size={32} />

            AGRIVA
          </a>

          <p className="mt-2 text-sm text-slate-500">
            Empowering Farmers, Connecting Markets.
          </p>

        </div>


        {/* Login Card */}

        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">

          <h1 className="text-2xl font-bold text-slate-900">
            Welcome back
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Login to your AGRIVA account.
          </p>


          {/* Error */}

          {error && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}


          <form
            onSubmit={handleLogin}
            className="mt-6 space-y-5"
          >

            {/* Email */}

            <div>

              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Email
              </label>

              <div className="relative">

                <Mail
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(
                      event.target.value
                    )
                  }
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />

              </div>

            </div>


            {/* Password */}

            <div>

              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Password
              </label>

              <div className="relative">

                <Lock
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="password"
                  value={password}
                  onChange={(event) =>
                    setPassword(
                      event.target.value
                    )
                  }
                  placeholder="Enter password"
                  autoComplete="current-password"
                  required
                  className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />

              </div>

            </div>


            {/* Login Button */}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >

              {loading ? (
                <>
                  <Loader2
                    size={18}
                    className="animate-spin"
                  />

                  Logging in...
                </>
              ) : (
                "Login"
              )}

            </button>

          </form>


          {/* Register */}

          <p className="mt-6 text-center text-sm text-slate-500">

            Don&apos;t have an account?{" "}

            <a
              href="/register"
              className="font-semibold text-emerald-600 hover:text-emerald-700"
            >
              Create account
            </a>

          </p>

        </div>


        {/* Demo Accounts */}

        <div className="mt-5 grid gap-3 sm:grid-cols-2">

          <button
            type="button"
            onClick={useFarmerDemo}
            className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-left transition hover:bg-emerald-100"
          >

            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Demo Farmer
            </p>

            <p className="mt-2 text-sm text-slate-600">
              farmer@agriva.demo
            </p>

            <p className="text-sm text-slate-600">
              Farmer@123
            </p>

          </button>


          <button
            type="button"
            onClick={useBuyerDemo}
            className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-left transition hover:bg-blue-100"
          >

            <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
              Demo Buyer
            </p>

            <p className="mt-2 text-sm text-slate-600">
              buyer@agriva.demo
            </p>

            <p className="text-sm text-slate-600">
              Buyer@123
            </p>

          </button>

        </div>

      </div>

    </main>
  );
}