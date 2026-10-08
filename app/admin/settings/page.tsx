"use client";

import { useEffect, useState } from "react";
import { minVisible } from "@/lib/ui";
import { sanitizeTelegramUrl } from "@/lib/settings";
import { Loader2, Save, Globe, DollarSign, Mail, Bell, ToggleLeft, X, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { LocalUpload } from "../../components/LocalUpload";

type Settings = Record<string, string>;

// Keys this page owns: a save here must never rewrite the Payments page's
// keys (or anything else). Server enforces the same list on write.
const SETTINGS_KEYS = [
  "siteName",
  "siteDescription",
  "logoUrl",
  "primaryColor",
  "commissionPercent",
  "minWithdrawal",
  "minDeposit",
  "reportWindowHours",
  "supportEmail",
  "adminAlertEmail",
  "telegramUrl",
  "smtpEnabled",
  "smtpHost",
  "smtpPort",
  "smtpSecurity",
  "smtpUser",
  "smtpPass",
  "smtpFrom",
  "smtpFromName",
  "enableMarketplace",
  "enableTickets",
  "maintenanceMode",
];

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testTo, setTestTo] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    // An invalid hex here would poison --brand-color and silently break
    // button/link colors site-wide, so reject it before saving anything.
    const pc = (settings.primaryColor || "").trim();
    if (pc && !/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(pc)) {
      setError("Primary Color must be a hex color like #dc2626.");
      return;
    }
    const tg = (settings.telegramUrl || "").trim();
    if (tg && !sanitizeTelegramUrl(tg)) {
      setError("Telegram Channel must be a link like https://t.me/yourchannel.");
      return;
    }
    const vis = minVisible();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          Object.fromEntries(SETTINGS_KEYS.filter((k) => k in settings).map((k) => [k, settings[k]]))
        ),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || `Save failed (${res.status})`);
        return;
      }
      setSaved(true);
      load();
      window.scrollTo({ top: 0, behavior: "smooth" });
      setTimeout(() => setSaved(false), 6000);
    } catch (err) {
      setError(String(err));
    } finally {
      await vis();
      setSaving(false);
    }
  };

  const sendTest = async () => {
    if (!settings || !testTo.trim()) {
      setTestResult({ ok: false, msg: "Enter the email address to test first." });
      return;
    }
    const vis = minVisible();
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testTo.trim(), settings }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setTestResult({ ok: true, msg: `Test email sent to ${testTo.trim()} via ${(data.via || "smtp").toUpperCase()}.` });
        load();
      } else {
        setTestResult({ ok: false, msg: data?.error || `Send failed (${res.status})` });
      }
    } catch (err) {
      setTestResult({ ok: false, msg: String(err) });
    } finally {
      await vis();
      setTesting(false);
    }
  };

  if (loading)
    return (
      <p className="flex items-center justify-center gap-2 p-8 text-zinc-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading settings...
      </p>
    );

  if (!settings)
    return (
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

      {saved && (
        <div className="flex items-center gap-2 rounded-lg border border-green-900/50 bg-green-950/30 px-4 py-3 text-sm text-green-400">
          <CheckCircle2 className="h-4 w-4" /> Settings saved successfully.
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-400">
          <X className="h-4 w-4" /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Branding */}
        <section className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 md:p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
            <Globe className="h-5 w-5 text-red-500" /> Branding
          </h2>
          <div className="space-y-4">
            <Field label="Site Name" value={settings.siteName || ""} onChange={(v) => update("siteName", v)} />
            <Field label="Site Description" value={settings.siteDescription || ""} onChange={(v) => update("siteDescription", v)} />

            <div>
              <label className="mb-1 block text-sm font-semibold text-red-500">Logo</label>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                  {settings.logoUrl ? (
                    <img
                      src={settings.logoUrl}
                      alt="Logo preview"
                      className="h-16 w-auto"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center text-xs text-zinc-600">
                      No logo
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <LocalUpload
                    kind="logo"
                    accept="image/*"
                    label="Upload logo"
                    hint="PNG, JPG or SVG up to 4MB"
                    onUploaded={(url) => {
                      update("logoUrl", url);
                      setSaved(false);
                    }}
                    onError={(msg) => setError(`Upload failed: ${msg}`)}
                  />
                  <p className="mt-2 text-xs text-zinc-500">
                    PNG, JPG, or SVG up to 4MB. Click <strong>Save All Settings</strong> after uploading.
                  </p>
                  {settings.logoUrl && (
                    <p className="mt-2 break-all font-mono text-xs text-zinc-600">{settings.logoUrl}</p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-red-500">Primary Color</label>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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
        <section className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 md:p-6">
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
            <Field
              label="Minimum Deposit (USD)"
              type="number"
              value={settings.minDeposit || "10"}
              onChange={(v) => update("minDeposit", v)}
              hint="Minimum amount buyers can deposit at once."
            />
            <Field
              label="Report Window (hours)"
              type="number"
              value={settings.reportWindowHours || "16"}
              onChange={(v) => update("reportWindowHours", v)}
              hint="Buyers can report an order within this many hours of purchase."
            />
          </div>
        </section>

        {/* Notifications */}
        <section className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 md:p-6">
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
            <Field
              label="Telegram Channel"
              value={settings.telegramUrl || ""}
              onChange={(v) => update("telegramUrl", v)}
              placeholder="https://t.me/yourchannel"
              hint="Shows a join icon on the dashboard. Leave empty to hide it."
            />
          </div>
        </section>

        {/* Email (SMTP) */}
        <section className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 md:p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
                <Mail className="h-5 w-5 text-red-500" /> Email (SMTP)
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Site emails (password resets, order alerts, ticket replies) are sent through this SMTP server.
              </p>
            </div>
            <button
              type="button"
              onClick={() => toggle("smtpEnabled")}
              aria-label="Toggle SMTP"
              className={`relative h-6 w-11 flex-shrink-0 rounded-full transition ${
                settings.smtpEnabled === "true" ? "bg-green-600" : "bg-zinc-700"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                  settings.smtpEnabled === "true" ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          <div className={settings.smtpEnabled === "true" ? "" : "pointer-events-none opacity-40"}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field
                label="SMTP Host"
                value={settings.smtpHost || ""}
                onChange={(v) => update("smtpHost", v)}
                placeholder="smtp.yourprovider.com"
                mono
                hint="From your mail provider (e.g. smtp.hostinger.com, smtp.gmail.com)."
              />
              <Field
                label="SMTP Port"
                type="number"
                value={settings.smtpPort || "587"}
                onChange={(v) => update("smtpPort", v)}
                hint="587 for STARTTLS (recommended), 465 for SSL."
              />
              <div>
                <label className="mb-1 block text-sm font-semibold text-red-500">Encryption</label>
                <select
                  value={settings.smtpSecurity || "starttls"}
                  onChange={(e) => update("smtpSecurity", e.target.value)}
                  className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none"
                >
                  <option value="starttls">STARTTLS (port 587)</option>
                  <option value="ssl">SSL/TLS (port 465)</option>
                  <option value="none">None (port 25)</option>
                </select>
              </div>
              <Field
                label="SMTP Username"
                value={settings.smtpUser || ""}
                onChange={(v) => update("smtpUser", v)}
                placeholder="usually your full email address"
                mono
              />
              <Field
                label="SMTP Password"
                type="password"
                value={settings.smtpPass || ""}
                onChange={(v) => update("smtpPass", v)}
                placeholder="SMTP password or app password"
                mono
                secret
                hint="Use an app password if your provider requires 2FA."
              />
              <Field
                label="From Email"
                type="email"
                value={settings.smtpFrom || ""}
                onChange={(v) => update("smtpFrom", v)}
                placeholder="no-reply@yourdomain.com"
                mono
                hint="Must be an address on the domain your SMTP account can send from."
              />
              <Field
                label="From Name"
                value={settings.smtpFromName || ""}
                onChange={(v) => update("smtpFromName", v)}
                placeholder="Proplux"
              />
            </div>

            <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <p className="text-sm font-semibold text-white">Send a test email</p>
              <p className="mt-0.5 text-xs text-zinc-500">
                Saves your settings, then sends a test message so you can confirm delivery before users rely on it.
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  type="email"
                  value={testTo}
                  onChange={(e) => setTestTo(e.target.value)}
                  placeholder="you@example.com"
                  className="flex-1 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-red-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={sendTest}
                  disabled={testing}
                  className="flex items-center justify-center gap-2 rounded-md border border-red-600 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-600/10 disabled:opacity-50"
                >
                  {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} {testing ? "Sending..." : "Send test email"}
                </button>
              </div>
              {testResult && (
                <p className={`mt-2 text-sm ${testResult.ok ? "text-green-400" : "text-red-400"}`}>
                  {testResult.msg}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Feature Toggles */}
        <section className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 md:p-6">
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
        <div className="sticky bottom-4 flex flex-col gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-4 sm:flex-row sm:items-center sm:gap-4">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center justify-center gap-2 rounded-md bg-red-600 px-6 py-3 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {saving ? "Saving..." : "Save All Settings"}
          </button>
          {saved && <span className="text-sm text-green-500">Settings saved</span>}
        </div>
      </form>
    </div>
  );
}

function Field({
  label, value, onChange, type = "text", placeholder, hint, mono, secret = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  hint?: string;
  mono?: boolean;
  secret?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const inputType = secret ? (visible ? "text" : "password") : type;

  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-red-500">{label}</label>
      <div className="relative">
        <input
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-red-500 focus:outline-none ${secret ? "pr-10" : ""} ${mono ? "font-mono" : ""}`}
        />
        {secret && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Hide password" : "Show password"}
            title={visible ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-zinc-500 hover:text-zinc-300 focus:outline-none focus-visible:text-zinc-200"
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
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