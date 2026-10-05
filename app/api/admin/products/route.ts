import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decryptAllFields } from "@/lib/encrypt";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");

  const where: any = {};
  if (category) where.categorySlug = category;

  // Fetch sellOnce map separately (Product has categorySlug, not a relation)
  const categories = await prisma.category.findMany({
    select: { slug: true, sellOnce: true },
  });
  const sellOnceMap = new Map(categories.map((c) => [c.slug, c.sellOnce]));

  const products = await prisma.product.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      seller: { select: { username: true } },
      orders: {
        where: { status: { in: ["Pending Confirmation", "Completed"] } },
        select: { id: true, createdAt: true, buyer: { select: { username: true } } },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      _count: {
        select: {
          orders: { where: { status: { in: ["Pending Confirmation", "Completed"] } } },
        },
      },
    },
  });

  return NextResponse.json(products.map(p => ({
    id: p.id,
    country: p.country,
    tld: p.tld,
    hosting: p.hosting,
    price: p.price,
    check: p.checkStatus,
    addedOn: p.createdAt,
    seller: p.seller.username,
    categorySlug: p.categorySlug,
    deliveryType: p.deliveryType,
    fileUrl: p.fileUrl,
    textContent: p.textContent,
    sellOnce: sellOnceMap.get(p.categorySlug || "") ?? false,
    sold: p.orders.length > 0,
    soldAt: p.orders[0]?.createdAt || null,
    buyer: p.orders[0]?.buyer.username || null,
    orderCount: p._count.orders,
    metadata: p.metadata ? decryptAllFields(JSON.parse(p.metadata)) : {},
  })));
}
