"use client";

import { usePathname } from "next/navigation";

/**
 * Floating "join our Telegram channel" icon. The URL arrives as a prop from
 * the root layout, so the anchor is part of the server-rendered HTML on every
 * page (no client fetch, no flash). Stays off the admin panel, where it adds
 * nothing, and renders nothing while the setting is empty or invalid.
 */
export function TelegramJoin({ url }: { url: string }) {
  const pathname = usePathname();
  if (!url || pathname?.startsWith("/admin")) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title="Join the Telegram channel"
      aria-label="Join the Telegram channel"
      className="fixed bottom-5 right-5 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-[#2AABEE] shadow-lg shadow-black/40 transition hover:brightness-110"
    >
      <svg viewBox="0 0 24 24" fill="white" className="h-6 w-6" aria-hidden="true">
        <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" />
      </svg>
    </a>
  );
}
