import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DEFAULT_COMMISSION_PERCENT = 65;

async function getCommissionPercent(): Promise<number> {
  try {
    const setting = await prisma.setting.findUnique({ where: { key: "commissionPercent" } });
    const parsed = parseFloat(setting?.value ?? "");
    if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 100) return parsed;
  } catch {}
  return DEFAULT_COMMISSION_PERCENT;
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sellerId = (session.user as any).id;

  const [user, orders, commissionPercent] = await Promise.all([
    prisma.user.findUnique({
      where: { id: sellerId },
      select: { balance: true, totalRevenue: true },
    }),
    prisma.order.findMany({
      where: { product: { sellerId } },
      include: {
        product: { select: { country: true, tld: true, hosting: true } },
        buyer: { select: { username: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    getCommissionPercent(),
  ]);

  const activeOrders = orders.filter(
    (o) => o.status === "Pending Confirmation" || o.status === "Completed"
  );

  const formatted = orders.map((o) => ({
    id: o.id,
    status: o.status,
    totalPrice: o.totalPrice,
    yourCut: o.totalPrice * (commissionPercent / 100),
    createdAt: o.createdAt,
    buyer: o.buyer.username,
    product: `${o.product.country} ${o.product.tld || ""}`.trim() || o.product.hosting,
  }));

  return NextResponse.json({
    balance: user?.balance ?? 0,
    totalRevenue: user?.totalRevenue ?? 0,
    salesCount: activeOrders.length,
    orders: formatted,
  });
}
