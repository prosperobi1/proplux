import { NextResponse } from "next/server";
import { sendEmail, emailLayout, escapeHtml } from "@/lib/email";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session?.user || (role !== "SELLER" && role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const withdrawals = await prisma.withdrawal.findMany({
    where: { sellerId: (session.user as any).id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(withdrawals);
}

export async function POST(req: Request) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session?.user || (role !== "SELLER" && role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { amount, wallet, network } = await req.json();

  if (!amount || !wallet || !network) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Fetch seller to check balance
  const seller = await prisma.user.findUnique({
    where: { id: (session.user as any).id },
  });
  if (!seller) {
    return NextResponse.json({ error: "Seller not found" }, { status: 404 });
  }

  // Get minimum withdrawal from settings
  const minSetting = await prisma.setting.findUnique({ where: { key: "minWithdrawal" } });
  const minWithdrawal = minSetting ? Number(minSetting.value) : 10;

  const requestedAmount = Number(amount);

  // Validation 1: minimum
  if (requestedAmount < minWithdrawal) {
    return NextResponse.json({ error: "Minimum withdrawal is $" + minWithdrawal }, { status: 400 });
  }

  // Validation 2: can't withdraw more than balance
  if (requestedAmount > seller.balance) {
    return NextResponse.json({ error: "Insufficient balance. You have $" + seller.balance.toFixed(2) }, { status: 400 });
  }

  // Validation 3: no pending withdrawal exceeding balance
  const pendingTotal = await prisma.withdrawal.aggregate({
    where: { sellerId: seller.id, status: "PENDING" },
    _sum: { amount: true },
  });
  const pendingAmount = pendingTotal._sum.amount || 0;
  if (pendingAmount + requestedAmount > seller.balance) {
    return NextResponse.json({
      error: "You already have $" + pendingAmount.toFixed(2) + " pending. Available: $" + (seller.balance - pendingAmount).toFixed(2),
    }, { status: 400 });
  }

  const w = await prisma.withdrawal.create({
    data: { amount: requestedAmount, wallet, network, sellerId: seller.id },
  });

  // Alert the admin — fire-and-forget so the request is never blocked by the mail server
  (async () => {
    try {
      const [siteSet, alertSet] = await Promise.all([
        prisma.setting.findUnique({ where: { key: "siteName" } }),
        prisma.setting.findUnique({ where: { key: "adminAlertEmail" } }),
      ]);
      const siteName = siteSet?.value || "Proplux";
      const adminTo = alertSet?.value?.trim();
      if (!adminTo) return;

      const baseUrl = process.env.NEXTAUTH_URL || process.env.AUTH_URL || "http://localhost:3000";

      await sendEmail({
        to: adminTo,
        subject: "New withdrawal request on " + siteName,
        html: emailLayout(
          '<p style="margin:0 0 12px 0;">A seller has requested a payout.</p>' +
          '<p style="margin:0 0 12px 0;">Seller: <strong>' + escapeHtml(seller.username) + "</strong><br />" +
          "Amount: <strong>$" + requestedAmount.toFixed(2) + "</strong><br />" +
          "Network: <strong>" + escapeHtml(network) + "</strong><br />" +
          "Wallet: <span style=\"word-break:break-all;\">" + escapeHtml(wallet) + "</span></p>" +
          '<p style="margin:24px 0;"><a href="' + baseUrl + '/admin/withdrawals" style="background:#dc2626;color:#fff;text-decoration:none;padding:12px 20px;border-radius:6px;font-weight:600;display:inline-block;">Review request</a></p>' +
          '<p style="margin:0;font-size:13px;color:#52525b;">Withdrawal #' + escapeHtml(String(w.id).slice(-6)) + "</p>",
          siteName
        ),
      });
    } catch (err) {
      console.error("withdrawal request email failed:", err);
    }
  })();

  return NextResponse.json(w);
}
