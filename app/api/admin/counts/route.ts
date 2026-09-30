import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [pendingTickets, pendingReports, pendingWithdrawals, pendingSellerRequests] = await Promise.all([
    prisma.ticket.count({ where: { status: "OPEN" } }),
    prisma.report.count({ where: { status: { in: ["PENDING", "REVIEWED"] } } }),
    prisma.withdrawal.count({ where: { status: "PENDING" } }),
    prisma.sellerRequest.count({ where: { status: "PENDING" } }),
  ]);

  return NextResponse.json({
    pendingTickets,
    pendingReports,
    pendingWithdrawals,
    pendingSellerRequests,
  });
}
