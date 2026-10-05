import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = (session.user as { role?: string }).role;
  if (role !== "SELLER" && role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const sellerId = (session.user as any).id;

  const [user, productCount, orders, minWithdrawalSetting, ratingAgg] = await Promise.all([
    prisma.user.findUnique({
      where: { id: sellerId },
      select: { balance: true, totalRevenue: true },
    }),
    prisma.product.count({ where: { sellerId } }),
    prisma.order.findMany({
      where: { product: { sellerId }, status: { in: ["Pending Confirmation", "Completed"] } },
      select: { id: true, totalPrice: true },
    }),
    prisma.setting.findUnique({ where: { key: "minWithdrawal" } }),
    prisma.rating.aggregate({
      where: { sellerId },
      _avg: { stars: true },
      _count: { _all: true },
    }),
  ]);

  const salesCount = orders.length;
  const grossSales = orders.reduce((s, o) => s + o.totalPrice, 0);
  const avg = ratingAgg._avg.stars ?? 0;

  return NextResponse.json({
    balance: user?.balance ?? 0,
    totalRevenue: user?.totalRevenue ?? 0,
    productCount,
    salesCount,
    grossSales,
    averageRating: Math.round(avg * 10) / 10,
    ratingCount: ratingAgg._count._all,
    minWithdrawal: (() => {
      const p = parseFloat(minWithdrawalSetting?.value ?? "");
      return Number.isFinite(p) && p >= 0 ? p : 10;
    })(),
  });
}
