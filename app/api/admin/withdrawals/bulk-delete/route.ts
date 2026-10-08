import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const ids = Array.isArray(body?.ids) ? body.ids.filter((x: any) => typeof x === "string") : [];

  if (ids.length === 0) {
    return NextResponse.json({ error: "No withdrawals selected" }, { status: 400 });
  }
  if (ids.length > 100) {
    return NextResponse.json({ error: "Max 100 at once" }, { status: 400 });
  }

  // Only allow deleting PENDING or REJECTED withdrawals (not PAID; those affect balance history)
  const allowed = await prisma.withdrawal.findMany({
    where: { id: { in: ids }, status: { in: ["PENDING", "REJECTED"] } },
    select: { id: true },
  });

  if (allowed.length !== ids.length) {
    return NextResponse.json(
      { error: "Only PENDING or REJECTED withdrawals can be deleted" },
      { status: 400 }
    );
  }

  try {
    const result = await prisma.withdrawal.deleteMany({
      where: { id: { in: ids } },
    });
    return NextResponse.json({ ok: true, deleted: result.count });
  } catch (err) {
    return NextResponse.json({ error: "Delete failed", details: String(err) }, { status: 500 });
  }
}
