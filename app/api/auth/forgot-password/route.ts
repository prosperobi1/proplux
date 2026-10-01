import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendEmail, emailLayout } from "@/lib/email";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const TOKEN_TTL_MS = 60 * 60 * 1000;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Every request here sends a real email — cap per IP and per address
    // before touching the database (5/min each).
    const wait =
      rateLimit("forgot:ip:" + clientIp(req), 5, 60 * 1000) ??
      rateLimit("forgot:email:" + email, 5, 60 * 1000);
    if (wait !== null) {
      return NextResponse.json(
        { error: "Too many requests — wait a minute and try again." },
        { status: 429, headers: { "Retry-After": String(wait) } }
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return NextResponse.json({ ok: true });
    }

    const token = randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + TOKEN_TTL_MS);

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken: token, resetTokenExpiry: expiry },
    });

    const baseUrl = process.env.NEXTAUTH_URL || process.env.AUTH_URL || "http://localhost:3000";
    const resetUrl = baseUrl + "/reset-password?token=" + token;

    const html = emailLayout(
      '<p style="margin:0 0 12px 0;">Hi ' + user.username + ',</p>' +
      '<p style="margin:0 0 16px 0;">We received a request to reset your password. Click the button below to choose a new one. This link expires in 1 hour.</p>' +
      '<p style="margin:24px 0;"><a href="' + resetUrl + '" style="background:#dc2626;color:#fff;text-decoration:none;padding:12px 20px;border-radius:6px;font-weight:600;display:inline-block;">Reset Password</a></p>' +
      '<p style="margin:0 0 8px 0;font-size:13px;color:#52525b;">Or copy this link:</p>' +
      '<p style="margin:0;font-size:12px;color:#52525b;word-break:break-all;">' + resetUrl + '</p>'
    );

    await sendEmail({
      to: user.email,
      subject: "Reset your password",
      html,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("forgot-password error:", error);
    return NextResponse.json({ ok: true });
  }
}
