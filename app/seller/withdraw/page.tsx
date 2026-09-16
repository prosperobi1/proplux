"use client";

import { useState } from "react";

export default function WithdrawPage() {
  const [amount, setAmount] = useState("");
  const [wallet, setWallet] = useState("");
  const [network, setNetwork] = useState("BTC");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 4000);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-red-600">Withdraw Funds</h1>

      <div className="rounded-lg border border-red-900/50 bg-red-950/20 p-6">
        <p className="text-sm text-zinc-400">
          Request a payout to your crypto wallet. Withdrawals are typically processed within 24 hours. Minimum withdrawal: <span className="text-white font-semibold">$10.00</span>
        </p>
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
        <p className="text-xs font-semibold uppercase text-zinc-500">Available Balance</p>
        <p className="mt-2 text-4xl font-bold text-green-500">$0.00</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        <div>
          <label className="mb-1 block text-sm font-semibold text-red-500">Cryptocurrency</label>
          <select
            value={network}
            onChange={(e) => setNetwork(e.target.value)}
            className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none"
          >
            <option value="BTC">Bitcoin (BTC)</option>
            <option value="ETH">Ethereum (ETH)</option>
            <option value="USDT-TRC20">Tether (USDT - TRC20)</option>
            <option value="USDT-ERC20">Tether (USDT - ERC20)</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-red-500">Destination Wallet Address</label>
          <input
            type="text"
            value={wallet}
            onChange={(e) => setWallet(e.target.value)}
            placeholder="Enter your wallet address"
            className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-red-500 focus:outline-none"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-red-500">Amount (USD)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="10.00"
            step="0.01"
            min="10"
            className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-red-500 focus:outline-none"
            required
          />
        </div>

        <button
          type="submit"
          className="rounded-md bg-red-600 px-6 py-3 text-sm font-semibold text-white hover:bg-red-500"
        >
          Request Withdrawal
        </button>
      </form>

      {submitted && (
        <div className="rounded-lg border border-green-900/50 bg-green-950/20 p-4 text-sm text-green-500">
          ✅ Withdrawal request submitted! It is now pending admin approval.
        </div>
      )}
    </div>
  );
}