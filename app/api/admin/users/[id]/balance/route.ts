import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX_CREDIT = 100000;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const amount = Number(body?.amount);
    const mode = body?.mode === "debit" ? "debit" : "credit";

    if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_CREDIT) {
      return NextResponse.json(
        { error: `Amount must be between 0.01 and ${MAX_CREDIT}` },
        { status: 400 }
      );
    }

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, balance: true, email: true },
    });

    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (mode === "debit" && target.balance < amount) {
      return NextResponse.json(
        { error: "Insufficient balance to debit that amount" },
        { status: 400 }
      );
    }

    const [updated] = await prisma.$transaction([
      prisma.user.update({
        where: { id },
        data: {
          balance: mode === "debit" ? { decrement: amount } : { increment: amount },
        },
        select: { id: true, email: true, balance: true },
      }),
      prisma.deposit.create({
        data: {
          userId: id,
          amount: mode === "debit" ? -amount : amount,
          method: "admin",
        },
      }),
    ]);

    return NextResponse.json({ ok: true, user: updated });
  } catch (error) {
    return NextResponse.json(
      { error: "Server error", details: String(error) },
      { status: 500 }
    );
  }
}
