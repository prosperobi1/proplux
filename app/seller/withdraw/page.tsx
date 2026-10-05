"use client";

import { useState, useEffect } from "react";
import { minVisible } from "@/lib/ui";
import { AlertCircle, Loader2 } from "lucide-react";

export default function WithdrawPage() {
  type Withdrawal = {
    id: string;
    amount: number;
    network: string;
    status: string;
    reason?: string | null;
    createdAt: string;
  };
  const [amount, setAmount] = useState("");
  const [wallet, setWallet] = useState("");
  const [network, setNetwork] = useState("BTC");
  const [balance, setBalance] = useState(0);
  const [minWithdrawal, setMinWithdrawal] = useState(10);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [wRes, sRes] = await Promise.all([
      fetch("/api/seller/withdrawals").then(r => r.json()),
      fetch("/api/seller/stats").then(r => r.json()).catch(() => ({ balance: 0, minWithdrawal: 10 })),
    ]);
    if (Array.isArray(wRes)) setWithdrawals(wRes);
    if (sRes && typeof sRes.balance === "number") {
      setBalance(sRes.balance);
      if (typeof sRes.minWithdrawal === "number") setMinWithdrawal(sRes.minWithdrawal);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const pendingTotal = withdrawals
    .filter((w) => w.status === "PENDING")
    .reduce((sum, w) => sum + w.amount, 0);
  const available = Math.max(0, balance - pendingTotal);
  const canWithdraw = available >= minWithdrawal;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    const vis = minVisible();
    setWithdrawing(true);

    const res = await fetch("/api/seller/withdrawals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(amount), wallet, network }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Failed to submit request");
      await vis();
      setWithdrawing(false);
      return;
    }

    setSuccess("Withdrawal request submitted. Pending admin approval.");
    setAmount("");
    setWallet("");
    await vis();
    setWithdrawing(false);
    load();
    setTimeout(() => setSuccess(""), 4000);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-red-600">Withdraw Funds</h1>

      <div className="rounded-lg border border-red-900/50 bg-red-950/20 p-6 text-sm text-zinc-400">
        Request a payout to your crypto wallet. Minimum withdrawal: <span className="text-white font-semibold">${minWithdrawal.toFixed(2)}</span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <p className="text-xs font-semibold uppercase text-zinc-500">Total Balance</p>
          <p className="mt-2 text-3xl font-bold text-green-500">${balance.toFixed(2)}</p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <p className="text-xs font-semibold uppercase text-zinc-500">Available to Withdraw</p>
          <p className="mt-2 text-3xl font-bold text-white">${available.toFixed(2)}</p>
          {pendingTotal > 0 && (
            <p className="mt-1 text-xs text-yellow-500">${pendingTotal.toFixed(2)} pending</p>
          )}
        </div>
      </div>

      {!canWithdraw && !loading && (
        <div className="rounded-lg border border-yellow-900/50 bg-yellow-950/20 p-4 text-sm text-yellow-500 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>You need at least ${minWithdrawal.toFixed(2)} in available balance to request a withdrawal.</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        <div>
          <label className="mb-1 block text-sm font-semibold text-red-500">Cryptocurrency</label>
          <select value={network} onChange={(e) => setNetwork(e.target.value)} className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none">
            <option value="BTC">Bitcoin (BTC)</option>
            <option value="ETH">Ethereum (ETH)</option>
            <option value="USDT-TRC20">Tether (USDT - TRC20)</option>
            <option value="USDT-ERC20">Tether (USDT - ERC20)</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-red-500">Destination Wallet Address</label>
          <input type="text" value={wallet} onChange={(e) => setWallet(e.target.value)} placeholder="Enter wallet address" required disabled={!canWithdraw} className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-red-500 focus:outline-none disabled:opacity-50" />
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-red-500">Amount (USD)</label>
          <input type="number" step="0.01" min={minWithdrawal} max={available} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={available.toFixed(2)} required disabled={!canWithdraw} className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-red-500 focus:outline-none disabled:opacity-50" />
        </div>

        <button type="submit" disabled={!canWithdraw || withdrawing} className="flex items-center gap-2 rounded-md bg-red-600 px-6 py-3 text-sm font-semibold text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50">
          {withdrawing ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>
          ) : (
            "Request Withdrawal"
          )}
        </button>
      </form>

      {error && (
        <div className="rounded-lg border border-red-900/50 bg-red-950/20 p-4 text-sm text-red-500">{error}</div>
      )}
      {success && (
        <div className="rounded-lg border border-green-900/50 bg-green-950/20 p-4 text-sm text-green-500">{success}</div>
      )}

      <div>
        <h3 className="mb-4 text-xl font-bold text-red-500">Recent Withdrawal Requests</h3>
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900 text-left text-xs font-semibold uppercase text-red-500">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Network</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 bg-zinc-950">
              {withdrawals.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-sm text-zinc-500">No withdrawal requests yet.</td></tr>
              ) : withdrawals.map((w, i) => (
                <tr key={w.id}>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-500">{w.id.slice(-6)}</td>
                  <td className="px-4 py-3 font-semibold text-green-500">${w.amount.toFixed(2)}</td>
                  <td className="px-4 py-3 text-zinc-300">{w.network}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      w.status === "PAID" ? "bg-green-950 text-green-500" :
                      w.status === "APPROVED" ? "bg-blue-950 text-blue-400" :
                      w.status === "REJECTED" ? "bg-red-950 text-red-500" :
                      "bg-yellow-950 text-yellow-500"
                    }`}>{w.status}</span>
                    {w.status === "REJECTED" && w.reason && (
                      <div className="mt-1 max-w-[200px] text-[11px] text-zinc-500" title={w.reason}>
                        {w.reason}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">{new Date(w.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
