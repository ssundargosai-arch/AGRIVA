import {
  ArrowRight,
  CloudSun,
  Leaf,
  Sprout,
  Store
} from "lucide-react";

const navItems = [
  ["Home", "#home"],
  ["AGRIVA AI", "#ai"],
  ["AGRIVA Soil", "#soil"],
  ["Market", "#market"]
];

export default function HomePage() {
  return (
    <main id="home" className="min-h-screen">
      <nav className="sticky top-0 z-20 border-b border-green-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <a
            href="#home"
            className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-agriva-700"
          >
            <Leaf className="h-6 w-6" />
            AGRIVA
          </a>

          <div className="hidden items-center gap-6 text-sm font-medium md:flex">
            {navItems.map(([label, href]) => (
              <a
                key={href}
                href={href}
                className="transition hover:text-agriva-700"
              >
                {label}
              </a>
            ))}
          </div>

          <a
            href="#get-started"
            className="rounded-full bg-agriva-700 px-4 py-2 text-sm font-semibold text-white hover:bg-agriva-800"
          >
            Get Started
          </a>
        </div>
      </nav>

      <section className="mx-auto grid max-w-7xl gap-12 px-6 py-20 md:grid-cols-2 md:items-center md:py-28">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-agriva-100 px-4 py-2 text-sm font-semibold text-agriva-800">
            <Sprout className="h-4 w-4" />
            Smart farming ecosystem
          </div>

          <h1 className="text-5xl font-black tracking-tight text-green-950 md:text-7xl">
            AGRIVA
          </h1>

          <p className="mt-3 text-2xl font-bold text-agriva-700 md:text-3xl">
            Empowering Farmers, Connecting Markets.
          </p>

          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
            From Soil to Sale — a connected foundation for smarter farming,
            better decisions, and stronger market access.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <a
              href="#get-started"
              className="inline-flex items-center gap-2 rounded-xl bg-agriva-700 px-6 py-3 font-semibold text-white hover:bg-agriva-800"
            >
              Explore AGRIVA
              <ArrowRight className="h-5 w-5" />
            </a>

            <a
              href="#modules"
              className="rounded-xl border border-green-200 bg-white px-6 py-3 font-semibold text-green-900 hover:bg-green-50"
            >
              View Modules
            </a>
          </div>
        </div>

        <div className="rounded-3xl border border-green-100 bg-white p-8 shadow-xl">
          <div className="rounded-2xl bg-gradient-to-br from-agriva-100 to-white p-8">
            <Leaf className="h-16 w-16 text-agriva-700" />

            <p className="mt-8 text-sm font-bold uppercase tracking-[0.2em] text-agriva-700">
              From Soil to Sale
            </p>

            <p className="mt-3 text-3xl font-extrabold text-green-950">
              One connected farming journey.
            </p>
          </div>
        </div>
      </section>

      <section
        id="modules"
        className="border-y border-green-100 bg-white"
      >
        <div className="mx-auto max-w-7xl px-6 py-16">
          <p className="text-sm font-bold uppercase tracking-widest text-agriva-700">
            Foundation
          </p>

          <h2 className="mt-2 text-3xl font-extrabold text-green-950">
            Built for the complete farmer journey
          </h2>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Module
              icon={<Leaf />}
              title="AGRIVA Soil"
              description="Soil-focused smart farming foundation."
            />

            <Module
              icon={<Sprout />}
              title="AGRIVA AI"
              description="AI-ready decision support foundation."
            />

            <Module
              icon={<Store />}
              title="AGRIVA Store"
              description="A foundation for agricultural products."
            />

            <Module
              icon={<CloudSun />}
              title="AGRIVA Insights"
              description="A future-ready insights experience."
            />
          </div>
        </div>
      </section>

      <section id="ai" className="sr-only">
        AGRIVA AI module
      </section>

      <section id="soil" className="sr-only">
        AGRIVA Soil module
      </section>

      <section id="market" className="sr-only">
        AGRIVA Market module
      </section>

      <section
        id="get-started"
        className="mx-auto max-w-7xl px-6 py-20"
      >
        <div className="rounded-3xl bg-green-950 px-8 py-12 text-white md:px-12">
          <p className="text-sm font-bold uppercase tracking-widest text-green-200">
            Phase 1
          </p>

          <h2 className="mt-3 text-3xl font-extrabold">
            AGRIVA foundation is ready.
          </h2>

          <p className="mt-3 max-w-2xl text-green-100">
            This initialization phase establishes the frontend, FastAPI
            backend, PostgreSQL connection, environment configuration,
            and Docker setup.
          </p>
        </div>
      </section>

      <footer className="border-t border-green-100 bg-white py-8 text-center text-sm text-slate-500">
        AGRIVA — Empowering Farmers, Connecting Markets.
      </footer>
    </main>
  );
}

function Module({
  icon,
  title,
  description
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <article className="rounded-2xl border border-green-100 bg-green-50/50 p-6">
      <div className="h-7 w-7 text-agriva-700">
        {icon}
      </div>

      <h3 className="mt-5 font-bold text-green-950">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-slate-600">
        {description}
      </p>
    </article>
  );
}