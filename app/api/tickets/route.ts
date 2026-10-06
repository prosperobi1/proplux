import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail, emailLayout, escapeHtml } from "@/lib/email";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tickets = await prisma.ticket.findMany({
    where: { userId: (session.user as { id: string }).id },
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
  const authorId = (session.user as { id: string }).id;
  const ticket = await prisma.ticket.create({
    data: {
      subject,
      userId: authorId,
      messages: {
        create: {
          content: message,
          authorId,
        },
      },
    },
  });

  // New ticket — alert support so it doesn't sit unnoticed (fire-and-forget).
  (async () => {
    try {
      const [alertSet, siteSet, author] = await Promise.all([
        prisma.setting.findUnique({ where: { key: "adminAlertEmail" } }),
        prisma.setting.findUnique({ where: { key: "siteName" } }),
        prisma.user.findUnique({ where: { id: authorId }, select: { username: true } }),
      ]);
      const adminTo = alertSet?.value?.trim();
      const siteName = siteSet?.value || "Proplux";
      if (!adminTo) return;
      const baseUrl = process.env.NEXTAUTH_URL || process.env.AUTH_URL || "http://localhost:3000";
      const snippet = String(message).length > 200 ? String(message).slice(0, 200) + "..." : String(message);
      await sendEmail({
        to: adminTo,
        subject: "New support ticket on " + siteName,
        html: emailLayout(
          '<p style="margin:0 0 12px 0;"><strong>' +
            escapeHtml(author?.username || "A user") +
            "</strong> opened a new support ticket.</p>" +
            '<p style="margin:0 0 12px 0;">Subject: <strong>' +
            escapeHtml(subject) +
            "</strong></p>" +
            '<blockquote style="margin:0 0 12px 0;padding-left:12px;border-left:3px solid #dc2626;color:#52525b;">' +
            escapeHtml(snippet) +
            "</blockquote>" +
            '<p style="margin:24px 0;"><a href="' +
            baseUrl +
            '/admin/tickets" style="background:#dc2626;color:#fff;text-decoration:none;padding:12px 20px;border-radius:6px;font-weight:600;display:inline-block;">Review ticket</a></p>',
          siteName
        ),
      });
    } catch (err) {
      console.error("new ticket email failed:", err);
    }
  })();

  return NextResponse.json(ticket);
}
