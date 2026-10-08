import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { npFetch } from "@/lib/nowpayments";

/**
 * Admin: validate the SAVED NOWPayments credentials against the configured
 * environment (sandbox/live). Uses the estimate endpoint: authenticated,
 * side-effect free (403 without a valid API key). Never echoes the key back.
 */
export async function POST() {
  const session = await auth();
  const me = session?.user as { id?: string; role?: string } | undefined;
  if (!me?.id || me.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const est = await npFetch("/estimate?amount=10&currency_from=usd&currency_to=btc");
    return NextResponse.json({
      ok: true,
      sample: typeof est?.estimated_amount === "string" ? est.estimated_amount : null,
      currency: typeof est?.currency_to === "string" ? est.currency_to : null,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 400 }
    );
  }
}
