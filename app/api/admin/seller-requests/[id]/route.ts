import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail, emailLayout } from "@/lib/email";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const request = await prisma.sellerRequest.findUnique({
    where: { id },
    include: {
      user: { select: { username: true, email: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { username: true } } },
      },
    },
  });
  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(request);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const { status, reviewNote } = await req.json().catch(() => ({}));

  if (!["APPROVED", "REJECTED"].includes(status)) {
    return NextResponse.json({ error: "Status must be APPROVED or REJECTED" }, { status: 400 });
  }

  const request = await prisma.sellerRequest.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (request.status !== "PENDING") {
    return NextResponse.json({ error: "This request is already reviewed" }, { status: 400 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.sellerRequest.update({
      where: { id },
      data: { status, reviewNote: reviewNote || null },
    });
    if (status === "APPROVED") {
      await tx.user.update({ where: { id: request.userId }, data: { role: "SELLER" } });
    }
    return u;
  });

  (async () => {
    try {
      const siteNameSetting = await prisma.setting.findUnique({ where: { key: "siteName" } });
      const siteName = siteNameSetting?.value || "Proplux";
      const subject = status === "APPROVED"
        ? "Your seller request has been approved"
        : "Your seller request was reviewed";
      const bodyHtml = status === "APPROVED"
        ? "<p>Hi " + request.user.username + ",</p><p>Great news — your seller request has been <strong>approved</strong>. You can now access your Seller Panel and start listing products.</p>"
        : "<p>Hi " + request.user.username + ",</p><p>Your seller request was not approved.</p>" +
          (reviewNote ? "<p><strong>Reason:</strong> " + String(reviewNote).replace(/</g, "&lt;") + "</p>" : "");

      await sendEmail({
        to: request.user.email,
        subject,
        html: emailLayout(bodyHtml, siteName),
      });
    } catch (err) {
      console.error("seller request email failed:", err);
    }
  })();

  return NextResponse.json({ ok: true, request: updated });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const adminId = (session.user as any).id;
  const { content } = await req.json().catch(() => ({}));

  if (typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const request = await prisma.sellerRequest.findUnique({ where: { id } });
  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const message = await prisma.sellerRequestMessage.create({
    data: { requestId: id, authorId: adminId, content: content.trim(), isAdmin: true },
  });
  await prisma.sellerRequest.update({ where: { id }, data: { updatedAt: new Date() } });
  return NextResponse.json(message, { status: 201 });
}
