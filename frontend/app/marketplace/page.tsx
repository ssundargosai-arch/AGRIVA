"use client";

import type { ChangeEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

import {
  ArrowLeft,
  Award,
  BadgeCheck,
  Camera,
  Heart,
  ImagePlus,
  Loader2,
  MapPin,
  PackagePlus,
  Search,
  ShieldCheck,
  ShoppingBasket,
  Sparkles,
  Star,
  Target,
  Trash2,
  Upload,
  Wheat,
  X,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000";

/* =========================================================
   TYPES
========================================================= */

type MarketplaceListing = {
  id: string;
  crop_id: string;
  crop: string;
  quantity_kg: number;
  quality_grade: string | null;
  expected_price_per_kg: number;
  location: string;
  harvest_date: string | null;
  images: string[];
  status: string;
  created_at: string;
};

type FarmerCrop = {
  id: string;
  field_id: string;
  name: string;
  variety: string | null;
  sowing_date: string | null;
  expected_harvest_date: string | null;
  expected_yield_kg: number | null;
  status: string;
  created_at?: string;
};

type SellImageFile = {
  file: File;
  previewUrl: string;
};

type MarketplaceImageUploadResponse = {
  images: Array<{
    filename: string;
    url: string;
    original_name: string | null;
    content_type: string;
    size_bytes: number;
  }>;
  urls: string[];
};

type BuyerMatchLabel =
  | "BEST_MATCH"
  | "EXCELLENT"
  | "GOOD"
  | "FAIR"
  | "LOW";

type BuyerMatchBreakdown = {
  crop_score: number;
  quantity_score: number;
  price_score: number;
  quality_score: number;
  distance_score: number;
  rating_score: number;
};

type BuyerMatch = {
  buyer_id: string;
  buyer_name: string;
  buyer_city: string | null;
  buyer_state: string | null;
  preferred_crop: string | null;
  preferred_quality: string | null;
  match_percentage: number;
  match_label: BuyerMatchLabel;
  offer_price: number | null;
  demand_quantity: number | null;
  distance_km: number | null;
  buyer_rating: number | null;

  verification_status: string;
  verification_label: string;
  verification_note: string;
  agriva_verified: boolean;

  breakdown: BuyerMatchBreakdown;
};

type UserRole =
  | "ADMIN"
  | "FARMER"
  | "BUYER"
  | null;

type BreakdownRow = {
  label: string;
  value: number;
  maximum: number;
};

function formatMatchLabel(
  label: BuyerMatchLabel
) {
  switch (label) {
    case "BEST_MATCH":
      return "Best Match";
    case "EXCELLENT":
      return "Excellent";
    case "GOOD":
      return "Good";
    case "FAIR":
      return "Fair";
    default:
      return "Low";
  }
}

function matchBadgeClass(
  label: BuyerMatchLabel
) {
  switch (label) {
    case "BEST_MATCH":
      return "border-emerald-200 bg-emerald-100 text-emerald-800";
    case "EXCELLENT":
      return "border-teal-200 bg-teal-50 text-teal-800";
    case "GOOD":
      return "border-sky-200 bg-sky-50 text-sky-800";
    case "FAIR":
      return "border-amber-200 bg-amber-50 text-amber-800";
    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
}

function scoreWidth(
  value: number,
  maximum: number
) {
  if (maximum <= 0) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      100,
      (value / maximum) * 100
    )
  );
}

function buyerLocation(
  match: BuyerMatch
) {
  return [
    match.buyer_city,
    match.buyer_state,
  ]
    .filter(Boolean)
    .join(", ");
}

/* =========================================================
   PAGE
========================================================= */


function localizeMarketplaceCrop(
  crop: string,
  locale: string
) {
  const key = (crop || "").trim().toLowerCase();

  const names: Record<
    string,
    Record<string, string>
  > = {
    wheat: {
      en: "Wheat",
      hi: "गेहूं",
      mr: "गहू",
    },
    maize: {
      en: "Maize",
      hi: "मक्का",
      mr: "मका",
    },
    rice: {
      en: "Rice",
      hi: "चावल",
      mr: "तांदूळ",
    },
    soybean: {
      en: "Soybean",
      hi: "सोयाबीन",
      mr: "सोयाबीन",
    },
    cotton: {
      en: "Cotton",
      hi: "कपास",
      mr: "कापूस",
    },
    onion: {
      en: "Onion",
      hi: "प्याज",
      mr: "कांदा",
    },
    tomato: {
      en: "Tomato",
      hi: "टमाटर",
      mr: "टोमॅटो",
    },
    potato: {
      en: "Potato",
      hi: "आलू",
      mr: "बटाटा",
    },
    sugarcane: {
      en: "Sugarcane",
      hi: "गन्ना",
      mr: "ऊस",
    },
  };

  return names[key]?.[locale] || crop;
}

function localizeMarketplaceStatus(
  status: string,
  locale: string
) {
  const value = (status || "").trim().toLowerCase();

  if (value === "active") {
    if (locale === "mr") return "सक्रिय";
    if (locale === "hi") return "सक्रिय";
    return "Active";
  }

  if (value === "sold") {
    if (locale === "mr") return "विकले";
    if (locale === "hi") return "बिक गया";
    return "Sold";
  }

  if (value === "inactive") {
    if (locale === "mr") return "निष्क्रिय";
    if (locale === "hi") return "निष्क्रिय";
    return "Inactive";
  }

  return status;
}


function buyerVerificationLabel(
  status: string,
  locale: string
) {
  if (
    status ===
    "AGRIVA_VERIFIED"
  ) {
    return "AGRIVA Verified";
  }

  if (status === "PENDING") {
    if (locale === "hi") {
      return "AGRIVA समीक्षा लंबित";
    }

    if (locale === "mr") {
      return "AGRIVA पुनरावलोकन प्रलंबित";
    }

    return "AGRIVA review pending";
  }

  if (status === "REJECTED") {
    if (locale === "hi") {
      return "AGRIVA समीक्षा अस्वीकृत";
    }

    if (locale === "mr") {
      return "AGRIVA पुनरावलोकन नाकारले";
    }

    return "AGRIVA review rejected";
  }

  if (locale === "hi") {
    return "AGRIVA द्वारा सत्यापित नहीं";
  }

  if (locale === "mr") {
    return "AGRIVA कडून पडताळलेले नाही";
  }

  return "Not verified by AGRIVA";
}


function buyerVerificationNote(
  status: string,
  locale: string
) {
  if (
    status ===
    "AGRIVA_VERIFIED"
  ) {
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
    return "इस खरीदार के लिए सरकारी, KYC या बैंक सत्यापन का दावा नहीं किया गया है।";
  }

  if (locale === "mr") {
    return "या खरेदीदारासाठी सरकारी, KYC किंवा बँक पडताळणीचा दावा केलेला नाही.";
  }

  return "No Government, KYC or bank verification is claimed for this buyer.";
}

export default function MarketplacePage() {
  const router = useRouter();
  const t = useTranslations("marketplacePage");
  const locale = useLocale();

  const [listings, setListings] =
    useState<MarketplaceListing[]>([]);

  const [favorites, setFavorites] =
    useState<string[]>([]);

  const [myListingIds, setMyListingIds] =
    useState<string[]>([]);

  const [removingListingId, setRemovingListingId] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [location, setLocation] =
    useState("");

  const [quality, setQuality] =
    useState("");

  const [selectedListing, setSelectedListing] =
    useState<MarketplaceListing | null>(null);

  const [matches, setMatches] =
    useState<BuyerMatch[]>([]);

  const [matchLoading, setMatchLoading] =
    useState(false);

  const [userRole, setUserRole] =
    useState<UserRole>(null);

  const [roleLoading, setRoleLoading] =
    useState(true);

  const [orderingListing, setOrderingListing] =
    useState<MarketplaceListing | null>(null);

  const [orderQuantity, setOrderQuantity] =
    useState("5");

  const [placingOrder, setPlacingOrder] =
    useState(false);

  const [sellModalOpen, setSellModalOpen] =
    useState(false);

  const [farmerCrops, setFarmerCrops] =
    useState<FarmerCrop[]>([]);

  const [cropsLoading, setCropsLoading] =
    useState(false);

  const [sellCropId, setSellCropId] =
    useState("");

  const [sellQuantity, setSellQuantity] =
    useState("");

  const [sellQuality, setSellQuality] =
    useState("A");

  const [sellPrice, setSellPrice] =
    useState("");

  const [sellLocation, setSellLocation] =
    useState("");

  const [sellHarvestDate, setSellHarvestDate] =
    useState("");

  const [sellImages, setSellImages] =
    useState<SellImageFile[]>([]);

  const [sellSubmitting, setSellSubmitting] =
    useState(false);

  const [sellError, setSellError] =
    useState("");

  /* =========================================================
     LOAD MARKETPLACE
  ========================================================= */

  useEffect(() => {
    void initializePage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function getToken() {
    return (
      localStorage.getItem("access_token") ||
      localStorage.getItem("token")
    );
  }

  async function initializePage() {
    await Promise.all([
      loadUserRole(),
      loadMarketplace(),
    ]);
  }

  async function loadUserRole() {
    const token = getToken();

    if (!token) {
      setUserRole(null);
      setRoleLoading(false);
      return;
    }

    setRoleLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/api/auth/me`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }
      );

      if (!response.ok) {
        setUserRole(null);

        if (response.status === 401) {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          localStorage.removeItem("token");
        }

        return;
      }

      const user = await response.json();

      const role = String(
        user?.role || ""
      ).toUpperCase();

      if (
        role === "ADMIN" ||
        role === "FARMER" ||
        role === "BUYER"
      ) {
        setUserRole(role as UserRole);
      } else {
        setUserRole(null);
      }
    } catch {
      setUserRole(null);
    } finally {
      setRoleLoading(false);
    }
  }

  function goToDashboard() {
    if (userRole === "BUYER") {
      router.push("/dashboard/buyer");
      return;
    }

    if (userRole === "ADMIN") {
      router.push("/dashboard/admin");
      return;
    }

    if (userRole === "FARMER") {
      router.push("/dashboard/farmer");
      return;
    }

    router.push("/login");
  }

  function dashboardLabel() {
    if (userRole === "BUYER") {
      return "Back to Buyer Dashboard";
    }

    if (userRole === "ADMIN") {
      return "Back to Admin Dashboard";
    }

    if (userRole === "FARMER") {
      return "Back to Farmer Dashboard";
    }

    return "Back to Login";
  }

  async function loadMarketplace() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/api/marketplace/listings`,
        {
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error(t("loadError"));
      }

      const data: MarketplaceListing[] =
        await response.json();

      setListings(data);

      const token = getToken();

      if (token) {
        await Promise.all([
          loadFavorites(token),
          loadMyListings(token),
        ]);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("generalError")
      );
    } finally {
      setLoading(false);
    }
  }

  /* =========================================================
     FARMER - OWN LISTINGS
  ========================================================= */

  async function loadMyListings(token: string) {
    try {
      const response = await fetch(
        `${API_URL}/api/marketplace/my-listings`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }
      );

      if (!response.ok) {
        setMyListingIds([]);
        return;
      }

      const data: MarketplaceListing[] =
        await response.json();

      setMyListingIds(
        data
          .filter(
            (item) =>
              item.status.toLowerCase() ===
              "active"
          )
          .map((item) => item.id)
      );
    } catch {
      setMyListingIds([]);
    }
  }

  async function removeListingFromMarket(
    listing: MarketplaceListing
  ) {
    const token = getToken();

    if (!token) {
      router.push("/login");
      return;
    }

    if (!myListingIds.includes(listing.id)) {
      alert(
        "You can remove only your own crop listing."
      );
      return;
    }

    const confirmed = window.confirm(
      `Remove ${localizeMarketplaceCrop(listing.crop, locale)} from AGRIVA Market?\n\n` +
        "Buyers will no longer be able to place new orders for this listing. Existing orders are not cancelled."
    );

    if (!confirmed) {
      return;
    }

    setRemovingListingId(listing.id);

    try {
      const response = await fetch(
        `${API_URL}/api/marketplace/listings/${listing.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.detail ||
            "Unable to remove listing from market."
        );
      }

      setListings((current) =>
        current.filter(
          (item) => item.id !== listing.id
        )
      );

      setMyListingIds((current) =>
        current.filter(
          (id) => id !== listing.id
        )
      );

      if (selectedListing?.id === listing.id) {
        setSelectedListing(null);
        setMatches([]);
      }

      alert(
        `${localizeMarketplaceCrop(listing.crop, locale)} removed from AGRIVA Market. New orders are now blocked.`
      );
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Unable to remove listing from market."
      );
    } finally {
      setRemovingListingId(null);
    }
  }

  /* =========================================================
     LOAD FAVORITES
  ========================================================= */

  async function loadFavorites(token: string) {
    try {
      const response = await fetch(
        `${API_URL}/api/marketplace/favorites`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        return;
      }

      const data: MarketplaceListing[] =
        await response.json();

      setFavorites(
        data.map((item) => item.id)
      );
    } catch {
      // Ignore favorites loading failure
    }
  }

  /* =========================================================
     TOGGLE FAVORITE
  ========================================================= */

  async function toggleFavorite(
    listingId: string
  ) {
    const token = getToken();

    if (!token) {
      alert(t("loginFirst"));
      return;
    }

    const isFavorite =
      favorites.includes(listingId);

    try {
      const response = await fetch(
        `${API_URL}/api/marketplace/favorites/${listingId}`,
        {
          method: isFavorite
            ? "DELETE"
            : "POST",

          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const result = await response
          .json()
          .catch(() => null);

        throw new Error(
          result?.detail ||
            t("favoriteError")
        );
      }

      if (isFavorite) {
        setFavorites((current) =>
          current.filter(
            (id) => id !== listingId
          )
        );
      } else {
        setFavorites((current) => [
          ...current,
          listingId,
        ]);
      }
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : t("favoriteError")
      );
    }
  }

  /* =========================================================
     BUYER - PLACE ORDER
  ========================================================= */

  function openOrderModal(
    listing: MarketplaceListing
  ) {
    if (userRole !== "BUYER") {
      return;
    }

    setOrderingListing(listing);
    setOrderQuantity("5");
  }

  function closeOrderModal() {
    if (placingOrder) {
      return;
    }

    setOrderingListing(null);
    setOrderQuantity("5");
  }

  async function placeOrder() {
    const token = getToken();

    if (!token) {
      router.push("/login");
      return;
    }

    if (userRole !== "BUYER") {
      alert("Buyer access required.");
      return;
    }

    if (!orderingListing) {
      return;
    }

    const quantity =
      Number(orderQuantity);

    if (
      !Number.isFinite(quantity) ||
      quantity <= 0
    ) {
      alert("Enter a valid quantity.");
      return;
    }

    if (
      quantity >
      orderingListing.quantity_kg
    ) {
      alert(
        `Only ${orderingListing.quantity_kg} kg is available.`
      );
      return;
    }

    setPlacingOrder(true);

    try {
      const response = await fetch(
        `${API_URL}/api/orders`,
        {
          method: "POST",

          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            listing_id:
              orderingListing.id,
            quantity_kg:
              quantity,
          }),
        }
      );

      const result = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.detail ||
            "Unable to place order."
        );
      }

      const total =
        result?.total_amount ??
        quantity *
          orderingListing.expected_price_per_kg;

      alert(
        `Order placed successfully. Total ₹${total}`
      );

      setOrderingListing(null);
      setOrderQuantity("5");

      await loadMarketplace();
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Unable to place order."
      );
    } finally {
      setPlacingOrder(false);
    }
  }

  /* =========================================================
     FIND BEST BUYERS
  ========================================================= */

  async function findBuyerMatches(
    listing: MarketplaceListing
  ) {
    const token = getToken();

    if (!token) {
      alert(t("farmerLoginFirst"));
      return;
    }

    if (userRole !== "FARMER") {
      alert("Farmer access required.");
      return;
    }

    setSelectedListing(listing);
    setMatches([]);
    setMatchLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/api/marketplace/listings/${listing.id}/matches`,
        {
          method: "POST",

          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result?.detail ||
            t("buyerMatchError")
        );
      }

      setMatches(
        result.matches || []
      );
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : t("buyerMatchError")
      );
    } finally {
      setMatchLoading(false);
    }
  }

  /* =========================================================
     FARMER - SELL CROP
  ========================================================= */

  function applyCropDefaults(
    crop: FarmerCrop
  ) {
    setSellCropId(crop.id);

    if (
      crop.expected_yield_kg !== null &&
      crop.expected_yield_kg > 0
    ) {
      setSellQuantity(
        String(crop.expected_yield_kg)
      );
    } else {
      setSellQuantity("");
    }

    setSellHarvestDate(
      crop.expected_harvest_date
        ? crop.expected_harvest_date.slice(
            0,
            10
          )
        : ""
    );
  }

  async function loadFarmerCrops(
    token: string
  ) {
    setCropsLoading(true);
    setSellError("");

    try {
      const response = await fetch(
        `${API_URL}/api/crops`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }
      );

      const result = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.detail ||
            "Unable to load your crops."
        );
      }

      const crops = Array.isArray(result)
        ? (result as FarmerCrop[])
        : [];

      setFarmerCrops(crops);

      if (crops.length > 0) {
        applyCropDefaults(crops[0]);
      } else {
        setSellCropId("");
        setSellQuantity("");
        setSellHarvestDate("");
      }
    } catch (err) {
      setSellError(
        err instanceof Error
          ? err.message
          : "Unable to load your crops."
      );
    } finally {
      setCropsLoading(false);
    }
  }

  async function openSellCropModal() {
    const token = getToken();

    if (!token) {
      router.push("/login");
      return;
    }

    if (userRole !== "FARMER") {
      alert("Farmer access required.");
      return;
    }

    setSellError("");
    setSellModalOpen(true);

    if (farmerCrops.length === 0) {
      await loadFarmerCrops(token);
    } else {
      applyCropDefaults(
        farmerCrops[0]
      );
    }
  }

  function clearSellImages() {
    sellImages.forEach((item) => {
      URL.revokeObjectURL(
        item.previewUrl
      );
    });

    setSellImages([]);
  }

  function resetSellForm() {
    clearSellImages();
    setSellCropId("");
    setSellQuantity("");
    setSellQuality("A");
    setSellPrice("");
    setSellLocation("");
    setSellHarvestDate("");
    setSellError("");
  }

  function closeSellCropModal() {
    if (sellSubmitting) {
      return;
    }

    resetSellForm();
    setSellModalOpen(false);
  }

  function selectSellCrop(
    cropId: string
  ) {
    const crop = farmerCrops.find(
      (item) => item.id === cropId
    );

    if (!crop) {
      setSellCropId(cropId);
      return;
    }

    applyCropDefaults(crop);
  }

  function selectSellImages(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const files = Array.from(
      event.target.files || []
    );

    event.target.value = "";

    if (files.length === 0) {
      return;
    }

    if (files.length > 5) {
      setSellError(
        "You can upload a maximum of 5 crop photos."
      );
      return;
    }

    const allowedTypes = new Set([
      "image/jpeg",
      "image/png",
      "image/webp",
    ]);

    const invalidFile = files.find(
      (file) =>
        !allowedTypes.has(file.type) ||
        file.size > 10 * 1024 * 1024
    );

    if (invalidFile) {
      setSellError(
        "Use JPG, PNG or WEBP images up to 10 MB each."
      );
      return;
    }

    clearSellImages();

    setSellImages(
      files.map((file) => ({
        file,
        previewUrl:
          URL.createObjectURL(file),
      }))
    );

    setSellError("");
  }

  function removeSellImage(
    index: number
  ) {
    setSellImages((current) => {
      const target = current[index];

      if (target) {
        URL.revokeObjectURL(
          target.previewUrl
        );
      }

      return current.filter(
        (_, itemIndex) =>
          itemIndex !== index
      );
    });
  }

  async function publishCropListing() {
    const token = getToken();

    if (!token) {
      router.push("/login");
      return;
    }

    if (userRole !== "FARMER") {
      setSellError(
        "Farmer access required."
      );
      return;
    }

    const quantity = Number(
      sellQuantity
    );

    const price = Number(
      sellPrice
    );

    if (!sellCropId) {
      setSellError(
        "Select a crop to sell."
      );
      return;
    }

    if (
      !Number.isFinite(quantity) ||
      quantity <= 0
    ) {
      setSellError(
        "Enter a valid quantity greater than 0."
      );
      return;
    }

    if (
      !Number.isFinite(price) ||
      price <= 0
    ) {
      setSellError(t("validExpectedPrice"));
      return;
    }

    if (
      sellLocation.trim().length < 2
    ) {
      setSellError(
        "Enter the crop location."
      );
      return;
    }

    if (!sellHarvestDate) {
      setSellError(
        "Select the harvest date."
      );
      return;
    }

    setSellSubmitting(true);
    setSellError("");

    try {
      let imageUrls: string[] = [];

      if (sellImages.length > 0) {
        const formData = new FormData();

        sellImages.forEach((item) => {
          formData.append(
            "files",
            item.file
          );
        });

        const uploadResponse =
          await fetch(
            `${API_URL}/api/marketplace/media/images`,
            {
              method: "POST",
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
              body: formData,
            }
          );

        const uploadResult:
          MarketplaceImageUploadResponse =
            await uploadResponse
              .json()
              .catch(() => ({
                images: [],
                urls: [],
              }));

        if (!uploadResponse.ok) {
          throw new Error(
            (
              uploadResult as unknown as {
                detail?: string;
              }
            )?.detail ||
              "Unable to upload crop photos."
          );
        }

        imageUrls =
          uploadResult.urls || [];
      }

      const listingResponse =
        await fetch(
          `${API_URL}/api/marketplace/listings`,
          {
            method: "POST",
            headers: {
              Authorization:
                `Bearer ${token}`,
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              crop_id: sellCropId,
              quantity_kg: quantity,
              quality_grade:
                sellQuality,
              expected_price_per_kg:
                price,
              location:
                sellLocation.trim(),
              harvest_date:
                sellHarvestDate,
              images: imageUrls,
            }),
          }
        );

      const listingResult =
        await listingResponse
          .json()
          .catch(() => null);

      if (!listingResponse.ok) {
        throw new Error(
          listingResult?.detail ||
            "Unable to publish crop listing."
        );
      }

      const createdListing =
        listingResult as MarketplaceListing;

      setListings((current) => [
        createdListing,
        ...current.filter(
          (item) =>
            item.id !== createdListing.id
        ),
      ]);

      setSelectedListing(null);
      setMatches([]);

      resetSellForm();
      setSellModalOpen(false);

      alert(
        `${createdListing.crop} is now listed for sale on AGRIVA Market.`
      );
    } catch (err) {
      setSellError(
        err instanceof Error
          ? err.message
          : "Unable to publish crop listing."
      );
    } finally {
      setSellSubmitting(false);
    }
  }

  /* =========================================================
     FILTER MARKETPLACE
  ========================================================= */

  const filteredListings =
    useMemo(() => {
      return listings.filter(
        (listing) => {
          const cropMatch =
            listing.crop
              .toLowerCase()
              .includes(
                search.toLowerCase()
              );

          const locationMatch =
            (listing.location || "")
              .toLowerCase()
              .includes(
                location.toLowerCase()
              );

          const qualityMatch =
            quality === "" ||
            listing.quality_grade
              ?.toLowerCase() ===
              quality.toLowerCase();

          return (
            cropMatch &&
            locationMatch &&
            qualityMatch
          );
        }
      );
    }, [
      listings,
      search,
      location,
      quality,
    ]);

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading || roleLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="flex items-center gap-3 text-slate-300">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />

          <span>
            {t("loading")}
          </span>
        </div>
      </main>
    );
  }

  /* =========================================================
     UI
  ========================================================= */

  return (
    <main className="min-h-screen bg-slate-950 text-slate-950">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <section className="relative overflow-hidden border-b border-white/10 bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-950 text-white">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute -bottom-48 left-1/3 h-96 w-96 rounded-full bg-green-400/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={goToDashboard}
            className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-300 transition hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
            {dashboardLabel()}
          </button>

          <div className="mt-8 grid items-end gap-8 lg:grid-cols-[1fr_auto]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">
                <Sparkles className="h-4 w-4" />
                AGRIVA Market Intelligence
              </div>

              <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-tight text-white md:text-5xl">
                {t("title")}
              </h1>

              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300 md:text-lg">
                {t("subtitle")}
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                {userRole === "FARMER" && (
                  <button
                    type="button"
                    onClick={() => void openSellCropModal()}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400"
                  >
                    <PackagePlus className="h-5 w-5" />{t("sellYourCrop")}</button>
                )}

                <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 backdrop-blur">
                  <ShieldCheck className="h-5 w-5 text-emerald-400" />
                  {t("secureMarketplace")}
                </div>
              </div>
            </div>

            <div className="hidden rounded-3xl border border-white/10 bg-white/5 p-5 text-white backdrop-blur lg:block">
              <div className="flex items-center gap-3">
                <ShoppingBasket className="h-9 w-9 text-emerald-400" />
                <div>
                  <p className="font-bold">{t("activeMarketNetwork")}</p>
                  <p className="mt-1 text-xs text-slate-400">{t("networkSummary")}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          MAIN CONTENT
      ===================================================== */}

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* ===================================================
            FILTERS
        =================================================== */}

        <section className="relative z-10 mb-8 -mt-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-black/10 md:p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">{t("marketplaceSearch")}</p>
              <h2 className="mt-1 text-xl font-black text-slate-950">{t("exploreListings")}</h2>
            </div>

            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-800">
              <ShoppingBasket className="h-4 w-4" />
              {t("activeListings", { count: filteredListings.length })}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">

            {/* CROP SEARCH */}

            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder={t(
                  "searchCrop"
                )}
                className="h-12 w-full rounded-xl border border-slate-300 bg-slate-50 py-3 pl-10 pr-3 text-sm outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100"
              />
            </div>

            {/* LOCATION SEARCH */}

            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-5 w-5 text-slate-400" />

              <input
                value={location}
                onChange={(event) =>
                  setLocation(
                    event.target.value
                  )
                }
                placeholder={t(
                  "location"
                )}
                className="h-12 w-full rounded-xl border border-slate-300 bg-slate-50 py-3 pl-10 pr-3 text-sm outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100"
              />
            </div>

            {/* QUALITY FILTER */}

            <select
              value={quality}
              onChange={(event) =>
                setQuality(
                  event.target.value
                )
              }
              className="h-12 rounded-xl border border-slate-300 bg-slate-50 px-4 text-sm font-medium outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100"
            >
              <option value="">
                {t(
                  "allQualityGrades"
                )}
              </option>

              <option value="A">
                {t("gradeA")}
              </option>

              <option value="B">
                {t("gradeB")}
              </option>

              <option value="C">
                {t("gradeC")}
              </option>
            </select>
          </div>
        </section>

        {/* ===================================================
            ERROR
        =================================================== */}

        {error && (
          <div className="mb-6 rounded-2xl border border-red-300 bg-red-50 p-4 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {/* ===================================================
            LISTINGS
        =================================================== */}

        {filteredListings.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-xl shadow-black/10">
            <Wheat className="mx-auto h-12 w-12 text-slate-300" />

            <h2 className="mt-4 text-xl font-semibold text-slate-900">
              {t("noListings")}
            </h2>

            <p className="mt-2 text-slate-300">
              {t("changeFilters")}
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredListings.map(
              (listing) => {
                const isFavorite =
                  favorites.includes(
                    listing.id
                  );

                const isMyListing =
                  myListingIds.includes(
                    listing.id
                  );

                return (
                  <article
                    key={listing.id}
                    className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg shadow-black/10 transition duration-300 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-950/10"
                  >

                    {/* IMAGE */}

                    <div className="relative h-52 overflow-hidden bg-gradient-to-br from-emerald-50 to-green-100">
                      {listing.images?.length >
                      0 ? (
                        <>
                          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-emerald-50 to-green-100">
                            <Wheat className="h-20 w-20 text-emerald-400" />
                          </div>

                          <img
                            src={listing.images[0]}
                            alt={localizeMarketplaceCrop(listing.crop, locale)}
                            onError={(event) => {
                              event.currentTarget.style.display =
                                "none";
                            }}
                            className="relative z-10 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                          />
                        </>
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Wheat className="h-20 w-20 text-emerald-400" />
                        </div>
                      )}

                      {/* FAVORITE */}

                      {userRole === "BUYER" && (
                        <button
                          type="button"
                          onClick={() =>
                            toggleFavorite(
                              listing.id
                            )
                          }
                          className="absolute right-4 top-4 rounded-full bg-white p-2 shadow transition hover:scale-105"
                          aria-label={t(
                            "favorite"
                          )}
                        >
                          <Heart
                            className={`h-5 w-5 ${
                              isFavorite
                                ? "fill-red-500 text-red-500"
                                : "text-slate-600"
                            }`}
                          />
                        </button>
                      )}

                      {/* QUALITY */}

                      <div className="absolute bottom-4 left-4 rounded-full border border-emerald-300/30 bg-slate-950/80 px-3 py-1 text-sm font-bold text-emerald-300 backdrop-blur">
                        {t("grade")}{" "}
                        {listing.quality_grade ||
                          t(
                            "notAvailable"
                          )}
                      </div>
                    </div>

                    {/* LISTING DETAILS */}

                    <div className="p-5">
                      <div className="flex items-start justify-between gap-4">

                        {/* CROP */}

                        <div>
                          <h2 className="text-2xl font-black tracking-tight text-slate-950">
                            {localizeMarketplaceCrop(listing.crop, locale)}
                          </h2>

                          <div className="mt-2 flex items-center gap-1 text-sm text-slate-500">
                            <MapPin className="h-4 w-4" />

                            {
                              listing.location
                            }
                          </div>
                        </div>

                        {/* PRICE */}

                        <div className="text-right">
                          <div className="text-2xl font-black text-emerald-700">
                            ₹
                            {
                              listing.expected_price_per_kg
                            }
                          </div>

                          <div className="text-xs text-slate-500">
                            {t(
                              "perKg"
                            )}
                          </div>
                        </div>
                      </div>

                      {/* INFO */}

                      <div className="mt-5 grid grid-cols-2 gap-3">

                        {/* QUANTITY */}

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                          <p className="text-xs text-slate-500">
                            {t(
                              "quantity"
                            )}
                          </p>

                          <p className="font-semibold">
                            {
                              listing.quantity_kg
                            }{" "}
                            kg
                          </p>
                        </div>

                        {/* STATUS */}

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                          <p className="text-xs text-slate-500">
                            {t(
                              "status"
                            )}
                          </p>

                          <p className="font-semibold capitalize">
                            {localizeMarketplaceStatus(listing.status, locale)}
                          </p>
                        </div>
                      </div>

                      {/* ROLE-AWARE ACTION */}

                      {userRole === "FARMER" &&
                        isMyListing && (
                          <div className="mt-5 grid gap-3 sm:grid-cols-2">
                            <button
                              type="button"
                              onClick={() =>
                                findBuyerMatches(
                                  listing
                                )
                              }
                              className="w-full rounded-xl bg-emerald-700 px-4 py-3 font-bold text-white shadow-md shadow-emerald-700/15 transition hover:bg-emerald-800"
                            >
                              {t(
                                "findBestBuyers"
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                removeListingFromMarket(
                                  listing
                                )
                              }
                              disabled={
                                removingListingId ===
                                listing.id
                              }
                              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 font-bold text-slate-700 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {removingListingId ===
                              listing.id ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Removing...
                                </>
                              ) : (
                                <>
                                  <Trash2 className="h-4 w-4" />
                                  {t("removeFromMarket")}
                                </>
                              )}
                            </button>
                          </div>
                        )}

                      {userRole === "FARMER" &&
                        !isMyListing && (
                          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm font-semibold text-slate-500">
                            Other farmer listing
                          </div>
                        )}

                      {userRole === "BUYER" && (
                        <button
                          type="button"
                          onClick={() =>
                            openOrderModal(
                              listing
                            )
                          }
                          disabled={
                            listing.quantity_kg <= 0 ||
                            listing.status.toLowerCase() !==
                              "active"
                          }
                          className="mt-5 w-full rounded-xl bg-emerald-700 px-4 py-3 font-bold text-white shadow-md shadow-emerald-700/15 transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                        >{t("placeOrder")}</button>
                      )}

                      {userRole === "ADMIN" && (
                        <div className="mt-5 rounded-xl bg-slate-100 px-4 py-3 text-center text-sm font-semibold text-slate-600">
                          Marketplace View Only
                        </div>
                      )}

                      {!userRole && (
                        <button
                          type="button"
                          onClick={() =>
                            router.push(
                              "/login"
                            )
                          }
                          className="mt-5 w-full rounded-xl bg-emerald-700 px-4 py-3 font-bold text-white shadow-md shadow-emerald-700/15 transition hover:bg-emerald-800"
                        >
                          Login to Continue
                        </button>
                      )}
                    </div>
                  </article>
                );
              }
            )}
          </div>
        )}

        {/* ===================================================
            BUYER MATCHES
        =================================================== */}

        {userRole === "FARMER" &&
          selectedListing && (
          <section className="mt-10 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-black/10">
            <div className="border-b border-white/10 bg-gradient-to-r from-slate-950 via-emerald-950 to-slate-950 p-6 text-white sm:p-7">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-emerald-300">
                    <Target className="h-4 w-4" />
                    Buyer Intelligence
                  </div>

                  <h2 className="text-2xl font-black text-white sm:text-3xl">
                    {t("buyerMatches")}
                  </h2>

                  <p className="mt-2 text-slate-500">
                    {t(
                      "bestBuyersFor",
                      {
                        crop: localizeMarketplaceCrop(selectedListing.crop, locale),
                      }
                    )}
                  </p>
                </div>

                {!matchLoading &&
                  matches.length > 0 && (
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-white backdrop-blur">
                    <span className="text-slate-400">{t("rankedBuyers")}</span>
                    <span className="ml-2 font-bold text-white">
                      {matches.length}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 sm:p-7">
              {matchLoading ? (
                <div className="flex min-h-44 items-center justify-center">
                  <div className="text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-700" />
                    <p className="mt-3 font-medium text-slate-700">
                      {t(
                        "findingBuyers"
                      )}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {t("comparingFactors")}
                    </p>
                  </div>
                </div>
              ) : matches.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
                  <Wheat className="mx-auto h-10 w-10 text-slate-300" />
                  <p className="mt-4 font-semibold text-slate-700">
                    {t(
                      "noBuyerMatches"
                    )}
                  </p>
                  <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">
                    AGRIVA only recommends buyers whose crop demand matches this listing. Try another crop listing if buyers currently demand a different crop.
                  </p>
                </div>
              ) : (
                <div className="grid gap-6 xl:grid-cols-2">
                  {matches.map(
                    (match, index) => {
                      const rows: BreakdownRow[] = [
                        {
                          label: "Crop",
                          value:
                            match.breakdown
                              .crop_score,
                          maximum: 30,
                        },
                        {
                          label: "Quantity",
                          value:
                            match.breakdown
                              .quantity_score,
                          maximum: 20,
                        },
                        {
                          label: "Price",
                          value:
                            match.breakdown
                              .price_score,
                          maximum: 20,
                        },
                        {
                          label: "Quality",
                          value:
                            match.breakdown
                              .quality_score,
                          maximum: 15,
                        },
                        {
                          label: "Distance",
                          value:
                            match.breakdown
                              .distance_score,
                          maximum: 10,
                        },
                        {
                          label: "Rating",
                          value:
                            match.breakdown
                              .rating_score,
                          maximum: 5,
                        },
                      ];

                      const isTopMatch =
                        index === 0;

                      return (
                        <article
                          key={
                            match.buyer_id
                          }
                          className={`relative overflow-hidden rounded-3xl border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${
                            isTopMatch
                              ? "border-emerald-400 ring-2 ring-emerald-100"
                              : "border-slate-200"
                          }`}
                        >
                          {isTopMatch && (
                            <div className="flex items-center gap-2 bg-gradient-to-r from-slate-950 via-emerald-900 to-slate-950 px-5 py-2.5 text-sm font-bold text-emerald-100">
                              <Award className="h-4 w-4" />
                              #1 Recommended Buyer
                            </div>
                          )}

                          <div className="p-5 sm:p-6">
                            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="text-xl font-bold text-slate-900">
                                    {
                                      match.buyer_name
                                    }
                                  </h3>

                                  <span
                                    data-agriva-verification-badge
                                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-black ${
                                      match.agriva_verified
                                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                        : match.verification_status === "PENDING"
                                          ? "border-amber-200 bg-amber-50 text-amber-800"
                                          : match.verification_status === "REJECTED"
                                            ? "border-red-200 bg-red-50 text-red-700"
                                            : "border-slate-200 bg-slate-50 text-slate-600"
                                    }`}
                                  >
                                    {buyerVerificationLabel(
                                      match.verification_status,
                                      locale
                                    )}
                                  </span>

                                  <p className="basis-full text-xs leading-5 text-slate-500">
                                    {buyerVerificationNote(
                                      match.verification_status,
                                      locale
                                    )}
                                  </p>

                                  <span
                                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${matchBadgeClass(
                                      match.match_label
                                    )}`}
                                  >
                                    <BadgeCheck className="h-3.5 w-3.5" />
                                    {formatMatchLabel(
                                      match.match_label
                                    )}
                                  </span>
                                </div>

                                {buyerLocation(
                                  match
                                ) && (
                                  <div className="mt-2 flex items-center gap-1.5 text-sm text-slate-500">
                                    <MapPin className="h-4 w-4 shrink-0" />
                                    <span>
                                      {buyerLocation(
                                        match
                                      )}
                                    </span>
                                  </div>
                                )}

                                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                                  <div className="flex items-center gap-1 text-amber-600">
                                    <Star className="h-4 w-4 fill-current" />
                                    <span className="font-semibold">
                                      {match.buyer_rating ??
                                        t(
                                          "notAvailable"
                                        )}
                                    </span>
                                  </div>

                                  {match.preferred_crop && (
                                    <span className="text-slate-500">
                                      Wants{" "}
                                      <strong className="text-slate-700">
                                        {
                                          match.preferred_crop
                                        }
                                      </strong>
                                    </span>
                                  )}

                                  {match.preferred_quality && (
                                    <span className="text-slate-500">
                                      Quality{" "}
                                      <strong className="text-slate-700">
                                        {
                                          match.preferred_quality
                                        }
                                      </strong>
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="shrink-0 rounded-2xl bg-emerald-50 px-5 py-4 text-center">
                                <p className="text-3xl font-black tracking-tight text-emerald-700">
                                  {match.match_percentage.toFixed(
                                    2
                                  )}
                                  %
                                </p>
                                <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">
                                  Overall Match
                                </p>
                              </div>
                            </div>

                            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                              <div className="rounded-2xl bg-slate-50 p-4">
                                <p className="text-xs font-medium text-slate-500">
                                  {t(
                                    "offer"
                                  )}
                                </p>
                                <p className="mt-1 text-lg font-bold text-slate-900">
                                  ₹
                                  {(
                                    match.offer_price ??
                                    0
                                  ).toFixed(
                                    2
                                  )}
                                  <span className="text-xs font-medium text-slate-500">
                                    /kg
                                  </span>
                                </p>
                              </div>

                              <div className="rounded-2xl bg-slate-50 p-4">
                                <p className="text-xs font-medium text-slate-500">
                                  {t(
                                    "demand"
                                  )}
                                </p>
                                <p className="mt-1 text-lg font-bold text-slate-900">
                                  {match.demand_quantity ??
                                    0}
                                  <span className="ml-1 text-xs font-medium text-slate-500">
                                    kg
                                  </span>
                                </p>
                              </div>

                              <div className="rounded-2xl bg-slate-50 p-4">
                                <p className="text-xs font-medium text-slate-500">
                                  {t(
                                    "distance"
                                  )}
                                </p>
                                <p className="mt-1 text-lg font-bold text-slate-900">
                                  {match.distance_km ??
                                    0}
                                  <span className="ml-1 text-xs font-medium text-slate-500">
                                    km
                                  </span>
                                </p>
                              </div>

                              <div className="rounded-2xl bg-slate-50 p-4">
                                <p className="text-xs font-medium text-slate-500">{t("buyerRating")}</p>
                                <p className="mt-1 flex items-center gap-1 text-lg font-bold text-slate-900">
                                  <Star className="h-4 w-4 fill-current text-amber-500" />
                                  {match.buyer_rating ??
                                    t(
                                      "notAvailable"
                                    )}
                                </p>
                              </div>
                            </div>

                            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                              <div className="mb-5 flex items-center justify-between gap-4">
                                <div>
                                  <h4 className="font-bold text-slate-900">{t("whyBuyerMatches")}</h4>
                                  <p className="mt-1 text-xs text-slate-500">
                                    {t("transparentScore")}
                                  </p>
                                </div>

                                <div className="rounded-xl bg-white px-3 py-2 text-sm font-bold text-emerald-700 shadow-sm">
                                  {match.match_percentage.toFixed(
                                    2
                                  )}
                                  /100
                                </div>
                              </div>

                              <div className="space-y-4">
                                {rows.map(
                                  (row) => (
                                    <div
                                      key={
                                        row.label
                                      }
                                    >
                                      <div className="mb-1.5 flex items-center justify-between gap-4 text-sm">
                                        <span className="font-medium text-slate-700">
                                          {
                                            row.label
                                          }
                                        </span>
                                        <span className="tabular-nums text-slate-500">
                                          {row.value.toFixed(
                                            2
                                          )}{" "}
                                          /{" "}
                                          {
                                            row.maximum
                                          }
                                        </span>
                                      </div>

                                      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                                        <div
                                          className="h-full rounded-full bg-emerald-600 transition-all"
                                          style={{
                                            width: `${scoreWidth(
                                              row.value,
                                              row.maximum
                                            )}%`,
                                          }}
                                        />
                                      </div>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>

                            <div className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                              <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                              <p className="text-sm leading-6 text-emerald-900">
                                {t("matchingDisclaimer")}
                              </p>
                            </div>
                          </div>
                        </article>
                      );
                    }
                  )}
                </div>
              )}
            </div>
          </section>
        )}
      </div>
      {/* =====================================================
          FARMER SELL CROP MODAL
      ===================================================== */}

      {userRole === "FARMER" &&
        sellModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-sm">
            <div className="flex min-h-full items-center justify-center py-6">
              <div className="w-full max-w-4xl overflow-hidden rounded-[32px] border border-white/10 bg-white shadow-2xl shadow-black/40">
                <div className="relative overflow-hidden border-b border-white/10 bg-gradient-to-r from-slate-950 via-emerald-950 to-slate-950 px-6 py-6 text-white sm:px-8">
                  <div className="flex items-start justify-between gap-5">
                    <div className="flex items-start gap-4">
                      <div className="rounded-2xl bg-white/15 p-3">
                        <PackagePlus className="h-7 w-7" />
                      </div>

                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">
                          Farmer Marketplace
                        </p>

                        <h2 className="mt-1 text-3xl font-black">{t("sellYourCrop")}</h2>

                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                          Select one of your registered crops, add sale details and crop photos, then publish it directly to AGRIVA Market.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={closeSellCropModal}
                      disabled={sellSubmitting}
                      className="rounded-xl bg-white/10 p-2 text-white transition hover:bg-white/20 disabled:opacity-50"
                      aria-label="Close sell crop dialog"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                </div>

                <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.1fr_0.9fr]">
                  <div>
                    {sellError && (
                      <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                        {sellError}
                      </div>
                    )}

                    <div className="grid gap-5 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <label className="text-sm font-bold text-slate-700">
                          Your Crop
                        </label>

                        {cropsLoading ? (
                          <div className="mt-2 flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-500">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading your crops...
                          </div>
                        ) : farmerCrops.length === 0 ? (
                          <div className="mt-2 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                            <p className="font-semibold text-amber-900">
                              No registered crop found.
                            </p>
                            <p className="mt-1 text-sm text-amber-700">
                              Add a crop to your farm first, then return here to list it for sale.
                            </p>
                          </div>
                        ) : (
                          <select
                            value={sellCropId}
                            onChange={(event) =>
                              selectSellCrop(
                                event.target.value
                              )
                            }
                            disabled={sellSubmitting}
                            className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3.5 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 disabled:bg-slate-100"
                          >
                            {farmerCrops.map(
                              (crop) => (
                                <option
                                  key={crop.id}
                                  value={crop.id}
                                >
                                  {crop.name}
                                  {crop.variety
                                    ? ` · ${crop.variety}`
                                    : ""}
                                  {crop.status
                                    ? ` · ${crop.status}`
                                    : ""}
                                </option>
                              )
                            )}
                          </select>
                        )}
                      </div>

                      <div>
                        <label className="text-sm font-bold text-slate-700">
                          Quantity for Sale (kg)
                        </label>

                        <input
                          type="number"
                          min="0.1"
                          step="0.1"
                          value={sellQuantity}
                          onChange={(event) =>
                            setSellQuantity(
                              event.target.value
                            )
                          }
                          disabled={sellSubmitting}
                          placeholder="e.g. 500"
                          className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3.5 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 disabled:bg-slate-100"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-bold text-slate-700">{t("qualityGrade")}</label>

                        <select
                          value={sellQuality}
                          onChange={(event) =>
                            setSellQuality(
                              event.target.value
                            )
                          }
                          disabled={sellSubmitting}
                          className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3.5 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 disabled:bg-slate-100"
                        >
                          <option value="A+">
                            A+ · Premium
                          </option>
                          <option value="A">{t("qualityHigh")}</option>
                          <option value="B">{t("qualityStandard")}</option>
                          <option value="C">
                            C · Economy
                          </option>
                        </select>
                      </div>

                      <div>
                        <label className="text-sm font-bold text-slate-700">{t("expectedPrice")}</label>

                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={sellPrice}
                          onChange={(event) =>
                            setSellPrice(
                              event.target.value
                            )
                          }
                          disabled={sellSubmitting}
                          placeholder="e.g. 28"
                          className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3.5 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 disabled:bg-slate-100"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-bold text-slate-700">
                          Harvest Date
                        </label>

                        <input
                          type="date"
                          value={sellHarvestDate}
                          onChange={(event) =>
                            setSellHarvestDate(
                              event.target.value
                            )
                          }
                          disabled={sellSubmitting}
                          className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3.5 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 disabled:bg-slate-100"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-sm font-bold text-slate-700">
                          Crop Location
                        </label>

                        <div className="relative mt-2">
                          <MapPin className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-400" />

                          <input
                            value={sellLocation}
                            onChange={(event) =>
                              setSellLocation(
                                event.target.value
                              )
                            }
                            disabled={sellSubmitting}
                            placeholder="Village / City, District, State"
                            className="w-full rounded-xl border border-slate-200 py-3.5 pl-11 pr-4 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 disabled:bg-slate-100"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-emerald-100 p-2.5 text-emerald-700">
                          <Camera className="h-5 w-5" />
                        </div>

                        <div>
                          <h3 className="font-bold text-slate-900">
                            Crop Photos
                          </h3>
                          <p className="text-xs text-slate-500">
                            {t("imageHelp")}
                          </p>
                        </div>
                      </div>

                      <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-emerald-200 bg-white px-5 py-7 text-center transition hover:border-emerald-400 hover:bg-emerald-50/40">
                        <ImagePlus className="h-9 w-9 text-emerald-600" />

                        <span className="mt-3 font-bold text-slate-800">{t("addCropPhotos")}</span>

                        <span className="mt-1 text-xs text-slate-500">
                          Select from your computer or phone
                        </span>

                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          multiple
                          onChange={selectSellImages}
                          disabled={sellSubmitting}
                          className="sr-only"
                        />
                      </label>

                      {sellImages.length > 0 ? (
                        <div className="mt-5 grid grid-cols-2 gap-3">
                          {sellImages.map(
                            (item, index) => (
                              <div
                                key={`${item.file.name}-${index}`}
                                className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white"
                              >
                                <img
                                  src={item.previewUrl}
                                  alt={`Crop preview ${index + 1}`}
                                  className="h-28 w-full object-cover"
                                />

                                <button
                                  type="button"
                                  onClick={() =>
                                    removeSellImage(
                                      index
                                    )
                                  }
                                  disabled={sellSubmitting}
                                  className="absolute right-2 top-2 rounded-lg bg-slate-950/70 p-1.5 text-white transition hover:bg-red-600 disabled:opacity-50"
                                  aria-label={`Remove image ${index + 1}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>

                                <p className="truncate px-3 py-2 text-xs font-medium text-slate-600">
                                  {item.file.name}
                                </p>
                              </div>
                            )
                          )}
                        </div>
                      ) : (
                        <div className="mt-5 rounded-2xl bg-white p-4 text-sm leading-6 text-slate-500">
                          Photos are optional, but clear crop photos help buyers evaluate your produce faster.
                        </div>
                      )}
                    </div>

                    <div className="mt-5 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50 p-4">
                      <div className="flex gap-3">
                        <Upload className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                        <p className="text-sm leading-6 text-emerald-900">
                          Publishing creates a live marketplace listing. You can then use <strong>Find Best Buyers</strong> to rank compatible buyers for this crop.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        void publishCropListing()
                      }
                      disabled={
                        sellSubmitting ||
                        cropsLoading ||
                        farmerCrops.length === 0
                      }
                      className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-5 py-4 font-black text-white shadow-lg shadow-emerald-700/20 transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {sellSubmitting ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Publishing...
                        </>
                      ) : (
                        <>
                          <PackagePlus className="h-5 w-5" />
                          Publish for Sale
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* =====================================================
          BUYER ORDER MODAL
      ===================================================== */}

      {userRole === "BUYER" &&
        orderingListing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
            <div className="w-full max-w-xl rounded-[32px] border border-slate-200 bg-white p-7 shadow-2xl shadow-black/40">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-bold text-slate-900">{t("placeOrder")}</h2>

                  <p className="mt-2 text-slate-500">
                    {localizeMarketplaceCrop(orderingListing.crop, locale)}
                    {" · ₹"}
                    {
                      orderingListing.expected_price_per_kg
                    }
                    /kg
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeOrderModal}
                  disabled={placingOrder}
                  className="rounded-xl bg-slate-100 px-4 py-2 text-xl text-slate-600 transition hover:bg-slate-200 disabled:opacity-50"
                  aria-label="Close order dialog"
                >
                  ×
                </button>
              </div>

              <div className="mt-8">
                <label className="font-semibold text-slate-700">
                  Quantity (kg)
                </label>

                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  max={
                    orderingListing.quantity_kg
                  }
                  value={orderQuantity}
                  onChange={(event) =>
                    setOrderQuantity(
                      event.target.value
                    )
                  }
                  className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-4 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                />

                <p className="mt-2 text-sm text-slate-500">
                  Available:{" "}
                  {
                    orderingListing.quantity_kg
                  }{" "}
                  kg
                </p>
              </div>

              <div className="mt-6 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50 p-5">
                <p className="text-sm text-emerald-700">
                  Estimated Total
                </p>

                <p className="mt-2 text-3xl font-bold text-emerald-800">
                  ₹
                  {(
                    Math.max(
                      0,
                      Number(
                        orderQuantity
                      ) || 0
                    ) *
                    orderingListing.expected_price_per_kg
                  ).toFixed(2)}
                </p>
              </div>

              <div className="mt-7 grid grid-cols-2 gap-4">
                <button
                  type="button"
                  disabled={placingOrder}
                  onClick={closeOrderModal}
                  className="rounded-xl border border-slate-300 px-4 py-4 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={placingOrder}
                  onClick={() =>
                    void placeOrder()
                  }
                  className="flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-4 font-black text-white shadow-lg shadow-emerald-700/20 transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {placingOrder && (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  )}

                  {placingOrder
                    ? "Placing..."
                    : "Confirm Order"}
                </button>
              </div>
            </div>
          </div>
        )}

    </main>
  );
}