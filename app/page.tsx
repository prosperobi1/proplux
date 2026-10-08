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
    "Secure multi-vendor digital marketplace with escrow-backed transactions, instant delivery and buyer protection on every order.",
};

const BRAND = "var(--brand-color, #dc2626)";

async function getHomeData() {
  try {
    const [site, vendors, orders] = await Promise.all([
      prisma.setting.findUnique({ where: { key: "siteName" } }),
      prisma.user.count({ where: { role: "SELLER" } }),
      prisma.order.count(),
    ]);
    return {
      siteName: site?.value || "Proplux",
      vendors,
      orders,
    };
  } catch {
    return { siteName: "Proplux", vendors: 0, orders: 0 };
  }
}

const pad = (n: number) => String(n).padStart(2, "0");

export default async function Home() {
  const { siteName, vendors, orders } = await getHomeData();

  const ticker = [
    "systems online",
    "escrow enabled",
    "instant auto-delivery",
    "buyer protection on every order",
    "fresh stock daily",
    "support around the clock",
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
      <div className="overflow-hidden border-b border-red-500/20 bg-black py-1.5">
        <div className="marquee-track flex w-max font-mono text-[11px] uppercase tracking-widest text-red-400/80">
          {[0, 1].map((dup) => (
            <span key={dup} className="flex shrink-0">
              {ticker.map((t, i) => (
                <span key={`${dup}-${i}`} className="flex items-center">
                  <span className="px-5">{t}</span>
                  <span className="text-red-900/70">◆</span>
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
            <span className="hidden font-mono text-sm font-bold tracking-tight text-white sm:inline">
              {siteName.toLowerCase()}
              <span style={{ color: BRAND }}>.</span>
              <span className="text-red-400">market</span>
            </span>
          </Link>
          <nav className="flex items-center gap-3">
            <Link
              href="/products"
              className="hidden font-mono text-xs text-zinc-400 transition hover:text-red-400 sm:block"
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
          <MatrixRain className="absolute inset-0 h-full w-full opacity-85" />
          <div className="scanlines pointer-events-none absolute inset-0 opacity-30" />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at center, transparent 42%, rgba(0,0,0,0.5) 100%)",
            }}
          />

          <div className="relative z-10 mx-auto grid max-w-6xl gap-10 px-4 py-16 md:px-8 md:py-24 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="reveal reveal-1 font-mono text-xs">
                <span className="text-zinc-500">root@{siteName.toLowerCase()}:~#</span>{" "}
                <span className="text-glow" style={{ color: BRAND }}>
                  open_market
                </span>
                <span className="blink-cursor ml-0.5" style={{ color: BRAND }}>
                  ▊
                </span>
              </p>

              <div className="reveal reveal-2">
                <h1 className="glitch-text mt-5 text-3xl font-black uppercase leading-[0.95] tracking-tight text-white sm:text-4xl md:text-5xl">
                  The underground
                  <br />
                  <span className="text-glow" style={{ color: BRAND }}>
                    tool market
                  </span>
                </h1>
              </div>

              <p className="reveal reveal-3 mt-5 max-w-xl font-mono text-sm leading-relaxed text-zinc-400">
                <span style={{ color: BRAND }}>&gt;</span> Buy and sell digital tools with
                escrow, instant delivery and full buyer protection.
              </p>

              <div className="reveal reveal-4 mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/register"
                  className="btn-pulse flex items-center justify-center gap-2 rounded-md px-6 py-3 text-sm font-semibold text-white hover:opacity-90"
                  style={{ backgroundColor: BRAND }}
                >
                  Create Account <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/products"
                  className="glow-brand flex items-center justify-center gap-2 rounded-md border bg-black px-6 py-3 font-mono text-sm font-semibold transition"
                  style={{
                    borderColor: "color-mix(in srgb, var(--brand-color, #dc2626) 55%, transparent)",
                    color: "var(--brand-color, #dc2626)",
                  }}
                >
                  browse_market <span aria-hidden>→</span>
                </Link>
              </div>
            </div>

            {/* terminal */}
            <div
              className="glow-brand reveal reveal-5 relative rounded-lg border bg-black/85 font-mono text-[13px] shadow-2xl"
              style={{
                borderColor: "color-mix(in srgb, var(--brand-color, #dc2626) 35%, transparent)",
              }}
            >
              <span
                className="pointer-events-none absolute -left-1 -top-1 h-3.5 w-3.5 border-l border-t"
                style={{ borderColor: BRAND }}
              />
              <span
                className="pointer-events-none absolute -right-1 -top-1 h-3.5 w-3.5 border-r border-t"
                style={{ borderColor: BRAND }}
              />
              <span
                className="pointer-events-none absolute -bottom-1 -left-1 h-3.5 w-3.5 border-b border-l"
                style={{ borderColor: BRAND }}
              />
              <span
                className="pointer-events-none absolute -bottom-1 -right-1 h-3.5 w-3.5 border-b border-r"
                style={{ borderColor: BRAND }}
              />
              <div
                className="flex items-center gap-2 border-b px-4 py-2.5"
                style={{
                  borderColor: "color-mix(in srgb, var(--brand-color, #dc2626) 25%, transparent)",
                }}
              >
                <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-red-400/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-red-600/70" />
                <span className="ml-2 text-[11px] text-zinc-500">
                  proplux@market: ~
                </span>
              </div>
              <div className="space-y-2 p-4 leading-relaxed sm:p-5">
                <p>
                  <span className="text-zinc-500">root@market:~$</span>{" "}
                  <span className="text-white">./status --all</span>
                </p>
                <p className="flex items-baseline gap-2">
                  <span className="text-red-400">[ok]</span>
                  <span className="text-zinc-400">escrow</span>
                  <span className="flex-1 border-b border-dotted border-zinc-700" />
                  <span className="text-white">active</span>
                </p>
                <p className="flex items-baseline gap-2">
                  <span className="text-red-400">[ok]</span>
                  <span className="text-zinc-400">delivery</span>
                  <span className="flex-1 border-b border-dotted border-zinc-700" />
                  <span className="text-white">instant</span>
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
                  <span className="blink-cursor" style={{ color: BRAND }}>
                    ▊
                  </span>
                </p>
              </div>
            </div>
          </div>

        </section>

        {/* features */}
        <section className="border-y border-zinc-800 bg-black/40">
          <div className="mx-auto grid max-w-6xl grid-cols-1 divide-y divide-zinc-800 px-4 md:grid-cols-3 md:divide-x md:divide-y-0 md:px-8">
            {features.map((f) => (
              <div key={f.tag} className="group p-6 transition-colors hover:bg-zinc-900/50 md:p-8">
                <f.icon className="mb-4 h-5 w-5 text-red-500 transition-transform group-hover:scale-125" />
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
              <Wallet className="mr-1 inline h-3.5 w-3.5 text-red-500" /> how_it_works:
            </span>
            {steps.map((s, i) => (
              <span key={s} className="flex items-center gap-3">
                <span className="rounded border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 font-mono text-xs text-zinc-300 transition hover:border-red-500/40 hover:text-white">
                  <span className="text-red-500">{i + 1}.</span> {s}
                </span>
                {i < steps.length - 1 && (
                  <span className="rotate-90 font-mono text-red-500 md:rotate-0">→</span>
                )}
              </span>
            ))}
            <span className="flex items-center gap-1.5 font-mono text-xs text-zinc-500">
              <PackageCheck className="h-3.5 w-3.5 text-red-500" /> no waiting, no
              middlemen
            </span>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-800 py-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 font-mono text-xs text-zinc-500 sm:flex-row md:px-8">
          <div className="flex flex-wrap items-center justify-center gap-4">
            <span>
              &copy; {new Date().getFullYear()} {siteName}
            </span>
            <Link
              href="/terms"
              className="inline-flex py-1.5 transition hover:text-red-400 sm:py-0"
            >
              terms
            </Link>
            <span className="text-zinc-700">|</span>
            <Link
              href="/privacy"
              className="inline-flex py-1.5 transition hover:text-red-400 sm:py-0"
            >
              privacy
            </Link>
          </div>
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
            status: <span className="text-red-400">online</span>
          </span>
        </div>
      </footer>
    </div>
  );
}
