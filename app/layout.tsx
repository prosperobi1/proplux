import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { prisma } from "@/lib/prisma";

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
  try {
    const s = await prisma.setting.findUnique({ where: { key: "primaryColor" } });
    if (s?.value) primaryColor = s.value;
  } catch {}

  return (
    <html lang="en" style={{ ["--brand-color" as any]: primaryColor }}>
      <body className={`${inter.className} bg-zinc-950 text-white`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
