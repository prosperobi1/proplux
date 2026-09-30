import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const existing = await prisma.categoryGroup.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: any = {};
  if (typeof body?.name === "string") {
    const name = body.name.trim();
    if (!name || name.length < 2 || name.length > 40) {
      return NextResponse.json({ error: "Name must be 2-40 characters" }, { status: 400 });
    }
    const conflict = await prisma.categoryGroup.findFirst({
      where: { id: { not: id }, name },
    });
    if (conflict) {
      return NextResponse.json({ error: "Another group already uses that name" }, { status: 400 });
    }
    data.name = name;
  }
  if (typeof body?.order === "number") data.order = body.order;

  const updated = await prisma.categoryGroup.update({ where: { id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const group = await prisma.categoryGroup.findUnique({
    where: { id },
    include: { _count: { select: { categories: true } } },
  });
  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (group._count.categories > 0) {
    return NextResponse.json(
      { error: `This group has ${group._count.categories} categories. Move or delete them first.` },
      { status: 400 }
    );
  }
  await prisma.categoryGroup.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
