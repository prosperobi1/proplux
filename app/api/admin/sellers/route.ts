import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sellers = await prisma.user.findMany({
    where: { role: "SELLER" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      username: true,
      email: true,
      balance: true,
      totalRevenue: true,
      banned: true,
      createdAt: true,
      _count: { select: { products: true } },
    },
  });

  const sellerIds = sellers.map((s) => s.id);

  const [orderCounts, ratingAggs] = await Promise.all([
    prisma.order.groupBy({
      by: ["productId"],
      where: { product: { sellerId: { in: sellerIds } }, status: { in: ["Pending Confirmation", "Completed"] } },
      _count: { _all: true },
    }),
    prisma.rating.groupBy({
      by: ["sellerId"],
      where: { sellerId: { in: sellerIds } },
      _avg: { stars: true },
      _count: { _all: true },
    }),
  ]);

  // Fetch products to map productId -> sellerId
  const products = await prisma.product.findMany({
    where: { sellerId: { in: sellerIds } },
    select: { id: true, sellerId: true },
  });
  const productToSeller = new Map(products.map((p) => [p.id, p.sellerId]));

  const ordersBySeller = new Map<string, number>();
  for (const oc of orderCounts) {
    const sellerId = productToSeller.get(oc.productId);
    if (sellerId) ordersBySeller.set(sellerId, (ordersBySeller.get(sellerId) ?? 0) + oc._count._all);
  }

  const ratingsBySeller = new Map<string, { avg: number; count: number }>();
  for (const r of ratingAggs) {
    ratingsBySeller.set(r.sellerId, {
      avg: r._avg.stars ?? 0,
      count: r._count._all,
    });
  }

  return NextResponse.json(sellers.map((s) => {
    const rating = ratingsBySeller.get(s.id);
    return {
      id: s.id,
      username: s.username,
      email: s.email,
      balance: s.balance,
      totalRevenue: s.totalRevenue ?? 0,
      banned: s.banned,
      createdAt: s.createdAt,
      productCount: s._count.products,
      orderCount: ordersBySeller.get(s.id) ?? 0,
      averageRating: rating ? Math.round(rating.avg * 10) / 10 : 0,
      ratingCount: rating?.count ?? 0,
    };
  }));
}
