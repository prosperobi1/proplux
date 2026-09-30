import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encryptHiddenFields } from "@/lib/encrypt";

// DELETE — existing
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session?.user || (role !== "SELLER" && role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Sellers can only delete their own; admins can delete any
  if (role === "SELLER" && product.sellerId !== (session.user as any).id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Order history must survive — block deleting listings that were ever bought,
  // regardless of how the database treats the foreign key.
  const orderCount = await prisma.order.count({ where: { productId: id } });
  if (orderCount > 0) {
    return NextResponse.json(
      { error: "This listing has order history and can't be deleted." },
      { status: 409 }
    );
  }

  try {
    await prisma.product.delete({ where: { id } });
  } catch (err) {
    console.error("DELETE product error:", err);
    return NextResponse.json({ error: "Could not delete this listing." }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

// PATCH — edit product (new)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session?.user || (role !== "SELLER" && role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (role === "SELLER" && product.sellerId !== (session.user as any).id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const { metadata, price, deliveryType, fileUrl } = body;

  if (price !== undefined) {
    const p = Number(price);
    if (!Number.isFinite(p) || p <= 0) {
      return NextResponse.json({ error: "Invalid price" }, { status: 400 });
    }
  }

  const data: any = {};
  if (price !== undefined) data.price = Number(price);
  if (metadata !== undefined) {
    // Look up category fields to know which to encrypt
    const category = await prisma.category.findUnique({
      where: { slug: product.categorySlug || "" },
      select: { fields: true },
    });
    let fieldDefs: Array<{ name: string; visible?: boolean }> = [];
    if (category?.fields) {
      try {
        fieldDefs = JSON.parse(category.fields);
      } catch {}
    }
    // Preserve existing encrypted values where the client didn't send new ones
    const existing = product.metadata ? JSON.parse(product.metadata) : {};
    const merged = { ...existing, ...metadata };
    const encrypted = encryptHiddenFields(merged, fieldDefs);
    data.metadata = JSON.stringify(encrypted);
    data.country = metadata?.country || metadata?.location || product.country;
  }
  if (deliveryType !== undefined && ["credentials", "text", "file"].includes(deliveryType)) {
    data.deliveryType = deliveryType;
  }
  if (fileUrl !== undefined) {
    data.fileUrl = typeof fileUrl === "string" && fileUrl ? fileUrl : null;
  }

  const updated = await prisma.product.update({ where: { id }, data });
  return NextResponse.json(updated);
}
