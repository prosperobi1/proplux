import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail, emailLayout, escapeHtml } from "@/lib/email";

// GET: returns the current user's active seller request (if any)
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;

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

// POST: create a new seller request
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const me = session.user as { id?: string; role?: string };
  const userId = me.id as string;
  const role = me.role;

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

  // New seller request: alert admin to review it (fire-and-forget).
  (async () => {
    try {
      const [alertSet, siteSet, applicant] = await Promise.all([
        prisma.setting.findUnique({ where: { key: "adminAlertEmail" } }),
        prisma.setting.findUnique({ where: { key: "siteName" } }),
        prisma.user.findUnique({ where: { id: userId }, select: { username: true, email: true } }),
      ]);
      const adminTo = alertSet?.value?.trim();
      const siteName = siteSet?.value || "Proplux";
      if (!adminTo) return;
      const baseUrl = process.env.NEXTAUTH_URL || process.env.AUTH_URL || "http://localhost:3000";
      const snippet = message.length > 200 ? message.slice(0, 200) + "..." : message;
      await sendEmail({
        to: adminTo,
        subject: "New seller request on " + siteName,
        html: emailLayout(
          '<p style="margin:0 0 12px 0;"><strong>' +
            escapeHtml(applicant?.username || "A user") +
            "</strong> requested a seller account" +
            (applicant?.email ? " (" + escapeHtml(applicant.email) + ")" : "") +
            ".</p>" +
            '<blockquote style="margin:0 0 12px 0;padding-left:12px;border-left:3px solid #dc2626;color:#52525b;">' +
            escapeHtml(snippet) +
            "</blockquote>" +
            '<p style="margin:24px 0;"><a href="' +
            baseUrl +
            '/admin/seller-requests" style="background:#dc2626;color:#fff;text-decoration:none;padding:12px 20px;border-radius:6px;font-weight:600;display:inline-block;">Review request</a></p>',
          siteName
        ),
      });
    } catch (err) {
      console.error("new seller request email failed:", err);
    }
  })();

  return NextResponse.json(created, { status: 201 });
}
