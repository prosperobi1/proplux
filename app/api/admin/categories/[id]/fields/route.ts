import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const category = await prisma.category.findUnique({
    where: { id },
    select: { id: true, name: true, slug: true, fields: true, sellOnce: true },
  });
  if (!category) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let fields = [];
  try {
    fields = category.fields ? JSON.parse(category.fields) : [];
  } catch {}

  return NextResponse.json({
    id: category.id,
    name: category.name,
    slug: category.slug,
    sellOnce: category.sellOnce,
    fields,
  });
}

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
  const { fields, sellOnce } = body;

  const data: any = {};
  if (Array.isArray(fields)) {
    // Validate each field
    for (const f of fields) {
      if (!f.name || !f.label || !f.type) {
        return NextResponse.json({ error: "Each field needs name, label, and type" }, { status: 400 });
      }
      if (f.type === "select" && (!Array.isArray(f.options) || f.options.length === 0)) {
        return NextResponse.json({ error: `Field "${f.label}" is select but has no options` }, { status: 400 });
      }
    }
    data.fields = JSON.stringify(fields);
  }
  if (typeof sellOnce === "boolean") {
    data.sellOnce = sellOnce;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const updated = await prisma.category.update({ where: { id }, data });
  return NextResponse.json({ ok: true, id: updated.id });
}
