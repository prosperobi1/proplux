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
    select: { id: true, username: true, email: true, balance: true, createdAt: true, _count: { select: { products: true, orders: true } } },
  });
  return NextResponse.json(sellers.map(s => ({
    id: s.id, username: s.username, email: s.email,
    balance: s.balance, createdAt: s.createdAt,
    products: s._count.products, orders: s._count.orders,
  })));
}
