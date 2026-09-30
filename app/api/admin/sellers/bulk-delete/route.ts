import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const selfId = (session.user as any).id;
  const body = await req.json().catch(() => ({}));
  const ids = Array.isArray(body?.ids) ? body.ids.filter((x: any) => typeof x === "string") : [];

  if (ids.length === 0) return NextResponse.json({ error: "No sellers selected" }, { status: 400 });
  if (ids.length > 100) return NextResponse.json({ error: "Max 100 at once" }, { status: 400 });
  if (ids.includes(selfId)) return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });

  // Sellers only — refuse any non-SELLER id
  const valid = await prisma.user.findMany({
    where: { id: { in: ids }, role: "SELLER" },
    select: { id: true },
  });
  if (valid.length !== ids.length) {
    return NextResponse.json({ error: "Only sellers can be deleted from this page" }, { status: 400 });
  }

  try {
    const result = await prisma.user.deleteMany({
      where: { id: { in: ids }, role: "SELLER" },
    });
    return NextResponse.json({ ok: true, deleted: result.count });
  } catch (err) {
    return NextResponse.json({ error: "Delete failed", details: String(err) }, { status: 500 });
  }
}
