"use client";

import { useEffect, useState } from "react";
import { minVisible } from "@/lib/ui";
import { COIN_MIN_USD, COIN_LABEL } from "@/lib/deposit";
import { Loader2, Bitcoin, Save, CheckCircle2, X, Wallet, AlertTriangle, Eye, EyeOff, Copy, Check, Zap } from "lucide-react";

type Settings = Record<string, string>;

type DepositRow = {
  id: string;
  username: string;
  email: string;
  role: string;
  amount: number;
  method: string;
  providerId: string | null;
  createdAt: string;
};

// The only keys this page is allowed to write: a save here must never
// rewrite unrelated settings (SMTP, app name, …).
const PAYMENT_KEYS = [
  "nowpaymentsApiKey",
  "nowpaymentsIpnSecret",
  "nowpaymentsSandbox",
  "paymentAutoEnabled",
];

export default function AdminPaymentsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [deposits, setDeposits] = useState<DepositRow[]>([]);
  const [depositsLoading, setDepositsLoading] = useState(true);
  const [viewing, setViewing] = useState<DepositRow | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const load = () => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) setSettings(d);
        else setError(d.error);
        setLoading(false);
      })
      .catch((e) => {
        setError(String(e));
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
    fetch("/api/admin/deposits")
      .then((r) => r.json())
      .then((d) => setDeposits(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setDepositsLoading(false));
  }, []);

  const update = (key: string, value: string) => {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const toggle = (key: string) => {
    setSettings((prev) => {
      if (!prev) return prev;
      const current = prev[key] === "true";
      return { ...prev, [key]: current ? "false" : "true" };
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    const vis = minVisible();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          Object.fromEntries(PAYMENT_KEYS.filter((k) => k in settings).map((k) => [k, settings[k]]))
        ),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || `Save failed (${res.status})`);
        return;
      }
      setSaved(true);
      load();
      setTimeout(() => setSaved(false), 4000);
    } catch (err) {
      setError(String(err));
    } finally {
      await vis();
      setSaving(false);
    }
  };

  const copyIpn = async () => {
    try {
      await navigator.clipboard.writeText(`${origin}/api/deposit/ipn`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  const testCredentials = async () => {
    const vis = minVisible();
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/nowpayments/test", { method: "POST" });
      const d = await res.json().catch(() => ({}));
      await vis();
      setTesting(false);
      if (d.ok) {
        const proof = d.sample ? `, 10 USD ≈ ${d.sample} ${d.currency || ""}` : "";
        setTestResult({ ok: true, msg: `Credentials OK${proof}` });
      } else {
        setTestResult({ ok: false, msg: d.error || `Test failed (${res.status})` });
      }
    } catch {
      await vis();
      setTesting(false);
      setTestResult({ ok: false, msg: "Network error. Try again." });
    }
  };

  if (loading) return <p className="flex items-center justify-center gap-2 p-8 text-zinc-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading payments...</p>;
  if (!settings) return (
    <div className="rounded-lg border border-red-900/50 bg-red-950/20 p-6 text-red-500">
      Failed to load payment settings. Make sure you are logged in as ADMIN.
    </div>
  );

  const autoEnabled = settings.paymentAutoEnabled === "true";
  const sandbox = settings.nowpaymentsSandbox === "true";
  // Render-time origin: "" during SSR, the real origin on the client. The IPN
  // input carries suppressHydrationWarning for that intentional difference.
  const origin =
    typeof window === "undefined" ? "" : process.env.NEXT_PUBLIC_APP_URL || window.location.origin;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-red-500">Payments</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Configure how buyers fund their account balance.
        </p>
      </div>

      {saved && (
        <div className="flex items-center gap-2 rounded-lg border border-green-900/50 bg-green-950/30 px-4 py-3 text-sm text-green-400">
          <CheckCircle2 className="h-4 w-4" /> Payment settings saved.
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-400">
          <X className="h-4 w-4" /> {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <section className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="rounded-md bg-yellow-950/50 p-2">
                <Bitcoin className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Auto Payments: NOWPayments (Crypto)</h2>
                <p className="mt-1 text-sm text-zinc-400">
                  Buyers fund their balance with crypto. Balance is credited automatically when the network confirms payment.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => toggle("paymentAutoEnabled")}
              className={`relative h-6 w-11 flex-shrink-0 rounded-full transition ${autoEnabled ? "bg-green-600" : "bg-zinc-700"}`}
              aria-label="Toggle auto payments"
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${autoEnabled ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>

          <div className={`space-y-4 border-t border-zinc-800 pt-4 ${autoEnabled ? "" : "opacity-40 pointer-events-none"}`}>
            <div>
              <label className="mb-1 block text-sm font-semibold text-red-500">NOWPayments API Key</label>
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  value={settings.nowpaymentsApiKey || ""}
                  onChange={(e) => update("nowpaymentsApiKey", e.target.value)}
                  placeholder="Paste your API key"
                  className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 pr-10 font-mono text-sm text-white placeholder-zinc-600 focus:border-red-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  title={showKey ? "Hide API key" : "Show API key"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-zinc-500 hover:text-zinc-300"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-1 text-xs text-zinc-500">
                Get it from nowpayments.io → Store Settings → API Keys.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-red-500">NOWPayments IPN Secret</label>
              <div className="relative">
                <input
                  type={showSecret ? "text" : "password"}
                  value={settings.nowpaymentsIpnSecret || ""}
                  onChange={(e) => update("nowpaymentsIpnSecret", e.target.value)}
                  placeholder="Paste your IPN secret"
                  className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 pr-10 font-mono text-sm text-white placeholder-zinc-600 focus:border-red-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret((v) => !v)}
                  title={showSecret ? "Hide IPN secret" : "Show IPN secret"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-zinc-500 hover:text-zinc-300"
                >
                  {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-1 text-xs text-zinc-500">
                Used to verify webhook signatures. Never share this publicly.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className={`mt-0.5 h-4 w-4 flex-shrink-0 ${sandbox ? "text-yellow-500" : "text-zinc-600"}`} />
                <div>
                  <p className="text-sm font-semibold text-white">Sandbox Mode</p>
                  <p className="text-xs text-zinc-500">
                    When ON, uses api-sandbox.nowpayments.io. Turn OFF for real payments.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggle("nowpaymentsSandbox")}
                className={`relative h-6 w-11 flex-shrink-0 rounded-full transition ${sandbox ? "bg-yellow-600" : "bg-zinc-700"}`}
                aria-label="Toggle sandbox"
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${sandbox ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-red-500">IPN callback URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${origin}/api/deposit/ipn`}
                  suppressHydrationWarning
                  onFocus={(e) => e.currentTarget.select()}
                  className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-300 focus:border-red-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={copyIpn}
                  title="Copy IPN callback URL"
                  className="flex-shrink-0 rounded-md bg-zinc-800 px-3 py-2 text-zinc-200 hover:bg-zinc-700"
                >
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-1 text-xs text-zinc-500">
                Paste this into nowpayments.io → Store Settings → IPN. Localhost works out of the box;
                for production set <code className="text-zinc-400">NEXT_PUBLIC_APP_URL</code>.
              </p>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <p className="text-sm font-semibold text-white">Deposit minimums (enforced)</p>
              <p className="mt-1 text-xs text-zinc-400">
                {Object.entries(COIN_MIN_USD).map(([coin, min], i) => (
                  <span key={coin}>
                    {i > 0 && " · "}
                    {COIN_LABEL[coin]}: <span className="font-mono text-zinc-200">${min}</span>
                  </span>
                ))}
              </p>
              <p className="mt-1 text-xs text-zinc-600">
                Requests below these amounts are rejected before contacting NOWPayments.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={testCredentials}
                disabled={testing}
                className="inline-flex items-center gap-2 rounded-md bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 disabled:opacity-50"
              >
                {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4 text-yellow-500" />}
                Test saved credentials
              </button>
              <span className="text-[11px] text-zinc-600">Tests the stored key. Save first after changing it.</span>
              {testResult && (
                <span className={`text-xs font-medium ${testResult.ok ? "text-green-500" : "text-red-400"}`}>
                  {testResult.ok ? `✓ ${testResult.msg}` : `✗ ${testResult.msg}`}
                </span>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-6">
          <div className="flex items-start gap-3">
            <div className="rounded-md bg-zinc-800 p-2">
              <Wallet className="h-5 w-5 text-zinc-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Manual balance adjustments</h2>
              <p className="mt-1 text-sm text-zinc-400">
                To credit or refund a user manually, use the dollar icon on the{" "}
                <a href="/admin/users" className="text-red-500 hover:underline">Users List</a>.
                Manual credits don&apos;t need to be enabled here.
              </p>
            </div>
          </div>
        </section>

        <div className="sticky bottom-4 flex flex-col gap-2 rounded-lg border border-zinc-800 bg-zinc-900 p-4 sm:flex-row sm:items-center sm:gap-4">
          <button
            type="submit"
            disabled={saving}
            className={`flex items-center gap-2 rounded-md px-6 py-3 text-sm font-semibold text-white disabled:opacity-50 w-full sm:w-auto ${
              saved ? "bg-green-600" : "bg-red-600 hover:bg-red-500"
            }`}
          >
            {saving ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
            ) : saved ? (
              <><CheckCircle2 className="h-4 w-4" /> Saved</>
            ) : (
              <><Save className="h-4 w-4" /> Save Payment Settings</>
            )}
          </button>
          {saved && <span className="text-sm text-green-500">Payment settings saved successfully</span>}
        </div>
      </form>

      {/* Deposit history */}
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-red-500">Deposit history</h2>
          <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs text-zinc-400">
            {depositsLoading ? "Loading…" : `Last ${deposits.length}`}
          </span>
        </div>
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-zinc-900 text-left text-xs font-semibold uppercase text-red-500">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Method</th>
                <th className="px-3 py-2">Reference</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 bg-zinc-950">
              {depositsLoading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-zinc-500">
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading deposits...
                    </span>
                  </td>
                </tr>
              ) : deposits.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-zinc-500">
                    No deposits yet.
                  </td>
                </tr>
              ) : (
                deposits.map((d) => (
                  <tr key={d.id} className="hover:bg-zinc-900/50">
                    <td className="px-3 py-3 text-xs text-zinc-400">
                      {new Date(d.createdAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-3">
                      <div className="text-white">{d.username}</div>
                      <div className="text-xs text-zinc-500">{d.email}</div>
                    </td>
                    <td className={`px-3 py-3 font-semibold ${d.amount >= 0 ? "text-green-500" : "text-red-400"}`}>
                      {d.amount >= 0 ? "+" : ""}
                      {d.amount.toFixed(2)} USD
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                          d.method === "nowpayments"
                            ? "bg-yellow-950 text-yellow-500"
                            : d.method === "refund"
                              ? "bg-blue-950 text-blue-400"
                              : "bg-zinc-800 text-zinc-300"
                        }`}
                      >
                        {d.method}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-zinc-500" title={d.providerId || undefined}>
                      {d.providerId ? `…${d.providerId.slice(-12)}` : "—"}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button
                        onClick={() => setViewing(d)}
                        title="View deposit details"
                        className="inline-flex min-h-9 min-w-9 items-center justify-center rounded bg-zinc-800 p-1.5 hover:bg-zinc-700"
                      >
                        <Eye className="h-3.5 w-3.5 text-blue-400" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {viewing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setViewing(null)}
        >
          <div
            className="w-full max-w-lg rounded-lg border border-zinc-700 bg-zinc-900 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold text-white">
                  Deposit <span className="font-mono">…{viewing.id.slice(-6)}</span>
                </h2>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {new Date(viewing.createdAt).toLocaleString()}
                </p>
              </div>
              <button onClick={() => setViewing(null)} title="Close" className="rounded p-1 hover:bg-zinc-800">
                <X className="h-4 w-4 text-zinc-400" />
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span
                className={`rounded bg-zinc-800 px-2 py-1 font-semibold ${
                  viewing.amount >= 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                {viewing.amount >= 0 ? "+" : ""}
                {viewing.amount.toFixed(2)} USD
              </span>
              <span className="rounded bg-zinc-800 px-2 py-1 text-zinc-300">{viewing.method}</span>
              <span className="rounded bg-zinc-800 px-2 py-1 text-zinc-300">{viewing.role}</span>
            </div>

            <dl className="mt-4 space-y-2.5">
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">User</dt>
                <dd className="break-words font-mono text-xs text-zinc-200">
                  {viewing.username} · {viewing.email}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Deposit ID</dt>
                <dd className="break-all font-mono text-xs text-zinc-200">{viewing.id}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Provider reference</dt>
                <dd className="break-all font-mono text-xs text-zinc-200">{viewing.providerId || "—"}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Created</dt>
                <dd className="font-mono text-xs text-zinc-200">{new Date(viewing.createdAt).toString()}</dd>
              </div>
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}
