import { Resend, type CreateEmailOptions } from "resend";
import nodemailer from "nodemailer";
import { prisma } from "./prisma";

const FROM_FALLBACK = "Proplux <onboarding@resend.dev>";

const SMTP_KEYS = [
  "smtpEnabled",
  "smtpHost",
  "smtpPort",
  "smtpSecurity",
  "smtpUser",
  "smtpPass",
  "smtpFrom",
  "smtpFromName",
];

export type SmtpConfig = {
  enabled: boolean;
  host: string;
  port: number;
  security: "starttls" | "ssl" | "none";
  user: string;
  pass: string;
  from: string;
  fromName: string;
};

/** Load SMTP settings from the DB (admin-configured in /admin/settings). */
export async function getSmtpConfig(): Promise<SmtpConfig> {
  const rows = await prisma.setting.findMany({
    where: { key: { in: SMTP_KEYS } },
  });
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;

  const port = parseInt(map.smtpPort || "", 10);
  const security = map.smtpSecurity === "ssl" || map.smtpSecurity === "none"
    ? map.smtpSecurity
    : "starttls";

  return {
    enabled: map.smtpEnabled === "true",
    host: (map.smtpHost || "").trim(),
    port: Number.isFinite(port) && port > 0 && port <= 65535 ? port : 587,
    security,
    user: (map.smtpUser || "").trim(),
    pass: map.smtpPass || "",
    from: (map.smtpFrom || "").trim(),
    fromName: (map.smtpFromName || "").trim(),
  };
}

export function isSmtpReady(cfg: SmtpConfig): boolean {
  return cfg.enabled && Boolean(cfg.host) && Boolean(cfg.from);
}

type SendArgs = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export type SendResult = {
  ok: boolean;
  skipped?: boolean;
  via?: "smtp" | "resend";
  /** true when the mail was handed to a connection that is still pending (rare network stall) */
  slow?: boolean;
  error?: string;
};

/**
 * Observed on this network: the FIRST smtp connection after an idle gap can stall
 * for ~2 minutes while DNS and the event loop are perfectly healthy (verified with
 * a standalone probe + process sample). Normal sends take ~1.5–2s, so anything past
 * this deadline is a stall — we stop making the caller wait and only retry if the
 * attempt ultimately fails (a retry connects on the now-warm path and takes ~1s).
 */
const SEND_DEADLINE_MS = 15000;

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

/** One concise line per successful send — the only way to answer "did that alert actually go out?" from logs. */
function logSent(args: SendArgs, r: SendResult): void {
  if (!r.ok) return;
  console.log(
    `[email] sent to ${args.to} via ${r.via ?? "?"}${r.slow ? " (slow, handed off)" : ""} — "${args.subject}"`
  );
}

async function sendViaSmtp(
  cfg: SmtpConfig,
  { to, subject, html, text }: SendArgs
): Promise<SendResult> {
  const secure = cfg.security === "ssl";
  const transport = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure,
    requireTLS: cfg.security === "starttls",
    ...(cfg.user ? { auth: { user: cfg.user, pass: cfg.pass } } : {}),
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 30000,
  });

  const from = cfg.fromName ? `${cfg.fromName} <${cfg.from}>` : cfg.from;
  const mail = {
    from,
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]+>/g, ""),
  };

  const t0 = Date.now();
  const send = transport.sendMail(mail);

  const outcome = await Promise.race([
    send.then(
      () => "accepted" as const,
      (err) => ({ failed: errorMessage(err) })
    ),
    new Promise<"pending">((resolve) => {
      const t = setTimeout(() => resolve("pending"), SEND_DEADLINE_MS);
      // don't let the deadline timer keep a process alive on shutdown
      if (typeof t === "object" && t && "unref" in t) t.unref();
    }),
  ]);

  if (outcome === "accepted") {
    return { ok: true, via: "smtp" };
  }
  if (typeof outcome === "object") {
    return { ok: false, via: "smtp", error: outcome.failed };
  }

  // Deadline hit: hand the caller back, keep watching in the background, and
  // retry only if this attempt eventually fails (avoids duplicate emails).
  send.then(undefined, async (err) => {
    console.warn(
      `[email] SMTP stalled past ${SEND_DEADLINE_MS}ms then failed after ${Date.now() - t0}ms — retrying once on a fresh connection:`,
      errorMessage(err)
    );
    try {
      await transport.sendMail(mail);
    } catch (err2) {
      console.error("[email] background retry failed:", errorMessage(err2));
    }
  });
  return { ok: true, via: "smtp", slow: true };
}

async function sendViaResend(
  { to, subject, html, text }: SendArgs
): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email] no SMTP configured and RESEND_API_KEY not set — skipping send to", to);
    return {
      ok: false,
      skipped: true,
      error: "No email method configured. Set up SMTP in Admin → Settings → Email (SMTP).",
    };
  }
  const resend = new Resend(apiKey);
  const payload: CreateEmailOptions = {
    from: process.env.EMAIL_FROM || FROM_FALLBACK,
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]+>/g, ""),
  };
  const { error } = await resend.emails.send(payload);
  if (error) return { ok: false, via: "resend", error: error.message };
  return { ok: true, via: "resend" };
}

/**
 * Send an email through the admin-configured SMTP server.
 * Falls back to Resend (RESEND_API_KEY) when SMTP is not configured.
 */
export async function sendEmail(args: SendArgs): Promise<SendResult> {
  let cfg: SmtpConfig | null = null;
  try {
    cfg = await getSmtpConfig();
  } catch (err) {
    console.error("[email] failed to load SMTP settings:", errorMessage(err));
  }

  if (cfg && isSmtpReady(cfg)) {
    try {
      const r = await sendViaSmtp(cfg, args);
      if (r.ok) logSent(args, r);
      else console.error("[email] SMTP send failed:", r.error || "unknown");
      return r;
    } catch (err) {
      const message = errorMessage(err);
      console.error("[email] SMTP send failed:", message);
      return { ok: false, via: "smtp", error: message };
    }
  }

  try {
    const r = await sendViaResend(args);
    if (r.ok) logSent(args, r);
    else if (!r.skipped) console.error("[email] Resend send failed:", r.error || "unknown");
    return r;
  } catch (err) {
    const message = errorMessage(err);
    console.error("[email] send failed:", message);
    return { ok: false, error: message };
  }
}

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function emailLayout(body: string, siteName = "Proplux") {
  // Light theme on purpose: dark-mode clients (Gmail on iOS especially) drop
  // dark background colors but keep dark text — so white background + near-black
  // text stays readable in both light and dark mode. The color-scheme metas let
  // clients that support them (Apple Mail) flip the whole email to dark cleanly.
  return `
    <meta name="color-scheme" content="light dark" />
    <meta name="supported-color-schemes" content="light dark" />
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="width:100%;background-color:#ffffff;border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;">
      <tr>
        <td align="center" bgcolor="#ffffff" style="background-color:#ffffff;padding:32px 16px;">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;">
            <tr>
              <td bgcolor="#ffffff" style="background-color:#ffffff;font-family:system-ui,Segoe UI,Arial,sans-serif;color:#18181b;line-height:1.55;">
                <h2 style="color:#dc2626;margin:0 0 16px 0;font-size:22px;">${escapeHtml(siteName)}</h2>
                ${body}
                <hr style="border:0;border-top:1px solid #e4e4e7;margin:24px 0;" />
                <p style="font-size:12px;color:#71717a;margin:0;">
                  This email was sent by ${escapeHtml(siteName)}. If you did not request this, you can ignore it.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
}
