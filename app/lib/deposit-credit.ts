import { prisma } from "@/lib/prisma";
import { sendEmail, emailLayout, escapeHtml } from "@/lib/email";

// Server-only (prisma + nodemailer): keep this out of app/lib/deposit.ts,
// which is imported by client components for the coin tables.

export type CreditDepositArgs = {
  userId: string;
  amount: number;
  /** NOWPayments payment id: the `deposit:<id>` marker key is derived from it */
  paymentId: string | number;
  /** the invoice's order_id (`dep_<userId>_<ts>`), stored as the marker value */
  orderId: string;
};

/**
 * Idempotently credit a confirmed deposit: balance increment, `Deposit` row and
 * `deposit:<payment_id>` marker in one transaction, then email the buyer
 * (fire-and-forget, after commit).
 *
 * The marker's primary key is what makes this safe to call from BOTH the IPN
 * webhook and the status poll: a concurrent second attempt fails inside the
 * transaction and rolls back, so a payment can only ever be credited once.
 *
 * Returns true when THIS call performed the credit.
 */
export async function creditDeposit({
  userId,
  amount,
  paymentId,
  orderId,
}: CreditDepositArgs): Promise<boolean> {
  const markerKey = `deposit:${paymentId}`;

  const marker = await prisma.setting.findUnique({ where: { key: markerKey } });
  if (marker) return false;

  try {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { balance: { increment: amount } },
      }),
      prisma.setting.create({
        data: { key: markerKey, value: orderId },
      }),
      prisma.deposit.create({
        data: {
          userId,
          amount,
          method: "nowpayments",
          providerId: String(paymentId),
        },
      }),
    ]);
  } catch (err) {
    // Lost the race to a concurrent credit (marker already exists). Not an error.
    const stillMarked = await prisma.setting.findUnique({ where: { key: markerKey } });
    if (stillMarked) return false;
    throw err;
  }

  // Balance credited: email the buyer (fire-and-forget, after commit).
  (async () => {
    try {
      const [user, siteSet] = await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: { email: true, username: true, balance: true },
        }),
        prisma.setting.findUnique({ where: { key: "siteName" } }),
      ]);
      const siteName = siteSet?.value || "Proplux";
      if (!user?.email) return;
      await sendEmail({
        to: user.email,
        subject: `Deposit received: +$${amount.toFixed(2)} on ${siteName}`,
        html: emailLayout(
          '<p style="margin:0 0 12px 0;">Hi ' +
            escapeHtml(user.username) +
            ",</p>" +
            '<p style="margin:0 0 12px 0;">Your deposit of <strong>$' +
            amount.toFixed(2) +
            "</strong> was confirmed and added to your balance.</p>" +
            '<p style="margin:0 0 12px 0;">New balance: <strong>$' +
            (user.balance ?? 0).toFixed(2) +
            "</strong></p>" +
            '<p style="margin:0;font-size:13px;color:#52525b;">Payment #' +
            escapeHtml(String(paymentId)) +
            "</p>",
          siteName
        ),
      });
    } catch (err) {
      console.error("deposit email failed:", err);
    }
  })();

  return true;
}
