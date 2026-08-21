"use client";

import {
  CloudRain,
  Droplets,
  Loader2,
  ThermometerSun,
  TriangleAlert,
  Wind,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000";

type CurrentWeather = {
  temperature_c: number;
  humidity_percent: number;
  rainfall_mm: number;
  wind_kph: number;
  condition: string;
};

type ForecastDay = {
  date: string;
  min_temperature_c: number;
  max_temperature_c: number;
  humidity_percent: number;
  rainfall_mm: number;
  rain_probability_percent: number;
  wind_kph: number;
  condition: string;
};

type WeatherAlert = {
  alert_type: string;
  severity: string;
  title: string;
  message: string;
};

type WeatherResponse = {
  location: string;
  source: string;
  current: CurrentWeather;
  forecast: ForecastDay[];
  alerts: WeatherAlert[];
};

export default function FarmerWeatherPage() {
  const router = useRouter();

  const [weather, setWeather] =
    useState<WeatherResponse | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    void loadWeather();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadWeather() {
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
        `${API_URL}/api/weather/farmer`,
        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
          cache: "no-store",
        }
      );

      const body = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          body?.detail ||
            "Unable to load weather."
        );
      }

      setWeather(
        body as WeatherResponse
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load weather."
      );
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <button
          onClick={() =>
            router.push(
              "/dashboard/farmer"
            )
          }
          className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold"
        >
          ← Farmer Dashboard
        </button>

        <div className="mt-6">
          <h1 className="text-3xl font-black">
            Weather Intelligence
          </h1>

          <p className="mt-2 text-slate-500">
            {weather?.location}
          </p>
        </div>

        {error && (
          <div className="mt-6 rounded-xl bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {weather && (
          <>
            <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <WeatherCard
                label="Temperature"
                value={`${weather.current.temperature_c} °C`}
                icon={
                  <ThermometerSun className="h-7 w-7 text-orange-500" />
                }
              />

              <WeatherCard
                label="Humidity"
                value={`${weather.current.humidity_percent}%`}
                icon={
                  <Droplets className="h-7 w-7 text-blue-500" />
                }
              />

              <WeatherCard
                label="Rainfall"
                value={`${weather.current.rainfall_mm} mm`}
                icon={
                  <CloudRain className="h-7 w-7 text-sky-600" />
                }
              />

              <WeatherCard
                label="Wind"
                value={`${weather.current.wind_kph} km/h`}
                icon={
                  <Wind className="h-7 w-7 text-slate-600" />
                }
              />
            </section>

            <section className="mt-10">
              <h2 className="text-2xl font-bold">
                5-Day Forecast
              </h2>

              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                {weather.forecast.map(
                  (day) => (
                    <article
                      key={day.date}
                      className="rounded-2xl bg-white p-5 shadow-sm"
                    >
                      <p className="text-sm font-semibold">
                        {new Date(
                          day.date
                        ).toLocaleDateString(
                          "en-IN",
                          {
                            weekday:
                              "short",
                            day:
                              "numeric",
                            month:
                              "short",
                          }
                        )}
                      </p>

                      <p className="mt-3 text-xl font-bold">
                        {
                          day.max_temperature_c
                        }
                        ° /{" "}
                        {
                          day.min_temperature_c
                        }
                        °
                      </p>

                      <p className="mt-2 text-sm text-slate-500">
                        {
                          day.condition
                        }
                      </p>

                      <div className="mt-4 space-y-1 text-sm text-slate-600">
                        <p>
                          Rain:{" "}
                          {
                            day.rain_probability_percent
                          }
                          %
                        </p>

                        <p>
                          Rainfall:{" "}
                          {
                            day.rainfall_mm
                          }{" "}
                          mm
                        </p>

                        <p>
                          Wind:{" "}
                          {
                            day.wind_kph
                          }{" "}
                          km/h
                        </p>
                      </div>
                    </article>
                  )
                )}
              </div>
            </section>

            <section className="mt-10 pb-10">
              <h2 className="text-2xl font-bold">
                Agricultural Alerts
              </h2>

              {weather.alerts.length ===
              0 ? (
                <div className="mt-5 rounded-2xl bg-white p-6">
                  No active weather alerts.
                </div>
              ) : (
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {weather.alerts.map(
                    (alert) => (
                      <article
                        key={`${alert.alert_type}-${alert.title}`}
                        className="rounded-2xl border border-amber-200 bg-amber-50 p-5"
                      >
                        <div className="flex items-start gap-3">
                          <TriangleAlert className="mt-0.5 h-5 w-5 text-amber-600" />

                          <div>
                            <p className="font-bold text-amber-900">
                              {
                                alert.title
                              }
                            </p>

                            <p className="mt-1 text-sm text-amber-800">
                              {
                                alert.message
                              }
                            </p>

                            <p className="mt-3 text-xs uppercase text-amber-700">
                              Severity:{" "}
                              {
                                alert.severity
                              }
                            </p>
                          </div>
                        </div>
                      </article>
                    )
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function WeatherCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">
            {label}
          </p>

          <p className="mt-2 text-2xl font-bold">
            {value}
          </p>
        </div>

        {icon}
      </div>
    </div>
  );
}