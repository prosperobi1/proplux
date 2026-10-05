import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Admin: full deposit/refund/credit history for the Payments page. */
export async function GET() {
  const session = await auth();
  const me = session?.user as { id?: string; role?: string } | undefined;
  if (!me?.id || me.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const deposits = await prisma.deposit.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { username: true, email: true, role: true } } },
  });

  return NextResponse.json(
    deposits.map((d) => ({
      id: d.id,
      username: d.user.username,
      email: d.user.email,
      role: d.user.role,
      amount: d.amount,
      method: d.method,
      providerId: d.providerId,
      createdAt: d.createdAt,
    }))
  );
}
