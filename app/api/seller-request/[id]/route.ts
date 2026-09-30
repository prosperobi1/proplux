import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const userId = (session.user as any).id;

  const request = await prisma.sellerRequest.findFirst({
    where: { id, userId },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { username: true } } },
      },
    },
  });
  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(request);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const userId = (session.user as any).id;
  const { content } = await req.json().catch(() => ({}));

  if (typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const request = await prisma.sellerRequest.findFirst({ where: { id, userId } });
  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (request.status !== "PENDING") {
    return NextResponse.json({ error: "This request is closed" }, { status: 400 });
  }

  const message = await prisma.sellerRequestMessage.create({
    data: { requestId: id, authorId: userId, content: content.trim(), isAdmin: false },
  });
  await prisma.sellerRequest.update({ where: { id }, data: { updatedAt: new Date() } });
  return NextResponse.json(message, { status: 201 });
}
