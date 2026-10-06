"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { MessageSquare, Star } from "lucide-react";

type Stats = {
  balance: number;
  totalRevenue: number;
  productCount: number;
  salesCount: number;
  grossSales: number;
  averageRating: number;
  ratingCount: number;
};

type NewsItem = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
};

export default function SellerMainPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<Stats | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const username = session?.user?.name || "Seller";

  useEffect(() => {
    fetch("/api/seller/stats")
      .then((r) => r.json())
      .then((d) => { if (!d.error) setStats(d); })
      .catch(() => {});

    fetch("/api/news")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setNews(d.slice(0, 3)); })
      .catch(() => {});
  }, []);

  const productCount = stats?.productCount ?? 0;
  const salesCount = stats?.salesCount ?? 0;
  const totalRevenue = stats?.totalRevenue ?? 0;
  const balance = stats?.balance ?? 0;
  const averageRating = stats?.averageRating ?? 0;
  const ratingCount = stats?.ratingCount ?? 0;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-red-900/50 bg-red-950/10 p-6">
        <h1 className="text-lg font-semibold text-red-500">Hello {username}</h1>
        <p className="mt-2 text-sm text-zinc-400">
          If you have any Question, Suggestion or Request, please feel free to{" "}
          <Link
            href="/tickets"
            className="font-semibold text-red-500 underline-offset-2 hover:text-red-400 hover:underline"
          >
            Open Ticket
          </Link>
          .
        </p>
        <div className="mt-4 text-sm">
          <p className="font-semibold text-white">Your information: {username}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-red-400">
            <li>Your selling nickname in this shop is {username}</li>
            <li>You get paid any time you like using the Withdraw section</li>
            <li>You get 65 percent of your sales</li>
            <li>Set your wallet address when requesting a withdrawal</li>
            <li>Your balance: ${balance.toFixed(2)}</li>
            <li>Lifetime earnings: ${totalRevenue.toFixed(2)}</li>
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <p className="text-xs font-semibold uppercase text-zinc-500">My Products</p>
          <p className="mt-2 text-3xl font-bold text-white">{productCount}</p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <p className="text-xs font-semibold uppercase text-zinc-500">Total Sales</p>
          <p className="mt-2 text-3xl font-bold text-white">{salesCount}</p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <p className="text-xs font-semibold uppercase text-zinc-500">Lifetime Earnings</p>
          <p className="mt-2 text-3xl font-bold text-green-500">${totalRevenue.toFixed(2)}</p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <p className="text-xs font-semibold uppercase text-zinc-500">Available Balance</p>
          <p className="mt-2 text-3xl font-bold text-green-500">${balance.toFixed(2)}</p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <p className="text-xs font-semibold uppercase text-zinc-500">Your Rating</p>
          <div className="mt-2 flex items-center gap-2">
            <p className="text-3xl font-bold text-yellow-500">
              {ratingCount > 0 ? averageRating.toFixed(1) : "—"}
            </p>
            <div className="flex">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star
                  key={n}
                  className={`h-4 w-4 ${
                    n <= Math.round(averageRating)
                      ? "fill-yellow-500 text-yellow-500"
                      : "text-zinc-700"
                  }`}
                />
              ))}
            </div>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            {ratingCount === 0
              ? "No ratings yet"
              : `${ratingCount} review${ratingCount === 1 ? "" : "s"}`}
          </p>
        </div>
      </div>

      {news.length > 0 && (
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-red-500">
            <MessageSquare className="h-5 w-5" /> News
          </h2>
          <div className="space-y-2">
            {news.map((n) => (
              <div key={n.id} className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
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
    </div>
  );
}
