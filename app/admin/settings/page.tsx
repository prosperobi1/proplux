"use client";

import { useEffect, useState } from "react";
import { Save, Globe, DollarSign, Wallet, Mail, Wrench, Palette, FileText, Bell, ToggleLeft } from "lucide-react";

type Settings = Record<string, string>;

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) setSettings(d);
        setLoading(false);
      });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  if (loading) return <p className="p-8 text-zinc-500">Loading settings...</p>;
  if (!settings) return (
    <div className="rounded-lg border border-red-900/50 bg-red-950/20 p-6 text-red-500">
      Failed to load settings. Make sure you are logged in as ADMIN.
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-red-500">Site Settings</h1>
        <p className="mt-1 text-sm text-zinc-500">Configure global platform settings. Changes apply immediately.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Branding */}
        <section className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
            <Globe className="h-5 w-5 text-red-500" /> Branding
          </h2>
          <div className="space-y-4">
            <Field label="Site Name" value={settings.siteName || ""} onChange={(v) => update("siteName", v)} />
            <Field label="Site Description" value={settings.siteDescription || ""} onChange={(v) => update("siteDescription", v)} />
            <Field label="Logo URL" value={settings.logoUrl || ""} onChange={(v) => update("logoUrl", v)} placeholder="https://example.com/logo.png" hint="Paste a hosted image URL. File upload coming soon." />
            {settings.logoUrl && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                <p className="mb-2 text-xs text-zinc-500">Preview:</p>
                <img src={settings.logoUrl} alt="Logo preview" className="h-12 w-auto" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              </div>
            )}
            <div>
              <label className="mb-1 block text-sm font-semibold text-red-500">Primary Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={settings.primaryColor || "#dc2626"}
                  onChange={(e) => update("primaryColor", e.target.value)}
                  className="h-10 w-20 cursor-pointer rounded border border-zinc-800 bg-zinc-950"
                />
                <input
                  type="text"
                  value={settings.primaryColor || "#dc2626"}
                  onChange={(e) => update("primaryColor", e.target.value)}
                  className="flex-1 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-sm text-white"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Financial */}
        <section className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
            <DollarSign className="h-5 w-5 text-red-500" /> Financial
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field
              label="Seller Commission (%)"
              type="number"
              value={settings.commissionPercent || ""}
              onChange={(v) => update("commissionPercent", v)}
              hint="Sellers receive this % of each sale."
            />
            <Field
              label="Minimum Withdrawal (USD)"
              type="number"
              value={settings.minWithdrawal || ""}
              onChange={(v) => update("minWithdrawal", v)}
            />
          </div>
        </section>

        {/* Crypto */}
        <section className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
            <Wallet className="h-5 w-5 text-red-500" /> Crypto Wallets
          </h2>
          <div className="space-y-4">
            <Field label="Bitcoin (BTC) Address" value={settings.walletBTC || ""} onChange={(v) => update("walletBTC", v)} mono />
            <Field label="Ethereum (ETH) Address" value={settings.walletETH || ""} onChange={(v) => update("walletETH", v)} mono />
            <Field label="USDT Address (TRC20 / ERC20)" value={settings.walletUSDT || ""} onChange={(v) => update("walletUSDT", v)} mono />
          </div>
        </section>

        {/* Notifications */}
        <section className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
            <Bell className="h-5 w-5 text-red-500" /> Notifications & Support
          </h2>
          <div className="space-y-4">
            <Field label="Support Email" type="email" value={settings.supportEmail || ""} onChange={(v) => update("supportEmail", v)} />
            <Field
              label="Admin Alert Email"
              type="email"
              value={settings.adminAlertEmail || ""}
              onChange={(v) => update("adminAlertEmail", v)}
              hint="Receive notifications for new orders and withdrawal requests."
            />
          </div>
        </section>

        {/* Legal */}
        <section className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
            <FileText className="h-5 w-5 text-red-500" /> Legal
          </h2>
          <div className="space-y-4">
            <Field label="Terms of Service URL" value={settings.termsUrl || ""} onChange={(v) => update("termsUrl", v)} placeholder="https://..." />
            <Field label="Privacy Policy URL" value={settings.privacyUrl || ""} onChange={(v) => update("privacyUrl", v)} placeholder="https://..." />
          </div>
        </section>

        {/* Feature Toggles */}
        <section className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
            <ToggleLeft className="h-5 w-5 text-red-500" /> Feature Toggles
          </h2>
          <div className="space-y-3">
            <Toggle
              label="Marketplace Enabled"
              description="Buyers can browse and purchase products."
              value={settings.enableMarketplace === "true"}
              onChange={() => toggle("enableMarketplace")}
            />
            <Toggle
              label="Support Tickets Enabled"
              description="Buyers and sellers can open support tickets."
              value={settings.enableTickets === "true"}
              onChange={() => toggle("enableTickets")}
            />
            <Toggle
              label="Maintenance Mode"
              description="Site is read-only. Buyers can't place orders."
              value={settings.maintenanceMode === "true"}
              onChange={() => toggle("maintenanceMode")}
              variant="warning"
            />
          </div>
        </section>

        {/* Save */}
        <div className="sticky bottom-4 flex items-center gap-4 rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-md bg-red-600 px-6 py-3 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
          >
            <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save All Settings"}
          </button>
          {saved && <span className="text-sm text-green-500">✓ Settings saved</span>}
        </div>
      </form>
    </div>
  );
}

function Field({
  label, value, onChange, type = "text", placeholder, hint, mono,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  hint?: string;
  mono?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-red-500">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-red-500 focus:outline-none ${mono ? "font-mono" : ""}`}
      />
      {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}

function Toggle({
  label, description, value, onChange, variant = "default",
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: () => void;
  variant?: "default" | "warning";
}) {
  const onColor = variant === "warning" ? "bg-yellow-600" : "bg-green-600";
  return (
    <button
      type="button"
      onClick={onChange}
      className="flex w-full items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-left hover:border-zinc-700"
    >
      <div>
        <p className="text-sm font-semibold text-white">{label}</p>
        <p className="text-xs text-zinc-500">{description}</p>
      </div>
      <div className={`relative h-6 w-11 flex-shrink-0 rounded-full transition ${value ? onColor : "bg-zinc-700"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${value ? "translate-x-5" : "translate-x-0.5"}`} />
      </div>
    </button>
  );
}