import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const news = await prisma.news.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    return NextResponse.json(news);
  } catch (error) {
    return NextResponse.json([], { status: 200 });
  }
}
