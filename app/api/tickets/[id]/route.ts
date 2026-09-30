import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail, emailLayout } from "@/lib/email";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
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

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
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

  (async () => {
    try {
      const adminAlert = await prisma.setting.findUnique({ where: { key: "adminAlertEmail" } });
      const siteNameSetting = await prisma.setting.findUnique({ where: { key: "siteName" } });
      const siteName = siteNameSetting?.value || "Proplux";
      const author = await prisma.user.findUnique({
        where: { id: (session.user as any).id },
        select: { username: true },
      });
      if (adminAlert?.value) {
        const snippet = content.length > 200 ? content.slice(0, 200) + "..." : content;
        await sendEmail({
          to: adminAlert.value,
          subject: "New message on ticket: " + ticket.subject,
          html: emailLayout(
            "<p style=\"margin:0 0 12px 0;\">A new message was posted on ticket <strong>" + ticket.subject + "</strong>.</p>" +
            "<p style=\"margin:0 0 12px 0;\"><strong>" + (author?.username || "User") + ":</strong></p>" +
            "<blockquote style=\"margin:0 0 12px 0;padding-left:12px;border-left:3px solid #dc2626;color:#52525b;\">" + snippet.replace(/</g, "&lt;") + "</blockquote>" +
            "<p style=\"margin:0;font-size:13px;color:#52525b;\">Ticket #" + ticket.id.slice(-6) + "</p>",
            siteName
          ),
        });
      }
    } catch (err) {
      console.error("ticket email hook failed:", err);
    }
  })();

  return NextResponse.json(message);
}
