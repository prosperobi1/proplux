import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();

  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [totalUsers, totalSellers, recentUsers, totalOrders] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "SELLER" } }),
    prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
      },
    }),
    prisma.order.count(),
  ]);

  return NextResponse.json({
    totalUsers,
    totalSellers,
    totalOrders,
    pendingTickets: 0, // we'll wire this once tickets are built
    pendingReports: 0, // we'll wire this once reports are built
    recentUsers,
  });
}