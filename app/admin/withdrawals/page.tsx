"use client";
import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";

export default function WithdrawalsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/withdrawals").then(r => r.json()).then(d => { setItems(Array.isArray(d) ? d : []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-red-500">Withdraw Approval</h1>
        <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs text-zinc-400">Pending: {items.length}</span>
      </div>
      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full min-w-[800px] text-sm">
          <thead className="bg-zinc-900 text-left text-xs font-semibold uppercase text-red-500">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Seller</th>
              <th className="px-3 py-2">Amount</th>
              <th className="px-3 py-2">Network</th>
              <th className="px-3 py-2">Wallet</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800 bg-zinc-950">
            {loading ? (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-zinc-500">Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-zinc-500">No withdrawal requests yet.</td></tr>
            ) : items.map((w, i) => (
              <tr key={w.id} className="hover:bg-zinc-900/50">
                <td className="px-3 py-3 text-red-500">{i + 1}</td>
                <td className="px-3 py-3 text-white">{w.seller}</td>
                <td className="px-3 py-3 font-semibold text-green-500">${w.amount?.toFixed(2)}</td>
                <td className="px-3 py-3 text-zinc-300">{w.network}</td>
                <td className="px-3 py-3 font-mono text-xs text-zinc-500">{w.wallet?.slice(0, 20)}...</td>
                <td className="px-3 py-3"><span className="rounded-full bg-yellow-950 px-2 py-0.5 text-xs font-semibold text-yellow-500">{w.status}</span></td>
                <td className="px-3 py-3">
                  <div className="flex gap-2">
                    <button className="rounded bg-zinc-800 p-1.5 hover:bg-zinc-700" title="Approve"><Check className="h-3.5 w-3.5 text-green-400" /></button>
                    <button className="rounded bg-zinc-800 p-1.5 hover:bg-zinc-700" title="Reject"><X className="h-3.5 w-3.5 text-red-500" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
