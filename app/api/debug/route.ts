import { auth } from "../../lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  return NextResponse.json({
    session: session,
    role: (session?.user as any)?.role,
    id: (session?.user as any)?.id,
    email: session?.user?.email,
    name: session?.user?.name,
  });
}
