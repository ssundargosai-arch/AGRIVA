"use client";

import {
  ArrowLeft,
  Loader2,
  MapPin,
  Package,
  Plus,
  RefreshCw,
  Sprout,
  Upload,
  Users,
  Volume2,
} from "lucide-react";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {useRouter} from "next/navigation";
import {useLocale, useTranslations} from "next-intl";

import LanguageSelector from "@/components/LanguageSelector";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000"
).replace(/\/$/, "");

type UserData = {
  role?: string;
};

type Group = {
  id: string;
  name: string;
  district: string;
  state: string;
  description?: string | null;
  status: string;
  member_count: number;
  created_at: string;
};

type Listing = {
  id: string;
  crop: string;
  quantity_kg: number;
  expected_price_per_kg: number;
  quality_grade?: string | null;
  location?: string | null;
  status: string;
};

type Contribution = {
  id: string;
  farmer_profile_id: string;
  farmer_name: string;
  listing_id: string;
  quantity_kg: number;
  listing_available_quantity_kg: number;
  status: string;
  created_at: string;
};

type Lot = {
  id: string;
  group_id: string;
  group_name: string;
  crop_name: string;
  quality_grade?: string | null;
  target_price_per_kg: number;
  location?: string | null;
  notes?: string | null;
  status: string;
  aggregated_quantity_kg: number;
  contribution_count: number;
  inventory_reserved: boolean;
  created_at: string;
  published_at?: string | null;
  contributions: Contribution[];
};

function localeName(locale: string) {
  return locale === "mr"
    ? "mr-IN"
    : locale === "hi"
      ? "hi-IN"
      : "en-IN";
}

function numberText(value: number, locale: string) {
  return new Intl.NumberFormat(localeName(locale), {
    maximumFractionDigits: 2,
  }).format(value);
}

function money(value: number, locale: string) {
  return new Intl.NumberFormat(localeName(locale), {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function errorText(body: unknown, fallback: string) {
  if (
    body &&
    typeof body === "object" &&
    "detail" in body
  ) {
    const detail = (body as {detail?: unknown}).detail;

    if (typeof detail === "string") {
      return detail;
    }

    if (
      detail &&
      typeof detail === "object" &&
      "message" in detail &&
      typeof (detail as {message?: unknown}).message ===
        "string"
    ) {
      return (detail as {message: string}).message;
    }
  }

  return fallback;
}

export default function FarmerFpoPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("sihFpo");

  const [groups, setGroups] = useState<Group[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [memberGroupIds, setMemberGroupIds] =
    useState<Set<string>>(new Set());

  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [groupName, setGroupName] = useState("");
  const [groupDistrict, setGroupDistrict] =
    useState("Prayagraj");
  const [groupState, setGroupState] =
    useState("Uttar Pradesh");
  const [groupDescription, setGroupDescription] =
    useState("");

  const [lotGroupId, setLotGroupId] = useState("");
  const [lotCrop, setLotCrop] = useState("Wheat");
  const [lotGrade, setLotGrade] = useState("A");
  const [lotRate, setLotRate] = useState("");
  const [lotLocation, setLotLocation] = useState("");
  const [lotNotes, setLotNotes] = useState("");

  const [contributionLot, setContributionLot] =
    useState<Lot | null>(null);
  const [contributionListingId, setContributionListingId] =
    useState("");
  const [contributionQuantity, setContributionQuantity] =
    useState("");

  const loadData = useCallback(async () => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      router.replace("/login");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const meResponse = await fetch(
        `${API_URL}/api/auth/me`,
        {headers, cache: "no-store"}
      );
      const me = await meResponse
        .json()
        .catch(() => null) as UserData | null;

      if (
        !meResponse.ok ||
        String(me?.role || "").toUpperCase() !== "FARMER"
      ) {
        throw new Error(t("farmerOnly"));
      }

      const [groupsResponse, lotsResponse, listingsResponse] =
        await Promise.all([
          fetch(`${API_URL}/api/fpo/groups`, {
            headers,
            cache: "no-store",
          }),
          fetch(`${API_URL}/api/fpo/lots`, {
            headers,
            cache: "no-store",
          }),
          fetch(`${API_URL}/api/marketplace/my-listings`, {
            headers,
            cache: "no-store",
          }),
        ]);

      const groupsBody = await groupsResponse
        .json()
        .catch(() => null);
      const lotsBody = await lotsResponse
        .json()
        .catch(() => null);
      const listingsBody = await listingsResponse
        .json()
        .catch(() => null);

      if (!groupsResponse.ok) {
        throw new Error(
          errorText(groupsBody, t("loadError"))
        );
      }
      if (!lotsResponse.ok) {
        throw new Error(
          errorText(lotsBody, t("loadError"))
        );
      }
      if (!listingsResponse.ok) {
        throw new Error(
          errorText(listingsBody, t("loadError"))
        );
      }

      const groupRows = groupsBody as Group[];
      setGroups(groupRows);
      setLots(lotsBody as Lot[]);
      setListings(
        (listingsBody as Listing[]).filter(
          (item) =>
            item.status === "active" &&
            Number(item.quantity_kg) > 0
        )
      );

      const membershipChecks = await Promise.all(
        groupRows.map(async (group) => {
          const response = await fetch(
            `${API_URL}/api/fpo/groups/${group.id}/members`,
            {headers, cache: "no-store"}
          );

          return response.ok ? group.id : null;
        })
      );

      const joined = new Set(
        membershipChecks.filter(
          (value): value is string => Boolean(value)
        )
      );
      setMemberGroupIds(joined);

      const firstMemberGroup = groupRows.find((group) =>
        joined.has(group.id)
      );
      setLotGroupId((current) =>
        current || firstMemberGroup?.id || ""
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("loadError")
      );
    } finally {
      setLoading(false);
    }
  }, [router, t]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const memberGroups = useMemo(
    () => groups.filter((group) => memberGroupIds.has(group.id)),
    [groups, memberGroupIds]
  );

  const matchingListings = useMemo(() => {
    if (!contributionLot) {
      return [];
    }

    const lotCropName =
      contributionLot.crop_name.trim().toLowerCase();
    const lotGrade =
      contributionLot.quality_grade?.trim().toLowerCase();

    return listings.filter((listing) => {
      const cropMatches =
        listing.crop.trim().toLowerCase() === lotCropName;
      const gradeMatches =
        !lotGrade ||
        listing.quality_grade?.trim().toLowerCase() ===
          lotGrade;

      return cropMatches && gradeMatches;
    });
  }, [contributionLot, listings]);

  async function createGroup(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }

    if (
      groupName.trim().length < 3 ||
      groupDistrict.trim().length < 2 ||
      groupState.trim().length < 2
    ) {
      setError(t("invalidGroup"));
      return;
    }

    if (!window.confirm(t("createGroupConfirm"))) {
      return;
    }

    setWorking("create-group");
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `${API_URL}/api/fpo/groups`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: groupName.trim(),
            district: groupDistrict.trim(),
            state: groupState.trim(),
            description:
              groupDescription.trim() || null,
          }),
        }
      );

      const body = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          errorText(body, t("actionError"))
        );
      }

      setGroupName("");
      setGroupDescription("");
      setSuccess(t("groupCreated"));
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("actionError")
      );
    } finally {
      setWorking("");
    }
  }

  async function joinGroup(group: Group) {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }

    if (
      !window.confirm(
        t("joinConfirm", {group: group.name})
      )
    ) {
      return;
    }

    setWorking(`join-${group.id}`);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `${API_URL}/api/fpo/groups/${group.id}/join`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const body = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          errorText(body, t("actionError"))
        );
      }

      setSuccess(t("joined"));
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("actionError")
      );
    } finally {
      setWorking("");
    }
  }

  async function createLot(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }

    const rate = Number(lotRate);

    if (
      !lotGroupId ||
      lotCrop.trim().length < 2 ||
      !Number.isFinite(rate) ||
      rate <= 0
    ) {
      setError(t("invalidLot"));
      return;
    }

    if (
      !window.confirm(
        t("createLotConfirm", {
          crop: lotCrop.trim(),
          rate: money(rate, locale),
        })
      )
    ) {
      return;
    }

    setWorking("create-lot");
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `${API_URL}/api/fpo/lots`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            group_id: lotGroupId,
            crop_name: lotCrop.trim(),
            quality_grade: lotGrade.trim() || null,
            target_price_per_kg: rate,
            location: lotLocation.trim() || null,
            notes: lotNotes.trim() || null,
          }),
        }
      );

      const body = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          errorText(body, t("actionError"))
        );
      }

      setLotRate("");
      setLotNotes("");
      setSuccess(t("lotCreated"));
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("actionError")
      );
    } finally {
      setWorking("");
    }
  }

  function openContribution(lot: Lot) {
    setContributionLot(lot);
    setContributionListingId("");
    setContributionQuantity("");
    setError("");
    setSuccess("");

    window.setTimeout(() => {
      document
        .getElementById("fpo-contribution-form")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
    }, 50);
  }

  async function contribute(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const token = localStorage.getItem("access_token");
    if (!token || !contributionLot) {
      router.replace("/login");
      return;
    }

    const quantity = Number(contributionQuantity);
    const selectedListing = matchingListings.find(
      (listing) => listing.id === contributionListingId
    );

    if (
      !selectedListing ||
      !Number.isFinite(quantity) ||
      quantity <= 0 ||
      quantity > selectedListing.quantity_kg
    ) {
      setError(t("invalidContribution"));
      return;
    }

    if (
      !window.confirm(
        t("contributionConfirm", {
          quantity: numberText(quantity, locale),
          crop: contributionLot.crop_name,
        })
      )
    ) {
      return;
    }

    setWorking(`contribute-${contributionLot.id}`);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `${API_URL}/api/fpo/lots/${contributionLot.id}/contribute`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            listing_id: selectedListing.id,
            quantity_kg: quantity,
          }),
        }
      );

      const body = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          errorText(body, t("actionError"))
        );
      }

      setContributionLot(null);
      setContributionListingId("");
      setContributionQuantity("");
      setSuccess(t("contributionAdded"));
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("actionError")
      );
    } finally {
      setWorking("");
    }
  }

  async function publishLot(lot: Lot) {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }

    if (
      !window.confirm(
        t("publishConfirm", {
          crop: lot.crop_name,
          quantity: numberText(
            lot.aggregated_quantity_kg,
            locale
          ),
        })
      )
    ) {
      return;
    }

    setWorking(`publish-${lot.id}`);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `${API_URL}/api/fpo/lots/${lot.id}/publish`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const body = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          errorText(body, t("actionError"))
        );
      }

      setSuccess(t("published"));
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("actionError")
      );
    } finally {
      setWorking("");
    }
  }

  function speakLot(lot: Lot) {
    if (
      typeof window === "undefined" ||
      !("speechSynthesis" in window)
    ) {
      setError(t("speechUnavailable"));
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(
      t("readLot", {
        group: lot.group_name,
        crop: lot.crop_name,
        quantity: numberText(
          lot.aggregated_quantity_kg,
          locale
        ),
        rate: money(
          lot.target_price_per_kg,
          locale
        ),
        status: t(`status.${lot.status}`),
      })
    );
    utterance.lang = localeName(locale);
    window.speechSynthesis.speak(utterance);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f8f4]">
        <div className="flex items-center gap-3 rounded-2xl bg-white px-6 py-4 font-semibold text-slate-700 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-emerald-700" />
          {t("loading")}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f8f4] pb-16 text-slate-950">
      <style jsx global>{`
        .agriva-global-theme-toggle {
          display: none !important;
        }
      `}</style>

      <header className="sticky top-0 z-40 border-b border-emerald-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <button
            type="button"
            onClick={() => router.push("/dashboard/farmer")}
            className="flex items-center gap-3"
          >
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-700 text-white">
              <Users className="h-6 w-6" />
            </span>
            <span className="text-left">
              <span className="block text-lg font-black">
                {t("farmerTitle")}
              </span>
              <span className="block text-xs text-slate-500">
                {t("farmerSubtitle")}
              </span>
            </span>
          </button>

          <div className="flex items-center gap-2">
            <LanguageSelector />
            <button
              type="button"
              onClick={() => router.push("/dashboard/farmer")}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">
                {t("dashboard")}
              </span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6">
        <section className="rounded-[2rem] bg-emerald-800 p-6 text-white shadow-xl sm:p-10">
          <p className="text-xs font-black tracking-[0.22em] text-emerald-100">
            AGRIVA FPO AGGREGATION
          </p>
          <h1 className="mt-3 max-w-4xl text-3xl font-black sm:text-5xl">
            {t("farmerHero")}
          </h1>
          <p className="mt-4 max-w-3xl leading-7 text-emerald-50">
            {t("farmerHeroText")}
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Summary
              label={t("groups")}
              value={numberText(groups.length, locale)}
            />
            <Summary
              label={t("myGroups")}
              value={numberText(memberGroups.length, locale)}
            />
            <Summary
              label={t("myVisibleLots")}
              value={numberText(lots.length, locale)}
            />
          </div>
        </section>

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
          <strong>{t("softPledgeTitle")}</strong>{" "}
          {t("softPledgeText")}
        </section>

        {(error || success) && (
          <section
            className={`rounded-2xl border px-5 py-4 text-sm font-semibold ${
              error
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}
          >
            {error || success}
          </section>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => void loadData()}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold"
          >
            <RefreshCw className="h-4 w-4" />
            {t("refresh")}
          </button>
        </div>

        <section>
          <h2 className="text-2xl font-black">
            {t("availableGroups")}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {t("availableGroupsText")}
          </p>

          {groups.length === 0 ? (
            <Empty text={t("noGroups")} />
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {groups.map((group) => {
                const joined = memberGroupIds.has(group.id);

                return (
                  <article
                    key={group.id}
                    className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-black">
                          {group.name}
                        </h3>
                        <p className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                          <MapPin className="h-4 w-4" />
                          {group.district}, {group.state}
                        </p>
                      </div>
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                        {joined
                          ? t("member")
                          : t("openGroup")}
                      </span>
                    </div>

                    <p className="mt-4 text-sm leading-6 text-slate-600">
                      {group.description || t("noDescription")}
                    </p>
                    <p className="mt-4 text-sm font-bold text-slate-700">
                      {t("members")}:{" "}
                      {numberText(group.member_count, locale)}
                    </p>

                    {!joined && (
                      <button
                        type="button"
                        disabled={working === `join-${group.id}`}
                        onClick={() => void joinGroup(group)}
                        className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-4 py-3 font-black text-white disabled:opacity-60"
                      >
                        {working === `join-${group.id}` ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Users className="h-5 w-5" />
                        )}
                        {t("joinGroup")}
                      </button>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <form
            onSubmit={createGroup}
            className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <Plus className="h-6 w-6 text-emerald-700" />
              <h2 className="text-2xl font-black">
                {t("createGroup")}
              </h2>
            </div>

            <div className="mt-5 grid gap-4">
              <Field
                label={t("groupName")}
                value={groupName}
                onChange={setGroupName}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label={t("district")}
                  value={groupDistrict}
                  onChange={setGroupDistrict}
                />
                <Field
                  label={t("state")}
                  value={groupState}
                  onChange={setGroupState}
                />
              </div>
              <label>
                <span className="mb-2 block text-sm font-black">
                  {t("descriptionOptional")}
                </span>
                <textarea
                  value={groupDescription}
                  onChange={(event) =>
                    setGroupDescription(event.target.value)
                  }
                  rows={3}
                  maxLength={1000}
                  className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500"
                />
              </label>

              <button
                type="submit"
                disabled={working === "create-group"}
                className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-5 py-3.5 font-black text-white disabled:opacity-60"
              >
                {working === "create-group" ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Users className="h-5 w-5" />
                )}
                {t("createGroup")}
              </button>
            </div>
          </form>

          <form
            onSubmit={createLot}
            className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <Package className="h-6 w-6 text-emerald-700" />
              <h2 className="text-2xl font-black">
                {t("createLot")}
              </h2>
            </div>

            <div className="mt-5 grid gap-4">
              <label>
                <span className="mb-2 block text-sm font-black">
                  {t("group")}
                </span>
                <select
                  value={lotGroupId}
                  onChange={(event) =>
                    setLotGroupId(event.target.value)
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
                >
                  <option value="">
                    {t("selectGroup")}
                  </option>
                  {memberGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label={t("crop")}
                  value={lotCrop}
                  onChange={setLotCrop}
                />
                <Field
                  label={t("quality")}
                  value={lotGrade}
                  onChange={setLotGrade}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label={t("targetRate")}
                  value={lotRate}
                  onChange={setLotRate}
                  inputMode="decimal"
                />
                <Field
                  label={t("location")}
                  value={lotLocation}
                  onChange={setLotLocation}
                />
              </div>

              <label>
                <span className="mb-2 block text-sm font-black">
                  {t("notesOptional")}
                </span>
                <textarea
                  value={lotNotes}
                  onChange={(event) =>
                    setLotNotes(event.target.value)
                  }
                  rows={3}
                  maxLength={1000}
                  className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500"
                />
              </label>

              <button
                type="submit"
                disabled={
                  working === "create-lot" ||
                  memberGroups.length === 0
                }
                className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-5 py-3.5 font-black text-white disabled:opacity-60"
              >
                {working === "create-lot" ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Plus className="h-5 w-5" />
                )}
                {t("createLot")}
              </button>
            </div>
          </form>
        </section>

        <section>
          <h2 className="text-2xl font-black">
            {t("aggregationLots")}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {t("aggregationLotsText")}
          </p>

          {lots.length === 0 ? (
            <Empty text={t("noLots")} />
          ) : (
            <div className="mt-5 space-y-5">
              {lots.map((lot) => (
                <article
                  key={lot.id}
                  className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-2xl font-black">
                          {lot.crop_name}
                        </h3>
                        <Status
                          label={t(`status.${lot.status}`)}
                          status={lot.status}
                        />
                      </div>
                      <p className="mt-2 text-sm font-semibold text-slate-600">
                        {lot.group_name}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {lot.location || t("notAvailable")}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => speakLot(lot)}
                      className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold"
                    >
                      <Volume2 className="h-4 w-4" />
                      {t("listen")}
                    </button>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    <Metric
                      label={t("aggregatedQuantity")}
                      value={`${numberText(
                        lot.aggregated_quantity_kg,
                        locale
                      )} kg`}
                    />
                    <Metric
                      label={t("targetRate")}
                      value={`${money(
                        lot.target_price_per_kg,
                        locale
                      )}/kg`}
                    />
                    <Metric
                      label={t("quality")}
                      value={
                        lot.quality_grade ||
                        t("notAvailable")
                      }
                    />
                    <Metric
                      label={t("contributions")}
                      value={numberText(
                        lot.contribution_count,
                        locale
                      )}
                    />
                    <Metric
                      label={t("inventoryReserved")}
                      value={
                        lot.inventory_reserved
                          ? t("yes")
                          : t("no")
                      }
                    />
                  </div>

                  {lot.contributions.length > 0 && (
                    <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                      <p className="text-sm font-black text-slate-700">
                        {t("farmerContributions")}
                      </p>
                      <div className="mt-3 space-y-2">
                        {lot.contributions.map(
                          (contribution) => (
                            <div
                              key={contribution.id}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white px-4 py-3 text-sm"
                            >
                              <span className="font-bold">
                                {contribution.farmer_name}
                              </span>
                              <span>
                                {numberText(
                                  contribution.quantity_kg,
                                  locale
                                )}{" "}
                                kg
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {lot.status === "open" && (
                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => openContribution(lot)}
                        className="flex items-center gap-2 rounded-2xl bg-emerald-700 px-5 py-3 font-black text-white"
                      >
                        <Upload className="h-5 w-5" />
                        {t("addMyCrop")}
                      </button>

                      <button
                        type="button"
                        disabled={
                          lot.contribution_count === 0 ||
                          working === `publish-${lot.id}`
                        }
                        onClick={() => void publishLot(lot)}
                        className="flex items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-3 font-black text-blue-800 disabled:opacity-50"
                      >
                        {working === `publish-${lot.id}` ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Upload className="h-5 w-5" />
                        )}
                        {t("publishLot")}
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        {contributionLot && (
          <section
            id="fpo-contribution-form"
            className="scroll-mt-28 rounded-[2rem] border border-emerald-200 bg-white p-6 shadow-sm sm:p-8"
          >
            <h2 className="text-2xl font-black">
              {t("addContribution")}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {contributionLot.group_name} ·{" "}
              {contributionLot.crop_name}
            </p>

            <form
              onSubmit={contribute}
              className="mt-6 grid gap-5 md:grid-cols-2"
            >
              <label>
                <span className="mb-2 block text-sm font-black">
                  {t("myListing")}
                </span>
                <select
                  value={contributionListingId}
                  onChange={(event) =>
                    setContributionListingId(
                      event.target.value
                    )
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
                >
                  <option value="">
                    {t("selectListing")}
                  </option>
                  {matchingListings.map((listing) => (
                    <option
                      key={listing.id}
                      value={listing.id}
                    >
                      {listing.crop} ·{" "}
                      {numberText(
                        listing.quantity_kg,
                        locale
                      )}{" "}
                      kg ·{" "}
                      {money(
                        listing.expected_price_per_kg,
                        locale
                      )}
                    </option>
                  ))}
                </select>
              </label>

              <Field
                label={t("quantityToAdd")}
                value={contributionQuantity}
                onChange={setContributionQuantity}
                inputMode="decimal"
              />

              {matchingListings.length === 0 && (
                <p className="md:col-span-2 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-900">
                  {t("noMatchingListings")}
                </p>
              )}

              <div className="md:col-span-2 rounded-2xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
                <strong>{t("softPledgeTitle")}</strong>{" "}
                {t("contributionSafety")}
              </div>

              <div className="md:col-span-2 flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={
                    !contributionListingId ||
                    working ===
                      `contribute-${contributionLot.id}`
                  }
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-5 py-3.5 font-black text-white disabled:opacity-50"
                >
                  {working ===
                  `contribute-${contributionLot.id}` ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Sprout className="h-5 w-5" />
                  )}
                  {t("confirmContribution")}
                </button>

                <button
                  type="button"
                  onClick={() => setContributionLot(null)}
                  className="rounded-2xl border border-slate-200 px-5 py-3.5 font-black"
                >
                  {t("cancel")}
                </button>
              </div>
            </form>
          </section>
        )}
      </div>
    </main>
  );
}

function Summary({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-white/10 p-4">
      <p className="text-xs font-bold text-emerald-100">
        {label}
      </p>
      <p className="mt-1 text-2xl font-black">
        {value}
      </p>
    </div>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-bold text-slate-500">
        {label}
      </p>
      <p className="mt-2 break-words text-lg font-black">
        {value}
      </p>
    </div>
  );
}

function Empty({text}: {text: string}) {
  return (
    <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-white p-9 text-center text-sm font-semibold text-slate-600">
      {text}
    </div>
  );
}

function Status({
  status,
  label,
}: {
  status: string;
  label: string;
}) {
  const className =
    status === "published"
      ? "bg-blue-100 text-blue-800"
      : "bg-emerald-100 text-emerald-800";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black ${className}`}
    >
      {label}
    </span>
  );
}

function Field({
  label,
  value,
  onChange,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  inputMode?: "text" | "decimal";
}) {
  return (
    <label>
      <span className="mb-2 block text-sm font-black">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        inputMode={inputMode}
        className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500"
      />
    </label>
  );
}
