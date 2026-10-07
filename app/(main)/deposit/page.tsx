"use client";

import { useState, useEffect, useRef } from "react";
import { minVisible } from "@/lib/ui";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Bitcoin, Copy, Check, CheckCircle2, Clock, Loader2, DollarSign, AlertTriangle, ScrollText, ShieldCheck } from "lucide-react";
import { COIN_MIN_USD, MAX_DEPOSIT_USD } from "@/lib/deposit";
import QRCode from "react-qr-code";

type Me = { id: string; username: string; balance: number };

type Payment = {
  paymentId: string;
  payAddress: string;
  payAmount: number;
  payCurrency: string;
  priceAmount: number;
  orderId: string;
  expiresAt: string | number | null;
  status: string;
};

type CoinOpt = {
  value: string;
  label: string;
  symbol: string;
  detail: string;
  logo: string;
  /** Repeated on the invoice for coins where the wrong network = lost funds. */
  warn?: string;
};

const COINS: CoinOpt[] = [
  { value: "btc", label: "Bitcoin (BTC)", symbol: "BTC", detail: "Bitcoin network", logo: "/coins/bitcoin.svg" },
  { value: "eth", label: "Ethereum (ETH)", symbol: "ETH", detail: "Ethereum network", logo: "/coins/ethereum.svg" },
  { value: "usdttrc20", label: "USDT (TRC20)", symbol: "USDT", detail: "TRC20 · TRON", logo: "/coins/tether.svg", warn: "TRON (TRC20) network" },
  { value: "usdterc20", label: "USDT (ERC20)", symbol: "USDT", detail: "ERC20 · Ethereum", logo: "/coins/tether.svg", warn: "Ethereum (ERC20) network" },
];

const QUICK_AMOUNTS = [50, 100, 250, 500];

/**
 * A pending invoice survives a refresh: without this, F5 threw away the
 * payment address (and the success screen) with no way back — and in local
 * dev the NOWPayments IPN can't reach the server at all, so a payment made
 * while the view was gone could sit uncredited until the next status poll.
 * The server has no "my pending invoices" list, so the client keeps it.
 */
const STORE_KEY = "proplux.pendingDeposit";
type StoredInvoice = { userId?: string; savedAt: number; payment: Payment };
const STORE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const STATUS_TEXT: Record<string, string> = {
  waiting: "Waiting for your payment…",
  confirming: "Payment detected — waiting for network confirmations…",
  confirmed: "Confirmed — finalizing…",
  sending: "Sending to your balance…",
  partially_paid: "Partial payment received — send the remaining amount to finish",
};

const FAILURE_TEXT: Record<string, string> = {
  expired:
    "This invoice expired before payment was confirmed. Create a new one — if you already sent funds, they will still be credited automatically once confirmed.",
  failed: "This payment attempt failed. Create a new invoice and try again.",
};

/** NOWPayments hands out the expiration as ISO, unix seconds or unix ms
 *  depending on the endpoint — normalize to epoch ms, or null if unusable. */
function toDeadline(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v < 1e12 ? v * 1000 : v;
  if (typeof v === "string" && v) {
    const parsed = Date.parse(v);
    if (Number.isFinite(parsed)) return parsed;
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) return n < 1e12 ? n * 1000 : n;
  }
  return null;
}

// Module scope so no Date.now() runs during render (react-hooks/purity).
const nowMs = () => Date.now();
const isFresh = (savedAt: number) => nowMs() - savedAt <= STORE_MAX_AGE_MS;

export default function DepositPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [paid, setPaid] = useState<{ amount: number; currency: string } | null>(null);
  const [minDeposit, setMinDeposit] = useState(10);
  const [autoEnabled, setAutoEnabled] = useState<boolean | null>(null);
  const [amount, setAmount] = useState("50");
  const [coin, setCoin] = useState("btc");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [copied, setCopied] = useState(false);
  // Provider status and deadline live OUTSIDE `payment`: updating them must
  // not retrigger the poll effect (its dep is the invoice identity only).
  const [providerStatus, setProviderStatus] = useState<string | null>(null);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  // Restore at most once per mount (refresh-button reloads must not yank the
  // user back into an invoice they already backed out of).
  const restoredRef = useRef(false);

  const saveStore = (p: Payment) => {
    try {
      const payload: StoredInvoice = { userId: me?.id, savedAt: nowMs(), payment: p };
      localStorage.setItem(STORE_KEY, JSON.stringify(payload));
    } catch {}
  };
  const clearStore = () => {
    try {
      localStorage.removeItem(STORE_KEY);
    } catch {}
  };

  const closeInvoice = () => {
    setPayment(null);
    setDeadline(null);
    setSecondsLeft(null);
    setProviderStatus(null);
  };

  /** Reconcile with the provider: credit on final, surface failure states,
   *  otherwise just keep the latest status text. Called by the 15s poll and
   *  immediately once when a stored invoice is restored. */
  const checkStatus = async (p: Payment, restoring = false) => {
    try {
      const res = await fetch(
        `/api/deposit/status?paymentId=${encodeURIComponent(String(p.paymentId))}`
      );
      if (res.status === 404) {
        // Stale/foreign invoice — drop it quietly on restore.
        clearStore();
        closeInvoice();
        if (!restoring) setError("This invoice could not be found — create a new one.");
        return;
      }
      const d = await res.json().catch(() => ({}));
      const s = typeof d?.status === "string" ? d.status : "";

      if (s === "finished" || s === "confirmed") {
        clearStore();
        setPaid({ amount: p.priceAmount, currency: p.payCurrency.toUpperCase() });
        closeInvoice();
        loadMe();
        return;
      }
      if (s === "expired" || s === "failed") {
        clearStore();
        closeInvoice();
        setError(FAILURE_TEXT[s]);
        return;
      }
      if (s) setProviderStatus(s);
    } catch {
      // Network blip — the next tick retries.
    }
  };

  const restorePending = (userId: string) => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as StoredInvoice;
      const p = saved?.payment;
      if (!p?.paymentId) {
        clearStore();
        return;
      }
      if (saved.userId && saved.userId !== userId) {
        clearStore(); // another account used this browser
        return;
      }
      if (!isFresh(saved.savedAt)) {
        clearStore();
        return;
      }
      openInvoice(p, true);
    } catch {
      clearStore();
    }
  };

  const loadMe = () => {
    fetch("/api/settings/public")
      .then((r) => r.json())
      .then((d) => {
        if (typeof d?.minDeposit === "number") setMinDeposit(d.minDeposit);
        if (typeof d?.paymentAutoEnabled === "boolean") setAutoEnabled(d.paymentAutoEnabled);
      })
      .catch(() => {});

    return fetch("/api/me")
      .then((r) => r.json())
      .then((d) => {
        if (d && !d.error) {
          setMe(d);
          restorePending(d.id);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openInvoice = (p: Payment, checkNow = false) => {
    const dl = toDeadline(p.expiresAt);
    setPayment(p);
    setDeadline(dl);
    setSecondsLeft(dl !== null ? Math.max(0, Math.ceil((dl - nowMs()) / 1000)) : null);
    setProviderStatus(p.status || "waiting");
    setError(null);
    if (checkNow) void checkStatus(p, true);
  };

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
      const p: Payment = {
        paymentId: String(data.paymentId),
        payAddress: String(data.payAddress || ""),
        payAmount: Number(data.payAmount) || 0,
        payCurrency: String(data.payCurrency || coin),
        priceAmount: Number(data.priceAmount) || amt,
        orderId: String(data.orderId || ""),
        expiresAt: data.expiresAt ?? null,
        status: String(data.status || "waiting"),
      };
      saveStore(p);
      openInvoice(p);
    } catch (err) {
      setError(String(err));
    } finally {
      await vis();
      setCreating(false);
    }
  };

  const refreshBalance = async () => {
    const vis = minVisible();
    setRefreshing(true);
    try {
      await loadMe();
    } finally {
      await vis();
      setRefreshing(false);
    }
  };

  const copyAddress = () => {
    if (!payment) return;
    navigator.clipboard.writeText(payment.payAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 15s reconciliation poll while an invoice is on screen.
  useEffect(() => {
    if (!payment) return;
    const iv = setInterval(() => {
      void checkStatus(payment);
    }, 15000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payment]);

  // Countdown ticker — only while the invoice has a deadline. Recomputed
  // from the deadline inside the interval callback (async context), so the
  // display never drifts and no impure call happens during render.
  useEffect(() => {
    if (!deadline) return;
    const iv = setInterval(() => {
      setSecondsLeft(Math.max(0, Math.ceil((deadline - nowMs()) / 1000)));
    }, 1000);
    return () => clearInterval(iv);
  }, [deadline]);

  if (loading)
    return (
      <div className="flex items-center justify-center gap-2 p-8 text-zinc-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );

  const balance = me?.balance ?? 0;
  const effMin = Math.max(minDeposit || 10, COIN_MIN_USD[coin] ?? 0);
  const invCoin = payment ? COINS.find((c) => c.value === payment.payCurrency) : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-white">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
      </Link>

      <div className="flex items-start justify-between gap-4 rounded-lg border border-red-900/50 bg-red-950/20 p-6">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-red-500">
            <Bitcoin className="h-5 w-5" /> Deposit Funds
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Pay with crypto. Your balance is credited automatically once the network confirms your payment.
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs font-semibold uppercase text-zinc-500">Balance</p>
          <p className="mt-1 whitespace-nowrap text-xl font-bold text-green-500 sm:text-2xl">
            ${balance.toFixed(2)}
          </p>
        </div>
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
          {autoEnabled === false && (
            <div className="rounded-md border border-yellow-900/60 bg-yellow-950/30 p-3 text-sm text-yellow-500">
              Crypto deposits are currently disabled. Please try again later or open a ticket.
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label
                htmlFor="dep-amount"
                className="mb-2 block text-xs font-semibold uppercase text-zinc-500"
              >
                Amount (USD)
              </label>
              <div className="flex items-center rounded-md border border-zinc-700 bg-zinc-950 focus-within:border-red-500">
                <span className="pl-3 text-lg text-zinc-500">$</span>
                <input
                  id="dep-amount"
                  type="number"
                  min={effMin}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-transparent px-2 py-3 text-lg text-white focus:outline-none"
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {QUICK_AMOUNTS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setAmount(String(q))}
                    className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800"
                  >
                    ${q}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-zinc-500">
                Minimum for {COINS.find((c) => c.value === coin)?.label || coin}: ${effMin}
              </p>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase text-zinc-500">Pay with</label>
              <div className="grid grid-cols-2 gap-3">
                {COINS.map((c) => {
                  const selected = coin === c.value;
                  return (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setCoin(c.value)}
                      aria-pressed={selected}
                      className={`flex flex-col items-center gap-1.5 rounded-lg border bg-zinc-900 p-4 transition-colors ${
                        selected ? "border-transparent bg-red-950/30" : "border-zinc-700 hover:border-zinc-500"
                      }`}
                      style={selected ? { borderColor: "var(--brand-color, #dc2626)" } : undefined}
                    >
                      <Image src={c.logo} width={36} height={36} alt="" unoptimized className="h-9 w-9" />
                      <span className="text-sm font-bold text-white">{c.symbol}</span>
                      <span className="text-center text-[11px] leading-tight text-zinc-500">{c.detail}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-red-900 bg-red-950/50 p-3 text-sm text-red-400">{error}</div>
          )}

          <button
            onClick={createInvoice}
            disabled={creating || autoEnabled === false}
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
              <Clock className="h-4 w-4 shrink-0" />
              Send exactly <strong>{payment.payAmount} {payment.payCurrency.toUpperCase()}</strong> to the address below.
            </p>
            <p className="mt-1.5 flex items-center gap-2 pl-6 text-xs text-yellow-600">
              {invCoin && (
                <Image src={invCoin.logo} width={16} height={16} alt="" unoptimized className="h-4 w-4 shrink-0" />
              )}
              {invCoin?.warn ? (
                <span>
                  Send only via the <strong>{invCoin.warn}</strong> — funds sent on another network may be lost.
                </span>
              ) : (
                <span>{invCoin?.detail || "On-chain payment"}</span>
              )}
            </p>
            {secondsLeft !== null && (
              <p className="mt-1.5 pl-6 text-xs text-yellow-600">
                {secondsLeft > 0
                  ? `Invoice expires in ${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`
                  : "Invoice expiry reached — still watching for your payment…"}
              </p>
            )}
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
              <p className="mt-4 flex items-center justify-center gap-2 text-center text-xs text-zinc-500">
                <Loader2 className="h-3 w-3 animate-spin" />{" "}
                {STATUS_TEXT[providerStatus ?? "waiting"] ?? STATUS_TEXT.waiting}
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={closeInvoice}
              className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-zinc-800"
            >
              Back
            </button>
            <button
              onClick={refreshBalance}
              disabled={refreshing}
              className="flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-3 text-center text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: "var(--brand-color, #dc2626)" }}
            >
              {refreshing && <Loader2 className="h-4 w-4 animate-spin" />}
              {refreshing ? "Refreshing…" : "Refresh Balance"}
            </button>
          </div>
        </>
      )}

      {/* Rules: every number here comes from the same settings/constants the
          create API enforces, so this card can't promise what it won't accept. */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-6">
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase text-zinc-400">
          <ScrollText className="h-4 w-4" /> Deposit Rules
        </h3>

        <ul className="mt-4 space-y-3 text-sm text-zinc-300">
          <li className="flex gap-3">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
            <span>
              All payments are accepted automatically — crediting usually takes{" "}
              <strong className="text-white">3 minutes up to 1 hour</strong>, depending on
              your sender service and network congestion.
            </span>
          </li>
          <li className="flex gap-3">
            <DollarSign className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
            <span>
              Min/Max deposit:{" "}
              <strong className="text-white">
                ${(minDeposit || 10).toLocaleString("en-US")} – $
                {MAX_DEPOSIT_USD.toLocaleString("en-US")}
              </strong>{" "}
              per payment.
            </span>
          </li>
          <li className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" />
            <span className="text-yellow-500">
              Make sure you send <strong>exactly the amount shown on the invoice</strong> —
              a different amount may cause your payment to be rejected.
            </span>
          </li>
        </ul>

        <div className="mt-5 border-t border-zinc-800 pt-4">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase text-zinc-500">
            <ShieldCheck className="h-3.5 w-3.5" /> Available payment methods — secure way
            to fund your account
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {COINS.map((c) => (
              <div
                key={c.value}
                className="flex flex-col items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3 text-center"
              >
                <Image src={c.logo} width={28} height={28} alt="" unoptimized className="h-7 w-7" />
                <span className="text-xs font-bold text-white">{c.symbol}</span>
                <span className="text-[10px] leading-tight text-zinc-500">{c.detail}</span>
                <span className="mt-0.5 text-[11px] font-semibold text-zinc-400">
                  Min ${Math.max(minDeposit || 10, COIN_MIN_USD[c.value] ?? 0).toLocaleString("en-US")}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
