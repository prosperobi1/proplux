"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import QRCode from "react-qr-code";

type Product = {
  id: string;
  country: string;
  tld: string;
  hosting: string;
  price: number;
};

export default function PayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [timeLeft, setTimeLeft] = useState(900);
  const [product, setProduct] = useState<Product | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Fetch product from API
  useEffect(() => {
    params.then(({ id }) => {
      fetch(`/api/products/${id}`)
        .then((res) => {
          if (!res.ok) throw new Error("Product not found");
          return res.json();
        })
        .then((data) => {
          setProduct(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    });
  }, [params]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const handlePaid = async () => {
    if (!product) return;

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id }),
      });

      if (!res.ok) {
        const data = await res.json();
        console.error("Order failed:", data);
        alert("Failed to place order. Please try again.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      console.error(err);
      alert("Something went wrong.");
    }
  };

  if (loading) {
    return <div className="p-8 text-zinc-500">Loading...</div>;
  }

  if (!product) {
    return <div className="p-8 text-red-500">Product not found.</div>;
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const walletAddress = "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh";

  const copyAddress = () => {
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-red-900/50 bg-red-950/20 p-6">
        <h2 className="text-lg font-semibold text-red-500">Complete Payment</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Send the exact amount to the wallet address below. Your order will be processed once payment is confirmed.
        </p>
      </div>

      <div className="rounded-lg border border-yellow-900/50 bg-yellow-950/20 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-yellow-500">⏰ Payment expires in:</span>
          <span className="font-mono text-2xl font-bold text-yellow-500">
            {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <h3 className="mb-4 text-lg font-bold text-white">Payment Details</h3>
          <div className="space-y-4 text-sm">
            <div>
              <p className="text-xs font-semibold uppercase text-zinc-500">Amount</p>
              <p className="mt-1 text-2xl font-bold text-green-500">${product.price.toFixed(2)}</p>
              <p className="text-xs text-zinc-500">≈ 0.000198 BTC</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-zinc-500">Network</p>
              <p className="mt-1 text-white">Bitcoin (BTC)</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-zinc-500">Wallet Address</p>
              <div className="mt-1 flex items-center gap-2">
                <code className="flex-1 truncate rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white">
                  {walletAddress}
                </code>
                <button
                  onClick={copyAddress}
                  className="rounded-md bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-500"
                >
                  {copied ? "✓ Copied" : "Copy"}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <h3 className="mb-4 text-lg font-bold text-white">Scan to Pay</h3>
          <div className="rounded-lg bg-white p-4">
            <QRCode
              value={`bitcoin:${walletAddress}?amount=0.000198`}
              size={180}
              bgColor="#ffffff"
              fgColor="#000000"
            />
          </div>
          <p className="mt-4 text-center text-xs text-zinc-500">
            Scan this QR code with your crypto wallet app
          </p>
        </div>
      </div>

      <div className="flex gap-4">
        <a
          href="/dashboard"
          className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-zinc-800"
        >
          Cancel Order
        </a>
        <button
          onClick={handlePaid}
          className="flex-1 rounded-md bg-red-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-red-500"
        >
          I've Paid ✓
        </button>
      </div>
    </div>
  );
}