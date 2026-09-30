import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const groups = await prisma.categoryGroup.findMany({
    orderBy: { order: "asc" },
    include: { _count: { select: { categories: true } } },
  });
  return NextResponse.json(groups.map((g) => ({
    id: g.id,
    name: g.name,
    order: g.order,
    categoryCount: g._count.categories,
  })));
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name || name.length < 2 || name.length > 40) {
    return NextResponse.json({ error: "Name must be 2-40 characters" }, { status: 400 });
  }
  const existing = await prisma.categoryGroup.findUnique({ where: { name } });
  if (existing) {
    return NextResponse.json({ error: "A group with that name already exists" }, { status: 400 });
  }
  const max = await prisma.categoryGroup.aggregate({ _max: { order: true } });
  const nextOrder = (max._max.order ?? 0) + 1;
  const created = await prisma.categoryGroup.create({
    data: { name, order: nextOrder },
  });
  return NextResponse.json(created, { status: 201 });
}
