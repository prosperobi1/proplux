import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail, emailLayout } from "@/lib/email";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;
  const reports = await prisma.report.findMany({
    where: { reporterId: userId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(reports);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const reporterId = (session.user as any).id;
  const body = await req.json().catch(() => ({}));
  const { orderId, reason, details } = body;

  if (!orderId || !reason) {
    return NextResponse.json({ error: "Missing orderId or reason" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { product: true },
  });

  if (!order || order.buyerId !== reporterId) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const existing = await prisma.report.findFirst({
    where: { reporterId, orderId, status: { in: ["PENDING", "REVIEWED"] } },
  });
  if (existing) {
    return NextResponse.json({ error: "You already reported this order" }, { status: 400 });
  }

  const report = await prisma.report.create({
    data: {
      reporterId,
      sellerId: order.product.sellerId,
      orderId,
      reason,
      details: details || null,
    },
  });

  (async () => {
    try {
      const adminAlert = await prisma.setting.findUnique({ where: { key: "adminAlertEmail" } });
      const siteNameSetting = await prisma.setting.findUnique({ where: { key: "siteName" } });
      const siteName = siteNameSetting?.value || "Proplux";
      const reporter = await prisma.user.findUnique({
        where: { id: reporterId },
        select: { username: true, email: true },
      });
      const seller = await prisma.user.findUnique({
        where: { id: order.product.sellerId },
        select: { username: true },
      });
      if (adminAlert?.value) {
        await sendEmail({
          to: adminAlert.value,
          subject: "New report filed on " + siteName,
          html: emailLayout(
            "<p style=\"margin:0 0 12px 0;\"><strong>" + (reporter?.username || "A buyer") + "</strong> reported <strong>" + (seller?.username || "a seller") + "</strong>.</p>" +
            "<p style=\"margin:0 0 12px 0;\">Reason: <strong>" + reason + "</strong></p>" +
            (details ? "<p style=\"margin:0 0 12px 0;\">Details: " + String(details).replace(/</g, "&lt;") + "</p>" : "") +
            "<p style=\"margin:0;font-size:13px;color:#52525b;\">Order #" + orderId.slice(-6) + "</p>",
            siteName
          ),
        });
      }
    } catch (err) {
      console.error("report email hook failed:", err);
    }
  })();

  return NextResponse.json(report, { status: 201 });
}
