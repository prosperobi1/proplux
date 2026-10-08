"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowRight, Megaphone } from "lucide-react";

type Order = {
  id: string;
  status: string;
  totalPrice: number;
  createdAt: string;
  product: {
    country: string;
    tld: string;
    price: number;
  };
};

type NewsItem = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
};

type Me = {
  id: string;
  email: string;
  username: string;
  role: string;
  balance: number;
};

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [openTickets, setOpenTickets] = useState(0);
  const [telegramUrl, setTelegramUrl] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;

    Promise.all([
      fetch("/api/orders").then((res) => res.json()),
      fetch("/api/me").then((res) => res.json()),
      fetch("/api/news").then((res) => res.json()),
      fetch("/api/tickets").then((res) => res.json()),
      fetch("/api/settings/public").then((res) => res.json()),
    ])
      .then(([ordersData, meData, newsData, ticketsData, pubData]) => {
        setOrders(Array.isArray(ordersData) ? ordersData : []);
        setMe(meData && !meData.error ? meData : null);
        setNews(Array.isArray(newsData) ? newsData.slice(0, 3) : []);
        if (Array.isArray(ticketsData)) {
          setOpenTickets(ticketsData.filter((t: { status?: string }) => t.status === "OPEN").length);
        }
        setTelegramUrl(typeof pubData?.telegramUrl === "string" ? pubData.telegramUrl : "");
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [status]);

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center gap-2 p-8 text-zinc-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading...
      </div>
    );
  }

  const totalSpent = orders.reduce((sum, order) => sum + order.totalPrice, 0);
  const username = me?.username || session?.user?.name || "User";
  const balance = me?.balance ?? 0;

  return (
    <div className="space-y-6">
      {/* Welcome Banner, merged with Become a Seller */}
      <div className="rounded-lg border border-red-900/50 bg-red-950/20 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-red-500">Hello {username}</h2>
            <p className="mt-1 text-sm text-zinc-400">
              If you have any Question, Problem, Suggestion or Request, please feel free to{" "}
              <Link
                href="/tickets"
                className="font-semibold text-red-500 underline-offset-2 hover:text-red-400 hover:underline"
              >
                Open Ticket
              </Link>
              .
            </p>
            <p className="mt-1 text-sm text-zinc-400">
              If you want to report an order, just go to{" "}
              <Link
                href="/orders"
                className="font-semibold text-red-500 underline-offset-2 hover:text-red-400 hover:underline"
              >
                Orders
              </Link>{" "}
              then click on the <strong className="text-zinc-200">Report</strong> button.
            </p>
            <p className="mt-1 text-sm text-zinc-400">
              Don&apos;t forget to read the{" "}
              <Link
                href="/terms"
                className="inline-flex items-center rounded bg-red-600 px-3 py-1 align-middle text-xs font-semibold text-white hover:bg-red-500"
              >
                Terms of Service
              </Link>{" "}
              before using Proplux.
            </p>
          </div>
          {me?.role === "BUYER" && (
            <Link
              href="/become-seller"
              className="flex-shrink-0 rounded-md bg-red-600 px-5 py-2.5 text-center text-sm font-semibold text-white hover:bg-red-500"
            >
              Become a Seller →
            </Link>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <p className="text-xs font-semibold uppercase text-zinc-500">Balance</p>
          <p className="mt-2 text-3xl font-bold text-green-500">
            ${balance.toFixed(2)}
          </p>
          <Link href="/deposit" className="mt-4 inline-flex min-h-9 items-center rounded-md bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500">
            Add Funds
          </Link>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <p className="text-xs font-semibold uppercase text-zinc-500">Total Orders</p>
          <p className="mt-2 text-3xl font-bold text-white">{orders.length}</p>
          <p className="mt-4 text-xs text-zinc-500">Total spent: ${totalSpent.toFixed(2)}</p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <p className="text-xs font-semibold uppercase text-zinc-500">Open Tickets</p>
          <p className="mt-2 text-3xl font-bold text-white">{openTickets}</p>
          <Link href="/tickets" className="mt-4 inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-400">
            Open a Ticket <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Latest News */}
      {news.length > 0 && (
        <div className="rounded-lg border border-red-900/50 bg-red-950/10 p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-red-500">
            <Megaphone className="h-4 w-4" /> Latest News
          </h3>
          <div className="space-y-3">
            {news.map((n) => (
              <div key={n.id} className="rounded-md border border-zinc-800 bg-zinc-950/50 p-3">
                <p className="font-semibold text-white">{n.title}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-400">{n.message}</p>
                <p className="mt-2 text-xs text-zinc-600">
                  {new Date(n.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Join the Telegram channel; hidden until an admin sets the link */}
      {telegramUrl && (
        <a
          href={telegramUrl}
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
      )}

    </div>
  );
}
