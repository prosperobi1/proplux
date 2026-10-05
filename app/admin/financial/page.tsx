"use client";

import { useEffect, useState } from "react";
import { Loader2, DollarSign, Bitcoin, TrendingUp, RotateCcw, Users } from "lucide-react";

type Deposit = {
  id: string;
  username: string;
  email: string;
  amount: number;
  method: string;
  providerId: string | null;
  createdAt: string;
};

type FinancialData = {
  todayDeposit: number;
  monthDeposit: number;
  allTimeDeposit: number;
  cryptoDeposit: number;
  adminCredits: number;
  refunds: number;
  recentDeposits: Deposit[];
};

export default function FinancialStatusPage() {
  const [data, setData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/financial")
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const cards = [
    { label: "Today", value: data?.todayDeposit ?? 0, icon: DollarSign, color: "blue" },
    { label: "This Month", value: data?.monthDeposit ?? 0, icon: DollarSign, color: "blue" },
    { label: "All Time", value: data?.allTimeDeposit ?? 0, icon: TrendingUp, color: "red" },
    { label: "Crypto (NOWPayments)", value: data?.cryptoDeposit ?? 0, icon: Bitcoin, color: "blue" },
  ];

  const methodLabel = (m: string) => {
    if (m === "nowpayments") return "Crypto";
    if (m === "admin") return "Admin credit";
    if (m === "refund") return "Refund";
    return m;
  };

  const methodColor = (m: string) => {
    if (m === "nowpayments") return "bg-yellow-950 text-yellow-500";
    if (m === "admin") return "bg-blue-950 text-blue-400";
    if (m === "refund") return "bg-red-950 text-red-500";
    return "bg-zinc-800 text-zinc-400";
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-red-500">Financial Status</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
        {cards.map((card) => {
          const Icon = card.icon;
          const iconColor = card.color === "blue" ? "text-blue-400" : "text-red-500";
          const barBg = card.color === "blue" ? "bg-blue-500" : "bg-red-600";
          return (
            <div key={card.label} className="overflow-hidden rounded-lg border border-zinc-800">
              <div className="flex flex-col items-center justify-center bg-zinc-900 p-6 md:p-8">
                <Icon className={`h-8 w-8 md:h-12 md:w-12 ${iconColor}`} />
                <p className={`mt-4 text-center text-lg font-bold md:text-2xl ${iconColor}`}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : `$${card.value.toFixed(2)}`}
                </p>
              </div>
              <div className={`p-3 text-center text-xs font-semibold text-white md:text-sm ${barBg}`}>
                {card.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Breakdown by method */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bitcoin className="h-4 w-4 text-yellow-500" />
              <span className="text-sm text-zinc-400">Crypto deposits</span>
            </div>
            <span className="text-lg font-bold text-green-500">
              ${(data?.cryptoDeposit ?? 0).toFixed(2)}
            </span>
          </div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-400" />
              <span className="text-sm text-zinc-400">Admin credits</span>
            </div>
            <span className="text-lg font-bold text-blue-400">
              ${(data?.adminCredits ?? 0).toFixed(2)}
            </span>
          </div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 md:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-red-500" />
              <span className="text-sm text-zinc-400">Refunds paid out</span>
            </div>
            <span className="text-lg font-bold text-red-500">
              ${(data?.refunds ?? 0).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Recent Deposits */}
      <div>
        <h2 className="mb-3 text-lg font-bold text-red-500">Recent Deposits</h2>
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full min-w-[700px] text-sm">
            <thead className="bg-zinc-900 text-left text-xs font-semibold uppercase text-red-500">
              <tr>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Method</th>
                <th className="px-3 py-2">Reference</th>
                <th className="px-3 py-2">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 bg-zinc-950">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-zinc-500">
                    <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</span>
                  </td>
                </tr>
              ) : !data?.recentDeposits?.length ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-zinc-500">
                    No deposits yet. Crypto payments and admin credits will appear here.
                  </td>
                </tr>
              ) : (
                data.recentDeposits.map((d, i) => (
                  <tr key={d.id} className="hover:bg-zinc-900/50">
                    <td className="px-3 py-3 text-red-500">{i + 1}</td>
                    <td className="px-3 py-3">
                      <div className="text-white">{d.username}</div>
                      <div className="text-xs text-zinc-500">{d.email}</div>
                    </td>
                    <td className={`px-3 py-3 font-semibold ${d.amount >= 0 ? "text-green-500" : "text-red-500"}`}>
                      {d.amount >= 0 ? "+" : ""}${d.amount.toFixed(2)}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${methodColor(d.method)}`}>
                        {methodLabel(d.method)}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-zinc-500">
                      {d.providerId ? d.providerId.slice(0, 12) + "..." : "—"}
                    </td>
                    <td className="px-3 py-3 text-xs text-zinc-500">
                      {new Date(d.createdAt).toLocaleString()}
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
