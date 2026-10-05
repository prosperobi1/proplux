import crypto from "crypto";
import { prisma } from "@/lib/prisma";

const SANDBOX_URL = "https://api-sandbox.nowpayments.io/v1";
const LIVE_URL = "https://api.nowpayments.io/v1";

async function getConfig() {
  const rows = await prisma.setting.findMany({
    where: {
      key: {
        in: ["nowpaymentsApiKey", "nowpaymentsIpnSecret", "nowpaymentsSandbox", "paymentProvider"],
      },
    },
  });
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;
  return {
    apiKey: map.nowpaymentsApiKey || "",
    ipnSecret: map.nowpaymentsIpnSecret || "",
    sandbox: map.nowpaymentsSandbox === "true",
    provider: map.paymentProvider || "disabled",
  };
}

export async function npFetch(path: string, init: RequestInit = {}) {
  const cfg = await getConfig();
  if (!cfg.apiKey) throw new Error("NOWPayments API key is not configured");

  const base = cfg.sandbox ? SANDBOX_URL : LIVE_URL;
  const res = await fetch(base + path, {
    ...init,
    headers: {
      "x-api-key": cfg.apiKey,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || `NOWPayments ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

export async function createPayment(args: {
  priceAmount: number;
  priceCurrency: string;
  payCurrency: string;
  orderId: string;
  orderDescription?: string;
  ipnCallbackUrl: string;
}) {
  return npFetch("/payment", {
    method: "POST",
    body: JSON.stringify({
      price_amount: args.priceAmount,
      price_currency: args.priceCurrency,
      pay_currency: args.payCurrency,
      order_id: args.orderId,
      order_description: args.orderDescription || "Deposit",
      ipn_callback_url: args.ipnCallbackUrl,
      is_fixed_rate: false,
      is_fee_paid_by_user: false,
    }),
  });
}

export async function getPaymentStatus(paymentId: string) {
  return npFetch(`/payment/${paymentId}`, { method: "GET" });
}

export async function verifyIpnSignature(rawBody: string, signature: string): Promise<boolean> {
  const cfg = await getConfig();
  if (!cfg.ipnSecret || !signature) return false;
  try {
    const parsed = JSON.parse(rawBody);
    const sorted = sortObject(parsed);
    const hmac = crypto.createHmac("sha512", cfg.ipnSecret);
    hmac.update(JSON.stringify(sorted));
    const expected = hmac.digest("hex");
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(signature, "hex");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function sortObject(obj: any): any {
  return Object.keys(obj)
    .sort()
    .reduce((result: any, key: string) => {
      result[key] =
        obj[key] && typeof obj[key] === "object" ? sortObject(obj[key]) : obj[key];
      return result;
    }, {});
}

export async function isNowPaymentsConfigured(): Promise<boolean> {
  const cfg = await getConfig();
  return cfg.provider === "nowpayments" && Boolean(cfg.apiKey) && Boolean(cfg.ipnSecret);
}

export async function getPaymentProvider(): Promise<string> {
  const cfg = await getConfig();
  return cfg.provider;
}
