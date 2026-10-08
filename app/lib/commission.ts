import { prisma } from "@/lib/prisma";

const DEFAULT_COMMISSION_PERCENT = 65;

/**
 * The seller's share of a sale, as a percent.
 *
 * Single source of truth for BOTH sides of an order's money movement:
 * the purchase credit and the cancellation clawback must use the same
 * rate or balances drift apart. (If the admin changes the rate between
 * purchase and cancellation, the clawback uses the current rate; the
 * Order row doesn't snapshot the credited amount.)
 */
export async function getCommissionPercent(): Promise<number> {
  try {
    const setting = await prisma.setting.findUnique({ where: { key: "commissionPercent" } });
    const parsed = parseFloat(setting?.value ?? "");
    if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 100) return parsed;
  } catch {}
  return DEFAULT_COMMISSION_PERCENT;
}
