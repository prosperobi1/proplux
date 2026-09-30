import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,20}$/;
const ROLES = ["BUYER", "SELLER", "ADMIN"];

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const data: any = {};

  if (typeof body?.username === "string") {
    const username = body.username.trim();
    if (!USERNAME_RE.test(username)) {
      return NextResponse.json({ error: "Username must be 3-20 chars: letters, numbers, _ . -" }, { status: 400 });
    }
    data.username = username;
  }

  if (typeof body?.email === "string") {
    const email = body.email.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }
    data.email = email;
  }

  if (typeof body?.role === "string") {
    if (!ROLES.includes(body.role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    data.role = body.role;
  }

  if (typeof body?.banned === "boolean") {
    data.banned = body.banned;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  // Uniqueness check on username/email (excluding this user)
  if (data.email || data.username) {
    const conflict = await prisma.user.findFirst({
      where: {
        id: { not: id },
        OR: [
          ...(data.email ? [{ email: data.email }] : []),
          ...(data.username ? [{ username: data.username }] : []),
        ],
      },
      select: { email: true, username: true },
    });
    if (conflict) {
      if (data.email && conflict.email === data.email) {
        return NextResponse.json({ error: "Email is already in use" }, { status: 400 });
      }
      if (data.username && conflict.username === data.username) {
        return NextResponse.json({ error: "Username is already taken" }, { status: 400 });
      }
    }
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, username: true, email: true, role: true, banned: true, balance: true },
  });

  return NextResponse.json({ ok: true, user: updated });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  if (id === (session.user as any).id) {
    return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
  }
  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
