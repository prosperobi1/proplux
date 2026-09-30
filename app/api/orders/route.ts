import { prisma } from "../../lib/prisma";
import { auth } from "../../lib/auth";
import { NextResponse } from "next/server";
import { sendEmail, emailLayout } from "../../lib/email";
import { decryptAllFields } from "../../lib/encrypt";

const DEFAULT_COMMISSION_PERCENT = 65;
const MAX_QUANTITY = 10;

async function getCommissionPercent(): Promise<number> {
  try {
    const setting = await prisma.setting.findUnique({ where: { key: "commissionPercent" } });
    const parsed = parseFloat(setting?.value ?? "");
    if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 100) return parsed;
  } catch {}
  return DEFAULT_COMMISSION_PERCENT;
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { productId, quantity: rawQty } = body;
    const userId = (session.user as any).id;

    if (!productId || typeof productId !== "string") {
      return NextResponse.json({ error: "Missing productId" }, { status: 400 });
    }

    const quantity = rawQty === undefined || rawQty === null ? 1 : Number(rawQty);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
      return NextResponse.json({ error: `Quantity must be between 1 and ${MAX_QUANTITY}` }, { status: 400 });
    }

    const maintenance = await prisma.setting.findUnique({ where: { key: "maintenanceMode" } });
    if (maintenance?.value === "true") {
      return NextResponse.json({ error: "Site is in maintenance mode. Purchases are disabled." }, { status: 503 });
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    const existing = await prisma.order.findFirst({
      where: {
        buyerId: userId,
        productId: product.id,
        status: { in: ["Pending Confirmation", "Completed"] },
      },
    });

    if (existing) {
      return NextResponse.json({ ok: true, alreadyExists: true, order: existing }, { status: 200 });
    }

    const totalPrice = product.price * quantity;

    const buyer = await prisma.user.findUnique({
      where: { id: userId },
      select: { balance: true, email: true, username: true },
    });

    if (!buyer) return NextResponse.json({ error: "Buyer not found" }, { status: 404 });
    if (buyer.balance < totalPrice) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
    }

    const commissionPercent = await getCommissionPercent();
    const sellerCredit = totalPrice * (commissionPercent / 100);

    // Instant-delivery products auto-complete on purchase; others stay Pending
    const instantTypes = ["credentials", "file", "text"];
    const initialStatus = instantTypes.includes(product.deliveryType || "credentials")
      ? "Completed"
      : "Pending Confirmation";

    const [order] = await prisma.$transaction([
      prisma.order.create({
        data: {
          buyerId: userId,
          productId: product.id,
          totalPrice,
          quantity,
          status: initialStatus,
        },
        include: { product: true },
      }),
      prisma.user.update({
        where: { id: userId, balance: { gte: totalPrice } },
        data: { balance: { decrement: totalPrice } },
      }),
      prisma.user.update({
        where: { id: product.sellerId },
        data: { balance: { increment: sellerCredit }, totalRevenue: { increment: sellerCredit } },
      }),
    ]);

    (async () => {
      try {
        const seller = await prisma.user.findUnique({
          where: { id: product.sellerId },
          select: { email: true, username: true },
        });
        const siteNameSetting = await prisma.setting.findUnique({ where: { key: "siteName" } });
        const siteName = siteNameSetting?.value || "Proplux";

        if (seller?.email) {
          await sendEmail({
            to: seller.email,
            subject: "You made a sale on " + siteName,
            html: emailLayout(
              "<p style=\"margin:0 0 12px 0;\">Hi " + seller.username + ",</p>" +
              "<p style=\"margin:0 0 12px 0;\">You just sold <strong>" + product.country + " " + (product.tld || product.hosting) + "</strong>.</p>" +
              "<p style=\"margin:0 0 12px 0;\">Sale price: <strong>$" + totalPrice.toFixed(2) + "</strong><br />Your earnings (" + commissionPercent + "%): <strong>$" + sellerCredit.toFixed(2) + "</strong></p>" +
              "<p style=\"margin:0;font-size:13px;color:#52525b;\">Order #" + order.id.slice(-6) + "</p>",
              siteName
            ),
          });
        }

        if (buyer.email) {
          await sendEmail({
            to: buyer.email,
            subject: "Your " + siteName + " order is confirmed",
            html: emailLayout(
              "<p style=\"margin:0 0 12px 0;\">Hi " + buyer.username + ",</p>" +
              "<p style=\"margin:0 0 12px 0;\">Your purchase is confirmed.</p>" +
              "<p style=\"margin:0 0 12px 0;\"><strong>" + product.country + " " + (product.tld || product.hosting) + "</strong><br />" +
              "Total: <strong>$" + totalPrice.toFixed(2) + "</strong><br />" +
              "New balance: <strong>$" + (buyer.balance - totalPrice).toFixed(2) + "</strong></p>" +
              "<p style=\"margin:0 0 12px 0;font-size:13px;color:#52525b;\">Order #" + order.id.slice(-6) + "</p>" +
              "<p style=\"margin:0;font-size:13px;color:#52525b;\">View details in your orders page.</p>",
              siteName
            ),
          });
        }
      } catch (err) {
        console.error("order email hook failed:", err);
      }
    })();

    // If the product's category is sell-once, mark it as sold (display only — filter uses orders)
    try {
      const cat = await prisma.category.findUnique({
        where: { slug: product.categorySlug || "" },
        select: { sellOnce: true },
      });
      if (cat?.sellOnce) {
        await prisma.product.update({
          where: { id: product.id },
          data: { soldAt: new Date(), soldToId: userId },
        });
      }
    } catch {}

    return NextResponse.json(order, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2025") {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error", details: String(error) }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = (session.user as any).id;

    const orders = await prisma.order.findMany({
      where: { buyerId: userId },
      include: { product: { include: { seller: { select: { username: true } } } } },
      orderBy: { createdAt: "desc" },
    });

    const reportRows = await prisma.report.findMany({
      where: { reporterId: userId, status: { in: ["PENDING", "REVIEWED"] } },
      select: { orderId: true },
    });
    const reportedOrderIds = new Set(reportRows.map((r) => r.orderId).filter(Boolean));

    const ratingRows = await prisma.rating.findMany({
      where: { raterId: userId },
      select: { orderId: true, stars: true },
    });
    const ratingMap = new Map(ratingRows.map((r) => [r.orderId, r.stars]));

    const formatted = orders.map((o) => ({
      id: o.id,
      status: o.status,
      totalPrice: o.totalPrice,
      createdAt: o.createdAt,
      reported: reportedOrderIds.has(o.id),
      rating: ratingMap.get(o.id) ?? null,
      product: {
        id: o.product.id,
        country: o.product.country,
        tld: o.product.tld,
        hosting: o.product.hosting,
        price: o.product.price,
        seller: o.product.seller.username,
        categorySlug: o.product.categorySlug,
        deliveryType: o.product.deliveryType || "credentials",
        fileUrl: o.product.fileUrl,
        metadata: (() => { try { return o.product.metadata ? decryptAllFields(JSON.parse(o.product.metadata)) : {}; } catch { return {}; } })(),
      },
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    return NextResponse.json({ error: "Server error", details: String(error) }, { status: 500 });
  }
}
