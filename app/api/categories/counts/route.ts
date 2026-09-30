import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      select: { slug: true, sellOnce: true },
    });
    const sellOnceMap = new Map(categories.map((c) => [c.slug, c.sellOnce]));

    // Get all products with their category slug
    const products = await prisma.product.findMany({
      select: { id: true, categorySlug: true },
    });

    // Get all active order productIds
    const activeOrders = await prisma.order.findMany({
      where: { status: { in: ["Pending Confirmation", "Completed"] } },
      select: { productId: true },
    });
    const soldProductIds = new Set(activeOrders.map((o) => o.productId));

    const counts: Record<string, number> = {};
    for (const p of products) {
      if (!p.categorySlug) continue;
      const isSellOnce = sellOnceMap.get(p.categorySlug) === true;
      const isSold = soldProductIds.has(p.id);
      if (isSellOnce && isSold) continue; // hidden from marketplace
      counts[p.categorySlug] = (counts[p.categorySlug] ?? 0) + 1;
    }

    return NextResponse.json({ counts });
  } catch (error) {
    console.error("counts error:", error);
    return NextResponse.json({ counts: {} });
  }
}
