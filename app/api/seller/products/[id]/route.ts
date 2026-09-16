import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "SELLER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product || product.sellerId !== (session.user as any).id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await prisma.product.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
