import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encryptHiddenFields, decryptAllFields } from "@/lib/encrypt";
import { isValidFileUrl, isValidTextContent, MAX_TEXT_CONTENT, categoryHasHiddenFields, CREDENTIALS_NO_HIDDEN_ERROR, missingRequiredFields } from "@/lib/delivery";

export async function GET(req: Request) {
  try {
    const session = await auth();
    const role = (session?.user as any)?.role;
    if (!session?.user || (role !== "SELLER" && role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const where: any = { sellerId: (session.user as any).id };
    if (category) where.categorySlug = category;

    const products = await prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        orders: {
          where: { status: { in: ["Pending Confirmation", "Completed"] } },
          select: { id: true, buyerId: true, createdAt: true },
          take: 1,
        },
      },
    });

    return NextResponse.json(products.map((p) => ({
      id: p.id,
      country: p.country,
      tld: p.tld,
      hosting: p.hosting,
      checkStatus: p.checkStatus,
      price: p.price,
      createdAt: p.createdAt,
      categorySlug: p.categorySlug,
      deliveryType: p.deliveryType,
      fileUrl: p.fileUrl,
      textContent: p.textContent,
      metadata: p.metadata ? decryptAllFields(JSON.parse(p.metadata)) : {},
      sold: p.orders.length > 0,
      soldOrderId: p.orders[0]?.id || null,
    })));
  } catch (err: any) {
    console.error("GET /api/seller/products error:", err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    const role = (session?.user as any)?.role;
    if (!session?.user || (role !== "SELLER" && role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json();

    const { categorySlug, price, metadata, deliveryType, fileUrl, textContent } = body;

    if (!categorySlug) return NextResponse.json({ error: "Missing categorySlug" }, { status: 400 });
    if (price === undefined || price === null || price === "") return NextResponse.json({ error: "Missing price" }, { status: 400 });
    if (deliveryType === "file" && !fileUrl) {
      return NextResponse.json({ error: "File delivery requires an uploaded file or a download link" }, { status: 400 });
    }
    if (fileUrl !== undefined && fileUrl !== null && fileUrl !== "" && !isValidFileUrl(fileUrl)) {
      return NextResponse.json({ error: "Invalid delivery link — use an http(s) URL or an uploaded file" }, { status: 400 });
    }
    const tc = typeof textContent === "string" && textContent.trim() ? textContent : null;
    if (tc !== null && !isValidTextContent(tc)) {
      return NextResponse.json({ error: `Delivery content too large (max ${MAX_TEXT_CONTENT} characters)` }, { status: 400 });
    }
    if (deliveryType === "text" && !tc) {
      return NextResponse.json({ error: "Text delivery requires delivery content" }, { status: 400 });
    }

    const meta = metadata || {};
    const country = meta.country || meta.location || "Unknown";

    // Look up the category's field definitions to know which fields to encrypt
    const category = await prisma.category.findUnique({
      where: { slug: categorySlug },
      select: { fields: true },
    });
    let fieldDefs: Array<{ name: string; visible?: boolean }> = [];
    if (category?.fields) {
      try {
        fieldDefs = JSON.parse(category.fields);
      } catch {}
    }

    // A credentials product in a category with no hidden fields would deliver
    // nothing beyond the public listing — refuse it up front.
    const effectiveDt = deliveryType === "file" || deliveryType === "text" ? deliveryType : "credentials";
    if (effectiveDt === "credentials" && !categoryHasHiddenFields(fieldDefs)) {
      return NextResponse.json({ error: CREDENTIALS_NO_HIDDEN_ERROR }, { status: 400 });
    }

    const missing = missingRequiredFields(meta, fieldDefs);
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Required field${missing.length > 1 ? "s" : ""} missing: ${missing.join(", ")}` },
        { status: 400 }
      );
    }

    const encryptedMeta = encryptHiddenFields(meta, fieldDefs);

    const product = await prisma.product.create({
      data: {
        country,
        tld: "",
        hosting: categorySlug,
        price: Number(price),
        checkStatus: "Valid",
        categorySlug,
        metadata: JSON.stringify(encryptedMeta),
        deliveryType: deliveryType === "file" || deliveryType === "text" ? deliveryType : "credentials",
        fileUrl: typeof fileUrl === "string" ? fileUrl : null,
        textContent: deliveryType === "text" ? tc : null,
        sellerId: (session.user as any).id,
      },
    });
    return NextResponse.json(product);
  } catch (err: any) {
    console.error("POST /api/seller/products error:", err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
