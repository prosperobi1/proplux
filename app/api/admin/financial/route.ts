import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();

  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // For now, "deposits" = total order value. Once we add real crypto
  // deposits, this will pull from a Deposit table.
  const [todayOrders, monthOrders, allOrders, totalUsers] = await Promise.all([
    prisma.order.aggregate({
      where: { createdAt: { gte: startOfToday } },
      _sum: { totalPrice: true },
    }),
    prisma.order.aggregate({
      where: { createdAt: { gte: startOfMonth } },
      _sum: { totalPrice: true },
    }),
    prisma.order.aggregate({
      _sum: { totalPrice: true },
    }),
    prisma.user.count(),
  ]);

  const recentOrders = await prisma.order.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: {
      buyer: { select: { username: true } },
      product: { select: { country: true, tld: true } },
    },
  });

  return NextResponse.json({
    todayDeposit: todayOrders._sum.totalPrice || 0,
    monthDeposit: monthOrders._sum.totalPrice || 0,
    beginningDeposit: allOrders._sum.totalPrice || 0,
    walletBalance: 0, // Placeholder — real balance comes from crypto provider
    totalUsers,
    recentOrders: recentOrders.map((o) => ({
      id: o.id,
      buyer: o.buyer.username,
      amount: o.totalPrice,
      product: `${o.product.country} ${o.product.tld}`,
      createdAt: o.createdAt,
    })),
  });
}