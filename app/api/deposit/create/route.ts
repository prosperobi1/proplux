import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createPayment } from "@/lib/nowpayments";

const ALLOWED_COINS = ["btc", "eth", "usdttrc20", "usdterc20"];

function buildIpnCallbackUrl(req: Request): string | null {
  // Prefer explicit production URL if set (required for live deployments)
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return `${process.env.NEXT_PUBLIC_APP_URL}/api/deposit/ipn`;
  }
  // Local dev only. Never derive the callback from request headers: host and
  // x-forwarded-* are client-controllable, so a forged value would hand
  // payment IPNs to an attacker-controlled server.
  const host = req.headers.get("host") || "";
  if (host.startsWith("localhost:") || host.startsWith("127.0.0.1:")) {
    return `http://${host}/api/deposit/ipn`;
  }
  return null;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const autoSetting = await prisma.setting.findUnique({ where: { key: "paymentAutoEnabled" } });
  if (autoSetting?.value !== "true") {
    return NextResponse.json(
      { error: "Crypto deposits are currently disabled." },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const amount = Number(body?.amount);
  const payCurrency = typeof body?.coin === "string" ? body.coin.toLowerCase() : "btc";

  if (!Number.isFinite(amount) || amount < 10 || amount > 100000) {
    return NextResponse.json({ error: "Amount must be between $10 and $100,000" }, { status: 400 });
  }
  if (!ALLOWED_COINS.includes(payCurrency)) {
    return NextResponse.json({ error: "Unsupported coin" }, { status: 400 });
  }

  const userId = (session.user as any).id;
  const orderId = `dep_${userId}_${Date.now()}`;
  const ipnCallbackUrl = buildIpnCallbackUrl(req);
  if (!ipnCallbackUrl) {
    return NextResponse.json(
      { error: "Server URL not configured — set NEXT_PUBLIC_APP_URL so payments can call back" },
      { status: 503 }
    );
  }

  try {
    const payment = await createPayment({
      priceAmount: amount,
      priceCurrency: "usd",
      payCurrency,
      orderId,
      orderDescription: `Deposit for user ${userId.slice(-6)}`,
      ipnCallbackUrl,
    });

    return NextResponse.json({
      ok: true,
      paymentId: payment.payment_id,
      payAddress: payment.pay_address,
      payAmount: payment.pay_amount,
      payCurrency: payment.pay_currency,
      priceAmount: payment.price_amount,
      orderId,
      expiresAt: payment.expiration_estimate_date || null,
      status: payment.payment_status,
    });
  } catch (err: any) {
    console.error("nowpayments create failed:", err);
    return NextResponse.json({ error: err?.message || "Failed to create payment" }, { status: 500 });
  }
}
