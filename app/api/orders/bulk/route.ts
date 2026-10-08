import { prisma } from "../../../lib/prisma";
import { auth } from "../../../lib/auth";
import { buildDeliverySnapshot } from "../../../lib/delivery";
import { sendEmail, emailLayout, escapeHtml } from "../../../lib/email";
import { NextResponse } from "next/server";

const DEFAULT_COMMISSION_PERCENT = 65;
const MAX_BULK_ITEMS = 20;

async function getCommissionPercent(): Promise<number> {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: "commissionPercent" },
    });
    const parsed = parseFloat(setting?.value ?? "");
    if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 100) {
      return parsed;
    }
  } catch {
    // fall through
  }
  return DEFAULT_COMMISSION_PERCENT;
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    const body = await req.json().catch(() => ({}));
    const productIds = body?.productIds;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { error: "productIds must be a non-empty array" },
        { status: 400 }
      );
    }

    if (productIds.length > MAX_BULK_ITEMS) {
      return NextResponse.json(
        { error: `You can buy at most ${MAX_BULK_ITEMS} items at once` },
        { status: 400 }
      );
    }

    const uniqueIds = Array.from(new Set(productIds.filter((x) => typeof x === "string")));
    if (uniqueIds.length !== productIds.length) {
      return NextResponse.json(
        { error: "Duplicate productIds are not allowed" },
        { status: 400 }
      );
    }

    const maintenance = await prisma.setting.findUnique({ where: { key: "maintenanceMode" } });
    if (maintenance?.value === "true") {
      return NextResponse.json({ error: "Site is in maintenance mode. Purchases are disabled." }, { status: 503 });
    }

    const products = await prisma.product.findMany({
      where: { id: { in: uniqueIds } },
    });

    if (products.length !== uniqueIds.length) {
      return NextResponse.json(
        { error: "One or more products not found" },
        { status: 404 }
      );
    }

    // Reject if any product already has an active order for this buyer.
    const existing = await prisma.order.findMany({
      where: {
        buyerId: userId,
        productId: { in: uniqueIds },
        status: { in: ["Pending Confirmation", "Completed"] },
      },
      select: { productId: true },
    });

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "One or more items already have an active order" },
        { status: 400 }
      );
    }

    const totalPrice = products.reduce((sum, p) => sum + p.price, 0);

    const buyer = await prisma.user.findUnique({
      where: { id: userId },
      select: { balance: true },
    });

    if (!buyer) {
      return NextResponse.json({ error: "Buyer not found" }, { status: 404 });
    }

    if (buyer.balance < totalPrice) {
      return NextResponse.json(
        { error: "Insufficient balance" },
        { status: 400 }
      );
    }

    const commissionPercent = await getCommissionPercent();
    const sellerEarnings = new Map<string, number>();
    for (const p of products) {
      const credit = p.price * (commissionPercent / 100);
      sellerEarnings.set(p.sellerId, (sellerEarnings.get(p.sellerId) ?? 0) + credit);
    }

    const ops = [
      ...products.map((p) =>
        prisma.order.create({
          data: {
            buyerId: userId,
            productId: p.id,
            totalPrice: p.price,
            quantity: 1,
            status: "Pending Confirmation",
            delivery: buildDeliverySnapshot(p),
          },
        })
      ),
      prisma.user.update({
        where: { id: userId, balance: { gte: totalPrice } },
        data: { balance: { decrement: totalPrice } },
      }),
      ...Array.from(sellerEarnings.entries()).map(([sellerId, amount]) =>
        prisma.user.update({
          where: { id: sellerId },
          data: { balance: { increment: amount }, totalRevenue: { increment: amount } },
        })
      ),
    ];

    const result = await prisma.$transaction(ops);
    const createdOrders = result.slice(0, products.length);

    // Purchase complete: email the buyer a summary and each seller their
    // sales (the single-item order flow already does this; bulk never did).
    (async () => {
      try {
        const siteSet = await prisma.setting.findUnique({ where: { key: "siteName" } });
        const siteName = siteSet?.value || "Proplux";

        const buyerRow = await prisma.user.findUnique({
          where: { id: userId },
          select: { email: true, username: true, balance: true },
        });
        if (buyerRow?.email) {
          const items = products
            .map((p) => escapeHtml(`${p.country} ${p.tld || p.hosting}`))
            .join("<br />");
          await sendEmail({
            to: buyerRow.email,
            subject: `Your ${siteName} order is confirmed`,
            html: emailLayout(
              '<p style="margin:0 0 12px 0;">Hi ' + escapeHtml(buyerRow.username) + ",</p>" +
                '<p style="margin:0 0 12px 0;">Your purchase of <strong>' +
                createdOrders.length +
                (createdOrders.length === 1 ? " item" : " items") +
                "</strong> is confirmed:</p>" +
                '<p style="margin:0 0 12px 0;">' + items + "</p>" +
                '<p style="margin:0 0 12px 0;">Total: <strong>$' +
                totalPrice.toFixed(2) +
                "</strong><br />New balance: <strong>$" +
                (buyerRow.balance ?? 0).toFixed(2) +
                "</strong></p>" +
                '<p style="margin:0;font-size:13px;color:#52525b;">View details in your orders page.</p>',
              siteName
            ),
          });
        }

        const sellers = await prisma.user.findMany({
          where: { id: { in: Array.from(sellerEarnings.keys()) } },
          select: { id: true, email: true, username: true },
        });
        for (const s of sellers) {
          if (!s.email) continue;
          const mine = products.filter((p) => p.sellerId === s.id);
          const earn = sellerEarnings.get(s.id) ?? 0;
          const items = mine
            .map((p) => escapeHtml(`${p.country} ${p.tld || p.hosting}`))
            .join("<br />");
          await sendEmail({
            to: s.email,
            subject: `You made a sale on ${siteName}`,
            html: emailLayout(
              '<p style="margin:0 0 12px 0;">Hi ' + escapeHtml(s.username) + ",</p>" +
                '<p style="margin:0 0 12px 0;">You sold <strong>' +
                mine.length +
                (mine.length === 1 ? " item" : " items") +
                "</strong> in one order:</p>" +
                '<p style="margin:0 0 12px 0;">' + items + "</p>" +
                '<p style="margin:0 0 12px 0;">Your earnings (' +
                commissionPercent +
                '%): <strong>$' +
                earn.toFixed(2) +
                "</strong></p>",
              siteName
            ),
          });
        }
      } catch (err) {
        console.error("bulk order emails failed:", err);
      }
    })();

    return NextResponse.json(
      { ok: true, count: createdOrders.length, total: totalPrice },
      { status: 201 }
    );
  } catch (error) {
    if ((error as { code?: string } | null)?.code === "P2025") {
      return NextResponse.json(
        { error: "Insufficient balance" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Server error", details: String(error) },
      { status: 500 }
    );
  }
}
