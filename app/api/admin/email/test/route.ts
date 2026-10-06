import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail, emailLayout, getSmtpConfig } from "@/lib/email";
import { isWritableSettingKey } from "@/lib/settings";

function isValidEmail(value: unknown): value is string {
  return typeof value === "string" && /^\S+@\S+\.\S+$/.test(value.trim());
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    const role = (session?.user as { role?: string } | undefined)?.role;
    if (!session?.user || role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const to = typeof body?.to === "string" ? body.to.trim() : "";

    if (!isValidEmail(to)) {
      return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
    }

    // Save the settings from the form first so the test uses exactly what the admin typed.
    const settings = body?.settings;
    if (settings && typeof settings === "object" && !Array.isArray(settings)) {
      for (const [key, value] of Object.entries(settings as Record<string, unknown>)) {
        if (typeof key !== "string" || !key || value === undefined || value === null) continue;
        if (!isWritableSettingKey(key)) continue; // stray/internal keys are never persisted
        if (typeof value !== "string") continue;
        await prisma.setting.upsert({
          where: { key },
          update: { value },
          create: { key, value },
        });
      }
    }

    const smtp = await getSmtpConfig();
    if (!smtp.enabled) {
      return NextResponse.json(
        { ok: false, error: "SMTP is turned off. Enable it first, then send the test again." },
        { status: 400 }
      );
    }
    if (!smtp.host) {
      return NextResponse.json(
        { ok: false, error: "SMTP host is empty. Fill in your SMTP server details first." },
        { status: 400 }
      );
    }
    if (!smtp.from) {
      return NextResponse.json(
        { ok: false, error: 'The "From email" address is empty. Set it before sending.' },
        { status: 400 }
      );
    }

    const siteSetting = await prisma.setting.findUnique({ where: { key: "siteName" } });
    const siteName = siteSetting?.value || "Proplux";

    const result = await sendEmail({
      to,
      subject: `Test email from ${siteName}`,
      html: emailLayout(
        '<p style="margin:0 0 12px 0;">Hi,</p>' +
          '<p style="margin:0 0 12px 0;">This is a test email from <strong>' +
          siteName +
          "</strong>. SMTP is configured correctly — site notifications (password resets, order alerts, ticket replies) will be delivered through this server.</p>" +
          '<p style="margin:0;font-size:13px;color:#52525b;">Sent to ' + to + "</p>",
        siteName
      ),
    });

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error || "Sending failed. Check your SMTP details." },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, via: result.via || "smtp" });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
