import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const settings = await prisma.setting.findMany({
      where: {
        key: {
          in: ["siteName", "logoUrl", "reportWindowHours", "minDeposit", "paymentAutoEnabled", "telegramUrl"],
        },
      },
      select: { key: true, value: true },
    });

    const map: Record<string, string> = {};
    for (const s of settings) map[s.key] = s.value;

    const hours = parseInt(map.reportWindowHours ?? "", 10);
    const min = Number(map.minDeposit ?? "");
    const tg = (map.telegramUrl ?? "").trim();

    return NextResponse.json({
      siteName: map.siteName || "Proplux",
      logoUrl: map.logoUrl || "",
      reportWindowHours: Number.isFinite(hours) && hours > 0 ? hours : 16,
      // Consumed by /deposit: the UI must show the SAME floor the create
      // API enforces (its fallback is 10 when the row is missing).
      minDeposit: Number.isFinite(min) && min > 0 ? min : 10,
      // Matches the create route: without a row, deposits are disabled.
      paymentAutoEnabled: map.paymentAutoEnabled === "true",
      // Only real Telegram links reach the client; anything else is
      // treated as "not configured" so the dashboard icon stays hidden.
      telegramUrl: /^https:\/\/(t\.me|telegram\.me)(\/|$)/.test(tg) ? tg : "",
    });
  } catch {
    return NextResponse.json({
      siteName: "Proplux",
      logoUrl: "",
      reportWindowHours: 16,
      minDeposit: 10,
      paymentAutoEnabled: false,
      telegramUrl: "",
    });
  }
}
