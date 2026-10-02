"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Branding = {
  siteName: string;
  logoUrl: string;
};

export function useBranding(): Branding {
  const [branding, setBranding] = useState<Branding>({
    siteName: "Proplux",
    logoUrl: "",
  });

  useEffect(() => {
    fetch("/api/settings/public")
      .then((r) => r.json())
      .then((d) => {
        setBranding({
          siteName: d?.siteName || "Proplux",
          logoUrl: d?.logoUrl || "",
        });
      })
      .catch(() => {});
  }, []);

  return branding;
}

export function LogoMark({ size = 32 }: { size?: number }) {
  const { siteName, logoUrl } = useBranding();

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={siteName}
        style={{ height: size, width: "auto", maxWidth: "min(100%, 220px)" }}
        className="object-contain"
      />
    );
  }

  return (
    <div
      className="flex items-center justify-center rounded-full bg-red-600"
      style={{ height: size, width: size }}
    >
      <span
        className="font-bold text-white"
        style={{ fontSize: size * 0.5 }}
      >
        {siteName.charAt(0).toUpperCase()}
      </span>
    </div>
  );
}

export function BrandLink({
  href = "/",
  size = 32,
  showText = true,
}: {
  href?: string;
  size?: number;
  showText?: boolean;
}) {
  const { siteName } = useBranding();
  return (
    <Link href={href} className="flex items-center gap-2">
      <LogoMark size={size} />
      {showText && <span className="text-lg font-bold">{siteName}</span>}
    </Link>
  );
}
