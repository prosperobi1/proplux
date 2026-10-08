/**
 * Setting keys the admin UI is allowed to read/write through
 * /api/admin/settings (and the email test route's pre-save).
 *
 * Keeping this list explicit means:
 *  - saves are least-privilege (a page can only touch its own keys), and
 *  - internal Setting rows used as data (e.g. deposit:<payment_id>
 *    idempotency markers written by the IPN handler) never surface in,
 *    or get round-tripped by, the admin editors.
 */
export const WRITABLE_SETTING_KEYS = [
  // Site Settings page
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
  // Admin → Payments page
  "nowpaymentsApiKey",
  "nowpaymentsIpnSecret",
  "nowpaymentsSandbox",
  "paymentAutoEnabled",
] as const;

export function isWritableSettingKey(key: unknown): key is string {
  return typeof key === "string" && (WRITABLE_SETTING_KEYS as readonly string[]).includes(key);
}

/** Accepts only https://t.me/... or https://telegram.me/... links; empty otherwise. */
export function sanitizeTelegramUrl(value: unknown): string {
  if (typeof value !== "string") return "";
  const v = value.trim();
  return /^https:\/\/(t\.me|telegram\.me)(\/|$)/.test(v) ? v : "";
}
