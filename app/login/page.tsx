"use client";

import { useEffect, useRef, useState } from "react";
import { minVisible } from "@/lib/ui";
import { signIn } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogoMark } from "../components/Branding";
import { AuthBackdrop } from "../components/AuthBackdrop";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const rememberRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  // Restore the last choice after hydration (the server can't read cookies here)
  useEffect(() => {
    const m = document.cookie.match(/(?:^|;\s*)proplux_remember=([^;]*)/);
    if (m && rememberRef.current) rememberRef.current.checked = m[1] === "1";
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const vis = minVisible();
    setSubmitting(true);

    // The auth route reads this to decide whether the session cookie gets an
    // expiry (remember on) or dies with the browser (remember off).
    document.cookie =
      "proplux_remember=" +
      (rememberRef.current?.checked ? "1" : "0") +
      "; path=/; max-age=31536000; samesite=lax";

    const result = await signIn("credentials", {
      identifier,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email/username or password");
      await vis();
      setSubmitting(false);
    } else {
      await vis();
      router.push("/dashboard");
      router.refresh();
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-950 p-4">
      <AuthBackdrop />
      <div className="relative z-10 w-full max-w-md rounded-lg border border-zinc-800 bg-zinc-900/85 p-5 shadow-2xl backdrop-blur-sm sm:p-8">
        <div className="mb-6 flex justify-center">
          <LogoMark size={48} />
        </div>

        <h1 className="mb-2 text-2xl font-bold text-white">Welcome back</h1>
        <p className="mb-6 text-sm text-zinc-500">Sign in to your account</p>

        {error && (
          <div className="mb-4 rounded-md border border-red-900 bg-red-950/50 p-3 text-sm text-red-500">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-zinc-500">Email or username</label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="you@example.com or username"
              autoComplete="username"
              required
              className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none"
            />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase text-zinc-500">Password</label>
              <Link
                href="/forgot-password"
                className="text-xs text-red-500 hover:text-red-400"
              >
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none"
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-400 hover:text-zinc-300">
            <input
              type="checkbox"
              defaultChecked
              ref={rememberRef}
              style={{ accentColor: "var(--brand-color, #dc2626)" }}
              className="h-4 w-4 rounded border-zinc-600 bg-zinc-950"
            />
            Remember me
          </label>
          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-md py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50" style={{ backgroundColor: "var(--brand-color, #dc2626)" }}
          >
            {submitting ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Signing In…</>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-500">
          No account?{" "}
          <Link href="/register" className="text-red-500 hover:text-red-400">Register</Link>
        </p>
      </div>
    </div>
  );
}
