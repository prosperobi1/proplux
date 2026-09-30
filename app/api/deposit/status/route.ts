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
    return NextResponse.json({ status: status.payment_status });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed" }, { status: 500 });
  }
}
