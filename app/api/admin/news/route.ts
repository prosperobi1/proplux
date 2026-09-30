import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const news = await prisma.news.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(news);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const message = typeof body?.message === "string" ? body.message.trim() : "";

  if (!title || !message) {
    return NextResponse.json(
      { error: "Title and message are required" },
      { status: 400 }
    );
  }

  const created = await prisma.news.create({
    data: { title, message },
  });

  return NextResponse.json(created, { status: 201 });
}
