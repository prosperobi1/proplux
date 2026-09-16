import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  console.log("=== API DEBUG ===");
  console.log("Session:", JSON.stringify(session));
  console.log("User:", JSON.stringify(session?.user));
  console.log("Role:", (session?.user as any)?.role);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized", reason: "no-session" }, { status: 401 });
  }
  if ((session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized", reason: "wrong-role", role: (session.user as any).role }, { status: 401 });
  }
  const categories = await prisma.category.findMany({
    orderBy: { order: "asc" },
  });
  return NextResponse.json(categories);
}
