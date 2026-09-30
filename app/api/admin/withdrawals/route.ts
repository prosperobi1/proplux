import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const withdrawals = await prisma.withdrawal.findMany({
    orderBy: { createdAt: "desc" },
    include: { seller: { select: { username: true, email: true } } },
  });
  return NextResponse.json(withdrawals.map(w => ({
    id: w.id,
    seller: w.seller.username,
    sellerEmail: w.seller.email,
    amount: w.amount,
    wallet: w.wallet,
    network: w.network,
    status: w.status,
    reason: w.reason,
    createdAt: w.createdAt,
  })));
}
