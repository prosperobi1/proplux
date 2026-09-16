import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req, { params }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const ticket = await prisma.ticket.findFirst({
    where: { id, userId: (session.user as any).id },
    include: {
      user: { select: { username: true } },
      messages: { orderBy: { createdAt: "asc" }, include: { author: { select: { username: true } } } },
    },
  });
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(ticket);
}

export async function POST(req, { params }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { content } = await req.json();
  const ticket = await prisma.ticket.findFirst({ where: { id, userId: (session.user as any).id } });
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const message = await prisma.ticketMessage.create({
    data: { content, ticketId: id, authorId: (session.user as any).id },
  });
  await prisma.ticket.update({ where: { id }, data: { updatedAt: new Date() } });
  return NextResponse.json(message);
}
