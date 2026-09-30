import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const settings = await prisma.setting.findMany({
      where: { key: { in: ["siteName", "logoUrl", "reportWindowHours"] } },
      select: { key: true, value: true },
    });

    const map: Record<string, string> = {};
    for (const s of settings) map[s.key] = s.value;

    const hours = parseInt(map.reportWindowHours ?? "", 10);

    return NextResponse.json({
      siteName: map.siteName || "Proplux",
      logoUrl: map.logoUrl || "",
      reportWindowHours: Number.isFinite(hours) && hours > 0 ? hours : 16,
    });
  } catch {
    return NextResponse.json({
      siteName: "Proplux",
      logoUrl: "",
      reportWindowHours: 16,
    });
  }
}
