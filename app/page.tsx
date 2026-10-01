import Link from "next/link";
import { LogoMark } from "./components/Branding";
import { MatrixRain } from "./components/MatrixRain";
import { prisma } from "@/lib/prisma";
import {
  ArrowRight,
  ShoppingCart,
  Users,
  Shield,
  Wallet,
  PackageCheck,
} from "lucide-react";

// Live counters (tools/vendors/orders) must never be served from a build-time cache.
export const dynamic = "force-dynamic";

export const metadata = {
  description:
    "Multi-vendor market for SMTP servers, RDPs, mailers and digital tools — escrow-backed, instant delivery, buyer protection on every order.",
};

const BRAND = "var(--brand-color, #dc2626)";

type CategoryTile = { slug: string; name: string; count: number };

async function getHomeData() {
  try {
    const [site, tools, vendors, orders, categories, byCat] = await Promise.all([
      prisma.setting.findUnique({ where: { key: "siteName" } }),
      prisma.product.count(),
      prisma.user.count({ where: { role: "SELLER" } }),
      prisma.order.count(),
      prisma.category.findMany({ select: { slug: true, name: true } }),
      prisma.product.groupBy({ by: ["categorySlug"], _count: { _all: true } }),
    ]);

    const counts = new Map<string, number>(
      byCat.map((c) => [c.categorySlug ?? "", c._count._all])
    );

    return {
      siteName: site?.value || "Proplux",
      tools,
      vendors,
      orders,
      categories: categories.map((c) => ({
        slug: c.slug,
        name: c.name,
        count: counts.get(c.slug) ?? 0,
      })) as CategoryTile[],
    };
  } catch {
    return {
      siteName: "Proplux",
      tools: 0,
      vendors: 0,
      orders: 0,
      categories: [] as CategoryTile[],
    };
  }
}

const pad = (n: number) => String(n).padStart(2, "0");

export default async function Home() {
  const { siteName, tools, vendors, orders, categories } = await getHomeData();

  const ticker = [
    "systems online",
    "escrow enabled",
    "instant auto-delivery",
    `${categories.length || 13} categories live`,
    "buyer protection on every order",
    "fresh drops daily",
  ];

  const features = [
    {
      icon: ShoppingCart,
      tag: "01",
      title: "instant_purchases",
      body: "Fund your balance, buy items in bulk, and access them immediately from your orders page.",
    },
    {
      icon: Users,
      tag: "02",
      title: "multi_vendor",
      body: "Any seller can list tools. Earn 65% of every sale and withdraw whenever you want.",
    },
    {
      icon: Shield,
      tag: "03",
      title: "buyer_protection",
      body: "Report bad orders inside the report window. Admins review every single report.",
    },
  ];

  const steps = ["register", "deposit balance", "buy tools", "instant delivery"];

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950">
      {/* ticker */}
      <div className="overflow-hidden border-b border-green-500/20 bg-black py-1.5">
        <div className="marquee-track flex w-max font-mono text-[11px] uppercase tracking-widest text-green-500/80">
          {[0, 1].map((dup) => (
            <span key={dup} className="flex shrink-0">
              {ticker.map((t, i) => (
                <span key={`${dup}-${i}`} className="flex items-center">
                  <span className="px-5">{t}</span>
                  <span className="text-green-700/60">◆</span>
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* header */}
      <header className="border-b border-zinc-800 bg-black/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <LogoMark size={30} />
            <span className="font-mono text-sm font-bold tracking-tight text-white">
              {siteName.toLowerCase()}
              <span style={{ color: BRAND }}>.</span>
              <span className="text-green-400">market</span>
            </span>
          </Link>
          <nav className="flex items-center gap-3">
            <Link
              href="/products"
              className="hidden font-mono text-xs text-zinc-400 transition hover:text-green-400 sm:block"
            >
              /market
            </Link>
            <Link
              href="/login"
              className="rounded-md border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="rounded-md px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              style={{ backgroundColor: BRAND }}
            >
              Register
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* hero */}
        <section className="relative overflow-hidden border-b border-zinc-800 bg-black">
          <MatrixRain className="absolute inset-0 h-full w-full opacity-70" />
          <div className="scanlines pointer-events-none absolute inset-0 opacity-30" />

          <div className="relative z-10 mx-auto grid max-w-6xl gap-10 px-4 py-16 md:px-8 md:py-24 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="font-mono text-xs">
                <span className="text-zinc-500">root@{siteName.toLowerCase()}:~#</span>{" "}
                <span className="text-green-400 text-glow">open_market</span>
                <span className="blink-cursor ml-0.5 text-green-400">▊</span>
              </p>

              <h1 className="glitch-text mt-5 text-4xl font-black uppercase leading-[0.95] tracking-tight text-white md:text-6xl">
                The underground
                <br />
                <span style={{ color: BRAND }}>tool market</span>
              </h1>

              <p className="mt-5 max-w-xl font-mono text-sm leading-relaxed text-zinc-400">
                <span className="text-green-500">&gt;</span> Buy and sell SMTP servers, RDPs,
                mailers and digital tools — escrowed, instant delivery, multi-vendor.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/register"
                  className="flex items-center justify-center gap-2 rounded-md px-6 py-3 text-sm font-semibold text-white hover:opacity-90"
                  style={{ backgroundColor: BRAND }}
                >
                  Create Account <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/products"
                  className="glow-green flex items-center justify-center gap-2 rounded-md border border-green-500/50 bg-black px-6 py-3 font-mono text-sm font-semibold text-green-400 transition hover:border-green-400 hover:text-green-300"
                >
                  browse_market <span aria-hidden>→</span>
                </Link>
              </div>
            </div>

            {/* terminal */}
            <div className="glow-green rounded-lg border border-green-500/30 bg-black/85 font-mono text-[13px] shadow-2xl">
              <div className="flex items-center gap-2 border-b border-green-500/20 px-4 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
                <span className="ml-2 text-[11px] text-zinc-500">
                  proplux@market: ~
                </span>
              </div>
              <div className="space-y-2 p-5 leading-relaxed">
                <p>
                  <span className="text-zinc-500">root@market:~$</span>{" "}
                  <span className="text-white">./status --all</span>
                </p>
                <p className="flex items-baseline gap-2">
                  <span className="text-green-500">[ok]</span>
                  <span className="text-zinc-400">escrow</span>
                  <span className="flex-1 border-b border-dotted border-zinc-700" />
                  <span className="text-green-400">active</span>
                </p>
                <p className="flex items-baseline gap-2">
                  <span className="text-green-500">[ok]</span>
                  <span className="text-zinc-400">delivery</span>
                  <span className="flex-1 border-b border-dotted border-zinc-700" />
                  <span className="text-green-400">instant</span>
                </p>
                <p className="flex items-baseline gap-2">
                  <span className="text-zinc-500">[..]</span>
                  <span className="text-zinc-400">categories</span>
                  <span className="flex-1 border-b border-dotted border-zinc-700" />
                  <span className="text-white">{pad(categories.length)}</span>
                </p>
                <p className="flex items-baseline gap-2">
                  <span className="text-zinc-500">[..]</span>
                  <span className="text-zinc-400">vendors</span>
                  <span className="flex-1 border-b border-dotted border-zinc-700" />
                  <span className="text-white">{pad(vendors)}</span>
                </p>
                <p className="flex items-baseline gap-2">
                  <span className="text-zinc-500">[..]</span>
                  <span className="text-zinc-400">orders settled</span>
                  <span className="flex-1 border-b border-dotted border-zinc-700" />
                  <span className="text-white">{pad(orders)}</span>
                </p>
                <p className="pt-1">
                  <span className="text-zinc-500">root@market:~$</span>{" "}
                  <span className="blink-cursor text-green-400">▊</span>
                </p>
              </div>
            </div>
          </div>

          {/* live stats */}
          <div className="relative z-10 border-t border-green-500/15 bg-black/70">
            <div className="mx-auto grid max-w-6xl grid-cols-2 divide-x divide-green-500/10 px-4 font-mono md:grid-cols-4 md:px-8">
              {[
                { k: "tools_listed", v: tools },
                { k: "active_vendors", v: vendors },
                { k: "orders_settled", v: orders },
                { k: "categories", v: categories.length },
              ].map((s) => (
                <div key={s.k} className="px-4 py-4 text-center md:py-5">
                  <div className="text-2xl font-bold text-green-400 text-glow md:text-3xl">
                    {pad(s.v)}
                  </div>
                  <div className="mt-1 text-[11px] uppercase tracking-widest text-zinc-500">
                    {s.k}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* categories */}
        <section className="mx-auto max-w-6xl px-4 py-16 md:px-8">
          <div className="mb-6 flex items-baseline justify-between">
            <h2 className="font-mono text-lg font-bold text-white">
              <span style={{ color: BRAND }}>#</span> market_categories
            </h2>
            <Link
              href="/products"
              className="font-mono text-xs text-green-400 transition hover:text-green-300"
            >
              view_all →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {categories.map((c) => (
              <Link
                key={c.slug}
                href={`/products?category=${encodeURIComponent(c.slug)}`}
                className="group rounded-md border border-zinc-800 bg-zinc-950/60 p-4 transition hover:border-green-500/60 hover:bg-green-500/5 hover:shadow-[0_0_20px_rgba(34,197,94,0.12)]"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-mono text-sm text-white transition group-hover:text-green-300">
                    /{c.slug}
                  </span>
                  <span
                    className={`shrink-0 font-mono text-[11px] ${
                      c.count > 0 ? "text-green-500" : "text-zinc-600"
                    }`}
                  >
                    [{pad(c.count)}]
                  </span>
                </div>
                <p className="mt-1 truncate text-xs text-zinc-500">{c.name}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* features */}
        <section className="border-y border-zinc-800 bg-black/40">
          <div className="mx-auto grid max-w-6xl grid-cols-1 divide-y divide-zinc-800 px-4 md:grid-cols-3 md:divide-x md:divide-y-0 md:px-8">
            {features.map((f) => (
              <div key={f.tag} className="p-6 md:p-8">
                <f.icon className="mb-4 h-5 w-5 text-green-500" />
                <h3 className="font-mono text-sm font-bold text-white">
                  <span className="text-zinc-600">[{f.tag}]</span> {f.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* how it works */}
        <section className="mx-auto max-w-6xl px-4 py-14 md:px-8">
          <div className="flex flex-col items-center justify-center gap-4 md:flex-row md:flex-wrap">
            <span className="font-mono text-xs uppercase tracking-widest text-zinc-500">
              <Wallet className="mr-1 inline h-3.5 w-3.5" /> how_it_works:
            </span>
            {steps.map((s, i) => (
              <span key={s} className="flex items-center gap-3">
                <span className="rounded border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 font-mono text-xs text-zinc-300">
                  <span className="text-green-500">{i + 1}.</span> {s}
                </span>
                {i < steps.length - 1 && (
                  <span className="font-mono text-green-600">→</span>
                )}
              </span>
            ))}
            <span className="flex items-center gap-1.5 font-mono text-xs text-zinc-500">
              <PackageCheck className="h-3.5 w-3.5 text-green-500" /> no waiting, no
              middlemen
            </span>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-800 py-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 font-mono text-xs text-zinc-500 sm:flex-row md:px-8">
          <span>
            &copy; {new Date().getFullYear()} {siteName} — all rights reserved
          </span>
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
            status: <span className="text-green-500">online</span>
          </span>
        </div>
      </footer>
    </div>
  );
}
