import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyIpnSignature } from "@/lib/nowpayments";
import { sendEmail, emailLayout, escapeHtml } from "@/lib/email";

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-nowpayments-sig") || "";

  const valid = await verifyIpnSignature(rawBody, signature);
  if (!valid) {
    console.warn("IPN signature verification failed");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: {
    payment_status?: string;
    order_id?: string;
    price_amount?: number;
    payment_id?: string | number;
  };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { payment_status, order_id, price_amount, payment_id } = payload;

  const FINISHED_STATUSES = ["finished", "confirmed"];
  if (typeof payment_status !== "string" || !FINISHED_STATUSES.includes(payment_status)) {
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

    // Balance credited — email the buyer (fire-and-forget, after commit).
    (async () => {
      try {
        const [user, siteSet] = await Promise.all([
          prisma.user.findUnique({
            where: { id: userId },
            select: { email: true, username: true, balance: true },
          }),
          prisma.setting.findUnique({ where: { key: "siteName" } }),
        ]);
        const siteName = siteSet?.value || "Proplux";
        if (!user?.email) return;
        await sendEmail({
          to: user.email,
          subject: `Deposit received: +$${amount.toFixed(2)} on ${siteName}`,
          html: emailLayout(
            '<p style="margin:0 0 12px 0;">Hi ' + escapeHtml(user.username) + ",</p>" +
              '<p style="margin:0 0 12px 0;">Your deposit of <strong>$' +
              amount.toFixed(2) +
              "</strong> was confirmed and added to your balance.</p>" +
              '<p style="margin:0 0 12px 0;">New balance: <strong>$' +
              (user.balance ?? 0).toFixed(2) +
              "</strong></p>" +
              '<p style="margin:0;font-size:13px;color:#52525b;">Payment #' +
              escapeHtml(String(payment_id)) +
              "</p>",
            siteName
          ),
        });
      } catch (err) {
        console.error("deposit email failed:", err);
      }
    })();

    return NextResponse.json({ ok: true, credited: true, amount });
  } catch (err) {
    console.error("IPN credit failed:", err);
    return NextResponse.json({ error: "Failed to credit balance" }, { status: 500 });
  }
}
