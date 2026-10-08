import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { prisma } from "@/lib/prisma";
import { sanitizeTelegramUrl } from "@/lib/settings";
import { TelegramJoin } from "./components/TelegramJoin";

const inter = Inter({ subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  let siteName = "Proplux";
  let logoUrl = "";
  try {
    const [sn, lu] = await Promise.all([
      prisma.setting.findUnique({ where: { key: "siteName" } }),
      prisma.setting.findUnique({ where: { key: "logoUrl" } }),
    ]);
    if (sn?.value) siteName = sn.value;
    if (lu?.value) logoUrl = lu.value;
  } catch {}
  return {
    title: `${siteName} Marketplace`,
    description: "Digital Marketplace Platform",
    icons: logoUrl ? { icon: logoUrl } : undefined,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let primaryColor = "#dc2626";
  let telegramUrl = "";
  try {
    const [pc, tg] = await Promise.all([
      prisma.setting.findUnique({ where: { key: "primaryColor" } }),
      prisma.setting.findUnique({ where: { key: "telegramUrl" } }),
    ]);
    if (pc?.value) primaryColor = pc.value;
    telegramUrl = sanitizeTelegramUrl(tg?.value);
  } catch {}

  return (
    <html lang="en" style={{ ["--brand-color" as any]: primaryColor }}>
      <body className={`${inter.className} bg-zinc-950 text-white`}>
        <Providers>{children}</Providers>
        <TelegramJoin url={telegramUrl} />
        <script
          dangerouslySetInnerHTML={{
            __html:
              'if("serviceWorker" in navigator && /ngrok-free/.test(location.hostname))navigator.serviceWorker.register("/sw.js").catch(function(){});',
          }}
        />
      </body>
    </html>
  );
}
