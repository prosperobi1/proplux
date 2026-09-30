import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET — returns the current user's active seller request (if any)
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;

  const request = await prisma.sellerRequest.findFirst({
    where: { userId, status: { in: ["PENDING", "APPROVED"] } },
    orderBy: { createdAt: "desc" },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { username: true } } },
      },
    },
  });

  return NextResponse.json(request || null);
}

// POST — create a new seller request
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const role = (session.user as any).role;

  if (role === "SELLER" || role === "ADMIN") {
    return NextResponse.json({ error: "You are already a seller" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  const agree = body?.agree === true;

  if (!message || message.length < 20) {
    return NextResponse.json({ error: "Please describe what you want to sell (at least 20 characters)" }, { status: 400 });
  }
  if (!agree) {
    return NextResponse.json({ error: "You must agree to the rules" }, { status: 400 });
  }

  const existing = await prisma.sellerRequest.findFirst({
    where: { userId, status: { in: ["PENDING", "APPROVED"] } },
  });
  if (existing) {
    return NextResponse.json({ error: "You already have an active request" }, { status: 400 });
  }

  const created = await prisma.sellerRequest.create({
    data: { userId, message, status: "PENDING" },
  });

  return NextResponse.json(created, { status: 201 });
}
