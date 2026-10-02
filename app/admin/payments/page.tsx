"use client";

import { useEffect, useState } from "react";
import { Bitcoin, Save, CheckCircle2, X, Wallet, AlertTriangle } from "lucide-react";

type Settings = Record<string, string>;

export default function AdminPaymentsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
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
      setSaving(false);
    }
  };

  if (loading) return <p className="p-8 text-zinc-500">Loading payments...</p>;
  if (!settings) return (
    <div className="rounded-lg border border-red-900/50 bg-red-950/20 p-6 text-red-500">
      Failed to load payment settings. Make sure you are logged in as ADMIN.
    </div>
  );

  const autoEnabled = settings.paymentAutoEnabled === "true";
  const sandbox = settings.nowpaymentsSandbox === "true";

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
                <h2 className="text-lg font-semibold text-white">Auto Payments — NOWPayments (Crypto)</h2>
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
              <input
                type="password"
                value={settings.nowpaymentsApiKey || ""}
                onChange={(e) => update("nowpaymentsApiKey", e.target.value)}
                placeholder="Paste your API key"
                className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-sm text-white placeholder-zinc-600 focus:border-red-500 focus:outline-none"
              />
              <p className="mt-1 text-xs text-zinc-500">
                Get it from nowpayments.io → Store Settings → API Keys.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-red-500">NOWPayments IPN Secret</label>
              <input
                type="password"
                value={settings.nowpaymentsIpnSecret || ""}
                onChange={(e) => update("nowpaymentsIpnSecret", e.target.value)}
                placeholder="Paste your IPN secret"
                className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-sm text-white placeholder-zinc-600 focus:border-red-500 focus:outline-none"
              />
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
              "Saving..."
            ) : saved ? (
              <><CheckCircle2 className="h-4 w-4" /> Saved</>
            ) : (
              <><Save className="h-4 w-4" /> Save Payment Settings</>
            )}
          </button>
          {saved && <span className="text-sm text-green-500">Payment settings saved successfully</span>}
        </div>
      </form>
    </div>
  );
}
