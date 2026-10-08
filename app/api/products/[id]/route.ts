import { prisma } from "../../../lib/prisma";
import { auth } from "../../../lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const product = await prisma.product.findUnique({
      where: { id },
      // Never select the seller's full User row: it carries password, email,
      // balance and reset token. Only the public display name is exposed.
      include: { seller: { select: { username: true } } },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Product not found", id },
        { status: 404 }
      );
    }

    // The file is the paid deliverable: only the listing's seller, an admin,
    // or a buyer who already purchased this product may see its URL. `metadata`
    // is omitted entirely for the same reason: it holds the seller's secrets
    // and is only served to the buyer from /api/orders after the order completes.
    let fileUrl: string | null = null;
    if (product.fileUrl) {
      const session = await auth();
      const me = session?.user as { id?: string; role?: string } | undefined;
      if (me?.id) {
        const canSee =
          me.role === "ADMIN" ||
          product.sellerId === me.id ||
          (await prisma.order.findFirst({
            where: { productId: product.id, buyerId: me.id },
            select: { id: true },
          })) !== null;
        if (canSee) fileUrl = product.fileUrl;
      }
    }

    // Pre-purchase views only render these fields.
    return NextResponse.json({
      id: product.id,
      country: product.country,
      tld: product.tld,
      hosting: product.hosting,
      checkStatus: product.checkStatus,
      price: product.price,
      categorySlug: product.categorySlug,
      deliveryType: product.deliveryType,
      fileUrl,
      seller: product.seller,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Server error", details: String(error) },
      { status: 500 }
    );
  }
}
