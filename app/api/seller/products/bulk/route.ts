import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Row = Record<string, string>;

export async function POST(req: Request) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session?.user || (role !== "SELLER" && role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { categorySlug, deliveryType, fileUrl, rows } = body;

  if (!categorySlug || typeof categorySlug !== "string") {
    return NextResponse.json({ error: "Missing categorySlug" }, { status: 400 });
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "No rows to add" }, { status: 400 });
  }
  if (rows.length > 500) {
    return NextResponse.json({ error: "Max 500 rows per batch" }, { status: 400 });
  }

  const dt = ["credentials", "text", "file"].includes(deliveryType) ? deliveryType : "credentials";

  if (dt === "file" && !fileUrl) {
    return NextResponse.json({ error: "File delivery requires an uploaded file" }, { status: 400 });
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
