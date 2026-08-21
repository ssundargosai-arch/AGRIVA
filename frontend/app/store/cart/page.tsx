import Link from "next/link";

export default function CartPage() {
  return (
    <main className="min-h-screen p-10">
      <h1 className="text-3xl font-bold">
        AGRIVA Cart
      </h1>

      <p className="mt-3">
        Cart page is working.
      </p>

      <Link
        href="/store/checkout"
        className="mt-6 inline-block"
      >
        Checkout
      </Link>
    </main>
  );
}
