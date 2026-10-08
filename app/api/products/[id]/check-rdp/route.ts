import { NextResponse } from "next/server";
import net from "node:net";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { decryptAllFields } from "@/lib/encrypt";

/**
 * Pre-purchase RDP test: confirms the listing's RDP server is online and
 * actually speaks RDP (TCP connect + X.224 Connection Request/Confirm).
 * Credentials are not attempted — Windows auth (NLA/CredSSP) can't be safely
 * verified server-side and wrong attempts can lock the account.
 * Advisory only — buying is never blocked by the result.
 */

// 5 checks per user per minute (in-memory).
const hits = new Map<string, number[]>();
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 5;

const CONNECT_MS = 4000;
const RDP_REPLY_MS = 2000;

// Minimal X.224 Connection Request inside TPKT (no negotiation blob).
const RDP_CR = Buffer.from([0x03, 0x00, 0x00, 0x0b, 0x06, 0xe0, 0x00, 0x00, 0x00, 0x00, 0x00]);

type ProbeCode =
  | "rdp"          // Connection Confirm received — real RDP service
  | "open-no-rdp"  // TCP accepted but no/bad RDP reply
  | "refused"
  | "unreachable"
  | "nohost"
  | "timeout";

function probeRdp(host: string, port: number): Promise<ProbeCode> {
  return new Promise((resolve) => {
    let settled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const socket = net.connect({ host, port });

    const finish = (code: ProbeCode) => {
      if (settled) return;
      settled = true;
      for (const t of timers) clearTimeout(t);
      socket.destroy();
      resolve(code);
    };

    timers.push(setTimeout(() => finish("timeout"), CONNECT_MS));

    socket.on("connect", () => {
      // TCP is up — ask the service whether it speaks RDP.
      for (const t of timers) clearTimeout(t);
      timers.length = 0;
      try {
        socket.write(RDP_CR);
      } catch {
        finish("open-no-rdp");
        return;
      }
      timers.push(setTimeout(() => finish("open-no-rdp"), RDP_REPLY_MS));
    });

    socket.on("data", (buf) => {
      // TPKT (03 00 ..) + X.224 Connection Confirm TPDU (code 0xD0).
      if (buf.length >= 6 && buf[0] === 0x03 && buf[1] === 0x00 && (buf[5] & 0xf0) === 0xd0) {
        finish("rdp");
      } else {
        finish("open-no-rdp");
      }
    });

    socket.on("error", (err) => {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === "ECONNREFUSED") finish("refused");
      else if (code === "ENOTFOUND" || code === "EAI_AGAIN") finish("nohost");
      else if (code === "ETIMEDOUT" || code === "EHOSTUNREACH" || code === "ENETUNREACH")
        finish("unreachable");
      else finish("timeout");
    });

    socket.on("close", () => finish("open-no-rdp"));
  });
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  // Always answer with JSON — a thrown error would surface in the UI as a
  // generic "Network error" instead of a useful message.
  try {
    return await checkRdp(req, ctx);
  } catch {
    return NextResponse.json(
      { ok: false, message: "Something went wrong running the check. Try again." },
      { status: 500 }
    );
  }
}

async function checkRdp(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { ok: false, message: "Log in first to test the RDP." },
      { status: 401 }
    );
  }
  const userId = String((session.user as { id?: string }).id || "");

  const now = Date.now();
  const recent = (hits.get(userId) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_MAX) {
    return NextResponse.json(
      { ok: false, message: "Too many checks. Wait a minute and try again." },
      { status: 429 }
    );
  }
  recent.push(now);
  hits.set(userId, recent);

  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product || product.categorySlug !== "rdp") {
    return NextResponse.json(
      { ok: false, message: "This product can't be tested." },
      { status: 404 }
    );
  }

  let meta: Record<string, unknown> = {};
  try {
    meta = product.metadata ? decryptAllFields(JSON.parse(product.metadata)) : {};
  } catch {}

  const host = String(meta.ip || meta.host || "").trim();
  if (!host) {
    return NextResponse.json({
      ok: false,
      message: "This listing has no IP/Host.",
    });
  }

  // Validate the port before probing — net.connect throws synchronously on a
  // port outside 1–65535, which would otherwise surface as a generic client
  // "Network error". Only echo the value when it's plain digits (never echo
  // an undecrypted blob).
  const rawPort = String(meta.port ?? "").trim();
  const parsedPort = rawPort === "" ? 3389 : parseInt(rawPort, 10);
  if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
    const hint = /^\d{1,6}$/.test(rawPort) ? ` (${rawPort})` : "";
    return NextResponse.json({
      ok: false,
      message: `This listing has an invalid port${hint}. Use a number between 1 and 65535.`,
    });
  }
  const port = parsedPort;

  let code: ProbeCode;
  try {
    code = await probeRdp(host, port);
  } catch {
    return NextResponse.json({
      ok: false,
      message: "Could not run the check. Verify the IP/Host value.",
    });
  }

  switch (code) {
    case "rdp":
      return NextResponse.json({
        ok: true,
        message: `RDP server responding on port ${port}.`,
      });
    case "open-no-rdp":
      return NextResponse.json({
        ok: false,
        message: `Port ${port} is open but doesn't answer as RDP.`,
      });
    case "refused":
      return NextResponse.json({
        ok: false,
        message: "Connection refused. The server looks offline or the port is blocked.",
      });
    case "unreachable":
      return NextResponse.json({
        ok: false,
        message: "Host unreachable. Check the IP or try again later.",
      });
    case "nohost":
      return NextResponse.json({
        ok: false,
        message: "Host not found. Check the IP/Host value.",
      });
    default:
      return NextResponse.json({
        ok: false,
        message: "Connection timed out. The server may be down or firewalled.",
      });
  }
}
