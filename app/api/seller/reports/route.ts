import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session?.user || (role !== "SELLER" && role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sellerId = (session.user as any).id;
  const reports = await prisma.report.findMany({
    where: { sellerId },
    orderBy: { createdAt: "desc" },
    include: { reporter: { select: { username: true } } },
  });
  return NextResponse.json(reports);
}
