import { prisma } from "../../../lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const product = await prisma.product.findUnique({
      where: { id },
      // Never select the seller's full User row — it carries password, email,
      // balance and reset token. Only the public display name is exposed.
      include: { seller: { select: { username: true } } },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Product not found", id },
        { status: 404 }
      );
    }

    // Pre-purchase views only render these fields. `metadata` is deliberately
    // omitted: it holds the seller's secrets and is only served to the buyer
    // from /api/orders after the order completes.
    return NextResponse.json({
      id: product.id,
      country: product.country,
      tld: product.tld,
      hosting: product.hosting,
      checkStatus: product.checkStatus,
      price: product.price,
      categorySlug: product.categorySlug,
      deliveryType: product.deliveryType,
      fileUrl: product.fileUrl,
      seller: product.seller,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Server error", details: String(error) },
      { status: 500 }
    );
  }
}
