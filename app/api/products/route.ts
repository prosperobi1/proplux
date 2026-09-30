import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decryptAllFields } from "@/lib/encrypt";

type FieldDef = {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  visible?: boolean;
  preview?: string;
  options?: string[];
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");

  // sell-once slugs
  const sellOnceCats = await prisma.category.findMany({
    where: { sellOnce: true },
    select: { slug: true, fields: true },
  });
  const sellOnceSlugs = sellOnceCats.map((c) => c.slug);

  // field defs per category slug
  const fieldsBySlug = new Map<string, FieldDef[]>();
  for (const c of sellOnceCats) {
    try {
      fieldsBySlug.set(c.slug, c.fields ? JSON.parse(c.fields) : []);
    } catch {
      fieldsBySlug.set(c.slug, []);
    }
  }

  // Also fetch fields for non-sellOnce categories (to redact those too)
  const allCats = await prisma.category.findMany({
    select: { slug: true, fields: true },
  });
  for (const c of allCats) {
    if (!fieldsBySlug.has(c.slug)) {
      try {
        fieldsBySlug.set(c.slug, c.fields ? JSON.parse(c.fields) : []);
      } catch {
        fieldsBySlug.set(c.slug, []);
      }
    }
  }

  // sold product ids
  const soldOrders = await prisma.order.findMany({
    where: { status: { in: ["Pending Confirmation", "Completed"] } },
    select: { productId: true },
  });
  const soldProductIds = soldOrders.map((o) => o.productId);

  const where: any = {};
  if (category) where.categorySlug = category;

  if (sellOnceSlugs.length > 0 && soldProductIds.length > 0) {
    where.NOT = {
      AND: [
        { categorySlug: { in: sellOnceSlugs } },
        { id: { in: soldProductIds } },
      ],
    };
  }

  const products = await prisma.product.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { seller: { select: { username: true } } },
  });

  return NextResponse.json(products.map((p) => {
    const rawMeta = p.metadata ? (() => { try { return decryptAllFields(JSON.parse(p.metadata!)); } catch { return {}; } })() : {};
    const fieldDefs = fieldsBySlug.get(p.categorySlug || "") || [];
    const visibleMeta: Record<string, any> = {};

    for (const [key, value] of Object.entries(rawMeta)) {
      const def = fieldDefs.find((f) => f.name === key);
      // Hidden fields are omitted entirely from the marketplace listing
      const isVisible = def ? def.visible === true : false;
      if (isVisible) {
        visibleMeta[key] = value;
      }
      // hidden fields: skipped — not included in visibleMeta
    }

    return {
      id: p.id,
      country: p.country,
      tld: p.tld,
      hosting: p.hosting,
      price: p.price,
      check: p.checkStatus,
      addedOn: p.createdAt,
      seller: p.seller.username,
      categorySlug: p.categorySlug,
      metadata: visibleMeta,
      deliveryType: p.deliveryType,
    };
  }));
}
