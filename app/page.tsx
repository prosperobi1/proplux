import Link from "next/link";
import { LogoMark } from "./components/Branding";
import { ShoppingCart, Users, Shield, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-950">
      <header className="border-b border-zinc-800">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-8">
          <Link href="/" className="flex items-center gap-2">
            <LogoMark size={32} />
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-md border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="rounded-md px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              style={{ backgroundColor: "var(--brand-color, #dc2626)" }}
            >
              Register
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-4xl px-4 py-20 text-center md:px-8 md:py-32">
          <h1 className="text-4xl font-bold text-white md:text-6xl">
            The <span style={{ color: "var(--brand-color, #dc2626)" }}>Proplux</span> Marketplace
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-400">
            Buy and sell digital tools, accounts, and services on a secure multi-vendor platform.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 md:flex-row">
            <Link
              href="/register"
              className="flex items-center gap-2 rounded-md px-6 py-3 text-sm font-semibold text-white hover:opacity-90"
              style={{ backgroundColor: "var(--brand-color, #dc2626)" }}
            >
              Get Started <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="rounded-md border border-zinc-700 bg-zinc-900 px-6 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
            >
              Sign In
            </Link>
          </div>
        </section>

        <section className="mx-auto grid max-w-5xl grid-cols-1 gap-6 px-4 pb-20 md:grid-cols-3 md:px-8">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-6">
            <ShoppingCart className="mb-3 h-6 w-6 text-red-500" />
            <h3 className="font-semibold text-white">Instant Purchases</h3>
            <p className="mt-2 text-sm text-zinc-400">
              Fund your balance, buy items in bulk, and access them immediately from your orders page.
            </p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-6">
            <Users className="mb-3 h-6 w-6 text-red-500" />
            <h3 className="font-semibold text-white">Multi-Vendor</h3>
            <p className="mt-2 text-sm text-zinc-400">
              Any seller can list products. Earn 65% of every sale, withdraw whenever you want.
            </p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-6">
            <Shield className="mb-3 h-6 w-6 text-red-500" />
            <h3 className="font-semibold text-white">Buyer Protection</h3>
            <p className="mt-2 text-sm text-zinc-400">
              Report bad orders within the report window. Admins review every report.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-800 py-6 text-center text-xs text-zinc-500">
        &copy; {new Date().getFullYear()} Proplux. All rights reserved.
      </footer>
    </div>
  );
}
