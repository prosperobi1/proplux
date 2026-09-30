import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tickets = await prisma.ticket.findMany({
    where: { userId: (session.user as any).id },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { messages: true } } },
  });
  return NextResponse.json(tickets);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { subject, message } = await req.json();
  if (!subject || !message) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  const ticket = await prisma.ticket.create({
    data: {
      subject,
      userId: (session.user as any).id,
      messages: {
        create: {
          content: message,
          authorId: (session.user as any).id,
        },
      },
    },
  });
  return NextResponse.json(ticket);
}
