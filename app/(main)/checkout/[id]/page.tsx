"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Check, CheckCircle2, Clock, ShoppingCart } from "lucide-react";

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

export default function CheckoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [product, setProduct] = useState<Product | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    params.then(({ id }) => {
      Promise.all([
        fetch(`/api/products/${id}`).then((res) => {
          if (!res.ok) throw new Error("Product not found");
          return res.json();
        }),
        fetch("/api/me").then((res) => res.json()),
      ])
        .then(([productData, meData]) => {
          setProduct(productData);
          setMe(meData && !meData.error ? meData : null);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    });
  }, [params]);

  const handleConfirm = async () => {
    if (!product || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data?.error || "Failed to place order. Please try again.");
        return;
      }

      // Land on Orders with the delivery open + "purchase successful" banner
      const amt = typeof data.totalPrice === "number" ? `&amt=${data.totalPrice}` : "";
      router.push(data.id ? `/orders?open=${data.id}&paid=1${amt}` : `/orders?paid=1${amt}`);
      router.refresh();
    } catch (err) {
      console.error(err);
      alert("Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-zinc-500">Loading...</div>;
  }

  if (!product) {
    return <div className="p-8 text-red-500">Product not found.</div>;
  }

  const balance = me?.balance ?? 0;
  const canAfford = balance >= product.price;
  const balanceAfter = balance - product.price;
  const shortfall = canAfford ? 0 : product.price - balance;

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
          <ShoppingCart className="h-5 w-5" /> Confirm Purchase
        </h2>
        <p className="mt-2 text-sm text-zinc-400">
          Confirming will charge your account balance instantly and credit the seller.
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
              Your balance: ${balance.toFixed(2)} · Item price: ${product.price.toFixed(2)}
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

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <h3 className="mb-4 text-lg font-bold text-white">Order Summary</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-zinc-800 pb-2">
              <span className="text-zinc-400">Country</span>
              <span className="text-white">{product.country}</span>
            </div>
            <div className="flex justify-between border-b border-zinc-800 pb-2">
              <span className="text-zinc-400">Domain TLD</span>
              <span className="text-white">{product.tld || "—"}</span>
            </div>
            <div className="flex justify-between border-b border-zinc-800 pb-2">
              <span className="text-zinc-400">Hosting</span>
              <span className="text-white">{product.hosting}</span>
            </div>
            <div className="flex justify-between border-b border-zinc-800 pb-2">
              <span className="text-zinc-400">Seller</span>
              <span className="text-white">{product.seller.username}</span>
            </div>
            <div className="flex justify-between border-b border-zinc-800 pb-2">
              <span className="text-zinc-400">Product ID</span>
              <span className="font-mono text-xs text-white" title={product.id}>
                {product.id.slice(-6)}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <span className="text-zinc-400">Check Status</span>
              {product.checkStatus === "Valid" ? (
                <span className="flex items-center gap-1.5 text-white">
                  <CheckCircle2 className="h-4 w-4 text-green-500" /> Valid
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-white">
                  <Clock className="h-4 w-4 text-yellow-500" /> Checking
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <h3 className="mb-4 text-lg font-bold text-white">Payment</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-zinc-800 pb-2">
              <span className="text-zinc-400">Item price</span>
              <span className="text-white">${product.price.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-b border-zinc-800 pb-2">
              <span className="text-zinc-400">Your balance</span>
              <span className={canAfford ? "text-green-500" : "text-red-500"}>
                ${balance.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between pt-2 text-lg font-bold">
              <span className="text-white">Balance after</span>
              <span className={canAfford ? "text-green-500" : "text-red-500"}>
                {canAfford ? `$${balanceAfter.toFixed(2)}` : "—"}
              </span>
            </div>
          </div>
        </div>
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
              "Processing..."
            ) : (
              <>
                Confirm Purchase <Check className="h-4 w-4" />
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
