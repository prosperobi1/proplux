"use client";

import Link from "next/link";
import { LogoMark } from "./components/Branding";
import { AuthBackdrop } from "./components/AuthBackdrop";

const BRAND = "var(--brand-color, #dc2626)";

/**
 * Root error boundary: renders a themed crash screen instead of Next's
 * default white error page. `reset()` re-renders the failed segment.
 * Never surfaces error.message (may contain internals) — only the digest.
 */
export default function SegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-950 p-4">
      <AuthBackdrop />
      <div className="relative z-10 w-full max-w-md rounded-lg border border-zinc-800 bg-zinc-900/85 p-5 text-center shadow-2xl backdrop-blur-sm sm:p-8">
        <div className="mb-6 flex justify-center">
          <LogoMark size={48} />
        </div>

        <p className="font-mono text-xs">
          <span className="text-zinc-500">root@market:~#</span>{" "}
          <span className="text-glow" style={{ color: BRAND }}>
            ./session --recover
          </span>
          <span className="blink-cursor ml-0.5" style={{ color: BRAND }}>
            ▊
          </span>
        </p>

        <h1
          className="glitch-text mt-4 font-mono text-5xl font-black"
          style={{ color: BRAND }}
        >
          500
        </h1>

        <p className="mt-3 text-sm text-zinc-400">
          Something crashed while handling this request.
        </p>
        {error?.digest && (
          <p className="mt-1 font-mono text-xs text-zinc-600">digest: {error.digest}</p>
        )}

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-md px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            style={{ backgroundColor: BRAND }}
          >
            retry_request
          </button>
          <Link
            href="/"
            className="rounded-md border px-4 py-2 text-sm font-semibold hover:opacity-90"
            style={{
              borderColor: "color-mix(in srgb, var(--brand-color, #dc2626) 55%, transparent)",
              color: BRAND,
            }}
          >
            back_to_home
          </Link>
        </div>
      </div>
    </div>
  );
}
