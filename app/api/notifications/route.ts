import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const LIST_LIMIT = 20;

type Role = "BUYER" | "SELLER" | "ADMIN";

function snippet(content: string, max = 140): string {
  const flat = String(content).replace(/\s+/g, " ").trim();
  return flat.length > max ? flat.slice(0, max) + "…" : flat;
}

/** Unread = messages the current viewer hasn't read, excluding their own. */
function unreadWhere(userId: string, isAdmin: boolean) {
  return isAdmin
    ? { authorId: { not: userId }, readByStaffAt: null }
    : { ticket: { is: { userId } }, isStaff: true, authorId: { not: userId }, readByOwnerAt: null };
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = (session.user as { id?: string; role?: string }).id as string;
    const role = ((session.user as { role?: string }).role || "BUYER") as Role;
    const isAdmin = role === "ADMIN";

    const where = unreadWhere(userId, isAdmin);

    const [rows, total] = await Promise.all([
      prisma.ticketMessage.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: LIST_LIMIT,
        include: {
          ticket: { select: { id: true, subject: true, status: true } },
          author: { select: { username: true } },
        },
      }),
      prisma.ticketMessage.count({ where }),
    ]);

    return NextResponse.json({
      total,
      items: rows.map((m) => ({
        id: m.id,
        ticketId: m.ticket.id,
        ticketSubject: m.ticket.subject,
        ticketStatus: m.ticket.status,
        author: m.author?.username || "User",
        isStaff: m.isStaff,
        preview: snippet(m.content),
        createdAt: m.createdAt,
        href: isAdmin ? `/admin/tickets/${m.ticket.id}` : `/tickets/${m.ticket.id}`,
      })),
    });
  } catch (error) {
    console.error("notifications GET failed:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * Mark messages as read.
 * Body: { ids?: string[] } | { ticketId?: string } | { all: true }
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = (session.user as { id?: string; role?: string }).id as string;
    const role = ((session.user as { role?: string }).role || "BUYER") as Role;
    const isAdmin = role === "ADMIN";

    const readField = isAdmin ? "readByStaffAt" : "readByOwnerAt";
    const now = new Date();
    const body = await req.json().catch(() => ({}));

    let count = 0;

    if (typeof body?.ticketId === "string" && body.ticketId) {
      const res = await prisma.ticketMessage.updateMany({
        where: {
          ticketId: body.ticketId,
          ...(isAdmin ? {} : { ticket: { is: { userId } } }),
          [readField]: null,
        },
        data: { [readField]: now },
      });
      count = res.count;
    } else if (Array.isArray(body?.ids) && body.ids.length > 0) {
      const ids = body.ids.filter((v: unknown): v is string => typeof v === "string").slice(0, 100);
      if (ids.length > 0) {
        const res = await prisma.ticketMessage.updateMany({
          // Non-admins may only touch messages on their own tickets; without
          // this filter any user could mark other users' notifications read.
          where: {
            id: { in: ids },
            [readField]: null,
            ...(isAdmin ? {} : { ticket: { is: { userId } } }),
          },
          data: { [readField]: now },
        });
        count = res.count;
      }
    } else if (body?.all === true) {
      const res = await prisma.ticketMessage.updateMany({
        where: unreadWhere(userId, isAdmin),
        data: { [readField]: now },
      });
      count = res.count;
    } else {
      return NextResponse.json({ error: "Nothing to mark" }, { status: 400 });
    }

    return NextResponse.json({ ok: true, updated: count });
  } catch (error) {
    console.error("notifications POST failed:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
