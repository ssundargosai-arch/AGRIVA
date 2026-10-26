from pathlib import Path
import json
import re
import shutil

ROOT = Path(r"D:\AGRIVA\frontend")

page = (
    ROOT /
    "app/dashboard/farmer/storage/page.tsx"
)

if page.exists():
    raise RuntimeError(
        f"Storage page already exists: {page}"
    )

page.parent.mkdir(
    parents=True,
    exist_ok=True,
)

page.write_text(
r'''"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowLeft,
  CalendarDays,
  IndianRupee,
  Loader2,
  MapPin,
  PackageCheck,
  RefreshCw,
  Snowflake,
  Store,
  XCircle,
} from "lucide-react";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";


const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000";


type Facility = {
  id: string;
  name: string;
  facility_type:
    | "WAREHOUSE"
    | "COLD_STORAGE";
  district: string;
  state: string;
  address: string;
  total_capacity_quintal: number;
  available_capacity_quintal: number;
  rate_per_quintal_day: number;
  supports_cold_chain: boolean;
  contact_phone: string | null;
  status: string;
  data_mode: string;
  verification_note: string;
};


type StorageEstimate = {
  facility_id: string;
  quantity_quintal: number;
  storage_days: number;
  rate_per_quintal_day: number;
  estimated_cost: number;
  capacity_available: boolean;
  note: string;
};


type StorageRequest = {
  id: string;
  facility_id: string;
  farmer_user_id: string;
  listing_id: string | null;
  crop_name: string;
  quantity_quintal: number;
  storage_days: number;
  rate_per_quintal_day: number;
  estimated_cost: number;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};


const COPY = {
  en: {
    back: "Farmer Dashboard",
    badge: "AGRIVA Storage Network",
    title: "Storage & Cold-Storage Options",
    subtitle:
      "Compare warehouse capacity and estimated holding cost before deciding whether to sell now or wait.",
    prototype: "Prototype directory",
    prototypeText:
      "Facilities shown here are AGRIVA directory/demo records. Provider identity, final price and real-time availability must be confirmed with the provider.",

    facilities: "Available Storage Options",
    facilitiesDesc:
      "Compare warehouse and cold-storage capacity, location and estimated daily rate.",
    refresh: "Refresh",
    loading: "Loading storage network...",
    noFacilities: "No storage facilities found.",

    warehouse: "Warehouse",
    coldStorage: "Cold Storage",
    coldChain: "Cold chain",
    district: "District",
    available: "Available",
    totalCapacity: "Total capacity",
    rate: "Storage rate",
    perQtlDay: "/ quintal / day",

    requestTitle: "Estimate & Request Storage",
    requestDesc:
      "Choose a facility, enter your crop quantity and holding period.",
    facility: "Storage facility",
    crop: "Crop",
    quantity: "Quantity (quintal)",
    days: "Storage days",
    notes: "Notes (optional)",
    calculate: "Calculate storage cost",
    calculating: "Calculating...",
    estimated: "Estimated storage cost",
    capacityYes: "Capacity available",
    capacityNo: "Requested quantity exceeds available capacity",
    send: "Send storage request",
    sending: "Sending request...",
    requestNote:
      "Sending a request does not confirm or reserve storage. Provider/admin approval is still required.",

    history: "My Storage Requests",
    historyDesc:
      "Track storage enquiries sent through AGRIVA.",
    noRequests: "No storage requests yet.",
    requested: "Requested",
    approved: "Approved",
    rejected: "Rejected",
    cancelled: "Cancelled",
    completed: "Completed",
    cancel: "Cancel request",

    success:
      "Storage request sent successfully.",
    cancelledMessage:
      "Storage request cancelled.",
    login:
      "Please login again to use storage services.",
    genericError:
      "Unable to load AGRIVA Storage Network.",
  },

  hi: {
    back: "किसान डैशबोर्ड",
    badge: "AGRIVA भंडारण नेटवर्क",
    title: "गोदाम और कोल्ड स्टोरेज विकल्प",
    subtitle:
      "अभी बेचें या प्रतीक्षा करें का निर्णय लेने से पहले भंडारण क्षमता और अनुमानित लागत की तुलना करें।",
    prototype: "प्रोटोटाइप डायरेक्टरी",
    prototypeText:
      "यहाँ दिखाई गई सुविधाएँ AGRIVA डायरेक्टरी/डेमो रिकॉर्ड हैं। प्रदाता की पहचान, अंतिम कीमत और वास्तविक उपलब्धता प्रदाता से पुष्टि करनी होगी।",

    facilities: "उपलब्ध भंडारण विकल्प",
    facilitiesDesc:
      "गोदाम और कोल्ड स्टोरेज की क्षमता, स्थान और अनुमानित दैनिक दर की तुलना करें।",
    refresh: "रीफ्रेश",
    loading: "भंडारण नेटवर्क लोड हो रहा है...",
    noFacilities: "कोई भंडारण सुविधा नहीं मिली।",

    warehouse: "गोदाम",
    coldStorage: "कोल्ड स्टोरेज",
    coldChain: "कोल्ड चेन",
    district: "जिला",
    available: "उपलब्ध",
    totalCapacity: "कुल क्षमता",
    rate: "भंडारण दर",
    perQtlDay: "/ क्विंटल / दिन",

    requestTitle: "लागत अनुमान और भंडारण अनुरोध",
    requestDesc:
      "सुविधा चुनें और फसल की मात्रा तथा भंडारण अवधि दर्ज करें।",
    facility: "भंडारण सुविधा",
    crop: "फसल",
    quantity: "मात्रा (क्विंटल)",
    days: "भंडारण दिन",
    notes: "नोट (वैकल्पिक)",
    calculate: "भंडारण लागत निकालें",
    calculating: "गणना हो रही है...",
    estimated: "अनुमानित भंडारण लागत",
    capacityYes: "क्षमता उपलब्ध है",
    capacityNo: "मांगी गई मात्रा उपलब्ध क्षमता से अधिक है",
    send: "भंडारण अनुरोध भेजें",
    sending: "अनुरोध भेजा जा रहा है...",
    requestNote:
      "अनुरोध भेजने से भंडारण आरक्षित या पुष्टि नहीं होता। प्रदाता/एडमिन की स्वीकृति आवश्यक है।",

    history: "मेरे भंडारण अनुरोध",
    historyDesc:
      "AGRIVA के माध्यम से भेजे गए भंडारण अनुरोध देखें।",
    noRequests: "अभी कोई भंडारण अनुरोध नहीं है।",
    requested: "अनुरोधित",
    approved: "स्वीकृत",
    rejected: "अस्वीकृत",
    cancelled: "रद्द",
    completed: "पूर्ण",
    cancel: "अनुरोध रद्द करें",

    success: "भंडारण अनुरोध सफलतापूर्वक भेजा गया।",
    cancelledMessage: "भंडारण अनुरोध रद्द किया गया।",
    login: "भंडारण सेवा के लिए दोबारा लॉगिन करें।",
    genericError: "AGRIVA भंडारण नेटवर्क लोड नहीं हो सका।",
  },

  mr: {
    back: "शेतकरी डॅशबोर्ड",
    badge: "AGRIVA साठवण नेटवर्क",
    title: "गोदाम आणि कोल्ड स्टोरेज पर्याय",
    subtitle:
      "आता विकायचे की थांबायचे हे ठरवण्यापूर्वी साठवण क्षमता आणि अंदाजित खर्चाची तुलना करा.",
    prototype: "प्रोटोटाइप डायरेक्टरी",
    prototypeText:
      "येथे दाखवलेल्या सुविधा AGRIVA डायरेक्टरी/डेमो नोंदी आहेत. प्रदात्याची ओळख, अंतिम दर आणि प्रत्यक्ष उपलब्धता प्रदात्याकडून निश्चित करावी.",

    facilities: "उपलब्ध साठवण पर्याय",
    facilitiesDesc:
      "गोदाम आणि कोल्ड स्टोरेजची क्षमता, ठिकाण आणि अंदाजित दैनिक दर तुलना करा.",
    refresh: "रीफ्रेश",
    loading: "साठवण नेटवर्क लोड होत आहे...",
    noFacilities: "साठवण सुविधा उपलब्ध नाही.",

    warehouse: "गोदाम",
    coldStorage: "कोल्ड स्टोरेज",
    coldChain: "कोल्ड चेन",
    district: "जिल्हा",
    available: "उपलब्ध",
    totalCapacity: "एकूण क्षमता",
    rate: "साठवण दर",
    perQtlDay: "/ क्विंटल / दिवस",

    requestTitle: "साठवण खर्च अंदाज व विनंती",
    requestDesc:
      "सुविधा निवडा आणि पीक प्रमाण व साठवण कालावधी भरा.",
    facility: "साठवण सुविधा",
    crop: "पीक",
    quantity: "प्रमाण (क्विंटल)",
    days: "साठवण दिवस",
    notes: "टीप (ऐच्छिक)",
    calculate: "साठवण खर्च मोजा",
    calculating: "मोजत आहे...",
    estimated: "अंदाजित साठवण खर्च",
    capacityYes: "क्षमता उपलब्ध आहे",
    capacityNo: "मागितलेले प्रमाण उपलब्ध क्षमतेपेक्षा जास्त आहे",
    send: "साठवण विनंती पाठवा",
    sending: "विनंती पाठवत आहे...",
    requestNote:
      "विनंती पाठवल्याने साठवण आरक्षित किंवा निश्चित होत नाही. प्रदाता/अॅडमिनची मंजुरी आवश्यक आहे.",

    history: "माझ्या साठवण विनंत्या",
    historyDesc:
      "AGRIVA मधून पाठवलेल्या साठवण विनंत्या पहा.",
    noRequests: "अद्याप साठवण विनंती नाही.",
    requested: "विनंती",
    approved: "मंजूर",
    rejected: "नाकारले",
    cancelled: "रद्द",
    completed: "पूर्ण",
    cancel: "विनंती रद्द करा",

    success: "साठवण विनंती यशस्वीपणे पाठवली.",
    cancelledMessage: "साठवण विनंती रद्द केली.",
    login: "साठवण सेवेसाठी पुन्हा लॉगिन करा.",
    genericError: "AGRIVA साठवण नेटवर्क लोड झाले नाही.",
  },
} as const;


function getToken() {
  return (
    localStorage.getItem("access_token") ||
    localStorage.getItem("token")
  );
}


function money(value: number) {
  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }
  ).format(value);
}


export default function StoragePage() {
  const router = useRouter();
  const locale = useLocale();

  const copy =
    COPY[
      locale === "hi" ||
      locale === "mr"
        ? locale
        : "en"
    ];

  const [facilities, setFacilities] =
    useState<Facility[]>([]);

  const [requests, setRequests] =
    useState<StorageRequest[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [selectedFacilityId, setSelectedFacilityId] =
    useState("");

  const [cropName, setCropName] =
    useState("Onion");

  const [quantity, setQuantity] =
    useState("25");

  const [days, setDays] =
    useState("10");

  const [notes, setNotes] =
    useState("");

  const [estimate, setEstimate] =
    useState<StorageEstimate | null>(
      null
    );

  const [estimating, setEstimating] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [cancellingId, setCancellingId] =
    useState<string | null>(null);


  const selectedFacility =
    useMemo(
      () =>
        facilities.find(
          (item) =>
            item.id ===
            selectedFacilityId
        ) || null,
      [
        facilities,
        selectedFacilityId,
      ]
    );


  const loadData = useCallback(
    async () => {
      const token = getToken();

      if (!token) {
        setError(copy.login);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const [
          facilityResponse,
          requestResponse,
        ] = await Promise.all([
          fetch(
            `${API_URL}/api/storage/facilities?state=Maharashtra`,
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          ),
          fetch(
            `${API_URL}/api/storage/requests/my`,
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          ),
        ]);

        if (
          facilityResponse.status === 401 ||
          requestResponse.status === 401
        ) {
          throw new Error(copy.login);
        }

        if (!facilityResponse.ok) {
          const result =
            await facilityResponse
              .json()
              .catch(() => null);

          throw new Error(
            result?.detail ||
              copy.genericError
          );
        }

        if (!requestResponse.ok) {
          const result =
            await requestResponse
              .json()
              .catch(() => null);

          throw new Error(
            result?.detail ||
              copy.genericError
          );
        }

        const facilityData:
          Facility[] =
          await facilityResponse.json();

        const requestData:
          StorageRequest[] =
          await requestResponse.json();

        setFacilities(facilityData);
        setRequests(requestData);

        setSelectedFacilityId(
          (current) =>
            current ||
            facilityData[0]?.id ||
            ""
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : copy.genericError
        );
      } finally {
        setLoading(false);
      }
    },
    [copy]
  );


  useEffect(() => {
    void loadData();
  }, [loadData]);


  async function calculateEstimate() {
    const token = getToken();

    if (
      !token ||
      !selectedFacilityId
    ) {
      setError(copy.login);
      return;
    }

    const quantityValue =
      Number(quantity);

    const dayValue =
      Number(days);

    if (
      !Number.isFinite(quantityValue) ||
      quantityValue <= 0 ||
      !Number.isFinite(dayValue) ||
      dayValue <= 0
    ) {
      setError(
        "Enter a valid quantity and storage period."
      );
      return;
    }

    setEstimating(true);
    setError("");
    setMessage("");

    try {
      const params =
        new URLSearchParams({
          facility_id:
            selectedFacilityId,
          quantity_quintal:
            String(quantityValue),
          storage_days:
            String(dayValue),
        });

      const response = await fetch(
        `${API_URL}/api/storage/cost-estimate?${params.toString()}`,
        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

      const result =
        await response
          .json()
          .catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.detail ||
            copy.genericError
        );
      }

      setEstimate(
        result as StorageEstimate
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : copy.genericError
      );
    } finally {
      setEstimating(false);
    }
  }


  async function sendRequest() {
    const token = getToken();

    if (
      !token ||
      !selectedFacilityId
    ) {
      setError(copy.login);
      return;
    }

    if (!estimate) {
      await calculateEstimate();
      return;
    }

    if (!estimate.capacity_available) {
      setError(copy.capacityNo);
      return;
    }

    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/api/storage/requests`,
        {
          method: "POST",
          headers: {
            Authorization:
              `Bearer ${token}`,
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            facility_id:
              selectedFacilityId,
            crop_name:
              cropName.trim(),
            quantity_quintal:
              Number(quantity),
            storage_days:
              Number(days),
            notes:
              notes.trim() || null,
          }),
        }
      );

      const result =
        await response
          .json()
          .catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.detail ||
            copy.genericError
        );
      }

      setMessage(copy.success);
      setEstimate(null);
      setNotes("");

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : copy.genericError
      );
    } finally {
      setSubmitting(false);
    }
  }


  async function cancelRequest(
    requestId: string
  ) {
    const token = getToken();

    if (!token) {
      setError(copy.login);
      return;
    }

    setCancellingId(requestId);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/api/storage/requests/${requestId}/cancel`,
        {
          method: "PATCH",
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

      const result =
        await response
          .json()
          .catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.detail ||
            copy.genericError
        );
      }

      setMessage(
        copy.cancelledMessage
      );

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : copy.genericError
      );
    } finally {
      setCancellingId(null);
    }
  }


  function statusLabel(
    status: string
  ) {
    const key =
      status.toLowerCase() as
        | "requested"
        | "approved"
        | "rejected"
        | "cancelled"
        | "completed";

    return copy[key] || status;
  }


  return (
    <main className="min-h-screen bg-[#f4f8f3] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <section className="border-b border-emerald-100 bg-gradient-to-br from-white via-emerald-50 to-green-100 dark:border-slate-800 dark:from-slate-950 dark:via-emerald-950/40 dark:to-slate-950">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <button
            onClick={() =>
              router.push(
                "/dashboard/farmer"
              )
            }
            className="inline-flex items-center gap-2 text-sm font-bold text-emerald-700 hover:text-emerald-900 dark:text-emerald-300"
          >
            <ArrowLeft className="h-4 w-4" />
            {copy.back}
          </button>

          <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
            <Store className="h-4 w-4" />
            {copy.badge}
          </div>

          <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-tight sm:text-5xl">
            {copy.title}
          </h1>

          <p className="mt-4 max-w-4xl text-lg leading-8 text-slate-600 dark:text-slate-300">
            {copy.subtitle}
          </p>

          <div className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
            <p className="font-black">
              {copy.prototype}
            </p>
            <p className="mt-1">
              {copy.prototypeText}
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 font-semibold text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </div>
        )}

        {message && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 font-semibold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
            {message}
          </div>
        )}

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <h2 className="text-2xl font-black">
                {copy.facilities}
              </h2>
              <p className="mt-2 max-w-3xl text-slate-600 dark:text-slate-300">
                {copy.facilitiesDesc}
              </p>
            </div>

            <button
              onClick={() =>
                void loadData()
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 font-bold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              <RefreshCw className="h-4 w-4" />
              {copy.refresh}
            </button>
          </div>

          {loading ? (
            <div className="flex min-h-48 items-center justify-center gap-3 text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              {copy.loading}
            </div>
          ) : facilities.length === 0 ? (
            <div className="mt-6 rounded-2xl bg-slate-50 p-8 text-center text-slate-500 dark:bg-slate-800">
              {copy.noFacilities}
            </div>
          ) : (
            <div className="mt-6 grid gap-5 lg:grid-cols-3">
              {facilities.map(
                (facility) => {
                  const selected =
                    facility.id ===
                    selectedFacilityId;

                  return (
                    <button
                      type="button"
                      key={facility.id}
                      onClick={() => {
                        setSelectedFacilityId(
                          facility.id
                        );
                        setEstimate(null);
                      }}
                      className={`rounded-2xl border p-5 text-left transition ${
                        selected
                          ? "border-emerald-500 bg-emerald-50 shadow-md dark:bg-emerald-950/30"
                          : "border-slate-200 hover:border-emerald-300 dark:border-slate-700 dark:bg-slate-900"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">
                            {facility.facility_type ===
                            "COLD_STORAGE"
                              ? copy.coldStorage
                              : copy.warehouse}
                          </p>

                          <h3 className="mt-2 text-lg font-black">
                            {facility.name}
                          </h3>
                        </div>

                        {facility.supports_cold_chain ? (
                          <Snowflake className="h-6 w-6 text-sky-600" />
                        ) : (
                          <Store className="h-6 w-6 text-emerald-700" />
                        )}
                      </div>

                      <p className="mt-4 flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                        {facility.address}
                      </p>

                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <Info
                          label={copy.available}
                          value={`${facility.available_capacity_quintal.toLocaleString("en-IN")} q`}
                        />
                        <Info
                          label={copy.totalCapacity}
                          value={`${facility.total_capacity_quintal.toLocaleString("en-IN")} q`}
                        />
                      </div>

                      <div className="mt-4 rounded-xl bg-white p-3 dark:bg-slate-800">
                        <p className="text-xs font-bold uppercase text-slate-500">
                          {copy.rate}
                        </p>
                        <p className="mt-1 font-black text-emerald-700 dark:text-emerald-300">
                          ₹
                          {facility.rate_per_quintal_day.toFixed(
                            2
                          )}
                          {copy.perQtlDay}
                        </p>
                      </div>
                    </button>
                  );
                }
              )}
            </div>
          )}
        </section>

        <section className="grid gap-8 lg:grid-cols-[1fr_0.8fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
            <h2 className="text-2xl font-black">
              {copy.requestTitle}
            </h2>

            <p className="mt-2 text-slate-600 dark:text-slate-300">
              {copy.requestDesc}
            </p>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <Field
                label={copy.facility}
              >
                <select
                  value={
                    selectedFacilityId
                  }
                  onChange={(event) => {
                    setSelectedFacilityId(
                      event.target.value
                    );
                    setEstimate(null);
                  }}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950"
                >
                  {facilities.map(
                    (facility) => (
                      <option
                        key={
                          facility.id
                        }
                        value={
                          facility.id
                        }
                      >
                        {facility.name}
                      </option>
                    )
                  )}
                </select>
              </Field>

              <Field label={copy.crop}>
                <input
                  value={cropName}
                  onChange={(event) =>
                    setCropName(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950"
                />
              </Field>

              <Field
                label={copy.quantity}
              >
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={quantity}
                  onChange={(event) => {
                    setQuantity(
                      event.target.value
                    );
                    setEstimate(null);
                  }}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950"
                />
              </Field>

              <Field label={copy.days}>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={days}
                  onChange={(event) => {
                    setDays(
                      event.target.value
                    );
                    setEstimate(null);
                  }}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950"
                />
              </Field>
            </div>

            <div className="mt-5">
              <Field label={copy.notes}>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(event) =>
                    setNotes(
                      event.target.value
                    )
                  }
                  className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950"
                />
              </Field>
            </div>

            <button
              type="button"
              disabled={
                estimating ||
                !selectedFacility
              }
              onClick={() =>
                void calculateEstimate()
              }
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 font-black text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-emerald-600 dark:hover:bg-emerald-500"
            >
              {estimating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <IndianRupee className="h-4 w-4" />
              )}

              {estimating
                ? copy.calculating
                : copy.calculate}
            </button>
          </div>

          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm dark:border-emerald-900 dark:bg-emerald-950/30 sm:p-8">
            <h2 className="text-xl font-black">
              {copy.estimated}
            </h2>

            {!estimate ? (
              <div className="mt-6 flex min-h-48 items-center justify-center rounded-2xl border border-dashed border-emerald-300 bg-white/60 p-6 text-center text-slate-500 dark:border-emerald-800 dark:bg-slate-900/50">
                {copy.calculate}
              </div>
            ) : (
              <>
                <div className="mt-6 text-4xl font-black text-emerald-800 dark:text-emerald-300">
                  {money(
                    estimate.estimated_cost
                  )}
                </div>

                <div className="mt-5 grid gap-3">
                  <Info
                    label={copy.quantity}
                    value={`${estimate.quantity_quintal} q`}
                  />

                  <Info
                    label={copy.days}
                    value={`${estimate.storage_days}`}
                  />

                  <Info
                    label={copy.rate}
                    value={`₹${estimate.rate_per_quintal_day.toFixed(2)}${copy.perQtlDay}`}
                  />
                </div>

                <div
                  className={`mt-5 rounded-xl p-4 font-bold ${
                    estimate.capacity_available
                      ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200"
                      : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200"
                  }`}
                >
                  <PackageCheck className="mr-2 inline h-5 w-5" />

                  {estimate.capacity_available
                    ? copy.capacityYes
                    : copy.capacityNo}
                </div>

                <button
                  type="button"
                  disabled={
                    submitting ||
                    !estimate.capacity_available
                  }
                  onClick={() =>
                    void sendRequest()
                  }
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 font-black text-white hover:bg-emerald-800 disabled:opacity-50"
                >
                  {submitting && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}

                  {submitting
                    ? copy.sending
                    : copy.send}
                </button>

                <p className="mt-4 text-xs leading-5 text-slate-600 dark:text-slate-300">
                  {copy.requestNote}
                </p>
              </>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          <h2 className="text-2xl font-black">
            {copy.history}
          </h2>

          <p className="mt-2 text-slate-600 dark:text-slate-300">
            {copy.historyDesc}
          </p>

          {requests.length === 0 ? (
            <div className="mt-6 rounded-2xl bg-slate-50 p-8 text-center text-slate-500 dark:bg-slate-800">
              {copy.noRequests}
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {requests.map(
                (request) => (
                  <article
                    key={request.id}
                    className="rounded-2xl border border-slate-200 p-5 dark:border-slate-700"
                  >
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-lg font-black">
                            {
                              request.crop_name
                            }
                          </h3>

                          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black uppercase text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                            {statusLabel(
                              request.status
                            )}
                          </span>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-300">
                          <span>
                            <PackageCheck className="mr-1 inline h-4 w-4" />
                            {
                              request.quantity_quintal
                            }{" "}
                            q
                          </span>

                          <span>
                            <CalendarDays className="mr-1 inline h-4 w-4" />
                            {
                              request.storage_days
                            }{" "}
                            days
                          </span>

                          <span className="font-bold">
                            <IndianRupee className="mr-1 inline h-4 w-4" />
                            {money(
                              request.estimated_cost
                            )}
                          </span>
                        </div>
                      </div>

                      {request.status ===
                        "REQUESTED" && (
                        <button
                          type="button"
                          disabled={
                            cancellingId ===
                            request.id
                          }
                          onClick={() =>
                            void cancelRequest(
                              request.id
                            )
                          }
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2 font-bold text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950"
                        >
                          {cancellingId ===
                          request.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <XCircle className="h-4 w-4" />
                          )}

                          {copy.cancel}
                        </button>
                      )}
                    </div>
                  </article>
                )
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}


function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-slate-700 dark:text-slate-200">
        {label}
      </span>
      {children}
    </label>
  );
}


function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </p>

      <p className="mt-1 font-black">
        {value}
      </p>
    </div>
  );
}
''',
    encoding="utf-8",
    newline="\n",
)

print(
    "CREATED: farmer storage page"
)


# ==============================================
# Dashboard backup
# ==============================================

dashboard = (
    ROOT /
    "app/dashboard/farmer/page.tsx"
)

backup = dashboard.with_name(
    "page.before-storage-dashboard.tsx"
)

shutil.copy2(
    dashboard,
    backup,
)


# ==============================================
# Dashboard action card
# ==============================================

text = dashboard.read_text(
    encoding="utf-8-sig"
)

if (
    'router.push("/dashboard/farmer/storage")'
    not in text
):
    lines = text.splitlines()

    target_index = None

    for i, line in enumerate(lines):
        if (
            'router.push("/dashboard/farmer/weather")'
            in line
        ):
            target_index = i
            break

    if target_index is None:
        raise RuntimeError(
            "Weather action card not found."
        )

    indent = (
        lines[target_index][
            :len(lines[target_index])
            - len(lines[target_index].lstrip())
        ]
    )

    storage_line = (
        indent
        + '{ icon: Store, title: t("storage"), '
        + 'desc: t("storageDesc"), '
        + 'onClick: () => router.push('
        + '"/dashboard/farmer/storage") },'
    )

    lines.insert(
        target_index + 1,
        storage_line,
    )

    text = "\n".join(lines) + "\n"


# Ensure Store icon is imported
match = re.search(
    r'import\s*\{(.*?)\}\s*from\s*"lucide-react";',
    text,
    flags=re.DOTALL,
)

if not match:
    raise RuntimeError(
        "lucide-react import block not found."
    )

body = match.group(1)

if not re.search(
    r'\bStore\b',
    body
):
    new_body = (
        body.rstrip()
        + "\n  Store,\n"
    )

    text = (
        text[:match.start(1)]
        + new_body
        + text[match.end(1):]
    )

dashboard.write_text(
    text,
    encoding="utf-8",
    newline="\n",
)

print(
    "UPDATED: Farmer Dashboard -> Storage"
)


# ==============================================
# phase2Dashboard translations
# ==============================================

translations = {
    "en": {
        "storage": "Storage Options",
        "storageDesc":
            "Compare warehouse and cold-storage costs.",
    },
    "hi": {
        "storage": "भंडारण विकल्प",
        "storageDesc":
            "गोदाम और कोल्ड स्टोरेज की लागत की तुलना करें।",
    },
    "mr": {
        "storage": "साठवण पर्याय",
        "storageDesc":
            "गोदाम आणि कोल्ड स्टोरेज खर्चाची तुलना करा.",
    },
}

for locale, values in translations.items():
    locale_path = (
        ROOT /
        "locales" /
        f"{locale}.json"
    )

    data = json.loads(
        locale_path.read_text(
            encoding="utf-8-sig"
        )
    )

    namespace = data.get(
        "phase2Dashboard"
    )

    if not isinstance(
        namespace,
        dict
    ):
        raise RuntimeError(
            f"phase2Dashboard missing in {locale}.json"
        )

    namespace.update(values)

    locale_path.write_text(
        json.dumps(
            data,
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
        newline="\n",
    )

    print(
        f"UPDATED: {locale}.json"
    )


print()
print(
    "AGRIVA STORAGE FRONTEND INSTALLED"
)
print(
    "Route: /dashboard/farmer/storage"
)
print(
    "Backup:",
    backup
)
