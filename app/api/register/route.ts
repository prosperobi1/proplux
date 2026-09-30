import { prisma } from "../../lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { sendEmail, emailLayout } from "../../lib/email";

export async function POST(req: Request) {
  try {
    const { email, username, password } = await req.json();

    if (!email || !username || !password) {
      return NextResponse.json({ error: "All fields required" }, { status: 400 });
    }

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });

    if (existing) {
      return NextResponse.json({ error: "Email or username taken" }, { status: 400 });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { email, username, password: hashed, role: "BUYER" },
    });

    // Welcome email — fire-and-forget so registration is never blocked by the mail server
    (async () => {
      try {
        const siteSetting = await prisma.setting.findUnique({ where: { key: "siteName" } });
        const siteName = siteSetting?.value || "Proplux";
        const baseUrl = process.env.NEXTAUTH_URL || process.env.AUTH_URL || "http://localhost:3000";

        await sendEmail({
          to: user.email,
          subject: "Welcome to " + siteName,
          html: emailLayout(
            '<p style="margin:0 0 12px 0;">Hi ' + user.username + ',</p>' +
            '<p style="margin:0 0 12px 0;">Your ' + siteName + ' account is ready. Browse the marketplace, fund your balance, and you are good to go.</p>' +
            '<p style="margin:24px 0;"><a href="' + baseUrl + '/dashboard" style="background:#dc2626;color:#fff;text-decoration:none;padding:12px 20px;border-radius:6px;font-weight:600;display:inline-block;">Open Dashboard</a></p>',
            siteName
          ),
        });
      } catch (err) {
        console.error("welcome email failed:", err);
      }
    })();

    return NextResponse.json({ id: user.id, email: user.email });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
