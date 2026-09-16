import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    include: { seller: { select: { username: true } } },
  });
  return NextResponse.json(products.map(p => ({
    id: p.id, country: p.country, tld: p.tld, hosting: p.hosting,
    price: p.price, check: p.checkStatus, addedOn: p.createdAt,
    seller: p.seller.username,
  })));
}
