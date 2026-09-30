import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sellerId = searchParams.get("sellerId");
  if (!sellerId) {
    return NextResponse.json({ error: "sellerId required" }, { status: 400 });
  }

  const ratings = await prisma.rating.findMany({
    where: { sellerId },
    orderBy: { createdAt: "desc" },
    include: { rater: { select: { username: true } } },
  });

  const avg = ratings.length
    ? ratings.reduce((s, r) => s + r.stars, 0) / ratings.length
    : 0;

  return NextResponse.json({
    average: Math.round(avg * 10) / 10,
    count: ratings.length,
    ratings: ratings.map((r) => ({
      id: r.id,
      stars: r.stars,
      comment: r.comment,
      createdAt: r.createdAt,
      rater: r.rater.username,
    })),
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const raterId = (session.user as any).id;
  const body = await req.json().catch(() => ({}));
  const orderId = typeof body?.orderId === "string" ? body.orderId : "";
  const stars = Number(body?.stars);
  const comment = typeof body?.comment === "string" ? body.comment.trim() : "";

  if (!orderId || !Number.isInteger(stars) || stars < 1 || stars > 5) {
    return NextResponse.json({ error: "orderId and stars (1-5) required" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { product: { select: { sellerId: true } } },
  });

  if (!order || order.buyerId !== raterId) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (order.status !== "Completed") {
    return NextResponse.json({ error: "You can only rate completed orders" }, { status: 400 });
  }

  const existing = await prisma.rating.findUnique({ where: { orderId } });
  if (existing) {
    return NextResponse.json({ error: "You already rated this order" }, { status: 400 });
  }

  const rating = await prisma.rating.create({
    data: {
      raterId,
      sellerId: order.product.sellerId,
      orderId,
      stars,
      comment: comment || null,
    },
  });

  return NextResponse.json(rating, { status: 201 });
}
