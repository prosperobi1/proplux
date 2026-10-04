import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decryptAllFields } from "@/lib/encrypt";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      buyer: { select: { id: true, username: true, email: true } },
      product: {
        include: {
          seller: { select: { id: true, username: true, email: true } },
        },
      },
    },
  });

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const metadata = order.product.metadata ? (() => {
    try { return decryptAllFields(JSON.parse(order.product.metadata!)); } catch { return {}; }
  })() : {};

  return NextResponse.json({
    id: order.id,
    status: order.status,
    totalPrice: order.totalPrice,
    quantity: order.quantity,
    createdAt: order.createdAt,
    buyer: order.buyer,
    seller: order.product.seller,
    product: {
      id: order.product.id,
      country: order.product.country,
      tld: order.product.tld,
      hosting: order.product.hosting,
      price: order.product.price,
      checkStatus: order.product.checkStatus,
      categorySlug: order.product.categorySlug,
      deliveryType: order.product.deliveryType,
      fileUrl: order.product.fileUrl,
      textContent: order.product.textContent,
      metadata,
    },
  });
}
