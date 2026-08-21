import Link from "next/link";

export default function StorePage() {
  return (
    <main className="min-h-screen p-10">
      <h1 className="text-3xl font-bold">
        AGRIVA Store
      </h1>

      <p className="mt-3">
        Phase 7 Store is running.
      </p>

      <div className="mt-6 flex gap-4">
        <Link href="/store/products">
          Products
        </Link>

        <Link href="/store/cart">
          Cart
        </Link>
      </div>
    </main>
  );
}
