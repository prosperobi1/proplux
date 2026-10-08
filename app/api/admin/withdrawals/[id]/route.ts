import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail, emailLayout, escapeHtml } from "@/lib/email";

const ALLOWED = ["APPROVED", "REJECTED", "PAID", "PENDING"];

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const status = body?.status;
  const reason =
    typeof body?.reason === "string" && body.reason.trim()
      ? body.reason.trim().slice(0, 500)
      : null;

  if (typeof status !== "string" || !ALLOWED.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const withdrawal = await prisma.withdrawal.findUnique({ where: { id } });
  if (!withdrawal) {
    return NextResponse.json({ error: "Withdrawal not found" }, { status: 404 });
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      // Transition INTO PAID: decrement balance, with guard against overdraft.
      if (status === "PAID" && withdrawal.status !== "PAID") {
        const seller = await tx.user.findUnique({
          where: { id: withdrawal.sellerId },
          select: { balance: true },
        });
        if (!seller || seller.balance < withdrawal.amount) {
          throw new Error(
            `Seller balance ($${(seller?.balance ?? 0).toFixed(2)}) is less than withdrawal amount ($${withdrawal.amount.toFixed(2)})`
          );
        }
        await tx.user.update({
          where: { id: withdrawal.sellerId },
          data: { balance: { decrement: withdrawal.amount } },
        });
      }

      // Transition OUT of PAID: refund balance.
      if (withdrawal.status === "PAID" && status !== "PAID") {
        await tx.user.update({
          where: { id: withdrawal.sellerId },
          data: { balance: { increment: withdrawal.amount } },
        });
      }

      return tx.withdrawal.update({
        where: { id },
        data: { status, ...(reason !== null ? { reason } : {}) },
      });
    });

    // Notify the seller: fire-and-forget so the status change is never blocked
    if (status !== withdrawal.status && ["APPROVED", "REJECTED", "PAID"].includes(status)) {
      (async () => {
        try {
          const [seller, siteSet] = await Promise.all([
            prisma.user.findUnique({
              where: { id: withdrawal.sellerId },
              select: { email: true, username: true },
            }),
            prisma.setting.findUnique({ where: { key: "siteName" } }),
          ]);
          if (!seller?.email) return;
          const siteName = siteSet?.value || "Proplux";
          const baseUrl = process.env.NEXTAUTH_URL || process.env.AUTH_URL || "http://localhost:3000";
          const amount = "$" + withdrawal.amount.toFixed(2);
          const wallet = escapeHtml(withdrawal.wallet);
          const network = escapeHtml(withdrawal.network);

          const copy: Record<string, { subject: string; body: string }> = {
            APPROVED: {
              subject: "Your withdrawal was approved",
              body:
                '<p style="margin:0 0 12px 0;">Hi ' + escapeHtml(seller.username) + ",</p>" +
                '<p style="margin:0 0 12px 0;">Your withdrawal of <strong>' + amount + "</strong> to " + wallet +
                " (" + network + ") has been <strong>approved</strong>. It will be marked paid once the transfer is sent.</p>",
            },
            REJECTED: {
              subject: "Your withdrawal was rejected",
              body:
                '<p style="margin:0 0 12px 0;">Hi ' + escapeHtml(seller.username) + ",</p>" +
                '<p style="margin:0 0 12px 0;">Your withdrawal request of <strong>' + amount + "</strong> was not approved. " +
                "The amount stays available in your balance.</p>" +
                (updated.reason
                  ? '<p style="margin:0 0 12px 0;padding:10px 12px;border-left:3px solid #dc2626;background:#f4f4f5;"><strong>Reason:</strong> ' +
                    escapeHtml(updated.reason) +
                    "</p>"
                  : ""),
            },
            PAID: {
              subject: "Your withdrawal was paid",
              body:
                '<p style="margin:0 0 12px 0;">Hi ' + escapeHtml(seller.username) + ",</p>" +
                '<p style="margin:0 0 12px 0;">Good news: we sent <strong>' + amount + "</strong> to " + wallet +
                " (" + network + "). The amount has been deducted from your balance.</p>",
            },
          };

          const chosen = copy[status];
          if (!chosen) return;

          await sendEmail({
            to: seller.email,
            subject: chosen.subject + " on " + siteName,
            html: emailLayout(
              chosen.body +
                '<p style="margin:24px 0;"><a href="' + baseUrl + '/seller/withdraw" style="background:#dc2626;color:#fff;text-decoration:none;padding:12px 20px;border-radius:6px;font-weight:600;display:inline-block;">View withdrawals</a></p>' +
                '<p style="margin:0;font-size:13px;color:#52525b;">Withdrawal #' + escapeHtml(String(withdrawal.id).slice(-6)) + "</p>",
              siteName
            ),
          });
        } catch (err) {
          console.error("withdrawal status email failed:", err);
        }
      })();
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to update withdrawal" },
      { status: 400 }
    );
  }
}
