"use client";

import type { FormEvent } from "react";

import {
  useState,
} from "react";

import Link from "next/link";

import {
  useRouter,
} from "next/navigation";

import {
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";

import LanguageSelector from "@/components/LanguageSelector";


const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000";


function clearAuthStorage() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}


export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");


  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoading(true);
    setError("");

    clearAuthStorage();

    try {
      const loginResponse =
        await fetch(
          `${API_URL}/api/auth/login`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              email: email.trim(),
              password,
            }),
          }
        );

      const loginData =
        await loginResponse
          .json()
          .catch(
            () => null
          );

      if (
        !loginResponse.ok ||
        !loginData?.access_token
      ) {
        throw new Error(
          loginData?.detail ||
          "Invalid admin credentials."
        );
      }


      const accessToken =
        loginData.access_token;

      localStorage.setItem(
        "access_token",
        accessToken
      );

      localStorage.setItem(
        "token",
        accessToken
      );

      if (
        loginData.refresh_token
      ) {
        localStorage.setItem(
          "refresh_token",
          loginData.refresh_token
        );
      }


      /*
       * Never trust the login page itself.
       * Confirm the real authenticated role
       * using the backend.
       */
      const meResponse =
        await fetch(
          `${API_URL}/api/auth/me`,
          {
            method: "GET",

            headers: {
              Authorization:
                `Bearer ${accessToken}`,
            },

            cache: "no-store",
          }
        );

      const user =
        await meResponse
          .json()
          .catch(
            () => null
          );

      if (!meResponse.ok) {
        throw new Error(
          user?.detail ||
          "Unable to verify administrator."
        );
      }


      const role =
        String(
          user?.role || ""
        )
          .trim()
          .toUpperCase();


      if (role !== "ADMIN") {
        clearAuthStorage();

        throw new Error(
          "Administrator access required. Farmer and Buyer accounts cannot use this page."
        );
      }


      localStorage.setItem(
        "user",
        JSON.stringify(user)
      );

      router.replace(
        "/dashboard/admin"
      );

      router.refresh();

    } catch (err) {
      clearAuthStorage();

      setError(
        err instanceof Error
          ? err.message
          : "Admin login failed."
      );

    } finally {
      setLoading(false);
    }
  }


  return (
    <main className="min-h-screen bg-[#F4F8F3]">
      {/* TOP BAR */}
      <header className="border-b border-emerald-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">

          <Link
            href="/"
            className="flex items-center gap-3"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-700 text-lg font-black text-white shadow-md">
              A
            </div>

            <div>
              <p className="text-xl font-black tracking-tight text-slate-900">
                AGRIVA
              </p>

              <p className="text-xs font-semibold text-emerald-700">
                Administrator Portal
              </p>
            </div>
          </Link>


          <div className="flex items-center gap-3">
            <LanguageSelector />

            <Link
              href="/login"
              className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 sm:inline-flex"
            >
              <ArrowLeft className="h-4 w-4" />

              Public Login
            </Link>
          </div>
        </div>
      </header>


      <div className="mx-auto grid min-h-[calc(100vh-78px)] max-w-7xl items-center gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:px-8 lg:py-12">

        {/* VISUAL PANEL */}
        <section
          className="relative hidden min-h-[650px] overflow-hidden rounded-[36px] border border-emerald-800/20 shadow-2xl shadow-emerald-950/20 lg:block"
          style={{
            backgroundImage:
              'linear-gradient(145deg, rgba(2,44,34,0.95), rgba(5,150,105,0.60)), url("/images/farmer-dashboard-hero.png")',

            backgroundSize:
              "cover",

            backgroundPosition:
              "center",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/80 via-transparent to-emerald-950/10" />

          <div className="relative flex h-full min-h-[650px] flex-col justify-between p-10">

            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold text-white backdrop-blur">
                <ShieldCheck className="h-4 w-4" />

                Authorized Access
              </div>

              <h1 className="mt-7 max-w-xl text-5xl font-black leading-[1.08] tracking-tight text-white">
                AGRIVA
                <br />
                Administration
              </h1>

              <p className="mt-5 max-w-lg text-lg leading-8 text-emerald-50">
                Review platform activity, buyer verification,
                grievances and administrative workflows from
                one protected portal.
              </p>
            </div>


            <div className="rounded-3xl border border-white/15 bg-emerald-950/40 p-6 text-white backdrop-blur-md">
              <p className="text-sm font-black">
                Secure Role Verification
              </p>

              <p className="mt-2 text-sm leading-6 text-emerald-100">
                AGRIVA checks the authenticated account role
                with the backend before allowing access to the
                administrator dashboard.
              </p>
            </div>
          </div>
        </section>


        {/* LOGIN PANEL */}
        <section className="mx-auto w-full max-w-xl rounded-[36px] border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-900/10 sm:p-9 lg:p-10">

          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <LockKeyhole className="h-7 w-7" />
          </div>


          <div className="mt-6">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">
              Restricted Portal
            </p>

            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              Admin Login
            </h2>

            <p className="mt-3 leading-7 text-slate-500">
              Sign in with an authorized AGRIVA administrator
              account.
            </p>
          </div>


          {error ? (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold leading-6 text-red-700">
              {error}
            </div>
          ) : null}


          <form
            onSubmit={handleSubmit}
            className="mt-8 space-y-5"
          >
            <div>
              <label
                htmlFor="admin-email"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                Admin Email
              </label>

              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                <input
                  id="admin-email"
                  type="email"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(event) =>
                    setEmail(
                      event.target.value
                    )
                  }
                  placeholder="Enter administrator email"
                  className="min-h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                />
              </div>
            </div>


            <div>
              <label
                htmlFor="admin-password"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                Password
              </label>

              <div className="relative">
                <LockKeyhole className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                <input
                  id="admin-password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) =>
                    setPassword(
                      event.target.value
                    )
                  }
                  placeholder="Enter administrator password"
                  className="min-h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-12 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (current) =>
                        !current
                    )
                  }
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-emerald-700"
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>


            <button
              type="submit"
              disabled={loading}
              className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-5 font-black text-white shadow-lg shadow-emerald-700/20 transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Verifying Administrator...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-5 w-5" />
                  Enter Admin Dashboard
                </>
              )}
            </button>
          </form>


          <div className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-black text-amber-900">
              Administrator access only
            </p>

            <p className="mt-1 text-xs leading-5 text-amber-800">
              Farmer or Buyer accounts are rejected even if
              valid credentials are entered on this page.
            </p>
          </div>


          <div className="mt-7 border-t border-slate-100 pt-6 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm font-bold text-emerald-700 transition hover:text-emerald-900"
            >
              <ArrowLeft className="h-4 w-4" />

              Farmer / Buyer Login
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
