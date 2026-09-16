import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req, { params }) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      user: { select: { username: true, email: true } },
      messages: { orderBy: { createdAt: "asc" }, include: { author: { select: { username: true, role: true } } } },
    },
  });
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    ...ticket,
    messages: ticket.messages.map(m => ({ id: m.id, content: m.content, isStaff: m.author.role === "ADMIN", createdAt: m.createdAt })),
  });
}

export async function POST(req, { params }) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { content } = await req.json();
  const message = await prisma.ticketMessage.create({
    data: { content, ticketId: id, authorId: (session.user as any).id, isStaff: true },
  });
  await prisma.ticket.update({ where: { id }, data: { updatedAt: new Date() } });
  return NextResponse.json(message);
}

export async function PATCH(req, { params }) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { status } = await req.json();
  const ticket = await prisma.ticket.update({ where: { id }, data: { status } });
  return NextResponse.json(ticket);
}
