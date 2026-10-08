import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decryptAllFields } from "@/lib/encrypt";
import { readDeliverySnapshot } from "@/lib/delivery";
import { getCommissionPercent } from "@/lib/commission";
import { sendEmail, emailLayout, escapeHtml } from "@/lib/email";

const TERMINAL_STATUSES = ["Completed", "Cancelled", "Refunded"];

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      buyer: { select: { id: true, username: true, email: true } },
      product: {
        include: {
          seller: { select: { id: true, username: true, email: true } },
        },
      },
    },
  });

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  // What the buyer received is the purchase-time snapshot; legacy orders
  // (created before snapshots existed) fall back to the live product.
  const snap = readDeliverySnapshot(order);
  const rawMeta: Record<string, unknown> | null = snap
    ? snap.metadata
    : order.product.metadata
      ? (() => { try { return JSON.parse(order.product.metadata!); } catch { return null; } })()
      : null;
  const metadata = rawMeta ? (() => {
    try { return decryptAllFields(rawMeta); } catch { return {}; }
  })() : {};

  return NextResponse.json({
    id: order.id,
    status: order.status,
    totalPrice: order.totalPrice,
    quantity: order.quantity,
    createdAt: order.createdAt,
    buyer: order.buyer,
    seller: order.product.seller,
    product: {
      id: order.product.id,
      country: order.product.country,
      tld: order.product.tld,
      hosting: order.product.hosting,
      price: order.product.price,
      checkStatus: order.product.checkStatus,
      categorySlug: order.product.categorySlug,
      deliveryType: snap ? snap.deliveryType : order.product.deliveryType,
      fileUrl: snap ? snap.fileUrl : order.product.fileUrl,
      textContent: snap ? snap.textContent : order.product.textContent,
      metadata,
    },
  });
}

/**
 * Admin order lifecycle: confirm (status only; the seller was already
 * credited at purchase) or cancel (full buyer refund + claw back the
 * seller's credit + un-sell sellOnce listings).
 *
 * The conditional status flip runs FIRST inside the transaction: its WHERE
 * only matches non-terminal orders, so a duplicate or concurrent PATCH
 * matches 0 rows and aborts before any money moves. That's the
 * idempotency guard.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body: { status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const newStatus = body.status;
  if (newStatus !== "Completed" && newStatus !== "Cancelled") {
    return NextResponse.json({ error: "Unsupported status" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      product: {
        select: { id: true, sellerId: true, categorySlug: true, country: true, tld: true, hosting: true },
      },
    },
  });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (TERMINAL_STATUSES.includes(order.status)) {
    return NextResponse.json({ error: `Order is already ${order.status}` }, { status: 400 });
  }

  if (newStatus === "Completed") {
    // Money already settled at purchase. This only releases the order.
    const upd = await prisma.order.updateMany({
      where: { id, status: { notIn: TERMINAL_STATUSES } },
      data: { status: "Completed" },
    });
    if (upd.count === 0) {
      return NextResponse.json({ error: "Order already updated" }, { status: 400 });
    }
    return NextResponse.json({ ok: true, status: "Completed" });
  }

  // ---- Cancellation: refund the buyer in full, claw back the seller ----
  const commissionPercent = await getCommissionPercent();
  // Same expression as the purchase credit (app/api/orders) so the clawback
  // matches the credited amount to the bit.
  const sellerCredit = order.totalPrice * (commissionPercent / 100);

  try {
    await prisma.$transaction(async (tx) => {
      const upd = await tx.order.updateMany({
        where: { id, status: { notIn: TERMINAL_STATUSES } },
        data: { status: "Cancelled" },
      });
      if (upd.count === 0) throw new Error("ALREADY_UPDATED");

      await tx.user.update({
        where: { id: order.buyerId },
        data: { balance: { increment: order.totalPrice } },
      });
      await tx.deposit.create({
        data: {
          userId: order.buyerId,
          amount: order.totalPrice,
          method: "refund",
          providerId: order.id,
        },
      });

      // The seller's credit (and lifetime earnings) came out of this
      // purchase, so take it back. Balance may go negative: a cancellation
      // outranks a spent balance, and wedging the order would be worse.
      await tx.user.update({
        where: { id: order.product.sellerId },
        data: {
          balance: { decrement: sellerCredit },
          totalRevenue: { decrement: sellerCredit },
        },
      });
      await tx.deposit.create({
        data: {
          userId: order.product.sellerId,
          amount: -sellerCredit,
          method: "admin",
          providerId: order.id,
        },
      });

      // sellOnce categories: un-sell the listing so it can be bought again
      // (only while it still points at this order's buyer).
      if (order.product.categorySlug) {
        const cat = await tx.category.findUnique({
          where: { slug: order.product.categorySlug },
          select: { sellOnce: true },
        });
        if (cat?.sellOnce) {
          await tx.product.updateMany({
            where: { id: order.product.id, soldToId: order.buyerId },
            data: { soldAt: null, soldToId: null },
          });
        }
      }
    });
  } catch (err) {
    if (err instanceof Error && err.message === "ALREADY_UPDATED") {
      return NextResponse.json({ error: "Order already updated" }, { status: 400 });
    }
    console.error("order cancel failed:", err);
    return NextResponse.json({ error: "Failed to cancel order" }, { status: 500 });
  }

  // Committed. Tell both sides (fire-and-forget; balances re-read fresh).
  (async () => {
    try {
      const [buyer, seller, siteSet] = await Promise.all([
        prisma.user.findUnique({
          where: { id: order.buyerId },
          select: { email: true, username: true, balance: true },
        }),
        prisma.user.findUnique({
          where: { id: order.product.sellerId },
          select: { email: true, username: true, balance: true },
        }),
        prisma.setting.findUnique({ where: { key: "siteName" } }),
      ]);
      const siteName = siteSet?.value || "Proplux";
      const orderRef = order.id.slice(-6);

      if (buyer?.email) {
        await sendEmail({
          to: buyer.email,
          subject: `Order #${orderRef} cancelled: $${order.totalPrice.toFixed(2)} refunded on ${siteName}`,
          html: emailLayout(
            '<p style="margin:0 0 12px 0;">Hi ' + escapeHtml(buyer.username) + ",</p>" +
              '<p style="margin:0 0 12px 0;">Your order <strong>#' + orderRef +
              "</strong> was cancelled and <strong>$" + order.totalPrice.toFixed(2) +
              "</strong> was refunded to your balance.</p>" +
              '<p style="margin:0 0 12px 0;">New balance: <strong>$' +
              (buyer.balance ?? 0).toFixed(2) + "</strong></p>",
            siteName
          ),
        });
      }
      if (seller?.email) {
        await sendEmail({
          to: seller.email,
          subject: `Order #${orderRef} cancelled: $${sellerCredit.toFixed(2)} deducted on ${siteName}`,
          html: emailLayout(
            '<p style="margin:0 0 12px 0;">Hi ' + escapeHtml(seller.username) + ",</p>" +
              '<p style="margin:0 0 12px 0;">The sale <strong>#' + orderRef + "</strong> (<strong>" +
              escapeHtml(`${order.product.country} ${order.product.tld || order.product.hosting}`) +
              "</strong>) was cancelled by an administrator, so your credited earnings of <strong>$" +
              sellerCredit.toFixed(2) + "</strong> (" + commissionPercent + "%) were deducted.</p>" +
              '<p style="margin:0 0 12px 0;">New balance: <strong>$' +
              (seller.balance ?? 0).toFixed(2) + "</strong></p>",
            siteName
          ),
        });
      }
    } catch (err) {
      console.error("cancel email failed:", err);
    }
  })();

  return NextResponse.json({ ok: true, status: "Cancelled" });
}
