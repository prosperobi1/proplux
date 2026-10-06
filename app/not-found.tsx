import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { LogoMark } from "./components/Branding";
import { AuthBackdrop } from "./components/AuthBackdrop";

const BRAND = "var(--brand-color, #dc2626)";

async function getSiteName(): Promise<string> {
  try {
    const site = await prisma.setting.findUnique({ where: { key: "siteName" } });
    return site?.value || "Proplux";
  } catch {
    return "Proplux";
  }
}

export default async function NotFound() {
  const siteName = await getSiteName();

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-950 p-4">
      <AuthBackdrop />
      <div className="relative z-10 w-full max-w-md rounded-lg border border-zinc-800 bg-zinc-900/85 p-5 text-center shadow-2xl backdrop-blur-sm sm:p-8">
        <div className="mb-6 flex justify-center">
          <LogoMark size={48} />
        </div>

        <p className="font-mono text-xs">
          <span className="text-zinc-500">root@{siteName.toLowerCase()}:~#</span>{" "}
          <span className="text-glow" style={{ color: BRAND }}>
            navigate /missing
          </span>
          <span className="blink-cursor ml-0.5" style={{ color: BRAND }}>
            ▊
          </span>
        </p>

        <h1
          className="glitch-text mt-4 font-mono text-6xl font-black"
          style={{ color: BRAND }}
        >
          404
        </h1>

        <p className="mt-3 text-sm text-zinc-400">
          Route not found — this page doesn&apos;t exist or was moved.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="rounded-md px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            style={{ backgroundColor: BRAND }}
          >
            back_to_home
          </Link>
          <Link
            href="/products"
            className="rounded-md border px-4 py-2 text-sm font-semibold hover:opacity-90"
            style={{
              borderColor: "color-mix(in srgb, var(--brand-color, #dc2626) 55%, transparent)",
              color: BRAND,
            }}
          >
            browse_market
          </Link>
        </div>
      </div>
    </div>
  );
}
