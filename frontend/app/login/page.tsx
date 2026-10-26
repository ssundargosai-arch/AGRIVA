"use client";
import Link from "next/link";
import {
  FormEvent,
  useState,
} from "react";

import {
  Eye,
  EyeOff,
  Leaf,
  Loader2,
  Lock,
  Mail,
  ShoppingBag,
  Sprout,
} from "lucide-react";

import { useRouter } from "next/navigation";

import {
  useLocale,
  useTranslations,
} from "next-intl";

import LanguageSelector from "@/components/LanguageSelector";


const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000";


type LoginRole =
  | "FARMER"
  | "BUYER";


const DEMO_ACCOUNTS: Record<
  LoginRole,
  {
    email: string;
    password: string;
  }
> = {
  FARMER: {
    email: "farmer@agriva.demo",
    password: "Farmer@123",
  },

  BUYER: {
    email: "buyer@agriva.demo",
    password: "Buyer@123",
  },
};


export default function LoginPage() {
  const router = useRouter();
  const t = useTranslations();
  const locale = useLocale();

  const [selectedRole, setSelectedRole] =
    useState<LoginRole>("FARMER");

  const [email, setEmail] =
    useState(
      DEMO_ACCOUNTS.FARMER.email
    );

  const [password, setPassword] =
    useState(
      DEMO_ACCOUNTS.FARMER.password
    );

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");


  const isHindi =
    locale === "hi";


  function ui(
    english: string,
    hindi: string
  ) {
    return isHindi
      ? hindi
      : english;
  }


  function selectRole(
    role: LoginRole
  ) {
    setSelectedRole(role);

    setEmail(
      DEMO_ACCOUNTS[role].email
    );

    setPassword(
      DEMO_ACCOUNTS[role].password
    );

    setError("");
  }


  async function handleLogin(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      localStorage.removeItem(
        "access_token"
      );

      localStorage.removeItem(
        "refresh_token"
      );

      localStorage.removeItem(
        "token"
      );

      const response = await fetch(
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

      const data = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            t(
              "errors.loginFailed"
            )
        );
      }

      if (!data?.access_token) {
        throw new Error(
          t(
            "login.accessTokenMissing"
          )
        );
      }

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

      /*
       * Important:
       * The selected role is only a login-page convenience.
       * AGRIVA always trusts the authenticated role returned
       * by /api/auth/me for authorization and redirection.
       */
      const meResponse =
        await fetch(
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

      const user =
        await meResponse
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
            t(
              "login.userInfoFailed"
            )
        );
      }

      const role = String(
        user?.role || ""
      )
        .trim()
        .toUpperCase();

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

      localStorage.removeItem(
        "access_token"
      );

      localStorage.removeItem(
        "refresh_token"
      );

      throw new Error(
        `${t(
          "login.unknownRole"
        )}: ${
          role ||
          t(
            "login.missingRole"
          )
        }`
      );
    } catch (err) {
      localStorage.removeItem(
        "access_token"
      );

      localStorage.removeItem(
        "refresh_token"
      );

      localStorage.removeItem(
        "token"
      );

      setError(
        err instanceof Error
          ? err.message
          : t(
              "errors.loginFailed"
            )
      );
    } finally {
      setLoading(false);
    }
  }


  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:py-10">
      <div className="mx-auto w-full max-w-5xl">

        {/* LANGUAGE */}

        <div className="mb-5 flex justify-end">
          <LanguageSelector />
        </div>


        {/* BRAND */}

        <div className="mb-7 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-3xl font-black text-emerald-700"
          >
            <Leaf size={32} />

            {t(
              "common.appName"
            )}
          </Link>

          <p className="mt-2 text-sm text-slate-500">
            {t(
              "login.tagline"
            )}
          </p>
        </div>


        <div className="grid gap-7 lg:grid-cols-[0.95fr_1.05fr] lg:items-stretch">

          {/* ROLE PANEL */}

          <section className="relative overflow-hidden rounded-[32px] border border-emerald-700/30 bg-emerald-900 p-6 text-white shadow-2xl shadow-emerald-950/20 sm:p-8 lg:p-10" style={{ backgroundImage: 'linear-gradient(135deg, rgba(6,78,59,0.96), rgba(5,150,105,0.72)), url("/images/farmer-dashboard-hero.png")', backgroundSize: "cover", backgroundPosition: "center" }}>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-100">
              {ui(
                "Choose your role",
                "à¤…à¤ªà¤¨à¥€ à¤­à¥‚à¤®à¤¿à¤•à¤¾ à¤šà¥à¤¨à¥‡à¤‚"
              )}
            </p>

            <h2 className="mt-3 text-3xl font-black">
              {ui(
                "Continue to AGRIVA",
                "AGRIVA à¤®à¥‡à¤‚ à¤†à¤—à¥‡ à¤¬à¤¢à¤¼à¥‡à¤‚"
              )}
            </h2>

            <p className="mt-3 text-sm leading-6 text-emerald-100">
              {ui(
                "Select Farmer or Buyer. For demo testing, the matching credentials are filled automatically.",
                "à¤•à¤¿à¤¸à¤¾à¤¨, à¤–à¤°à¥€à¤¦à¤¾à¤° à¤¯à¤¾ à¤à¤¡à¤®à¤¿à¤¨ à¤šà¥à¤¨à¥‡à¤‚à¥¤ à¤¡à¥‡à¤®à¥‹ à¤Ÿà¥‡à¤¸à¥à¤Ÿà¤¿à¤‚à¤— à¤•à¥‡ à¤²à¤¿à¤ à¤¸à¤‚à¤¬à¤‚à¤§à¤¿à¤¤ à¤²à¥‰à¤—à¤¿à¤¨ à¤µà¤¿à¤µà¤°à¤£ à¤…à¤ªà¤¨à¥‡-à¤†à¤ª à¤­à¤° à¤œà¤¾à¤à¤‚à¤—à¥‡à¥¤"
              )}
            </p>

            <div className="mt-7 space-y-3">

              <RoleButton
                active={
                  selectedRole ===
                  "FARMER"
                }
                title={ui(
                  "Farmer",
                  "à¤•à¤¿à¤¸à¤¾à¤¨"
                )}
                subtitle={ui(
                  "Manage crops, AI tools and orders",
                  "à¤«à¤¸à¤², AI à¤Ÿà¥‚à¤² à¤”à¤° à¤‘à¤°à¥à¤¡à¤° à¤ªà¥à¤°à¤¬à¤‚à¤§à¤¿à¤¤ à¤•à¤°à¥‡à¤‚"
                )}
                icon={
                  <Sprout className="h-6 w-6" />
                }
                onClick={() =>
                  selectRole(
                    "FARMER"
                  )
                }
              />

              <RoleButton
                active={
                  selectedRole ===
                  "BUYER"
                }
                title={ui(
                  "Buyer",
                  "à¤–à¤°à¥€à¤¦à¤¾à¤°"
                )}
                subtitle={ui(
                  "Explore crops and place orders",
                  "à¤«à¤¸à¤² à¤¦à¥‡à¤–à¥‡à¤‚ à¤”à¤° à¤‘à¤°à¥à¤¡à¤° à¤•à¤°à¥‡à¤‚"
                )}
                icon={
                  <ShoppingBag className="h-6 w-6" />
                }
                onClick={() =>
                  selectRole(
                    "BUYER"
                  )
                }
              />

              
            </div>

            <div className="mt-7 rounded-2xl border border-white/20 bg-white/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-100">
                {ui(
                  "Selected demo account",
                  "à¤šà¥à¤¨à¤¾ à¤—à¤¯à¤¾ à¤¡à¥‡à¤®à¥‹ à¤…à¤•à¤¾à¤‰à¤‚à¤Ÿ"
                )}
              </p>

              <p className="mt-2 break-all text-sm font-semibold">
                {
                  DEMO_ACCOUNTS[
                    selectedRole
                  ].email
                }
              </p>

              <p className="mt-1 text-sm text-emerald-100">
                {
                  DEMO_ACCOUNTS[
                    selectedRole
                  ].password
                }
              </p>
            </div>
          </section>


          {/* LOGIN CARD */}

          <section className="rounded-[32px] border border-slate-200/80 bg-white/95 p-6 shadow-2xl shadow-slate-900/10 backdrop-blur sm:p-8 lg:p-10">
            <h1 className="text-2xl font-bold text-slate-900">
              {t(
                "login.welcomeBack"
              )}
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              {t(
                "login.subtitle"
              )}
            </p>

            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-black uppercase tracking-wide text-emerald-800">
              {selectedRole === "FARMER"
                ? ui(
                    "Farmer Login",
                    "किसान लॉगिन"
                  )
                : ui(
                    "Buyer Login",
                    "खरीदार लॉगिन"
                  )}</div>


            {/* ERROR */}

            {error && (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}


            {/* FORM */}

            <form
              onSubmit={
                handleLogin
              }
              className="mt-6 space-y-5"
            >

              {/* EMAIL */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  {t(
                    "forms.email"
                  )}
                </label>

                <div className="relative">
                  <Mail
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="email"
                    value={email}
                    onChange={(
                      event
                    ) =>
                      setEmail(
                        event.target
                          .value
                      )
                    }
                    placeholder={t(
                      "login.emailPlaceholder"
                    )}
                    autoComplete="email"
                    required
                    className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
              </div>


              {/* PASSWORD */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  {t(
                    "forms.password"
                  )}
                </label>

                <div className="relative">
                  <Lock
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    value={
                      password
                    }
                    onChange={(
                      event
                    ) =>
                      setPassword(
                        event.target
                          .value
                      )
                    }
                    placeholder={t(
                      "login.passwordPlaceholder"
                    )}
                    autoComplete="current-password"
                    required
                    className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-12 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        (
                          current
                        ) =>
                          !current
                      )
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    aria-label={
                      showPassword
                        ? ui(
                            "Hide password",
                            "à¤ªà¤¾à¤¸à¤µà¤°à¥à¤¡ à¤›à¤¿à¤ªà¤¾à¤à¤‚"
                          )
                        : ui(
                            "Show password",
                            "à¤ªà¤¾à¤¸à¤µà¤°à¥à¤¡ à¤¦à¤¿à¤–à¤¾à¤à¤‚"
                          )
                    }
                  >
                    {showPassword ? (
                      <EyeOff
                        size={18}
                      />
                    ) : (
                      <Eye
                        size={18}
                      />
                    )}
                  </button>
                </div>
              </div>


              {/* LOGIN */}

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

                    {t(
                      "login.loggingIn"
                    )}
                  </>
                ) : (
                  t(
                    "login.login"
                  )
                )}
              </button>
            </form>


            <p className="mt-6 text-center text-sm text-slate-500">
              {t(
                "login.noAccount"
              )}{" "}

              <a
                href="/register"
                className="font-semibold text-emerald-600 hover:text-emerald-700"
              >
                {t(
                  "login.createAccount"
                )}
              </a>
            </p>


            <div className="mt-6 border-t border-slate-100 pt-5">
              <p className="text-center text-xs text-slate-400">
                {ui(
                  "The selected role never bypasses security. AGRIVA redirects using the authenticated role returned by the backend.",
                  "à¤šà¥à¤¨à¥€ à¤—à¤ˆ à¤­à¥‚à¤®à¤¿à¤•à¤¾ à¤¸à¥à¤°à¤•à¥à¤·à¤¾ à¤•à¥‹ à¤¬à¤¾à¤¯à¤ªà¤¾à¤¸ à¤¨à¤¹à¥€à¤‚ à¤•à¤°à¤¤à¥€à¥¤ AGRIVA à¤¬à¥ˆà¤•à¤à¤‚à¤¡ à¤¸à¥‡ à¤ªà¥à¤°à¤¾à¤ªà¥à¤¤ à¤µà¤¾à¤¸à¥à¤¤à¤µà¤¿à¤• à¤­à¥‚à¤®à¤¿à¤•à¤¾ à¤•à¥‡ à¤…à¤¨à¥à¤¸à¤¾à¤° à¤¹à¥€ à¤°à¥€à¤¡à¤¾à¤¯à¤°à¥‡à¤•à¥à¤Ÿ à¤•à¤°à¤¤à¤¾ à¤¹à¥ˆà¥¤"
                )}
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}


function RoleButton({
  active,
  title,
  subtitle,
  icon,
  onClick,
}: {
  active: boolean;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition ${
        active
          ? "border-white bg-white text-emerald-800 shadow-lg"
          : "border-white/20 bg-white/10 text-white hover:bg-white/15"
      }`}
    >
      <div
        className={`rounded-xl p-3 ${
          active
            ? "bg-emerald-100 text-emerald-700"
            : "bg-white/10 text-white"
        }`}
      >
        {icon}
      </div>

      <div>
        <p className="font-bold">
          {title}
        </p>

        <p
          className={`mt-1 text-xs ${
            active
              ? "text-slate-500"
              : "text-emerald-100"
          }`}
        >
          {subtitle}
        </p>
      </div>
    </button>
  );
}

