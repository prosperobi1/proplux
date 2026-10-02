"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogoMark } from "../components/Branding";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const result = await signIn("credentials", {
      identifier,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email/username or password");
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
      <div className="w-full max-w-md rounded-lg border border-zinc-800 bg-zinc-900 p-5 sm:p-8">
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
          <button
            type="submit"
            className="w-full rounded-md py-3 text-sm font-semibold text-white hover:opacity-90" style={{ backgroundColor: "var(--brand-color, #dc2626)" }}
          >
            Sign In
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
