import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { decryptAllFields } from "@/lib/encrypt";

/**
 * Pre-purchase SMTP test: the buyer enters their own email address and clicks
 * "Check". The server decrypts the listing's SMTP credentials (never returned
 * to the client), connects, and sends a fixed test email to that address.
 * Advisory only — buying is never blocked by the result.
 */

// 5 checks per user per minute (in-memory).
const hits = new Map<string, number[]>();
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 5;
const CHECK_TIMEOUT_MS = 12_000;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function friendly(err: unknown): string {
  const e = err as { code?: string; message?: string };
  const code = e?.code || "";
  const msg = String(e?.message || err || "Unknown error");
  if (code === "EAUTH") return "Login failed. The email or password is wrong.";
  if (code === "ECONNREFUSED") return "Connection refused. The host or port looks wrong.";
  if (code === "ENOTFOUND") return "Host not found. Check the host value.";
  if (code === "ETIMEDOUT" || code === "EDNS") return "Connection timed out. The server did not answer.";
  if (code === "ECONNRESET" || code === "EPIPE") return "The server dropped the connection.";
  if (code === "ECONNECTION") return "Could not connect in time. Try again.";
  if (code === "EMESSAGE") return "The server rejected the message.";
  if (/tls|ssl|certificate/i.test(msg)) return "TLS/SSL error. Check the security setting.";
  return msg.length > 160 ? msg.slice(0, 157) + "..." : msg;
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  // Always answer with JSON — a thrown error would surface in the UI as a
  // generic "Network error" instead of a useful message.
  try {
    return await checkSmtp(req, ctx);
  } catch {
    return NextResponse.json(
      { ok: false, message: "Something went wrong running the check. Try again." },
      { status: 500 }
    );
  }
}

async function checkSmtp(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { ok: false, message: "Log in first to test the SMTP." },
      { status: 401 }
    );
  }
  const userId = String((session.user as { id?: string }).id || "");

  const now = Date.now();
  const recent = (hits.get(userId) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_MAX) {
    return NextResponse.json(
      { ok: false, message: "Too many checks. Wait a minute and try again." },
      { status: 429 }
    );
  }
  recent.push(now);
  hits.set(userId, recent);

  let body: { email?: unknown } = {};
  try {
    body = await req.json();
  } catch {}
  const to = String(body.email || "").trim().toLowerCase();
  if (!EMAIL_RE.test(to)) {
    return NextResponse.json(
      { ok: false, message: "Enter a valid email address first." },
      { status: 400 }
    );
  }

  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product || product.categorySlug !== "smtps") {
    return NextResponse.json(
      { ok: false, message: "This product can't be tested." },
      { status: 404 }
    );
  }

  let meta: Record<string, unknown> = {};
  try {
    meta = product.metadata ? decryptAllFields(JSON.parse(product.metadata)) : {};
  } catch {}

  const host = String(meta.host || meta.smtpHost || "").trim();
  const user = String(meta.email || meta.user || meta.username || "").trim();
  const pass = String(meta.password || "");
  // Relay-style SMTPs (Brevo etc.) log in with an account address but must send
  // From a verified mailbox — fall back to the login when no From is set.
  const from = String(meta.fromEmail || meta.from || user).trim();
  const security = String(meta.security || "STARTTLS").toUpperCase();
  const type = String(meta.type || "SMTP").toUpperCase();

  if (type !== "SMTP") {
    return NextResponse.json({
      ok: false,
      message: `This is an ${type} account. The email test only works for SMTP.`,
    });
  }
  if (!host || !user || !pass) {
    return NextResponse.json({
      ok: false,
      message: "This listing is missing SMTP details.",
    });
  }

  // Validate the port — a junk value (e.g. 99999) would throw inside nodemailer
  // and surface as a generic client-side "Network error". Only echo the value
  // when it's plain digits (never echo an undecrypted blob).
  const rawPort = String(meta.port ?? "").trim();
  const parsedPort = rawPort === "" ? 587 : parseInt(rawPort, 10);
  if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
    const hint = /^\d{1,6}$/.test(rawPort) ? ` (${rawPort})` : "";
    return NextResponse.json({
      ok: false,
      message: `This listing has an invalid port${hint}. Use a number between 1 and 65535.`,
    });
  }
  const port = parsedPort;

  const transport = nodemailer.createTransport({
    host,
    port,
    secure: security === "SSL",
    requireTLS: security === "TLS" || security === "STARTTLS",
    auth: { user, pass },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 15000,
  });

  const send = transport.sendMail({
    from,
    to,
    subject: "SMTP test from Proplux",
    text:
      "Hi,\n\n" +
      "This is a test email sent through the SMTP account you are about to buy on Proplux. " +
      "If you are reading this, the SMTP works.\n\n" +
      "Proplux",
  }).then(
    () => ({ ok: true as const }),
    (error: unknown) => ({ ok: false as const, error })
  );

  const timeout = new Promise<{ ok: false; timedOut: true }>((resolve) => {
    const t = setTimeout(() => resolve({ ok: false, timedOut: true }), CHECK_TIMEOUT_MS);
    if (typeof t === "object" && t && "unref" in t) t.unref();
  });

  const result = await Promise.race([send, timeout]);

  if ("timedOut" in result) {
    return NextResponse.json({
      ok: false,
      message: "No response within 12 seconds. Try again.",
    });
  }
  if (result.ok) {
    return NextResponse.json({
      ok: true,
      message: `Test email sent to ${to}. Give it a minute and check spam too.`,
    });
  }
  return NextResponse.json({ ok: false, message: friendly(result.error) });
}
