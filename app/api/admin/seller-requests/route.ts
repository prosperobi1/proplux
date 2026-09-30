import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requests = await prisma.sellerRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { username: true, email: true } },
      _count: { select: { messages: true } },
    },
  });

  return NextResponse.json(requests.map((r) => ({
    id: r.id,
    status: r.status,
    message: r.message,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    username: r.user.username,
    userEmail: r.user.email,
    messageCount: r._count.messages,
  })));
}
