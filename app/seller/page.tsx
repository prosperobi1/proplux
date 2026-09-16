"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { MessageSquare, Flame } from "lucide-react";

export default function SellerMainPage() {
  const { data: session } = useSession();
  const [products, setProducts] = useState<any[]>([]);
  const [sales] = useState(0);
  const [revenue] = useState(0);
  const username = session?.user?.name || "Seller";

  useEffect(() => {
    fetch("/api/seller/products")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setProducts(d);
      });
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-red-900/50 bg-red-950/10 p-6">
        <h1 className="text-lg font-semibold text-red-500">
          Hello {username}
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          If you have any Question, Suggestion or Request please feel free to
          open a ticket.
        </p>

        <div className="mt-4 text-sm">
          <p className="font-semibold text-white">
            Your information: {username}
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-red-400">
            <li>Your selling nickname in this shop is {username}</li>
            <li>You get paid any time you like using the Withdraw section</li>
            <li>You get 65 percent of your sales</li>
            <li>You can change your bitcoin address from the Withdraw section</li>
            <li>Your bitcoin address is not set yet</li>
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <p className="text-xs font-semibold uppercase text-zinc-500">
            My Products
          </p>
          <p className="mt-2 text-3xl font-bold text-white">
            {products.length}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <p className="text-xs font-semibold uppercase text-zinc-500">
            Total Sales
          </p>
          <p className="mt-2 text-3xl font-bold text-white">{sales}</p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <p className="text-xs font-semibold uppercase text-zinc-500">
            Revenue
          </p>
          <p className="mt-2 text-3xl font-bold text-green-500">
            ${revenue.toFixed(2)}
          </p>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-bold text-red-500">Top Sellers</h2>
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900 text-left text-xs font-semibold uppercase text-red-500">
              <tr>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Seller</th>
                <th className="px-3 py-2 text-right">Sales</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 bg-zinc-950">
              <tr>
                <td className="px-3 py-3 text-zinc-400">1.</td>
                <td className="flex items-center gap-2 px-3 py-3 text-white">
                  <Flame className="h-4 w-4 text-red-500" /> {username}
                </td>
                <td className="px-3 py-3 text-right font-bold text-red-500">
                  $0.00
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-red-500">
          <MessageSquare className="h-5 w-5" /> News
        </h2>
        <div className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 text-sm">
          <div className="rounded-md bg-zinc-950 p-3">
            <p className="font-semibold text-white">
              Welcome to Seller Panel
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Start adding products to earn money on the platform.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
