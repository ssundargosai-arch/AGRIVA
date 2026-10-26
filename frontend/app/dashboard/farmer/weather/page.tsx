"use client";

import {
  CloudRain,
  Droplets,
  Leaf,
  LocateFixed,
  Loader2,
  MapPin,
  Search,
  ThermometerSun,
  TriangleAlert,
  Wind,
} from "lucide-react";

import {
  FormEvent,
  ReactNode,
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import {
  useLocale,
  useTranslations,
} from "next-intl";
import { useTheme } from "@/app/components/ThemeProvider";


const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000";


type CurrentWeather = {
  temperature_c: number;
  humidity_percent: number;
  rainfall_mm?: number;
  wind_kph?: number;
  condition: string;
};


type ForecastDay = {
  date: string;
  min_temperature_c: number;
  max_temperature_c: number;
  humidity_percent: number;
  rainfall_mm?: number;
  rain_probability_percent: number;
  wind_kph?: number;
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
  latitude?: number | null;
  longitude?: number | null;
  current: CurrentWeather;
  forecast: ForecastDay[];
  alerts: WeatherAlert[];
};


type LocationResult = {
  id?: number | null;
  name: string;
  display_name: string;
  latitude: number;
  longitude: number;
  admin1?: string | null;
  country?: string | null;
  country_code?: string | null;
  timezone?: string | null;
};


function getToken() {
  return (
    localStorage.getItem("access_token") ||
    localStorage.getItem("token")
  );
}


export default function FarmerWeatherPage() {
  const router = useRouter();
  const t = useTranslations("weatherPage");
  const locale = useLocale();

  const [weather, setWeather] =
    useState<WeatherResponse | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [query, setQuery] =
    useState("");

  const [searching, setSearching] =
    useState(false);

  const [locationLoading, setLocationLoading] =
    useState(false);

  const [results, setResults] =
    useState<LocationResult[]>([]);

  const { theme } = useTheme();

  const isHindi = locale === "hi";


  function ui(
    english: string,
    hindi: string
  ) {
    return isHindi
      ? hindi
      : english;
  }


  useEffect(() => {
    void loadWeather();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  async function authorizedFetch(
    url: string
  ) {
    const token = getToken();

    if (!token) {
      router.replace("/login");

      throw new Error(
        ui(
          "Please sign in again.",
          "कृपया दोबारा लॉग इन करें।"
        )
      );
    }

    const response = await fetch(
      url,
      {
        headers: {
          Authorization:
            `Bearer ${token}`,
        },
        cache: "no-store",
      }
    );

    if (response.status === 401) {
      localStorage.removeItem(
        "access_token"
      );

      localStorage.removeItem(
        "refresh_token"
      );

      localStorage.removeItem(
        "token"
      );

      router.replace("/login");
    }

    return response;
  }


  async function loadWeather(
    options?: {
      location?: string;
      latitude?: number;
      longitude?: number;
    }
  ) {
    setLoading(true);
    setError("");
    setResults([]);

    try {
      const params =
        new URLSearchParams();

      params.set(
        "language",
        isHindi ? "hi" : "en"
      );

      if (options?.location) {
        params.set(
          "location",
          options.location
        );
      }

      if (
        typeof options?.latitude ===
        "number"
      ) {
        params.set(
          "latitude",
          String(options.latitude)
        );
      }

      if (
        typeof options?.longitude ===
        "number"
      ) {
        params.set(
          "longitude",
          String(options.longitude)
        );
      }

      const response =
        await authorizedFetch(
          `${API_URL}/api/weather/farmer?${params.toString()}`
        );

      const body = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          typeof body?.detail === "string"
            ? body.detail
            : t("unableToLoad")
        );
      }

      setWeather(
        body as WeatherResponse
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("unableToLoad")
      );
    } finally {
      setLoading(false);
    }
  }


  async function searchLocation(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const value = query.trim();

    if (value.length < 2) {
      setError(
        ui(
          "Enter at least 2 characters.",
          "कम से कम 2 अक्षर लिखें।"
        )
      );

      return;
    }

    setSearching(true);
    setError("");

    try {
      const params =
        new URLSearchParams({
          q: value,
          language:
            isHindi ? "hi" : "en",
        });

      const response =
        await authorizedFetch(
          `${API_URL}/api/weather/search?${params.toString()}`
        );

      const body = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          typeof body?.detail === "string"
            ? body.detail
            : ui(
                "Unable to search locations.",
                "स्थान खोजने में समस्या हुई।"
              )
        );
      }

      const nextResults =
        Array.isArray(body?.results)
          ? body.results
          : [];

      setResults(nextResults);

      if (
        nextResults.length === 0
      ) {
        setError(
          ui(
            "No matching location found.",
            "कोई मिलता-जुलता स्थान नहीं मिला।"
          )
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : ui(
              "Unable to search locations.",
              "स्थान खोजने में समस्या हुई।"
            )
      );
    } finally {
      setSearching(false);
    }
  }


  function useCurrentLocation() {
    setError("");

    if (
      typeof navigator ===
        "undefined" ||
      !navigator.geolocation
    ) {
      setError(
        ui(
          "Current location is not supported by this browser.",
          "यह ब्राउज़र वर्तमान स्थान का समर्थन नहीं करता।"
        )
      );

      return;
    }

    setLocationLoading(true);

    navigator.geolocation
      .getCurrentPosition(
        (position) => {
          const {
            latitude,
            longitude,
          } = position.coords;

          void loadWeather({
            latitude,
            longitude,
          }).finally(() => {
            setLocationLoading(false);
          });
        },
        (positionError) => {
          setLocationLoading(false);

          const message =
            positionError.code === 1
              ? ui(
                  "Location permission was denied. Allow location access in the browser and try again.",
                  "लोकेशन अनुमति नहीं मिली। ब्राउज़र में लोकेशन की अनुमति देकर फिर कोशिश करें।"
                )
              : ui(
                  "Unable to detect your current location.",
                  "आपका वर्तमान स्थान पता नहीं चल पाया।"
                );

          setError(message);
        },
        {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 300000,
        }
      );
  }


  function conditionLabel(
    condition: string
  ) {
    const normalized =
      condition
        .trim()
        .toLowerCase();

    const keys:
      Record<string, string> = {
        sunny:
          "conditions.sunny",
        cloudy:
          "conditions.cloudy",
        "partly cloudy":
          "conditions.partlyCloudy",
        rain:
          "conditions.rain",
        "light rain":
          "conditions.lightRain",
        "heavy rain":
          "conditions.heavyRain",
        clear:
          "conditions.clear",
        overcast:
          "conditions.overcast",
        thunderstorm:
          "conditions.thunderstorm",
      };

    const key = keys[normalized];

    return key
      ? t(key)
      : condition;
  }


  function valueOrNoData(
    value:
      | number
      | null
      | undefined,
    unit: string
  ) {
    return typeof value === "number"
      ? `${value} ${unit}`
      : t("noData");
  }


  function weatherEmoji(
    condition: string
  ) {
    const value =
      condition.toLowerCase();

    if (
      value.includes(
        "thunder"
      )
    ) {
      return "⛈️";
    }

    if (
      value.includes("rain")
    ) {
      return "🌧️";
    }

    if (
      value.includes("cloud")
    ) {
      return "🌤️";
    }

    if (
      value.includes("clear") ||
      value.includes("sun")
    ) {
      return "☀️";
    }

    return "🌦️";
  }


  const current =
    weather?.current;

  const firstForecast =
    weather?.forecast?.[0];

  const farmingTip =
    !current
      ? ""
      : current.rainfall_mm &&
          current.rainfall_mm > 5
        ? ui(
            "Rainfall is active. Avoid pesticide spraying and check field drainage.",
            "बारिश हो रही है। कीटनाशक छिड़काव से बचें और खेत की जल निकासी जांचें।"
          )
        : firstForecast &&
            firstForecast.rain_probability_percent >=
              70
          ? ui(
              "High rain probability. Plan irrigation carefully and protect harvested produce.",
              "बारिश की संभावना अधिक है। सिंचाई सोच-समझकर करें और कटी हुई फसल सुरक्षित रखें।"
            )
          : current.temperature_c >=
              35
            ? ui(
                "High temperature. Prefer irrigation during cooler morning or evening hours.",
                "तापमान अधिक है। सुबह या शाम के ठंडे समय में सिंचाई करें।"
              )
            : ui(
                "Conditions are suitable for normal farm activities. Keep monitoring rainfall and wind.",
                "स्थिति सामान्य कृषि कार्यों के लिए अनुकूल है। वर्षा और हवा पर नजर रखें।"
              );


  return (
    <main
      className={`agriva-weather-page min-h-screen ${
        theme === "dark"
          ? "agriva-weather-dark text-slate-100"
          : "text-slate-900"
      }`}
    >
      <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
        {/* TOP BAR */}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() =>
              router.push(
                "/dashboard/farmer"
              )
            }
            className="rounded-xl border border-emerald-300 bg-white px-4 py-2 text-sm font-bold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-500 hover:shadow-md dark:border-emerald-700 dark:bg-[#0D2015] dark:text-slate-100"
          >
            ← {t("backToDashboard")}
          </button>

          
        </div>


        {/* HERO */}

        <section className="agriva-weather-hero relative mt-5 overflow-hidden rounded-[30px] border border-emerald-100 shadow-lg">
          <div className="agriva-weather-hero-overlay absolute inset-0" />

          <div className="relative z-10 grid gap-8 px-6 py-8 lg:grid-cols-[1.2fr_.8fr] lg:px-9 lg:py-10">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-xs font-black text-emerald-700 backdrop-blur">
                <Leaf className="h-4 w-4" />
                AGRIVA Weather Intelligence
              </div>

              <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                {t("title")}
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                {ui(
                  "Live weather, smart farm alerts and location-based forecasts for better field decisions.",
                  "बेहतर खेती निर्णयों के लिए लाइव मौसम, स्मार्ट कृषि चेतावनियाँ और स्थान आधारित पूर्वानुमान।"
                )}
              </p>

              {weather && (
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/85 px-4 py-2 text-sm font-bold text-slate-800 shadow-sm backdrop-blur">
                    <MapPin className="h-4 w-4 text-emerald-700" />
                    {weather.location}
                  </span>

                  <span className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-black text-white shadow-sm">
                    {ui(
                      "Live • Open-Meteo",
                      "लाइव • Open-Meteo"
                    )}
                  </span>
                </div>
              )}
            </div>

            {weather && (
              <div className="agriva-current-weather self-center rounded-3xl border border-white/60 bg-white/78 p-6 shadow-xl backdrop-blur-md">
                <div className="flex items-center justify-between gap-5">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
                      {ui(
                        "Current Weather",
                        "वर्तमान मौसम"
                      )}
                    </p>

                    <p className="mt-2 text-5xl font-black text-slate-950">
                      {weather.current.temperature_c}
                      °C
                    </p>

                    <p className="mt-2 font-bold text-slate-700">
                      {conditionLabel(
                        weather.current.condition
                      )}
                    </p>
                  </div>

                  <div className="text-7xl drop-shadow-sm">
                    {weatherEmoji(
                      weather.current.condition
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>


        {/* SEARCH */}

        <section className="relative z-20 -mt-5 mx-3 rounded-3xl border border-emerald-100 bg-white/95 p-4 shadow-xl backdrop-blur sm:mx-6 sm:p-5">
          <form
            onSubmit={searchLocation}
            className="flex flex-col gap-3 lg:flex-row"
          >
            <div className="relative flex-1">
              <MapPin className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-emerald-600" />

              <input
                value={query}
                onChange={(event) =>
                  setQuery(
                    event.target.value
                  )
                }
                placeholder={ui(
                  "Search city, district or postal code...",
                  "शहर, जिला या पिन कोड खोजें..."
                )}
                className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-12 pr-4 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              />
            </div>

            <button
              type="submit"
              disabled={
                searching ||
                query.trim().length < 2
              }
              className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3.5 font-bold text-white shadow-lg shadow-emerald-600/10 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {searching ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Search className="h-5 w-5" />
              )}

              {ui(
                "Search",
                "खोजें"
              )}
            </button>

            <button
              type="button"
              onClick={
                useCurrentLocation
              }
              disabled={
                locationLoading
              }
              className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-500 bg-emerald-50 px-6 py-3.5 font-bold text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {locationLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <LocateFixed className="h-5 w-5" />
              )}

              {ui(
                "Use My Location",
                "मेरा स्थान उपयोग करें"
              )}
            </button>
          </form>

          {results.length > 0 && (
            <div className="mt-3 overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-lg">
              {results.map(
                (
                  result,
                  index
                ) => (
                  <button
                    key={
                      result.id ??
                      `${result.latitude}-${result.longitude}-${index}`
                    }
                    type="button"
                    onClick={() => {
                      setQuery(
                        result.display_name
                      );

                      void loadWeather(
                        {
                          location:
                            result.display_name,
                          latitude:
                            result.latitude,
                          longitude:
                            result.longitude,
                        }
                      );
                    }}
                    className="flex w-full items-start gap-3 border-b border-slate-100 px-4 py-3 text-left last:border-b-0 hover:bg-emerald-50"
                  >
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />

                    <div>
                      <p className="font-bold text-slate-800">
                        {
                          result.name
                        }
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {
                          result.display_name
                        }
                      </p>
                    </div>
                  </button>
                )
              )}
            </div>
          )}
        </section>


        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}


        {loading && !weather && (
          <div className="flex min-h-[360px] items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
          </div>
        )}


        {weather && (
          <>
            {/* CURRENT METRICS */}

            <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <WeatherMetric
                label={t(
                  "temperature"
                )}
                value={`${weather.current.temperature_c} °C`}
                subtitle={conditionLabel(
                  weather.current.condition
                )}
                icon={
                  <ThermometerSun className="h-7 w-7" />
                }
                accent="orange"
              />

              <WeatherMetric
                label={t(
                  "humidity"
                )}
                value={`${weather.current.humidity_percent}%`}
                subtitle={ui(
                  "Air moisture",
                  "हवा में नमी"
                )}
                icon={
                  <Droplets className="h-7 w-7" />
                }
                accent="blue"
              />

              <WeatherMetric
                label={t(
                  "rainfall"
                )}
                value={valueOrNoData(
                  weather.current.rainfall_mm,
                  "mm"
                )}
                subtitle={ui(
                  "Current precipitation",
                  "वर्तमान वर्षा"
                )}
                icon={
                  <CloudRain className="h-7 w-7" />
                }
                accent="sky"
              />

              <WeatherMetric
                label={t("wind")}
                value={valueOrNoData(
                  weather.current.wind_kph,
                  "km/h"
                )}
                subtitle={ui(
                  "Surface wind",
                  "सतही हवा"
                )}
                icon={
                  <Wind className="h-7 w-7" />
                }
                accent="teal"
              />
            </section>


            {/* FARM TIP */}

            <section className="mt-6 overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-r from-emerald-700 via-emerald-700 to-teal-700 p-6 text-white shadow-lg">
              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-100">
                    🌱 AGRIVA Smart Farm Tip
                  </p>

                  <p className="mt-2 max-w-4xl text-sm leading-6 text-emerald-50 sm:text-base">
                    {farmingTip}
                  </p>
                </div>

                <div className="shrink-0 rounded-2xl bg-white/10 px-4 py-3 text-center backdrop-blur">
                  <p className="text-xs text-emerald-100">
                    {ui(
                      "Rain chance today",
                      "आज बारिश की संभावना"
                    )}
                  </p>

                  <p className="mt-1 text-2xl font-black">
                    {firstForecast?.rain_probability_percent ??
                      0}
                    %
                  </p>
                </div>
              </div>
            </section>


            {/* FORECAST */}

            <section className="mt-10">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
                    AGRIVA Forecast
                  </p>

                  <h2 className="mt-1 text-2xl font-black text-slate-950">
                    {ui(
                      "5-Day Forecast",
                      "5-दिन का पूर्वानुमान"
                    )}
                  </h2>
                </div>

                <p className="text-sm text-slate-500">
                  {ui(
                    "Plan irrigation, spraying and harvest with confidence.",
                    "सिंचाई, छिड़काव और कटाई की बेहतर योजना बनाएं।"
                  )}
                </p>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {weather.forecast.slice(0, 5).map(
                  (
                    day,
                    index
                  ) => (
                    <article
                      key={day.date}
                      className={`agriva-forecast-card rounded-3xl border p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg ${
                        index === 0
                          ? "border-emerald-300 bg-emerald-50"
                          : "border-emerald-100 bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-black text-slate-800">
                          {new Date(
                            `${day.date}T00:00:00`
                          ).toLocaleDateString(
                            isHindi
                              ? "hi-IN"
                              : "en-IN",
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

                        <span className="text-3xl">
                          {weatherEmoji(
                            day.condition
                          )}
                        </span>
                      </div>

                      <p className="mt-5 text-2xl font-black text-slate-950">
                        {
                          day.max_temperature_c
                        }
                        °{" "}
                        <span className="text-base font-bold text-slate-400">
                          /{" "}
                          {
                            day.min_temperature_c
                          }
                          °
                        </span>
                      </p>

                      <p className="mt-2 min-h-10 text-sm font-semibold text-slate-600">
                        {conditionLabel(
                          day.condition
                        )}
                      </p>

                      <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-xs text-slate-600">
                        <p className="flex items-center justify-between">
                          <span>
                            {t("rain")}
                          </span>
                          <strong>
                            {
                              day.rain_probability_percent
                            }
                            %
                          </strong>
                        </p>

                        <p className="flex items-center justify-between">
                          <span>
                            {t(
                              "rainfall"
                            )}
                          </span>
                          <strong>
                            {valueOrNoData(
                              day.rainfall_mm,
                              "mm"
                            )}
                          </strong>
                        </p>

                        <p className="flex items-center justify-between">
                          <span>
                            {t("wind")}
                          </span>
                          <strong>
                            {valueOrNoData(
                              day.wind_kph,
                              "km/h"
                            )}
                          </strong>
                        </p>
                      </div>
                    </article>
                  )
                )}
              </div>
            </section>


            {/* ALERTS */}

            <section className="mt-10 pb-12">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-600">
                  Smart Protection
                </p>

                <h2 className="mt-1 text-2xl font-black text-slate-950">
                  {t(
                    "agriculturalAlerts"
                  )}
                </h2>
              </div>

              {weather.alerts.length ===
              0 ? (
                <div className="mt-5 rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
                  {t(
                    "noAlerts"
                  )}
                </div>
              ) : (
                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {weather.alerts.map(
                    (
                      alert,
                      index
                    ) => (
                      <article
                        key={`${alert.alert_type}-${index}`}
                        className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-5 shadow-sm"
                      >
                        <div className="flex items-start gap-4">
                          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-700">
                            <TriangleAlert className="h-5 w-5" />
                          </div>

                          <div>
                            <p className="font-black text-amber-950">
                              {
                                alert.title
                              }
                            </p>

                            <p className="mt-2 text-sm leading-6 text-amber-900/80">
                              {
                                alert.message
                              }
                            </p>

                            <span className="mt-4 inline-flex rounded-full bg-amber-200/70 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-amber-900">
                              {t(
                                "severity"
                              )}:{" "}
                              {
                                alert.severity
                              }
                            </span>
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


      <style jsx global>{`
        .agriva-weather-page {
          background:
            radial-gradient(
              circle at 86% 0%,
              rgba(45,212,191,.10),
              transparent 32%
            ),
            radial-gradient(
              circle at 5% 45%,
              rgba(34,197,94,.08),
              transparent 28%
            ),
            #f6f8f5;
        }

        .agriva-weather-hero {
          min-height: 290px;
          background:
            url("/images/agriva-farm-hero.svg")
            center 42% / cover no-repeat;
        }

        .agriva-weather-hero-overlay {
          background:
            linear-gradient(
              90deg,
              rgba(255,255,255,.95) 0%,
              rgba(255,255,255,.84) 42%,
              rgba(255,255,255,.34) 68%,
              rgba(255,255,255,.06) 100%
            );
        }

        .agriva-weather-page
        .agriva-current-weather {
          color: #0f172a;
        }

        .agriva-weather-dark {
          color-scheme: dark;
          background:
            radial-gradient(
              circle at 86% 0%,
              rgba(45,212,191,.09),
              transparent 32%
            ),
            #07120d !important;
        }

        .agriva-weather-dark
        .agriva-weather-hero-overlay {
          background:
            linear-gradient(
              90deg,
              rgba(6,22,13,.95) 0%,
              rgba(6,22,13,.82) 42%,
              rgba(6,22,13,.34) 68%,
              rgba(6,22,13,.06) 100%
            );
        }

        .agriva-weather-dark
        .bg-white,
        .agriva-weather-dark
        .agriva-forecast-card,
        .agriva-weather-dark
        .agriva-current-weather {
          background: #0d2015 !important;
          border-color: #28513a !important;
        }

        .agriva-weather-dark
        .text-slate-950,
        .agriva-weather-dark
        .text-slate-900,
        .agriva-weather-dark
        .text-slate-800,
        .agriva-weather-dark
        .text-slate-700 {
          color: #edf8f0 !important;
        }

        .agriva-weather-dark
        .text-slate-600,
        .agriva-weather-dark
        .text-slate-500,
        .agriva-weather-dark
        .text-slate-400 {
          color: #9fb9a6 !important;
        }

        .agriva-weather-dark
        .bg-emerald-50 {
          background: rgba(16,185,129,.10) !important;
        }

        .agriva-weather-dark
        input {
          background: #10271a !important;
          color: #edf8f0 !important;
          border-color: #28513a !important;
        }

        .agriva-weather-dark
        .border-slate-100,
        .agriva-weather-dark
        .border-slate-200,
        .agriva-weather-dark
        .border-emerald-100 {
          border-color: #28513a !important;
        }
      `}</style>
    </main>
  );
}


function WeatherMetric({
  label,
  value,
  subtitle,
  icon,
  accent,
}: {
  label: string;
  value: string;
  subtitle: string;
  icon: ReactNode;
  accent:
    | "orange"
    | "blue"
    | "sky"
    | "teal";
}) {
  const accentClass =
    accent === "orange"
      ? "bg-orange-50 text-orange-600"
      : accent === "blue"
        ? "bg-blue-50 text-blue-600"
        : accent === "sky"
          ? "bg-sky-50 text-sky-600"
          : "bg-teal-50 text-teal-600";

  return (
    <article className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">
            {label}
          </p>

          <p className="mt-2 text-3xl font-black text-slate-950">
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {subtitle}
          </p>
        </div>

        <div
          className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl ${accentClass}`}
        >
          {icon}
        </div>
      </div>
    </article>
  );
}
