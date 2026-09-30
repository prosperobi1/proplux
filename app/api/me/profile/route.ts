import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,20}$/;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : "";

  if (!email || !username || !currentPassword) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
  }
  if (!USERNAME_RE.test(username)) {
    return NextResponse.json({ error: "Username must be 3-20 chars: letters, numbers, _ . -" }, { status: 400 });
  }

  const userId = (session.user as any).id;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const validPassword = await bcrypt.compare(currentPassword, user.password);
  if (!validPassword) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
  }

  // No-op if nothing changed
  if (email === user.email && username === user.username) {
    return NextResponse.json({ ok: true, unchanged: true });
  }

  // Uniqueness check
  const conflict = await prisma.user.findFirst({
    where: {
      id: { not: userId },
      OR: [{ email }, { username }],
    },
    select: { email: true, username: true },
  });

  if (conflict) {
    if (conflict.email === email) {
      return NextResponse.json({ error: "Email is already in use" }, { status: 400 });
    }
    return NextResponse.json({ error: "Username is already taken" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { email, username },
    select: { id: true, email: true, username: true, role: true, balance: true },
  });

  return NextResponse.json({ ok: true, user: updated });
}
