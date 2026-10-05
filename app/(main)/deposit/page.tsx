"use client";

import { useState, useEffect } from "react";
import { minVisible } from "@/lib/ui";
import Link from "next/link";
import { ArrowLeft, Bitcoin, Copy, Check, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { COIN_MIN_USD } from "@/lib/deposit";
import QRCode from "react-qr-code";

type Me = { id: string; username: string; balance: number };

type Payment = {
  paymentId: string;
  payAddress: string;
  payAmount: number;
  payCurrency: string;
  priceAmount: number;
  orderId: string;
  expiresAt: string | null;
  status: string;
};

const COINS = [
  { value: "btc", label: "Bitcoin (BTC)" },
  { value: "eth", label: "Ethereum (ETH)" },
  { value: "usdttrc20", label: "USDT (TRC20)" },
  { value: "usdterc20", label: "USDT (ERC20)" },
];

const QUICK_AMOUNTS = [50, 100, 250, 500];

export default function DepositPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [paid, setPaid] = useState<{ amount: number; currency: string } | null>(null);
  const [minDeposit, setMinDeposit] = useState(10);
  const [amount, setAmount] = useState("50");
  const [coin, setCoin] = useState("btc");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [copied, setCopied] = useState(false);
  const [polling, setPolling] = useState(false);

  const loadMe = () =>
    fetch("/api/settings/public").then((r) => r.json()).then((d) => { if (typeof d?.minDeposit === "number") setMinDeposit(d.minDeposit); }).catch(() => {});

    fetch("/api/settings/public").then((r) => r.json()).then((d) => { if (typeof d?.minDeposit === "number") setMinDeposit(d.minDeposit); }).catch(() => {});

    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => {
        if (d && !d.error) setMe(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));

  useEffect(() => { loadMe(); }, []);

  const createInvoice = async () => {
    setError(null);
    const amt = Number(amount);
    const effMin = Math.max(minDeposit || 10, COIN_MIN_USD[coin] ?? 0);
    if (!Number.isFinite(amt) || amt < effMin) {
      const label = COINS.find((c) => c.value === coin)?.label || coin;
      setError(
        effMin > (minDeposit || 10)
          ? `Minimum deposit for ${label} is $${effMin}`
          : "Minimum deposit is $" + effMin
      );
      return;
    }
    const vis = minVisible();
    setCreating(true);
    try {
      const res = await fetch("/api/deposit/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amt, coin }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Failed to create payment");
        return;
      }
      setPayment(data);
    } catch (err) {
      setError(String(err));
    } finally {
      await vis();
      setCreating(false);
    }
  };

  const copyAddress = () => {
    if (!payment) return;
    navigator.clipboard.writeText(payment.payAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (!payment) return;
    setPolling(true);
    const iv = setInterval(async () => {
      try {
        const res = await fetch(`/api/deposit/status?paymentId=${payment.paymentId}`);
        const d = await res.json();
        if (d?.status === "finished" || d?.status === "confirmed") {
          clearInterval(iv);
          setPolling(false);
          setPaid({ amount: payment.priceAmount, currency: payment.payCurrency.toUpperCase() });
          setPayment(null);
          loadMe();
        }
      } catch {}
    }, 15000);
    return () => clearInterval(iv);
  }, [payment]);

  if (loading)
    return (
      <div className="flex items-center justify-center gap-2 p-8 text-zinc-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );

  const balance = me?.balance ?? 0;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-white">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
      </Link>

      <div className="rounded-lg border border-red-900/50 bg-red-950/20 p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-red-500">
          <Bitcoin className="h-5 w-5" /> Deposit Funds
        </h2>
        <p className="mt-2 text-sm text-zinc-400">
          Pay with crypto. Your balance is credited automatically once the network confirms your payment.
        </p>
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-6">
        <p className="text-xs font-semibold uppercase text-zinc-500">Current Balance</p>
        <p className="mt-2 text-3xl font-bold text-green-500">${balance.toFixed(2)}</p>
      </div>

      {paid ? (
        <div className="rounded-lg border border-green-900/50 bg-green-950/20 p-8 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
          <h3 className="mt-4 text-xl font-bold text-white">Payment Received</h3>
          <p className="mt-2 text-sm text-green-400">
            <strong>${paid.amount.toFixed(2)}</strong> has been added to your balance.
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            New balance: <strong className="text-green-500">${balance.toFixed(2)}</strong>
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/dashboard"
              className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-5 py-2 text-sm font-semibold text-white hover:bg-zinc-800 sm:w-auto"
            >
              Back to Dashboard
            </Link>
            <button
              onClick={() => setPaid(null)}
              className="w-full rounded-md px-5 py-2 text-sm font-semibold text-white hover:opacity-90 sm:w-auto"
              style={{ backgroundColor: "var(--brand-color, #dc2626)" }}
            >
              Make Another Deposit
            </button>
          </div>
        </div>
      ) : !payment ? (
        <div className="space-y-5 rounded-lg border border-zinc-800 bg-zinc-900/30 p-6">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase text-zinc-500">Choose amount (USD)</label>
            <input
              type="number"
              min={10}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-3 text-lg text-white focus:border-red-500 focus:outline-none"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {QUICK_AMOUNTS.map((q) => (
                <button
                  key={q}
                  onClick={() => setAmount(String(q))}
                  className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800"
                >
                  ${q}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase text-zinc-500">Pay with</label>
            <select
              value={coin}
              onChange={(e) => setCoin(e.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-3 text-sm text-white focus:border-red-500 focus:outline-none"
            >
              {COINS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-zinc-500">
              Minimum for {COINS.find((c) => c.value === coin)?.label || coin}: $
              {Math.max(minDeposit || 10, COIN_MIN_USD[coin] ?? 0)}
            </p>
          </div>

          {error && (
            <div className="rounded-md border border-red-900 bg-red-950/50 p-3 text-sm text-red-400">{error}</div>
          )}

          <button
            onClick={createInvoice}
            disabled={creating}
            className="flex w-full items-center justify-center gap-2 rounded-md py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "var(--brand-color, #dc2626)" }}
          >
            {creating ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Creating payment…</>
            ) : (
              "Pay $" + (amount || "0") + " with crypto"
            )}
          </button>
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-yellow-900/50 bg-yellow-950/20 p-4">
            <p className="flex items-center gap-2 text-sm text-yellow-500">
              <Clock className="h-4 w-4" />
              Send exactly <strong>{payment.payAmount} {payment.payCurrency.toUpperCase()}</strong> to the address below.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-6">
              <h3 className="mb-4 text-sm font-semibold uppercase text-zinc-400">Payment Details</h3>
              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-xs font-semibold uppercase text-zinc-500">Amount</p>
                  <p className="mt-1 text-2xl font-bold text-green-500">${payment.priceAmount.toFixed(2)}</p>
                  <p className="text-xs text-zinc-500">≈ {payment.payAmount} {payment.payCurrency.toUpperCase()}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-zinc-500">Address</p>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="flex-1 truncate rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white">
                      {payment.payAddress}
                    </code>
                    <button
                      onClick={copyAddress}
                      className="flex items-center gap-1 rounded-md bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-500"
                    >
                      {copied ? <><Check className="h-3 w-3" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/30 p-6">
              <h3 className="mb-4 text-sm font-semibold uppercase text-zinc-400">Scan to Pay</h3>
              <div className="rounded-lg bg-white p-4">
                <QRCode value={payment.payAddress} size={180} bgColor="#ffffff" fgColor="#000000" />
              </div>
              {polling && (
                <p className="mt-4 flex items-center justify-center gap-2 text-center text-xs text-zinc-500">
                  <Loader2 className="h-3 w-3 animate-spin" /> Waiting for payment confirmation…
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setPayment(null)}
              className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              onClick={loadMe}
              className="flex-1 rounded-md px-4 py-3 text-center text-sm font-semibold text-white hover:opacity-90"
              style={{ backgroundColor: "var(--brand-color, #dc2626)" }}
            >
              Refresh Balance
            </button>
          </div>
        </>
      )}
    </div>
  );
}
