import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPaymentStatus } from "@/lib/nowpayments";
import { creditDeposit } from "@/lib/deposit-credit";

const FINAL_STATUSES = ["finished", "confirmed"];

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const paymentId = searchParams.get("paymentId");
  if (!paymentId) return NextResponse.json({ error: "paymentId required" }, { status: 400 });

  try {
    const payment = await getPaymentStatus(paymentId);
    // Bind to the caller: invoices are created with order_id dep_<userId>_<ts>,
    // so a user can only poll the state of their own payments.
    const orderId = typeof payment.order_id === "string" ? payment.order_id : "";
    const userId = (session.user as { id: string }).id;
    if (!orderId.startsWith(`dep_${userId}_`)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const status = payment.payment_status;
    let credited = false;

    // Self-heal while we're here: the IPN webhook can be lost (local dev isn't
    // reachable from NOWPayments at all, and production webhooks can drop),
    // which used to strand paid deposits forever. This endpoint already talks
    // to NOWPayments with the caller bound to their own invoice, so credit on
    // a final status too. creditDeposit is idempotent, so if the IPN lands as
    // well, only one of them does the work.
    if (typeof status === "string" && FINAL_STATUSES.includes(status)) {
      const amount = Number(payment.price_amount);
      if (Number.isFinite(amount) && amount > 0) {
        credited = await creditDeposit({
          userId,
          amount,
          paymentId: payment.payment_id ?? paymentId,
          orderId,
        });
      }
    }

    return NextResponse.json({ status, credited });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
