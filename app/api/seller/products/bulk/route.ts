import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isValidFileUrl, isValidTextContent, categoryHasHiddenFields, CREDENTIALS_NO_HIDDEN_ERROR, missingRequiredFields } from "@/lib/delivery";

type Row = Record<string, string>;

export async function POST(req: Request) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session?.user || (role !== "SELLER" && role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { categorySlug, deliveryType, fileUrl, textContent, rows } = body;

  if (!categorySlug || typeof categorySlug !== "string") {
    return NextResponse.json({ error: "Missing categorySlug" }, { status: 400 });
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "No rows to add" }, { status: 400 });
  }
  if (rows.length > 500) {
    return NextResponse.json({ error: "Max 500 rows per batch" }, { status: 400 });
  }

  const category = await prisma.category.findUnique({
    where: { slug: categorySlug },
    select: { fields: true },
  });
  let fieldDefs: Array<{ name: string; visible?: boolean; required?: boolean }> = [];
  if (category?.fields) {
    try {
      fieldDefs = JSON.parse(category.fields);
    } catch {
      fieldDefs = [];
    }
  }

  const dt = ["credentials", "text", "file"].includes(deliveryType) ? deliveryType : "credentials";

  if (dt === "credentials" && !categoryHasHiddenFields(fieldDefs)) {
    return NextResponse.json({ error: CREDENTIALS_NO_HIDDEN_ERROR }, { status: 400 });
  }

  if (dt === "file" && !fileUrl) {
    return NextResponse.json({ error: "File delivery requires an uploaded file or a download link" }, { status: 400 });
  }
  if (dt === "file" && fileUrl !== undefined && fileUrl !== null && fileUrl !== "" && !isValidFileUrl(fileUrl)) {
    return NextResponse.json({ error: "Invalid delivery link. Use an http(s) URL or an uploaded file" }, { status: 400 });
  }
  if (dt === "text" && (typeof textContent !== "string" || !textContent.trim())) {
    return NextResponse.json({ error: "Text delivery requires delivery content" }, { status: 400 });
  }
  if (dt === "text" && !isValidTextContent(textContent)) {
    return NextResponse.json({ error: "Delivery content too large (max 1000000 characters)" }, { status: 400 });
  }

  const sellerId = (session.user as any).id;

  const toCreate: any[] = [];
  for (const raw of rows) {
    const price = Number(raw.price);
    if (!Number.isFinite(price) || price <= 0) {
      return NextResponse.json({ error: `Invalid price in row: ${JSON.stringify(raw)}` }, { status: 400 });
    }
    const metadata = { ...raw };
    delete metadata.price;

    const missing = missingRequiredFields(metadata, fieldDefs);
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Required field${missing.length > 1 ? "s" : ""} missing in row ${JSON.stringify(raw)}: ${missing.join(", ")}` },
        { status: 400 }
      );
    }

    toCreate.push({
      country: raw.country || raw.location || "Unknown",
      tld: "",
      hosting: categorySlug,
      price,
      checkStatus: "Valid",
      categorySlug,
      metadata: JSON.stringify(metadata),
      deliveryType: dt,
      fileUrl: dt === "file" ? fileUrl : null,
      textContent: dt === "text" ? textContent : null,
      sellerId,
    });
  }

  try {
    const result = await prisma.product.createMany({ data: toCreate });
    return NextResponse.json({ ok: true, added: result.count });
  } catch (err) {
    return NextResponse.json({ error: "Bulk insert failed", details: String(err) }, { status: 500 });
  }
}
