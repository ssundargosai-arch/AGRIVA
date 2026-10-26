"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  Loader2,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from "lucide-react";

import {
  useLocale,
} from "next-intl";

import {
  useRouter,
} from "next/navigation";

import LanguageSelector from "@/components/LanguageSelector";


const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000";


type Submission = {
  verification_id: string | null;
  buyer_profile_id: string;

  business_name: string;
  business_type: string;
  city: string;
  state: string;

  status: string;
  status_label: string;
  verification_note: string;

  document_type: string | null;
  gstin: string | null;
  business_registration_number:
    string | null;

  document_original_name:
    string | null;

  submitted_at: string | null;
  reviewed_at: string | null;
  review_note: string | null;
};


const COPY = {
  en: {
    back: "Admin Dashboard",
    title: "Buyer Verification Review",
    subtitle:
      "Review documents submitted to AGRIVA and assign only AGRIVA's internal platform-review status.",
    warning:
      "Approval here does not mean Government KYC, GST-authority verification, bank verification, credit scoring, payment guarantee or delivery guarantee.",
    filter: "Filter",
    all: "All",
    pending: "Pending",
    verified: "AGRIVA Verified",
    rejected: "Rejected",
    refresh: "Refresh",
    view: "View document",
    approve: "Approve",
    reject: "Reject",
    note: "Review note",
    notePlaceholder:
      "Add the reason or review observation...",
    noRows:
      "No verification submissions found.",
    business: "Business",
    document: "Document",
    submitted: "Submitted",
    language: "Language",
    error:
      "Unable to load buyer verification submissions.",
  },

  hi: {
    back: "एडमिन डैशबोर्ड",
    title: "खरीदार सत्यापन समीक्षा",
    subtitle:
      "AGRIVA को जमा दस्तावेज़ों की समीक्षा करें और केवल AGRIVA की आंतरिक प्लेटफ़ॉर्म समीक्षा स्थिति दें।",
    warning:
      "यह स्वीकृति सरकारी KYC, GST विभाग सत्यापन, बैंक सत्यापन, क्रेडिट स्कोर, भुगतान गारंटी या डिलीवरी गारंटी नहीं है।",
    filter: "फ़िल्टर",
    all: "सभी",
    pending: "लंबित",
    verified: "AGRIVA Verified",
    rejected: "अस्वीकृत",
    refresh: "रीफ्रेश",
    view: "दस्तावेज़ देखें",
    approve: "स्वीकृत करें",
    reject: "अस्वीकृत करें",
    note: "समीक्षा टिप्पणी",
    notePlaceholder:
      "कारण या समीक्षा टिप्पणी लिखें...",
    noRows:
      "कोई सत्यापन आवेदन नहीं मिला।",
    business: "व्यवसाय",
    document: "दस्तावेज़",
    submitted: "जमा समय",
    language: "भाषा",
    error:
      "खरीदार सत्यापन आवेदन लोड नहीं हो सके।",
  },

  mr: {
    back: "अॅडमिन डॅशबोर्ड",
    title: "खरेदीदार पडताळणी पुनरावलोकन",
    subtitle:
      "AGRIVA वर सादर केलेल्या दस्तऐवजांचे पुनरावलोकन करा आणि केवळ AGRIVA ची अंतर्गत प्लॅटफॉर्म पुनरावलोकन स्थिती द्या.",
    warning:
      "ही मंजुरी सरकारी KYC, GST प्राधिकरण पडताळणी, बँक पडताळणी, क्रेडिट स्कोअर, पेमेंट हमी किंवा डिलिव्हरी हमी नाही.",
    filter: "फिल्टर",
    all: "सर्व",
    pending: "प्रलंबित",
    verified: "AGRIVA Verified",
    rejected: "नाकारलेले",
    refresh: "रीफ्रेश",
    view: "दस्तऐवज पहा",
    approve: "मंजूर करा",
    reject: "नाकारा",
    note: "पुनरावलोकन टिप्पणी",
    notePlaceholder:
      "कारण किंवा पुनरावलोकन टिप्पणी लिहा...",
    noRows:
      "कोणतेही पडताळणी अर्ज सापडले नाहीत.",
    business: "व्यवसाय",
    document: "दस्तऐवज",
    submitted: "सादर वेळ",
    language: "भाषा",
    error:
      "खरेदीदार पडताळणी अर्ज लोड झाले नाहीत.",
  },
} as const;


function token() {
  if (
    typeof window ===
    "undefined"
  ) {
    return null;
  }

  return (
    localStorage.getItem(
      "access_token"
    ) ||
    localStorage.getItem(
      "token"
    )
  );
}


function badgeClass(
  status: string
) {
  if (
    status ===
    "AGRIVA_VERIFIED"
  ) {
    return (
      "bg-emerald-100 " +
      "text-emerald-800"
    );
  }

  if (status === "PENDING") {
    return (
      "bg-amber-100 " +
      "text-amber-800"
    );
  }

  return (
    "bg-red-100 " +
    "text-red-700"
  );
}


export default function AdminBuyerVerificationPage() {
  const router = useRouter();
  const locale = useLocale();

  const key =
    locale === "hi" ||
    locale === "mr"
      ? locale
      : "en";

  const c = COPY[key];

  const [
    filter,
    setFilter,
  ] = useState("PENDING");

  const [
    rows,
    setRows,
  ] = useState<
    Submission[]
  >([]);

  const [
    notes,
    setNotes,
  ] = useState<
    Record<string, string>
  >({});

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    actionId,
    setActionId,
  ] = useState<
    string | null
  >(null);

  const [
    error,
    setError,
  ] = useState("");


  async function loadRows() {
    const auth = token();

    if (!auth) {
      router.replace("/login");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const suffix =
        filter === "ALL"
          ? ""
          : `?status=${encodeURIComponent(
              filter
            )}`;

      const response =
        await fetch(
          `${API_URL}/api/buyer-verification/admin/submissions${suffix}`,
          {
            headers: {
              Authorization:
                `Bearer ${auth}`,
            },
            cache: "no-store",
          }
        );

      const body =
        await response
          .json()
          .catch(() => null);

      if (!response.ok) {
        throw new Error(
          body?.detail ||
            c.error
        );
      }

      setRows(
        Array.isArray(body)
          ? body
          : []
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : c.error
      );
    } finally {
      setLoading(false);
    }
  }


  useEffect(() => {
    const auth = token();

    if (!auth) {
      router.replace("/login");
      return;
    }

    const suffix =
      filter === "ALL"
        ? ""
        : `?status=${encodeURIComponent(
            filter
          )}`;

    fetch(
      `${API_URL}/api/buyer-verification/admin/submissions${suffix}`,
      {
        headers: {
          Authorization:
            `Bearer ${auth}`,
        },
        cache: "no-store",
      }
    )
      .then(async (response) => {
        const body =
          await response
            .json()
            .catch(
              () => null
            );

        if (!response.ok) {
          throw new Error(
            body?.detail ||
              c.error
          );
        }

        return body;
      })
      .then((body) => {
        setRows(
          Array.isArray(body)
            ? body
            : []
        );
      })
      .catch((err) => {
        setError(
          err instanceof Error
            ? err.message
            : c.error
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [
    filter,
    router,
    c.error,
  ]);


  async function review(
    row: Submission,
    status: "AGRIVA_VERIFIED" |
      "REJECTED"
  ) {
    if (!row.verification_id) {
      return;
    }

    const auth = token();

    if (!auth) {
      router.replace("/login");
      return;
    }

    const note =
      notes[
        row.verification_id
      ] || "";

    if (
      status === "REJECTED" &&
      !note.trim()
    ) {
      setError(
        "Review note is required when rejecting."
      );

      return;
    }

    setActionId(
      row.verification_id
    );

    setError("");

    try {
      const response =
        await fetch(
          `${API_URL}/api/buyer-verification/admin/submissions/${row.verification_id}`,
          {
            method: "PATCH",
            headers: {
              Authorization:
                `Bearer ${auth}`,
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              status,
              review_note:
                note.trim() ||
                (
                  status ===
                  "AGRIVA_VERIFIED"
                    ? "Submitted platform business document reviewed by AGRIVA admin."
                    : null
                ),
            }),
          }
        );

      const body =
        await response
          .json()
          .catch(() => null);

      if (!response.ok) {
        throw new Error(
          body?.detail ||
            c.error
        );
      }

      await loadRows();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : c.error
      );
    } finally {
      setActionId(null);
    }
  }


  async function viewDocument(
    row: Submission
  ) {
    if (!row.verification_id) {
      return;
    }

    const auth = token();

    if (!auth) {
      router.replace("/login");
      return;
    }

    try {
      const response =
        await fetch(
          `${API_URL}/api/buyer-verification/admin/submissions/${row.verification_id}/document`,
          {
            headers: {
              Authorization:
                `Bearer ${auth}`,
            },
          }
        );

      if (!response.ok) {
        const body =
          await response
            .json()
            .catch(
              () => null
            );

        throw new Error(
          body?.detail ||
            "Unable to open document."
        );
      }

      const blob =
        await response.blob();

      const url =
        URL.createObjectURL(
          blob
        );

      window.open(
        url,
        "_blank",
        "noopener,noreferrer"
      );

      window.setTimeout(
        () =>
          URL.revokeObjectURL(
            url
          ),
        60000
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : c.error
      );
    }
  }


  return (
    <main className="min-h-screen bg-[#F7FAF7]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6">
          <button
            type="button"
            onClick={() =>
              router.push(
                "/dashboard/admin"
              )
            }
            className="inline-flex items-center gap-2 font-black text-emerald-700"
          >
            <ArrowLeft className="h-4 w-4" />
            {c.back}
          </button>

          <div className="flex items-center gap-3">
            <span className="text-xs font-black uppercase text-slate-500">
              {c.language}
            </span>

            <LanguageSelector />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <section className="rounded-3xl bg-slate-950 p-7 text-white shadow-xl sm:p-9">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-emerald-300">
            <ShieldCheck className="h-4 w-4" />
            AGRIVA Admin Review
          </div>

          <h1 className="mt-5 text-4xl font-black">
            {c.title}
          </h1>

          <p className="mt-3 max-w-3xl text-slate-300">
            {c.subtitle}
          </p>

          <p className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-300/10 p-4 text-sm leading-6 text-amber-100">
            {c.warning}
          </p>
        </section>

        <section className="mt-7 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center gap-2">
            {[
              ["ALL", c.all],
              ["PENDING", c.pending],
              [
                "AGRIVA_VERIFIED",
                c.verified,
              ],
              ["REJECTED", c.rejected],
            ].map(
              ([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    setFilter(
                      value
                    )
                  }
                  className={`rounded-full px-4 py-2 text-sm font-black ${
                    filter === value
                      ? "bg-emerald-700 text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {label}
                </button>
              )
            )}
          </div>

          <button
            type="button"
            onClick={() =>
              void loadRows()
            }
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-black"
          >
            <RefreshCw className="h-4 w-4" />
            {c.refresh}
          </button>
        </section>

        {error && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 font-semibold text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex min-h-72 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-700" />
          </div>
        ) : rows.length === 0 ? (
          <div className="mt-7 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center font-semibold text-slate-500">
            {c.noRows}
          </div>
        ) : (
          <div className="mt-7 grid gap-6 xl:grid-cols-2">
            {rows.map((row) => (
              <article
                key={
                  row.verification_id ||
                  row.buyer_profile_id
                }
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">
                      {c.business}
                    </p>

                    <h2 className="mt-1 text-xl font-black">
                      {row.business_name}
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      {row.business_type} ·{" "}
                      {row.city},{" "}
                      {row.state}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1.5 text-xs font-black ${badgeClass(
                      row.status
                    )}`}
                  >
                    {row.status_label}
                  </span>
                </div>

                <div className="mt-5 grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
                  <div>
                    <p className="font-bold text-slate-500">
                      {c.document}
                    </p>

                    <p className="mt-1 font-semibold">
                      {
                        row.document_original_name ||
                        "—"
                      }
                    </p>

                    <p className="text-xs text-slate-500">
                      {
                        row.document_type ||
                        "—"
                      }
                    </p>
                  </div>

                  <div>
                    <p className="font-bold text-slate-500">
                      {c.submitted}
                    </p>

                    <p className="mt-1 font-semibold">
                      {row.submitted_at
                        ? new Date(
                            row.submitted_at
                          ).toLocaleString()
                        : "—"}
                    </p>
                  </div>
                </div>

                {row.document_original_name && (
                  <button
                    type="button"
                    onClick={() =>
                      void viewDocument(
                        row
                      )
                    }
                    className="mt-5 inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-800"
                  >
                    <Eye className="h-4 w-4" />
                    {c.view}
                  </button>
                )}

                {row.status ===
                  "PENDING" && (
                  <>
                    <label className="mt-5 block">
                      <span className="mb-2 block text-sm font-black">
                        {c.note}
                      </span>

                      <textarea
                        value={
                          row.verification_id
                            ? notes[
                                row.verification_id
                              ] ||
                              ""
                            : ""
                        }
                        onChange={(event) => {
                          if (
                            !row.verification_id
                          ) {
                            return;
                          }

                          setNotes(
                            (current) => ({
                              ...current,
                              [
                                row.verification_id as string
                              ]:
                                event
                                  .target
                                  .value,
                            })
                          );
                        }}
                        rows={3}
                        placeholder={
                          c.notePlaceholder
                        }
                        className="w-full rounded-xl border border-slate-300 p-3"
                      />
                    </label>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        disabled={
                          actionId ===
                          row.verification_id
                        }
                        onClick={() =>
                          void review(
                            row,
                            "AGRIVA_VERIFIED"
                          )
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 font-black text-white disabled:opacity-60"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        {c.approve}
                      </button>

                      <button
                        type="button"
                        disabled={
                          actionId ===
                          row.verification_id
                        }
                        onClick={() =>
                          void review(
                            row,
                            "REJECTED"
                          )
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 font-black text-white disabled:opacity-60"
                      >
                        <XCircle className="h-4 w-4" />
                        {c.reject}
                      </button>
                    </div>
                  </>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
