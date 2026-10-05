"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Check, CheckCircle2, Clock, Loader2, ShoppingCart } from "lucide-react";

type Product = {
  id: string;
  country: string;
  tld: string;
  hosting: string;
  checkStatus: string;
  price: number;
  seller: { username: string };
};

type Me = {
  id: string;
  username: string;
  balance: number;
};

function BulkCheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const idsParam = searchParams.get("ids") || "";
  const ids = idsParam.split(",").map((s) => s.trim()).filter(Boolean);

  const [products, setProducts] = useState<Product[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (ids.length === 0) {
      setLoading(false);
      return;
    }

    Promise.all([
      Promise.all(
        ids.map((id) =>
          fetch(`/api/products/${id}`)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null)
        )
      ),
      fetch("/api/me").then((r) => r.json()),
    ])
      .then(([productData, meData]) => {
        setProducts(productData.filter(Boolean) as Product[]);
        setMe(meData && !meData.error ? meData : null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [idsParam]);

  const handleConfirm = async () => {
    if (submitting || products.length === 0) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/orders/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: products.map((p) => p.id) }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data?.error || "Failed to place bulk order. Please try again.");
        return;
      }

      // Bulk response has count + total (no ids) — Orders list with success banner
      const amt = typeof data.total === "number" ? `&amt=${data.total}` : "";
      router.push(`/orders?paid=${data.count ?? 1}${amt}`);
      router.refresh();
    } catch (err) {
      console.error(err);
      alert("Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 p-8 text-zinc-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading...
      </div>
    );
  }

  if (ids.length === 0) {
    return (
      <div className="p-8 text-zinc-400">
        No items selected.{" "}
        <Link href="/products" className="text-red-500 hover:underline">
          Back to Marketplace
        </Link>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="p-8 text-red-500">
        No valid products found.{" "}
        <Link href="/products" className="text-red-400 hover:underline">
          Back to Marketplace
        </Link>
      </div>
    );
  }

  const balance = me?.balance ?? 0;
  const totalPrice = products.reduce((sum, p) => sum + p.price, 0);
  const canAfford = balance >= totalPrice;
  const balanceAfter = balance - totalPrice;
  const shortfall = canAfford ? 0 : totalPrice - balance;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/products"
        className="inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Marketplace
      </Link>

      <div className="rounded-lg border border-red-900/50 bg-red-950/20 p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-red-500">
          <ShoppingCart className="h-5 w-5" /> Bulk Purchase — Confirm
        </h2>
        <p className="mt-2 text-sm text-zinc-400">
          Confirming will charge your account balance and credit each seller.
        </p>
      </div>

      {!canAfford && (
        <div className="flex items-start gap-3 rounded-lg border border-red-700 bg-red-950/40 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-400">
              Insufficient balance — you need ${shortfall.toFixed(2)} more.
            </p>
            <p className="mt-1 text-xs text-red-300/80">
              Your balance: ${balance.toFixed(2)} · Total: ${totalPrice.toFixed(2)}
            </p>
            <Link
              href="/deposit"
              className="mt-3 inline-block rounded-md bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500"
            >
              Deposit Funds
            </Link>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full min-w-[500px] text-sm">
          <thead className="bg-zinc-900 text-left text-xs font-semibold uppercase text-red-500">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Seller</th>
              <th className="px-4 py-3">Check</th>
              <th className="px-4 py-3 text-right">Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800 bg-zinc-950">
            {products.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3 text-zinc-300">
                  {p.country} {p.tld || ""}{" "}
                  <span className="text-zinc-500">· {p.hosting}</span>
                </td>
                <td className="px-4 py-3 text-zinc-400">{p.seller.username}</td>
                <td className="px-4 py-3">
                  {p.checkStatus === "Valid" ? (
                    <span className="flex items-center gap-1.5 text-white">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> Valid
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-white">
                      <Clock className="h-3.5 w-3.5 text-yellow-500" /> Checking
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-green-500">
                  ${p.price.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-zinc-900 text-sm">
            <tr>
              <td colSpan={3} className="px-4 py-3 text-right text-zinc-400">
                Total
              </td>
              <td className="px-4 py-3 text-right font-bold text-green-500">
                ${totalPrice.toFixed(2)}
              </td>
            </tr>
            <tr>
              <td colSpan={3} className="px-4 py-3 text-right text-zinc-400">
                Your balance
              </td>
              <td className={`px-4 py-3 text-right font-semibold ${canAfford ? "text-green-500" : "text-red-500"}`}>
                ${balance.toFixed(2)}
              </td>
            </tr>
            <tr>
              <td colSpan={3} className="px-4 py-3 text-right text-zinc-400">
                Balance after
              </td>
              <td className={`px-4 py-3 text-right font-bold ${canAfford ? "text-green-500" : "text-red-500"}`}>
                {canAfford ? `$${balanceAfter.toFixed(2)}` : "—"}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex gap-4">
        <Link
          href="/products"
          className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-zinc-800"
        >
          Cancel
        </Link>
        {canAfford ? (
          <button
            onClick={handleConfirm}
            disabled={submitting}
            className="flex flex-1 items-center justify-center gap-2 rounded-md bg-red-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</>
            ) : (
              <>
                Confirm {products.length} {products.length === 1 ? "Purchase" : "Purchases"}
                <Check className="h-4 w-4" />
              </>
            )}
          </button>
        ) : (
          <Link
            href="/deposit"
            className="flex flex-1 items-center justify-center gap-2 rounded-md bg-red-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-red-500"
          >
            Deposit Funds
          </Link>
        )}
      </div>
    </div>
  );
}

export default function BulkCheckoutPage() {
  return (
    <Suspense fallback={<p className="flex items-center justify-center gap-2 p-8 text-zinc-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</p>}>
      <BulkCheckoutContent />
    </Suspense>
  );
}
