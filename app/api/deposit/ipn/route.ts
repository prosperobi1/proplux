import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyIpnSignature } from "@/lib/nowpayments";

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-nowpayments-sig") || "";

  const valid = await verifyIpnSignature(rawBody, signature);
  if (!valid) {
    console.warn("IPN signature verification failed");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { payment_status, order_id, price_amount, payment_id } = payload;

  const FINISHED_STATUSES = ["finished", "confirmed"];
  if (!FINISHED_STATUSES.includes(payment_status)) {
    return NextResponse.json({ ok: true, status: payment_status, credited: false });
  }

  if (typeof order_id !== "string" || !order_id.startsWith("dep_")) {
    return NextResponse.json({ error: "Invalid order_id" }, { status: 400 });
  }

  const parts = order_id.split("_");
  const userId = parts[1];
  if (!userId) return NextResponse.json({ error: "Could not parse userId" }, { status: 400 });

  const amount = Number(price_amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const marker = await prisma.setting.findUnique({ where: { key: `deposit:${payment_id}` } });
  if (marker) return NextResponse.json({ ok: true, alreadyCredited: true });

  try {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { balance: { increment: amount } },
      }),
      prisma.setting.create({
        data: { key: `deposit:${payment_id}`, value: order_id },
      }),
      prisma.deposit.create({
        data: {
          userId,
          amount,
          method: "nowpayments",
          providerId: String(payment_id),
        },
      }),
    ]);
    return NextResponse.json({ ok: true, credited: true, amount });
  } catch (err: any) {
    console.error("IPN credit failed:", err);
    return NextResponse.json({ error: "Failed to credit balance" }, { status: 500 });
  }
}
