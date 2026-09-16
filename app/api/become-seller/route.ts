import { prisma } from "../../lib/prisma";
import { auth } from "../../lib/auth";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;

    const user = await prisma.user.update({
      where: { id: userId },
      data: { role: "SELLER" },
    });

    return NextResponse.json({ role: user.role });
  } catch (error) {
    return NextResponse.json(
      { error: "Server error", details: String(error) },
      { status: 500 }
    );
  }
}