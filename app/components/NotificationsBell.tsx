"use client";

// load() only ever sets state after `await fetch(...)` resolves, so calling it
// from effects does not synchronously cascade renders.
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useRef, useState } from "react";
import { minVisible } from "@/lib/ui";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Bell, CheckCheck, Inbox } from "lucide-react";

type Notification = {
  id: string;
  ticketId: string;
  ticketSubject: string;
  ticketStatus: string;
  author: string;
  isStaff: boolean;
  preview: string;
  createdAt: string;
  href: string;
};

function timeAgo(value: string): string {
  const diff = Date.now() - new Date(value).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(value).toLocaleDateString();
}

export function NotificationsBell({ anchor = "right" }: { anchor?: "right" | "left" }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role || "BUYER";
  const ticketsHref = role === "ADMIN" ? "/admin/tickets" : "/tickets";

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data?.items)) {
        setItems(data.items);
        setTotal(typeof data.total === "number" ? data.total : data.items.length);
      }
    } catch {
      /* keep the last known state */
    }
  }, []);

  // Initial load + periodic refresh
  useEffect(() => {
    load();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, [load]);

  // Refresh when navigating (a thread marks itself read on open)
  const pathname = usePathname();
  useEffect(() => {
    load();
  }, [pathname, load]);

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const markIds = (ids: string[]) => {
    if (ids.length === 0) return;
    fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    }).catch(() => {});
  };

  const openItem = (item: Notification) => {
    // Optimistic: drop it from the list immediately
    setItems((prev) => prev.filter((n) => n.id !== item.id));
    setTotal((t) => Math.max(0, t - 1));
    setOpen(false);
    markIds([item.id]);
    router.push(item.href);
  };

  const markAll = async () => {
    if (busy || total === 0) return;
    const vis = minVisible();
    setBusy(true);
    setItems([]);
    setTotal(0);
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
    } catch {
      load();
    } finally {
      await vis();
      setBusy(false);
    }
  };

  const toggle = () => {
    setOpen((v) => {
      if (!v) load();
      return !v;
    });
  };

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={toggle}
        title="Unread messages"
        aria-label={`Unread messages${total > 0 ? ` (${total})` : ""}`}
        aria-expanded={open}
        className="relative flex items-center justify-center rounded-md p-2 text-red-500 hover:bg-zinc-900 hover:text-red-400"
      >
        <Bell className="h-5 w-5" />
        {total > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {total > 99 ? "99+" : total}
          </span>
        )}
      </button>

      {open && (
        <div
          className={
            anchor === "left"
              ? "fixed inset-x-4 top-16 z-50 mt-2 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 shadow-xl sm:absolute sm:inset-x-auto sm:left-0 sm:right-auto sm:top-full sm:w-[22rem] sm:max-w-[calc(100vw-2rem)]"
              : "absolute right-0 top-full z-50 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 shadow-xl"
          }
        >
          <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
            <p className="text-sm font-semibold text-white">
              Messages {total > 0 && <span className="text-zinc-500">({total})</span>}
            </p>
            {total > 0 && (
              <button
                type="button"
                onClick={markAll}
                disabled={busy}
                className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white disabled:opacity-50"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                <Inbox className="h-6 w-6 text-zinc-600" />
                <p className="text-sm text-zinc-500">No unread messages.</p>
              </div>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openItem(item)}
                  className="flex w-full flex-col gap-0.5 border-b border-zinc-800/70 px-4 py-3 text-left last:border-b-0 hover:bg-zinc-800"
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-semibold text-white">
                      {item.ticketSubject}
                    </span>
                    <span className="shrink-0 text-[10px] text-zinc-500">
                      {timeAgo(item.createdAt)}
                    </span>
                  </span>
                  <span className="text-xs text-red-400">
                    {item.author}
                    {item.isStaff ? " (support)" : ""}
                  </span>
                  <span className="line-clamp-2 text-xs text-zinc-400">{item.preview}</span>
                </button>
              ))
            )}
          </div>

          <a
            href={ticketsHref}
            className="block border-t border-zinc-800 px-4 py-2.5 text-center text-xs font-semibold text-red-500 hover:bg-zinc-800 hover:text-red-400"
          >
            View all tickets
          </a>
        </div>
      )}
    </div>
  );
}

