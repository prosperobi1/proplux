import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "SELLER") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const products = await prisma.product.findMany({
    where: { sellerId: (session.user as any).id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(products);
}

export async function POST(req) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "SELLER") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { country, tld, hosting, price, checkStatus } = await req.json();
  if (!country || !tld || !hosting || !price) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  const product = await prisma.product.create({
    data: {
      country, tld, hosting,
      price: Number(price),
      checkStatus: checkStatus || "Valid",
      sellerId: (session.user as any).id,
    },
  });
  return NextResponse.json(product);
}
