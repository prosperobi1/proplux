import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPaymentStatus } from "@/lib/nowpayments";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const paymentId = searchParams.get("paymentId");
  if (!paymentId) return NextResponse.json({ error: "paymentId required" }, { status: 400 });

  try {
    const status = await getPaymentStatus(paymentId);
    // Bind to the caller: invoices are created with order_id dep_<userId>_<ts>,
    // so a user can only poll the state of their own payments.
    const orderId = typeof status.order_id === "string" ? status.order_id : "";
    if (!orderId.startsWith(`dep_${(session.user as { id: string }).id}_`)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ status: status.payment_status });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed" }, { status: 500 });
  }
}
