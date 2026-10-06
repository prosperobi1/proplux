import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [todaySum, monthSum, allTimeSum, cryptoSum, adminSum, refundSum, recent] = await Promise.all([
    prisma.deposit.aggregate({
      where: { createdAt: { gte: startOfDay } },
      _sum: { amount: true },
    }),
    prisma.deposit.aggregate({
      where: { createdAt: { gte: startOfMonth } },
      _sum: { amount: true },
    }),
    prisma.deposit.aggregate({
      _sum: { amount: true },
    }),
    prisma.deposit.aggregate({
      where: { method: "nowpayments" },
      _sum: { amount: true },
    }),
    prisma.deposit.aggregate({
      where: { method: "admin" },
      _sum: { amount: true },
    }),
    prisma.deposit.aggregate({
      where: { method: "refund" },
      _sum: { amount: true },
    }),
    prisma.deposit.findMany({
      orderBy: { createdAt: "desc" },
      take: 15,
      include: { user: { select: { username: true, email: true } } },
    }),
  ]);

  return NextResponse.json({
    todayDeposit: todaySum._sum.amount ?? 0,
    monthDeposit: monthSum._sum.amount ?? 0,
    allTimeDeposit: allTimeSum._sum.amount ?? 0,
    cryptoDeposit: cryptoSum._sum.amount ?? 0,
    adminCredits: adminSum._sum.amount ?? 0,
    refunds: refundSum._sum.amount ?? 0,
    recentDeposits: recent.map((d) => ({
      id: d.id,
      username: d.user.username,
      email: d.user.email,
      amount: d.amount,
      method: d.method,
      providerId: d.providerId,
      createdAt: d.createdAt,
    })),
  });
}
