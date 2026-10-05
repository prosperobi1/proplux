import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encryptHiddenFields } from "@/lib/encrypt";
import { isValidFileUrl, isValidTextContent, MAX_TEXT_CONTENT, categoryHasHiddenFields, CREDENTIALS_NO_HIDDEN_ERROR, missingRequiredFields } from "@/lib/delivery";

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
  const { metadata, price, deliveryType, fileUrl, textContent } = body;

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

    const missing = missingRequiredFields(merged, fieldDefs);
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Required field${missing.length > 1 ? "s" : ""} missing: ${missing.join(", ")}` },
        { status: 400 }
      );
    }

    const encrypted = encryptHiddenFields(merged, fieldDefs);
    data.metadata = JSON.stringify(encrypted);
    data.country = metadata?.country || metadata?.location || product.country;
  }
  if (deliveryType !== undefined && ["credentials", "text", "file"].includes(deliveryType)) {
    data.deliveryType = deliveryType;
  }
  if (fileUrl !== undefined && fileUrl !== null && fileUrl !== "" && !isValidFileUrl(fileUrl)) {
    return NextResponse.json({ error: "Invalid delivery link — use an http(s) URL or an uploaded file" }, { status: 400 });
  }
  if (fileUrl !== undefined) {
    data.fileUrl = typeof fileUrl === "string" && fileUrl ? fileUrl : null;
  }
  if (textContent !== undefined) {
    if (textContent === null || textContent === "") {
      data.textContent = null;
    } else if (isValidTextContent(textContent)) {
      data.textContent = textContent;
    } else {
      return NextResponse.json({ error: `Delivery content too large (max ${MAX_TEXT_CONTENT} characters)` }, { status: 400 });
    }
  }
  // A text product with no content delivers nothing — enforce on every edit
  // that leaves the product as text (also repairs legacy rows created before
  // this field existed).
  const effectiveType =
    deliveryType !== undefined && ["credentials", "text", "file"].includes(deliveryType)
      ? deliveryType
      : product.deliveryType;
  if (effectiveType === "text") {
    const finalText = data.textContent !== undefined ? data.textContent : product.textContent;
    if (typeof finalText !== "string" || !finalText.trim()) {
      return NextResponse.json({ error: "Text delivery requires delivery content" }, { status: 400 });
    }
  }
  // Same rule on edit: a credentials listing in a category with no hidden
  // fields delivers nothing beyond the public listing (also forces legacy
  // rows to switch to Text delivery or gain hidden fields first).
  if (effectiveType === "credentials") {
    const category = await prisma.category.findUnique({
      where: { slug: product.categorySlug || "" },
      select: { fields: true },
    });
    if (!categoryHasHiddenFields(category?.fields ?? null)) {
      return NextResponse.json({ error: CREDENTIALS_NO_HIDDEN_ERROR }, { status: 400 });
    }
  }

  const updated = await prisma.product.update({ where: { id }, data });
  return NextResponse.json(updated);
}
