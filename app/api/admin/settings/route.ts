import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isWritableSettingKey } from "@/lib/settings";

async function isAdmin(): Promise<boolean> {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  return Boolean(session?.user) && role === "ADMIN";
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const settings = await prisma.setting.findMany();
  const map: Record<string, string> = {};
  for (const s of settings) {
    // Only editor-owned keys: internal markers (deposit:<payment_id> etc.)
    // must never surface in the admin UI or get round-tripped by a save.
    if (isWritableSettingKey(s.key)) map[s.key] = s.value;
  }
  return NextResponse.json(map);
}

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const updates = await req.json().catch(() => null);
  if (!updates || typeof updates !== "object" || Array.isArray(updates)) {
    return NextResponse.json({ error: "Expected a JSON object of settings" }, { status: 400 });
  }

  const entries = Object.entries(updates as Record<string, unknown>);
  // Validate everything first so a rejected key can't leave a partial save.
  for (const [key, value] of entries) {
    if (!isWritableSettingKey(key)) {
      return NextResponse.json({ error: `Unknown setting key: ${key}` }, { status: 400 });
    }
    if (typeof value !== "string") {
      return NextResponse.json({ error: `Value for ${key} must be a string` }, { status: 400 });
    }
  }

  for (const [key, value] of entries) {
    await prisma.setting.upsert({
      where: { key },
      update: { value: value as string },
      create: { key, value: value as string },
    });
  }
  return NextResponse.json({ success: true });
}
