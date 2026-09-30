import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const categories = await prisma.category.findMany({
    orderBy: { order: "asc" },
    include: { group: { select: { id: true, name: true, order: true } } },
  });
  return NextResponse.json(categories);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const icon = typeof body?.icon === "string" ? body.icon : "Package";
  const groupId = typeof body?.groupId === "string" && body.groupId ? body.groupId : null;

  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (!slug) return NextResponse.json({ error: "Invalid name" }, { status: 400 });

  const existing = await prisma.category.findFirst({ where: { OR: [{ name }, { slug }] } });
  if (existing) return NextResponse.json({ error: "Name or slug already exists" }, { status: 400 });

  if (groupId) {
    const g = await prisma.categoryGroup.findUnique({ where: { id: groupId } });
    if (!g) return NextResponse.json({ error: "Group not found" }, { status: 400 });
  }

  const max = await prisma.category.aggregate({ _max: { order: true } });
  const nextOrder = (max._max.order ?? 0) + 1;

  const created = await prisma.category.create({
    data: { name, slug, icon, groupId, order: nextOrder },
    include: { group: { select: { id: true, name: true, order: true } } },
  });
  return NextResponse.json(created, { status: 201 });
}
