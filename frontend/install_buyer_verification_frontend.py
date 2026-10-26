from pathlib import Path
import re
import shutil

ROOT = Path(r"D:\AGRIVA\frontend")

BACKUP = Path(
    r"D:\AGRIVA\frontend_source_backups"
)

BACKUP.mkdir(
    parents=True,
    exist_ok=True,
)


# =========================================================
# BACKUP CURRENT FILES
# =========================================================

for rel in [
    "app/dashboard/buyer/page.tsx",
    "app/dashboard/admin/page.tsx",
    "app/dashboard/farmer/market/page.tsx",
    "app/marketplace/page.tsx",
]:
    src = ROOT / rel

    if src.exists():
        dst = (
            BACKUP /
            (
                rel.replace("/", "__")
                .replace("\\", "__")
                + ".before-buyer-verification-ui"
            )
        )

        shutil.copy2(
            src,
            dst,
        )


# =========================================================
# BUYER VERIFICATION PAGE
# =========================================================

buyer_page = (
    ROOT /
    "app/dashboard/buyer/verification/page.tsx"
)

buyer_page.parent.mkdir(
    parents=True,
    exist_ok=True,
)

buyer_page.write_text(
r'''"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import {
  ArrowLeft,
  BadgeCheck,
  FileCheck2,
  Loader2,
  ShieldCheck,
  Upload,
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


type Verification = {
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
    back: "Buyer Dashboard",
    title: "Buyer Verification",
    subtitle:
      "Submit a business document for AGRIVA platform-admin review.",
    scope:
      "AGRIVA Verified means AGRIVA reviewed the submitted platform document. It is not Government KYC, GST-authority verification, bank verification, credit scoring, or a payment/delivery guarantee.",
    business: "Business",
    location: "Location",
    status: "Verification status",
    documentType: "Document type",
    registration:
      "Business registration number",
    gstin: "GSTIN (optional)",
    document: "Business document",
    declaration:
      "I confirm that the submitted information belongs to my business and may be reviewed by AGRIVA admins.",
    submit: "Submit for review",
    submitting: "Submitting...",
    pending:
      "Your request is waiting for AGRIVA admin review.",
    verified:
      "AGRIVA has reviewed your submitted platform business document.",
    rejected:
      "The previous submission was not approved. You may submit updated information.",
    unverified:
      "No verification request has been submitted yet.",
    reviewNote: "Admin review note",
    fileLimit:
      "PDF, JPG or PNG · maximum 5 MB",
    success:
      "Verification request submitted successfully.",
    login:
      "Please login with a buyer account.",
    error:
      "Unable to load verification information.",
    required:
      "Select a document and accept the declaration.",
    language: "Language",
  },

  hi: {
    back: "खरीदार डैशबोर्ड",
    title: "खरीदार सत्यापन",
    subtitle:
      "AGRIVA प्लेटफ़ॉर्म एडमिन समीक्षा के लिए व्यवसाय दस्तावेज़ जमा करें।",
    scope:
      "AGRIVA Verified का अर्थ है कि AGRIVA ने प्लेटफ़ॉर्म पर जमा दस्तावेज़ की समीक्षा की है। यह सरकारी KYC, GST विभाग सत्यापन, बैंक सत्यापन, क्रेडिट स्कोर या भुगतान/डिलीवरी गारंटी नहीं है।",
    business: "व्यवसाय",
    location: "स्थान",
    status: "सत्यापन स्थिति",
    documentType: "दस्तावेज़ प्रकार",
    registration:
      "व्यवसाय पंजीकरण संख्या",
    gstin: "GSTIN (वैकल्पिक)",
    document: "व्यवसाय दस्तावेज़",
    declaration:
      "मैं पुष्टि करता हूँ कि दी गई जानकारी मेरे व्यवसाय से संबंधित है और AGRIVA एडमिन इसकी समीक्षा कर सकते हैं।",
    submit: "समीक्षा के लिए भेजें",
    submitting: "भेजा जा रहा है...",
    pending:
      "आपका अनुरोध AGRIVA एडमिन समीक्षा की प्रतीक्षा में है।",
    verified:
      "AGRIVA ने आपके जमा किए गए प्लेटफ़ॉर्म व्यवसाय दस्तावेज़ की समीक्षा की है।",
    rejected:
      "पिछला दस्तावेज़ स्वीकृत नहीं हुआ। आप नया दस्तावेज़ जमा कर सकते हैं।",
    unverified:
      "अभी तक कोई सत्यापन अनुरोध जमा नहीं किया गया है।",
    reviewNote: "एडमिन समीक्षा टिप्पणी",
    fileLimit:
      "PDF, JPG या PNG · अधिकतम 5 MB",
    success:
      "सत्यापन अनुरोध सफलतापूर्वक जमा हो गया।",
    login:
      "कृपया खरीदार खाते से लॉगिन करें।",
    error:
      "सत्यापन जानकारी लोड नहीं हो सकी।",
    required:
      "दस्तावेज़ चुनें और घोषणा स्वीकार करें।",
    language: "भाषा",
  },

  mr: {
    back: "खरेदीदार डॅशबोर्ड",
    title: "खरेदीदार पडताळणी",
    subtitle:
      "AGRIVA प्लॅटफॉर्म अॅडमिन पुनरावलोकनासाठी व्यवसाय दस्तऐवज सादर करा.",
    scope:
      "AGRIVA Verified म्हणजे AGRIVA ने प्लॅटफॉर्मवर सादर केलेल्या व्यवसाय दस्तऐवजाचे पुनरावलोकन केले आहे. हे सरकारी KYC, GST प्राधिकरण पडताळणी, बँक पडताळणी, क्रेडिट स्कोअर किंवा पेमेंट/डिलिव्हरी हमी नाही.",
    business: "व्यवसाय",
    location: "ठिकाण",
    status: "पडताळणी स्थिती",
    documentType: "दस्तऐवज प्रकार",
    registration:
      "व्यवसाय नोंदणी क्रमांक",
    gstin: "GSTIN (ऐच्छिक)",
    document: "व्यवसाय दस्तऐवज",
    declaration:
      "मी पुष्टी करतो की सादर केलेली माहिती माझ्या व्यवसायाशी संबंधित आहे आणि AGRIVA अॅडमिन तिचे पुनरावलोकन करू शकतात.",
    submit: "पुनरावलोकनासाठी पाठवा",
    submitting: "पाठवत आहे...",
    pending:
      "तुमचा अर्ज AGRIVA अॅडमिन पुनरावलोकनाच्या प्रतीक्षेत आहे.",
    verified:
      "AGRIVA ने तुमच्या प्लॅटफॉर्म व्यवसाय दस्तऐवजाचे पुनरावलोकन केले आहे.",
    rejected:
      "मागील अर्ज मंजूर झाला नाही. तुम्ही अद्ययावत दस्तऐवज पुन्हा सादर करू शकता.",
    unverified:
      "अजून कोणताही पडताळणी अर्ज सादर केलेला नाही.",
    reviewNote:
      "अॅडमिन पुनरावलोकन टिप्पणी",
    fileLimit:
      "PDF, JPG किंवा PNG · कमाल 5 MB",
    success:
      "पडताळणी अर्ज यशस्वीपणे सादर झाला.",
    login:
      "कृपया खरेदीदार खात्याने लॉगिन करा.",
    error:
      "पडताळणी माहिती लोड झाली नाही.",
    required:
      "दस्तऐवज निवडा आणि घोषणा स्वीकारा.",
    language: "भाषा",
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


function statusClass(
  value: string
) {
  if (
    value ===
    "AGRIVA_VERIFIED"
  ) {
    return (
      "border-emerald-200 " +
      "bg-emerald-50 " +
      "text-emerald-800"
    );
  }

  if (value === "PENDING") {
    return (
      "border-amber-200 " +
      "bg-amber-50 " +
      "text-amber-800"
    );
  }

  if (value === "REJECTED") {
    return (
      "border-red-200 " +
      "bg-red-50 " +
      "text-red-700"
    );
  }

  return (
    "border-slate-200 " +
    "bg-slate-50 " +
    "text-slate-700"
  );
}


export default function BuyerVerificationPage() {
  const router = useRouter();
  const locale = useLocale();

  const key =
    locale === "hi" ||
    locale === "mr"
      ? locale
      : "en";

  const c = COPY[key];

  const [
    verification,
    setVerification,
  ] = useState<
    Verification | null
  >(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  const [
    documentType,
    setDocumentType,
  ] = useState(
    "BUSINESS_REGISTRATION"
  );

  const [
    gstin,
    setGstin,
  ] = useState("");

  const [
    registration,
    setRegistration,
  ] = useState("");

  const [
    file,
    setFile,
  ] = useState<File | null>(
    null
  );

  const [
    declaration,
    setDeclaration,
  ] = useState(false);


  async function refresh() {
    const auth = token();

    if (!auth) {
      router.replace("/login");
      return;
    }

    const response = await fetch(
      `${API_URL}/api/buyer-verification/me`,
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

    const result =
      body as Verification;

    setVerification(result);

    setGstin(
      result.gstin || ""
    );

    setRegistration(
      result
        .business_registration_number ||
        ""
    );
  }


  useEffect(() => {
    const auth = token();

    if (!auth) {
      router.replace("/login");
      return;
    }

    fetch(
      `${API_URL}/api/buyer-verification/me`,
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

        return (
          body as Verification
        );
      })
      .then((result) => {
        setVerification(
          result
        );

        setGstin(
          result.gstin || ""
        );

        setRegistration(
          result
            .business_registration_number ||
            ""
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
  }, [router, c.error]);


  async function submit(
    event: FormEvent
  ) {
    event.preventDefault();

    const auth = token();

    if (!auth) {
      router.replace("/login");
      return;
    }

    if (
      !file ||
      !declaration
    ) {
      setError(c.required);
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const form =
        new FormData();

      form.append(
        "document_type",
        documentType
      );

      form.append(
        "gstin",
        gstin.trim()
      );

      form.append(
        "business_registration_number",
        registration.trim()
      );

      form.append(
        "declaration_accepted",
        "true"
      );

      form.append(
        "document",
        file
      );

      const response =
        await fetch(
          `${API_URL}/api/buyer-verification/submit`,
          {
            method: "POST",
            headers: {
              Authorization:
                `Bearer ${auth}`,
            },
            body: form,
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

      setSuccess(
        c.success
      );

      setFile(null);
      setDeclaration(false);

      await refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : c.error
      );
    } finally {
      setSubmitting(false);
    }
  }


  function statusMessage() {
    if (
      verification?.status ===
      "AGRIVA_VERIFIED"
    ) {
      return c.verified;
    }

    if (
      verification?.status ===
      "PENDING"
    ) {
      return c.pending;
    }

    if (
      verification?.status ===
      "REJECTED"
    ) {
      return c.rejected;
    }

    return c.unverified;
  }


  const canSubmit =
    verification?.status !==
      "PENDING" &&
    verification?.status !==
      "AGRIVA_VERIFIED";


  return (
    <main className="min-h-screen bg-[#F7FAF7] text-slate-900">
      <header className="border-b border-emerald-100 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6">
          <button
            type="button"
            onClick={() =>
              router.push(
                "/dashboard/buyer"
              )
            }
            className="inline-flex items-center gap-2 font-black text-emerald-700"
          >
            <ArrowLeft className="h-4 w-4" />
            {c.back}
          </button>

          <div className="flex items-center gap-3">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500">
              {c.language}
            </span>

            <LanguageSelector />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-950 p-7 text-white shadow-xl sm:p-9">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-emerald-100">
            <ShieldCheck className="h-4 w-4" />
            AGRIVA Platform Trust
          </div>

          <h1 className="mt-5 text-4xl font-black">
            {c.title}
          </h1>

          <p className="mt-3 max-w-3xl leading-7 text-emerald-50/90">
            {c.subtitle}
          </p>

          <div className="mt-6 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm leading-6 text-amber-50">
            {c.scope}
          </div>
        </section>

        {loading ? (
          <div className="flex min-h-72 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-700" />
          </div>
        ) : (
          <div className="mt-8 grid gap-7 lg:grid-cols-[0.9fr_1.1fr]">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-xl font-black">
                <BadgeCheck className="h-5 w-5 text-emerald-700" />
                {c.status}
              </h2>

              {verification && (
                <>
                  <div
                    className={`mt-5 rounded-2xl border p-5 ${statusClass(
                      verification.status
                    )}`}
                  >
                    <p className="text-xl font-black">
                      {
                        verification.status_label
                      }
                    </p>

                    <p className="mt-2 text-sm leading-6">
                      {statusMessage()}
                    </p>
                  </div>

                  <dl className="mt-6 space-y-4 text-sm">
                    <div>
                      <dt className="font-bold text-slate-500">
                        {c.business}
                      </dt>

                      <dd className="mt-1 text-base font-black">
                        {
                          verification.business_name
                        }
                      </dd>

                      <dd className="text-slate-500">
                        {
                          verification.business_type
                        }
                      </dd>
                    </div>

                    <div>
                      <dt className="font-bold text-slate-500">
                        {c.location}
                      </dt>

                      <dd className="mt-1 font-semibold">
                        {
                          verification.city
                        }
                        ,{" "}
                        {
                          verification.state
                        }
                      </dd>
                    </div>

                    {verification.document_original_name && (
                      <div>
                        <dt className="font-bold text-slate-500">
                          {c.document}
                        </dt>

                        <dd className="mt-1 font-semibold">
                          {
                            verification.document_original_name
                          }
                        </dd>
                      </div>
                    )}

                    {verification.review_note && (
                      <div className="rounded-xl bg-slate-50 p-4">
                        <dt className="font-bold">
                          {c.reviewNote}
                        </dt>

                        <dd className="mt-2 text-slate-600">
                          {
                            verification.review_note
                          }
                        </dd>
                      </div>
                    )}
                  </dl>
                </>
              )}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <FileCheck2 className="h-5 w-5 text-emerald-700" />

                <h2 className="text-xl font-black">
                  {c.submit}
                </h2>
              </div>

              {!canSubmit ? (
                <div className="mt-6 rounded-2xl bg-slate-50 p-6 text-sm leading-7 text-slate-600">
                  {statusMessage()}
                </div>
              ) : (
                <form
                  onSubmit={submit}
                  className="mt-6 space-y-5"
                >
                  <label className="block">
                    <span className="mb-2 block text-sm font-black">
                      {c.documentType}
                    </span>

                    <select
                      value={documentType}
                      onChange={(event) =>
                        setDocumentType(
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                    >
                      <option value="BUSINESS_REGISTRATION">
                        Business Registration
                      </option>

                      <option value="GST_CERTIFICATE">
                        GST Certificate
                      </option>

                      <option value="FPO_REGISTRATION">
                        FPO Registration
                      </option>

                      <option value="OTHER_BUSINESS_DOCUMENT">
                        Other Business Document
                      </option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-black">
                      {c.registration}
                    </span>

                    <input
                      value={registration}
                      onChange={(event) =>
                        setRegistration(
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border border-slate-300 px-4 py-3"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-black">
                      {c.gstin}
                    </span>

                    <input
                      value={gstin}
                      onChange={(event) =>
                        setGstin(
                          event.target.value
                        )
                      }
                      maxLength={15}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 uppercase"
                    />
                  </label>

                  <label className="block rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/50 p-5">
                    <span className="flex items-center gap-2 font-black text-emerald-900">
                      <Upload className="h-5 w-5" />
                      {c.document}
                    </span>

                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                      onChange={(event) =>
                        setFile(
                          event.target.files?.[0] ||
                            null
                        )
                      }
                      className="mt-4 block w-full text-sm"
                    />

                    <span className="mt-2 block text-xs text-slate-500">
                      {c.fileLimit}
                    </span>
                  </label>

                  <label className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
                    <input
                      type="checkbox"
                      checked={declaration}
                      onChange={(event) =>
                        setDeclaration(
                          event.target.checked
                        )
                      }
                      className="mt-1 h-4 w-4"
                    />

                    <span className="text-sm leading-6 text-slate-700">
                      {c.declaration}
                    </span>
                  </label>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 font-black text-white hover:bg-emerald-800 disabled:opacity-60"
                  >
                    {submitting && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}

                    {submitting
                      ? c.submitting
                      : c.submit}
                  </button>
                </form>
              )}

              {success && (
                <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
                  {success}
                </div>
              )}

              {error && (
                <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
                  {error}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
''',
    encoding="utf-8",
    newline="\n",
)

print(
    "CREATED: buyer verification page"
)


# =========================================================
# ADMIN VERIFICATION PAGE
# =========================================================

admin_page = (
    ROOT /
    "app/dashboard/admin/buyer-verification/page.tsx"
)

admin_page.parent.mkdir(
    parents=True,
    exist_ok=True,
)

admin_page.write_text(
r'''"use client";

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
''',
    encoding="utf-8",
    newline="\n",
)

print(
    "CREATED: admin buyer verification page"
)


# =========================================================
# COMMON HELPERS FOR FARMER UI
# =========================================================

verification_helpers = r'''
function buyerVerificationLabel(
  status: string,
  locale: string
) {
  if (status === "AGRIVA_VERIFIED") {
    return "AGRIVA Verified";
  }

  if (status === "PENDING") {
    if (locale === "hi") return "AGRIVA समीक्षा लंबित";
    if (locale === "mr") return "AGRIVA पुनरावलोकन प्रलंबित";
    return "AGRIVA review pending";
  }

  if (status === "REJECTED") {
    if (locale === "hi") return "AGRIVA समीक्षा अस्वीकृत";
    if (locale === "mr") return "AGRIVA पुनरावलोकन नाकारले";
    return "AGRIVA review rejected";
  }

  if (locale === "hi") return "AGRIVA द्वारा सत्यापित नहीं";
  if (locale === "mr") return "AGRIVA कडून पडताळलेले नाही";
  return "Not verified by AGRIVA";
}


function buyerVerificationNote(
  status: string,
  locale: string
) {
  if (status === "AGRIVA_VERIFIED") {
    if (locale === "hi") {
      return "AGRIVA एडमिन ने जमा प्लेटफ़ॉर्म व्यवसाय दस्तावेज़ की समीक्षा की है। यह सरकारी KYC या बैंक सत्यापन नहीं है।";
    }

    if (locale === "mr") {
      return "AGRIVA अॅडमिनने सादर केलेल्या प्लॅटफॉर्म व्यवसाय दस्तऐवजाचे पुनरावलोकन केले आहे. हे सरकारी KYC किंवा बँक पडताळणी नाही.";
    }

    return "AGRIVA admin reviewed the submitted platform business document. This is not Government KYC or bank verification.";
  }

  if (status === "PENDING") {
    if (locale === "hi") {
      return "दस्तावेज़ AGRIVA एडमिन समीक्षा की प्रतीक्षा में हैं। स्वतंत्र सरकारी/KYC सत्यापन का दावा नहीं है।";
    }

    if (locale === "mr") {
      return "दस्तऐवज AGRIVA अॅडमिन पुनरावलोकनाच्या प्रतीक्षेत आहेत. स्वतंत्र सरकारी/KYC पडताळणीचा दावा नाही.";
    }

    return "Documents are awaiting AGRIVA admin review. No Government/KYC verification is claimed.";
  }

  if (locale === "hi") {
    return "इस खरीदार के लिए स्वतंत्र सरकारी, KYC या बैंक सत्यापन का दावा नहीं किया गया है।";
  }

  if (locale === "mr") {
    return "या खरेदीदारासाठी स्वतंत्र सरकारी, KYC किंवा बँक पडताळणीचा दावा केलेला नाही.";
  }

  return "No Government, KYC or bank verification is claimed for this buyer.";
}

'''


# =========================================================
# FARMER MARKET PAGE
# =========================================================

farmer_path = (
    ROOT /
    "app/dashboard/farmer/market/page.tsx"
)

farmer = farmer_path.read_text(
    encoding="utf-8-sig"
)

if (
    "agriva_verified: boolean;"
    not in farmer
):
    farmer = farmer.replace(
'''  buyer_rating: number | null;
};''',
'''  buyer_rating: number | null;

  verification_status: string;
  verification_label: string;
  verification_note: string;
  agriva_verified: boolean;
};''',
        1,
    )


if (
    "function buyerVerificationLabel("
    not in farmer
):
    marker = (
        "export default function"
    )

    index = farmer.find(
        marker
    )

    if index == -1:
        raise RuntimeError(
            "Farmer market export marker not found."
        )

    farmer = (
        farmer[:index]
        + verification_helpers
        + farmer[index:]
    )


farmer_name = (
    '<h3 className="mt-1 text-lg font-black '
    'text-[#0F172A]">{match.buyer_name}</h3>'
)

if (
    "buyerVerificationLabel("
    in farmer
    and "match.agriva_verified ?" not in farmer
):
    if farmer_name not in farmer:
        raise RuntimeError(
            "Farmer buyer name anchor not found."
        )

    farmer = farmer.replace(
        farmer_name,
        farmer_name
        + r'''
                      <span
                        className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-black ${
                          match.agriva_verified
                            ? "bg-emerald-100 text-emerald-800"
                            : match.verification_status === "PENDING"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {buyerVerificationLabel(
                          match.verification_status,
                          locale
                        )}
                      </span>''',
        1,
    )


old_claim = (
    '<p className="mt-3 text-xs text-slate-500">'
    '{t("noVerificationClaim")}</p>'
)

if old_claim in farmer:
    farmer = farmer.replace(
        old_claim,
r'''<p className="mt-3 text-xs leading-5 text-slate-500">
                    {buyerVerificationNote(
                      match.verification_status,
                      locale
                    )}
                  </p>''',
        1,
    )


farmer_path.write_text(
    farmer,
    encoding="utf-8",
    newline="\n",
)

print(
    "UPDATED: farmer market verification badge"
)


# =========================================================
# MAIN MARKETPLACE
# =========================================================

market_path = (
    ROOT /
    "app/marketplace/page.tsx"
)

market = market_path.read_text(
    encoding="utf-8-sig"
)

if (
    "agriva_verified: boolean;"
    not in market
):
    type_anchor = (
        "  buyer_rating: number | null;\n"
        "  breakdown: BuyerMatchBreakdown;\n"
        "};"
    )

    if type_anchor not in market:
        raise RuntimeError(
            "Marketplace BuyerMatch type anchor not found."
        )

    market = market.replace(
        type_anchor,
'''  buyer_rating: number | null;

  verification_status: string;
  verification_label: string;
  verification_note: string;
  agriva_verified: boolean;

  breakdown: BuyerMatchBreakdown;
};''',
        1,
    )


if (
    "function buyerVerificationLabel("
    not in market
):
    marker = (
        "export default function"
    )

    index = market.find(
        marker
    )

    if index == -1:
        raise RuntimeError(
            "Marketplace export marker not found."
        )

    market = (
        market[:index]
        + verification_helpers
        + market[index:]
    )


if (
    "match.agriva_verified"
    not in market
):
    pattern = re.compile(
        r'(<h3\s+className="text-xl font-bold '
        r'text-slate-900">\s*'
        r'\{match\.buyer_name\}\s*'
        r'</h3>)',
        re.DOTALL,
    )

    replacement = r'''\1

                                  <span
                                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${
                                      match.agriva_verified
                                        ? "bg-emerald-100 text-emerald-800"
                                        : match.verification_status === "PENDING"
                                          ? "bg-amber-100 text-amber-800"
                                          : "bg-slate-100 text-slate-600"
                                    }`}
                                  >
                                    {buyerVerificationLabel(
                                      match.verification_status,
                                      locale
                                    )}
                                  </span>

                                  <span className="basis-full text-xs leading-5 text-slate-500">
                                    {buyerVerificationNote(
                                      match.verification_status,
                                      locale
                                    )}
                                  </span>'''

    market, count = (
        pattern.subn(
            replacement,
            market,
            count=1,
        )
    )

    if count != 1:
        raise RuntimeError(
            "Marketplace buyer heading anchor not found."
        )


market_path.write_text(
    market,
    encoding="utf-8",
    newline="\n",
)

print(
    "UPDATED: main marketplace verification badge"
)


# =========================================================
# BUYER DASHBOARD LINK
# =========================================================

buyer_dashboard_path = (
    ROOT /
    "app/dashboard/buyer/page.tsx"
)

buyer_dashboard = (
    buyer_dashboard_path
    .read_text(
        encoding="utf-8-sig"
    )
)

if (
    "/dashboard/buyer/verification"
    not in buyer_dashboard
):
    pattern = re.compile(
        r'(<p\s+className="mt-2\s+text-slate-500">'
        r'\s*Marketplace,\s*orders,\s*payments,\s*'
        r'transport\s+and\s*'
        r'Phase\s+11\s+order\s+tracking\.\s*'
        r'</p>)',
        re.DOTALL,
    )

    replacement = r'''\1

          <a
            href="/dashboard/buyer/verification"
            className="mt-5 inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-black text-emerald-800 transition hover:bg-emerald-100"
          >
            ✓ Buyer Verification
          </a>'''

    buyer_dashboard, count = (
        pattern.subn(
            replacement,
            buyer_dashboard,
            count=1,
        )
    )

    if count != 1:
        raise RuntimeError(
            "Buyer dashboard intro anchor not found."
        )


buyer_dashboard_path.write_text(
    buyer_dashboard,
    encoding="utf-8",
    newline="\n",
)

print(
    "UPDATED: buyer dashboard verification link"
)


# =========================================================
# ADMIN DASHBOARD LINK
# =========================================================

admin_dashboard_path = (
    ROOT /
    "app/dashboard/admin/page.tsx"
)

admin_dashboard = (
    admin_dashboard_path
    .read_text(
        encoding="utf-8-sig"
    )
)

admin_link_added = False

if (
    "/dashboard/admin/buyer-verification"
    in admin_dashboard
):
    admin_link_added = True

else:
    grievance_pos = (
        admin_dashboard.find(
            "/dashboard/admin/grievances"
        )
    )

    if grievance_pos != -1:
        candidates = []

        for closing in [
            "</button>",
            "</a>",
        ]:
            pos = (
                admin_dashboard.find(
                    closing,
                    grievance_pos,
                )
            )

            if pos != -1:
                candidates.append(
                    (
                        pos,
                        closing,
                    )
                )

        if candidates:
            close_pos, closing = min(
                candidates,
                key=lambda item:
                    item[0],
            )

            insert_at = (
                close_pos +
                len(closing)
            )

            admin_link = r'''

            <a
              href="/dashboard/admin/buyer-verification"
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-black text-emerald-800 hover:bg-emerald-100"
            >
              ✓ Buyer Verification
            </a>'''

            admin_dashboard = (
                admin_dashboard[:insert_at]
                + admin_link
                + admin_dashboard[insert_at:]
            )

            admin_link_added = True


admin_dashboard_path.write_text(
    admin_dashboard,
    encoding="utf-8",
    newline="\n",
)

print(
    "ADMIN DASHBOARD LINK:",
    (
        "ADDED"
        if admin_link_added
        else (
            "NOT ADDED - standalone "
            "admin page still available"
        )
    ),
)


print()
print(
    "AGRIVA BUYER VERIFICATION "
    "FRONTEND INSTALLED"
)

print(
    "Buyer route: "
    "/dashboard/buyer/verification"
)

print(
    "Admin route: "
    "/dashboard/admin/buyer-verification"
)

print(
    "Marketplace match score changed: NO"
)

print(
    "Government/KYC claim added: NO"
)
