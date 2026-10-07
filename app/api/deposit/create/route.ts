import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createPayment } from "@/lib/nowpayments";
import { COIN_MIN_USD, COIN_LABEL, MAX_DEPOSIT_USD } from "@/lib/deposit";

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

  // Server-side floor from the admin's "Minimum Deposit" setting — the old
  // hardcoded $10 let API clients bypass a raised minimum (the UI enforced
  // it, the API didn't). The per-coin NOWPayments minimum still applies on top.
  const minRow = await prisma.setting.findUnique({ where: { key: "minDeposit" } });
  const parsedMin = Number(minRow?.value);
  const minFloor = Number.isFinite(parsedMin) && parsedMin > 0 ? parsedMin : 10;
  if (!Number.isFinite(amount) || amount < minFloor || amount > MAX_DEPOSIT_USD) {
    return NextResponse.json(
      { error: `Amount must be between $${minFloor} and $${MAX_DEPOSIT_USD.toLocaleString("en-US")}` },
      { status: 400 }
    );
  }
  if (!ALLOWED_COINS.includes(payCurrency)) {
    return NextResponse.json({ error: "Unsupported coin" }, { status: 400 });
  }
  const coinMin = COIN_MIN_USD[payCurrency];
  if (amount < coinMin) {
    return NextResponse.json(
      { error: `Minimum deposit for ${COIN_LABEL[payCurrency]} is $${coinMin}` },
      { status: 400 }
    );
  }

  const userId = (session.user as { id: string }).id;
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
  } catch (err) {
    console.error("nowpayments create failed:", err);
    const msg = err instanceof Error && err.message ? err.message : "Failed to create payment";
    // Provider minimums can drift with the BTC/ETH price — surface it as an
    // actionable 400, not a generic 500.
    if (msg.includes("less than minimal")) {
      return NextResponse.json(
        { error: `Amount too low for ${COIN_LABEL[payCurrency] || payCurrency} right now — try a slightly larger deposit.` },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: msg || "Failed to create payment" }, { status: 500 });
  }
}
