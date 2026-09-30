import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const categories = await prisma.category.findMany({
    orderBy: { order: "asc" },
    include: {
      group: { select: { id: true, name: true, order: true } },
    },
  });

  return NextResponse.json(categories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    icon: c.icon,
    fields: c.fields,
    visible: c.visible,
    order: c.order,
    groupId: c.groupId,
    group: c.group ? { id: c.group.id, name: c.group.name, order: c.group.order } : null,
  })));
}
