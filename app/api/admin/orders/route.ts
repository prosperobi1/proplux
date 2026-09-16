import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();

  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      buyer: { select: { username: true, email: true } },
      product: {
        select: {
          country: true,
          tld: true,
          hosting: true,
          seller: { select: { username: true } },
        },
      },
    },
  });

  return NextResponse.json(
    orders.map((o) => ({
      id: o.id,
      status: o.status,
      totalPrice: o.totalPrice,
      createdAt: o.createdAt,
      buyer: o.buyer.username,
      buyerEmail: o.buyer.email,
      product: `${o.product.country} ${o.product.tld}`,
      seller: o.product.seller.username,
      hosting: o.product.hosting,
    }))
  );
}