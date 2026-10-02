import Link from "next/link";
import { LogoMark } from "./Branding";
import { prisma } from "@/lib/prisma";

export async function getSiteName(): Promise<string> {
  try {
    const s = await prisma.setting.findUnique({ where: { key: "siteName" } });
    return s?.value || "Proplux";
  } catch {
    return "Proplux";
  }
}

const BRAND = "var(--brand-color, #dc2626)";

/** Shared public chrome for legal pages (terms, privacy). */
export function LegalShell({
  siteName,
  title,
  updated,
  children,
}: {
  siteName: string;
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-950">
      <header className="border-b border-zinc-800 bg-black">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <LogoMark size={30} />
            <span className="hidden font-mono text-sm font-bold tracking-tight text-white sm:inline">
              {siteName.toLowerCase()}
              <span style={{ color: BRAND }}>.</span>
              <span className="text-red-400">market</span>
            </span>
          </Link>
          <nav className="flex items-center gap-4 font-mono text-xs text-zinc-400">
            <Link
              href="/products"
              className="hidden transition hover:text-red-400 sm:inline"
            >
              /market
            </Link>
            <Link href="/terms" className="hidden transition hover:text-red-400 sm:inline">
              terms
            </Link>
            <Link
              href="/privacy"
              className="hidden transition hover:text-red-400 sm:inline"
            >
              privacy
            </Link>
            <Link
              href="/login"
              className="inline-flex min-h-9 items-center rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 font-sans text-xs font-semibold text-white transition hover:bg-zinc-800"
            >
              Sign In
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 md:px-8 md:py-16">
        <p className="font-mono text-xs text-zinc-500">~/legal/{title.toLowerCase().replaceAll(" ", "-")}</p>
        <h1 className="mt-3 text-3xl font-black uppercase tracking-tight text-white md:text-4xl">
          {title}
        </h1>
        <p className="mt-3 flex items-center gap-2 font-mono text-xs text-zinc-500">
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: BRAND }} />
          last updated: {updated}
        </p>
        <article className="mt-8 space-y-5">{children}</article>
      </main>

      <footer className="border-t border-zinc-800 py-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 font-mono text-xs text-zinc-500 sm:flex-row md:px-8">
          <div className="flex flex-wrap items-center justify-center gap-4">
            <span>
              &copy; {new Date().getFullYear()} {siteName}
            </span>
            <Link
              href="/"
              className="inline-flex py-1.5 transition hover:text-red-400 sm:py-0"
            >
              home
            </Link>
            <span className="text-zinc-700">|</span>
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

/** Numbered clause card used inside LegalShell. */
export function Clause({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 sm:p-5">
      <h2 className="font-mono text-sm font-bold text-white">
        <span style={{ color: BRAND }}>[{n}]</span> {title}
      </h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-zinc-400">{children}</div>
    </section>
  );
}
