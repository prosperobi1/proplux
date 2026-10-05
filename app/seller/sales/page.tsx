"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

type Sale = {
  id: string;
  status: string;
  totalPrice: number;
  yourCut: number;
  createdAt: string;
  buyer: string;
  product: string;
};

export default function SellerSalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/seller/sales")
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) {
          setSales(Array.isArray(d.orders) ? d.orders : []);
          setStats(d);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-red-600">My Sales</h1>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <p className="text-xs font-semibold uppercase text-zinc-500">Total Earnings</p>
          <p className="mt-2 text-3xl font-bold text-green-500">
            ${(stats?.totalRevenue ?? 0).toFixed(2)}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <p className="text-xs font-semibold uppercase text-zinc-500">Available to Withdraw</p>
          <p className="mt-2 text-3xl font-bold text-white">
            ${(stats?.balance ?? 0).toFixed(2)}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <p className="text-xs font-semibold uppercase text-zinc-500">Total Sales</p>
          <p className="mt-2 text-3xl font-bold text-white">{stats?.salesCount ?? 0}</p>
        </div>
      </div>

      <div>
        <h3 className="mb-4 text-xl font-bold text-red-500">Recent Sales</h3>
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full min-w-[700px]">
            <thead className="bg-zinc-900">
              <tr className="text-left text-xs font-semibold uppercase text-red-500">
                <th className="px-4 py-3">Order ID</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Buyer</th>
                <th className="px-4 py-3">Your Cut (65%)</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 bg-zinc-950">
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-center text-sm text-zinc-500" colSpan={6}>
                    <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</span>
                  </td>
                </tr>
              ) : sales.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-center text-sm text-zinc-500" colSpan={6}>
                    No sales yet. Add products to your store to start earning.
                  </td>
                </tr>
              ) : (
                sales.map((s) => (
                  <tr key={s.id} className="hover:bg-zinc-900/50">
                    <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                      {s.id.slice(-6)}
                    </td>
                    <td className="px-4 py-3 text-zinc-300">{s.product}</td>
                    <td className="px-4 py-3 text-zinc-400">{s.buyer}</td>
                    <td className="px-4 py-3 font-semibold text-green-500">
                      ${s.yourCut.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500">
                      {new Date(s.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          s.status === "Completed"
                            ? "bg-green-950 text-green-500"
                            : s.status === "Cancelled" || s.status === "Refunded"
                            ? "bg-zinc-800 text-zinc-400"
                            : "bg-yellow-950 text-yellow-500"
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
