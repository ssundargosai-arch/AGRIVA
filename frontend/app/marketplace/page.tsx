

"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Heart,
  Loader2,
  MapPin,
  Search,
  ShoppingBasket,
  Star,
  Wheat,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

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

type BuyerMatch = {
  buyer_id: string;
  buyer_name: string;
  match_percentage: number;
  offer_price: number | null;
  demand_quantity: number | null;
  distance_km: number | null;
  buyer_rating: number | null;
};

export default function MarketplacePage() {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const [quality, setQuality] = useState("");

  const [selectedListing, setSelectedListing] =
    useState<MarketplaceListing | null>(null);

  const [matches, setMatches] = useState<BuyerMatch[]>([]);
  const [matchLoading, setMatchLoading] = useState(false);

  useEffect(() => {
    loadMarketplace();
  }, []);

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
        throw new Error("Unable to load marketplace listings");
      }

      const data: MarketplaceListing[] = await response.json();

      setListings(data);

      const token = localStorage.getItem("access_token");

      if (token) {
        await loadFavorites(token);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  }

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

      const data: MarketplaceListing[] = await response.json();

      setFavorites(data.map((item) => item.id));
    } catch {
      // Ignore favorites loading failure
    }
  }

  async function toggleFavorite(listingId: string) {
    const token = localStorage.getItem("access_token");

    if (!token) {
      alert("Please login first");
      return;
    }

    const isFavorite = favorites.includes(listingId);

    try {
      const response = await fetch(
        `${API_URL}/api/marketplace/favorites/${listingId}`,
        {
          method: isFavorite ? "DELETE" : "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const result = await response.json().catch(() => null);

        throw new Error(
          result?.detail || "Unable to update favorite"
        );
      }

      if (isFavorite) {
        setFavorites((current) =>
          current.filter((id) => id !== listingId)
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
          : "Unable to update favorite"
      );
    }
  }

  async function findBuyerMatches(
    listing: MarketplaceListing
  ) {
    const token = localStorage.getItem("access_token");

    if (!token) {
      alert("Please login as farmer first");
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

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.detail || "Unable to find buyer matches"
        );
      }

      setMatches(result.matches || []);
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Unable to find buyer matches"
      );
    } finally {
      setMatchLoading(false);
    }
  }

  const filteredListings = useMemo(() => {
    return listings.filter((listing) => {
      const cropMatch = listing.crop
        .toLowerCase()
        .includes(search.toLowerCase());

      const locationMatch = listing.location
        .toLowerCase()
        .includes(location.toLowerCase());

      const qualityMatch =
        quality === "" ||
        listing.quality_grade?.toLowerCase() ===
          quality.toLowerCase();

      return cropMatch && locationMatch && qualityMatch;
    });
  }, [listings, search, location, quality]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 text-slate-700">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading AGRIVA Marketplace...</span>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      {/* HEADER */}
      <section className="bg-emerald-700 text-white">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="flex items-center gap-3">
            <ShoppingBasket className="h-9 w-9" />

            <div>
              <h1 className="text-3xl font-bold">
                AGRIVA Marketplace
              </h1>

              <p className="mt-1 text-emerald-100">
                Discover crops and connect farmers with buyers.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* FILTERS */}
        <section className="mb-8 rounded-2xl bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search crop..."
                className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-3 outline-none focus:border-emerald-500"
              />
            </div>

            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-5 w-5 text-slate-400" />

              <input
                value={location}
                onChange={(event) =>
                  setLocation(event.target.value)
                }
                placeholder="Location..."
                className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-3 outline-none focus:border-emerald-500"
              />
            </div>

            <select
              value={quality}
              onChange={(event) =>
                setQuality(event.target.value)
              }
              className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500"
            >
              <option value="">All quality grades</option>
              <option value="A">Grade A</option>
              <option value="B">Grade B</option>
              <option value="C">Grade C</option>
            </select>
          </div>
        </section>

        {error && (
          <div className="mb-6 rounded-xl bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {/* LISTINGS */}
        {filteredListings.length === 0 ? (
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
            <Wheat className="mx-auto h-12 w-12 text-slate-300" />

            <h2 className="mt-4 text-xl font-semibold">
              No marketplace listings found
            </h2>

            <p className="mt-2 text-slate-500">
              Try changing your crop, location, or quality filters.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredListings.map((listing) => {
              const isFavorite = favorites.includes(
                listing.id
              );

              return (
                <article
                  key={listing.id}
                  className="overflow-hidden rounded-2xl bg-white shadow-sm transition hover:shadow-md"
                >
                  <div className="relative h-52 bg-emerald-50">
                    {listing.images?.length > 0 ? (
                      <img
                        src={listing.images[0]}
                        alt={listing.crop}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Wheat className="h-20 w-20 text-emerald-300" />
                      </div>
                    )}

                    <button
                      onClick={() =>
                        toggleFavorite(listing.id)
                      }
                      className="absolute right-4 top-4 rounded-full bg-white p-2 shadow"
                      aria-label="Favorite"
                    >
                      <Heart
                        className={`h-5 w-5 ${
                          isFavorite
                            ? "fill-red-500 text-red-500"
                            : "text-slate-600"
                        }`}
                      />
                    </button>

                    <div className="absolute bottom-4 left-4 rounded-full bg-emerald-700 px-3 py-1 text-sm font-medium text-white">
                      Grade{" "}
                      {listing.quality_grade || "N/A"}
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-2xl font-bold text-slate-900">
                          {listing.crop}
                        </h2>

                        <div className="mt-2 flex items-center gap-1 text-sm text-slate-500">
                          <MapPin className="h-4 w-4" />
                          {listing.location}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xl font-bold text-emerald-700">
                          ₹
                          {listing.expected_price_per_kg}
                        </div>

                        <div className="text-xs text-slate-500">
                          per kg
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">
                          Quantity
                        </p>

                        <p className="font-semibold">
                          {listing.quantity_kg} kg
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">
                          Status
                        </p>

                        <p className="font-semibold capitalize">
                          {listing.status}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        findBuyerMatches(listing)
                      }
                      className="mt-5 w-full rounded-xl bg-emerald-700 px-4 py-3 font-semibold text-white transition hover:bg-emerald-800"
                    >
                      Find Best Buyers
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* BUYER MATCHES */}
        {selectedListing && (
          <section className="mt-10 rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900">
                Buyer Matches
              </h2>

              <p className="mt-1 text-slate-500">
                Best buyers for {selectedListing.crop}
              </p>
            </div>

            {matchLoading ? (
              <div className="flex items-center gap-3 py-8">
                <Loader2 className="h-5 w-5 animate-spin" />
                Finding the best buyers...
              </div>
            ) : matches.length === 0 ? (
              <p className="text-slate-500">
                No buyer matches found.
              </p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {matches.map((match) => (
                  <div
                    key={match.buyer_id}
                    className="rounded-xl border border-slate-200 p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-bold">
                          {match.buyer_name}
                        </h3>

                        <div className="mt-2 flex items-center gap-1 text-amber-600">
                          <Star className="h-4 w-4 fill-current" />

                          <span>
                            {match.buyer_rating ?? "N/A"}
                          </span>
                        </div>
                      </div>

                      <div className="rounded-full bg-emerald-100 px-4 py-2 font-bold text-emerald-700">
                        {match.match_percentage}%
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-slate-500">
                          Offer
                        </p>

                        <p className="font-semibold">
                          ₹{match.offer_price ?? 0}/kg
                        </p>
                      </div>

                      <div>
                        <p className="text-slate-500">
                          Demand
                        </p>

                        <p className="font-semibold">
                          {match.demand_quantity ?? 0} kg
                        </p>
                      </div>

                      <div>
                        <p className="text-slate-500">
                          Distance
                        </p>

                        <p className="font-semibold">
                          {match.distance_km ?? 0} km
                        </p>
                      </div>

                      <div>
                        <p className="text-slate-500">
                          Match
                        </p>

                        <p className="font-semibold">
                          {match.match_percentage}%
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}