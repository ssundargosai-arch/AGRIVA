"use client";

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
