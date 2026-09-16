"use client";

import { useEffect, useState } from "react";
import { DollarSign, Bitcoin } from "lucide-react";

type RecentOrder = {
  id: string;
  buyer: string;
  amount: number;
  product: string;
  createdAt: string;
};

type FinancialData = {
  todayDeposit: number;
  monthDeposit: number;
  beginningDeposit: number;
  walletBalance: number;
  totalUsers: number;
  recentOrders: RecentOrder[];
};

export default function FinancialStatusPage() {
  const [data, setData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/financial")
      .then((res) => res.json())
      .then((d) => {
        if (!d.error) setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const cards = [
    {
      label: "Total Deposit (Today)",
      value: `$${(data?.todayDeposit ?? 0).toFixed(2)}`,
      icon: DollarSign,
      color: "blue" as const,
    },
    {
      label: "Total Deposit (Month)",
      value: `$${(data?.monthDeposit ?? 0).toFixed(2)}`,
      icon: DollarSign,
      color: "blue" as const,
    },
    {
      label: "Total Deposit (Beginning)",
      value: `$${(data?.beginningDeposit ?? 0).toFixed(2)}`,
      icon: DollarSign,
      color: "red" as const,
    },
    {
      label: "Current Wallet Balance",
      value: "Unavailable",
      icon: Bitcoin,
      color: "red" as const,
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-red-500">Financial Status</h1>

      {/* Warning Banner */}
      <div className="rounded-lg border border-yellow-900/50 bg-yellow-950/20 p-4 text-sm text-yellow-500">
        Wallet balance unavailable: crypto provider not yet connected. Deposits
        shown below are calculated from actual marketplace orders.
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
        {cards.map((card) => {
          const Icon = card.icon;
          const iconColor =
            card.color === "blue" ? "text-blue-400" : "text-red-500";
          const barBg = card.color === "blue" ? "bg-blue-500" : "bg-red-600";
          return (
            <div
              key={card.label}
              className="overflow-hidden rounded-lg border border-zinc-800"
            >
              <div className="flex flex-col items-center justify-center bg-zinc-900 p-6 md:p-8">
                <Icon className={`h-8 w-8 md:h-12 md:w-12 ${iconColor}`} />
                <p
                  className={`mt-4 text-center text-lg md:text-2xl font-bold ${iconColor}`}
                >
                  {loading ? "..." : card.value}
                </p>
              </div>
              <div
                className={`p-3 text-center text-xs md:text-sm font-semibold text-white ${barBg}`}
              >
                {card.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Deposits */}
      <div>
        <h2 className="mb-3 text-lg font-bold text-red-500">Last Deposits</h2>
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full min-w-[600px] text-sm">
            <thead className="bg-zinc-900 text-left text-xs font-semibold uppercase text-red-500">
              <tr>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Buyer</th>
                <th className="px-3 py-2">Product</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 bg-zinc-950">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-zinc-500">
                    Loading...
                  </td>
                </tr>
              ) : !data?.recentOrders?.length ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-zinc-500">
                    No deposits yet. Transactions will appear here when buyers purchase.
                  </td>
                </tr>
              ) : (
                data.recentOrders.map((order, i) => (
                  <tr key={order.id} className="hover:bg-zinc-900/50">
                    <td className="px-3 py-3 text-red-500">{i + 1}</td>
                    <td className="px-3 py-3 text-white">{order.buyer}</td>
                    <td className="px-3 py-3 text-zinc-300">{order.product}</td>
                    <td className="px-3 py-3 font-semibold text-green-500">
                      ${order.amount.toFixed(2)}
                    </td>
                    <td className="px-3 py-3 text-zinc-500">
                      {new Date(order.createdAt).toLocaleDateString()}
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