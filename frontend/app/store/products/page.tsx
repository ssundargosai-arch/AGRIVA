"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Search,
  ShoppingCart,
  Sparkles,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000";

type Product = {
  id: string;
  category_id: string;
  name: string;
  description?: string | null;
  price: number;
  stock_quantity: number;
};

type Category = {
  id: string;
  name: string;
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [sort, setSort] = useState("name");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const queryString = useMemo(() => {
    const params = new URLSearchParams();

    if (search.trim()) {
      params.set("search", search.trim());
    }

    if (categoryId) {
      params.set("category_id", categoryId);
    }

    params.set("sort", sort);

    return params.toString();
  }, [search, categoryId, sort]);

  useEffect(() => {
    async function loadCategories() {
      try {
        const response = await fetch(
          `${API_URL}/api/store/categories`
        );

        if (!response.ok) {
          throw new Error("Unable to load categories");
        }

        const data = await response.json();

        setCategories(data.categories || []);
      } catch (err) {
        console.error(err);
      }
    }

    loadCategories();
  }, []);

  useEffect(() => {
    async function loadProducts() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `${API_URL}/api/store/products?${queryString}`
        );

        if (!response.ok) {
          throw new Error("Unable to load products");
        }

        const data = await response.json();

        setProducts(data.products || []);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load products"
        );
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, [queryString]);

  async function addToCart(productId: string) {
    const token = localStorage.getItem("access_token");

    if (!token) {
      setMessage("Please login first.");
      return;
    }

    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/api/store/cart/items?product_id=${productId}&quantity=1`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to add product"
        );
      }

      setMessage("Product added to cart");
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : "Unable to add product"
      );
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/store"
            className="flex items-center gap-2 text-slate-600 hover:text-green-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Store
          </Link>

          <Link
            href="/store/cart"
            className="flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2 text-white hover:bg-green-800"
          >
            <ShoppingCart className="h-4 w-4" />
            Cart
          </Link>
        </div>

        <div className="mt-8">
          <h1 className="text-3xl font-bold text-slate-900">
            AGRIVA Products
          </h1>

          <p className="mt-2 text-slate-600">
            Search, filter and sort farming products.
          </p>
        </div>

        <div className="mt-8 grid gap-4 rounded-2xl border bg-white p-5 md:grid-cols-3">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search products..."
              className="w-full rounded-lg border py-2 pl-10 pr-3 outline-none focus:border-green-600"
            />
          </div>

          <select
            value={categoryId}
            onChange={(event) =>
              setCategoryId(event.target.value)
            }
            className="rounded-lg border px-3 py-2"
          >
            <option value="">
              All categories
            </option>

            {categories.map((category) => (
              <option
                key={category.id}
                value={category.id}
              >
                {category.name}
              </option>
            ))}
          </select>

          <select
            value={sort}
            onChange={(event) =>
              setSort(event.target.value)
            }
            className="rounded-lg border px-3 py-2"
          >
            <option value="name">
              Name
            </option>

            <option value="price_low">
              Price: Low to High
            </option>

            <option value="price_high">
              Price: High to Low
            </option>
          </select>
        </div>

        {message && (
          <div className="mt-5 rounded-lg bg-green-50 p-3 text-green-800">
            {message}
          </div>
        )}

        {error && (
          <div className="mt-5 rounded-lg bg-red-50 p-3 text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <p className="mt-8 text-slate-500">
            Loading products...
          </p>
        ) : products.length === 0 ? (
          <div className="mt-8 rounded-2xl border bg-white p-8 text-center text-slate-500">
            No products found.
          </div>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <article
                key={product.id}
                className="rounded-2xl border bg-white p-5 shadow-sm"
              >
                <div className="mb-4 flex h-32 items-center justify-center rounded-xl bg-green-50">
                  <Sparkles className="h-10 w-10 text-green-600" />
                </div>

                <h2 className="text-lg font-semibold text-slate-900">
                  {product.name}
                </h2>

                <p className="mt-2 min-h-12 text-sm text-slate-500">
                  {product.description ||
                    "AGRIVA farming product"}
                </p>

                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xl font-bold text-green-700">
                    ₹
                    {Number(
                      product.price
                    ).toLocaleString("en-IN")}
                  </span>

                  <span className="text-xs text-slate-500">
                    Stock: {product.stock_quantity}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    addToCart(product.id)
                  }
                  disabled={
                    product.stock_quantity <= 0
                  }
                  className="mt-5 w-full rounded-lg bg-green-700 px-4 py-2 font-medium text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {product.stock_quantity > 0
                    ? "Add to Cart"
                    : "Out of Stock"}
                </button>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}