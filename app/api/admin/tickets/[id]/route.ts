import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail, emailLayout, escapeHtml } from "@/lib/email";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const me = session?.user as { id?: string; role?: string } | undefined;
  if (!me?.id || me.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const me = session?.user as { id?: string; role?: string } | undefined;
  if (!me?.id || me.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { content } = await req.json();
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    select: { id: true, subject: true, user: { select: { email: true, username: true } } },
  });
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const message = await prisma.ticketMessage.create({
    data: { content, ticketId: id, authorId: me.id, isStaff: true },
  });
  await prisma.ticket.update({ where: { id }, data: { updatedAt: new Date() } });

  // Staff reply: notify the ticket owner (they'd otherwise never know).
  (async () => {
    try {
      const siteSet = await prisma.setting.findUnique({ where: { key: "siteName" } });
      const siteName = siteSet?.value || "Proplux";
      if (!ticket.user?.email) return;
      const baseUrl = process.env.NEXTAUTH_URL || process.env.AUTH_URL || "http://localhost:3000";
      const snippet = String(content).length > 200 ? String(content).slice(0, 200) + "..." : String(content);
      await sendEmail({
        to: ticket.user.email,
        subject: "Support replied: " + ticket.subject,
        html: emailLayout(
          '<p style="margin:0 0 12px 0;">Hi ' +
            escapeHtml(ticket.user.username) +
            ",</p>" +
            '<p style="margin:0 0 12px 0;">The support team replied to your ticket <strong>' +
            escapeHtml(ticket.subject) +
            "</strong>:</p>" +
            '<blockquote style="margin:0 0 12px 0;padding-left:12px;border-left:3px solid #dc2626;color:#52525b;">' +
            escapeHtml(snippet) +
            "</blockquote>" +
            '<p style="margin:24px 0;"><a href="' +
            baseUrl +
            "/tickets/" +
            ticket.id +
            '" style="background:#dc2626;color:#fff;text-decoration:none;padding:12px 20px;border-radius:6px;font-weight:600;display:inline-block;">Open ticket</a></p>',
          siteName
        ),
      });
    } catch (err) {
      console.error("admin reply email failed:", err);
    }
  })();

  return NextResponse.json(message);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const me = session?.user as { id?: string; role?: string } | undefined;
  if (!me?.id || me.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { status } = await req.json();
  const ticket = await prisma.ticket.update({ where: { id }, data: { status } });
  return NextResponse.json(ticket);
}
