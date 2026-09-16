import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const categories = await prisma.category.findMany({
    where: { visible: true },
    orderBy: { order: "asc" },
  });
  return NextResponse.json(categories);
}
