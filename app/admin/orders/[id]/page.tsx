"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Copy, Eye, EyeOff, Check, Download } from "lucide-react";

type OrderDetail = {
  id: string;
  status: string;
  totalPrice: number;
  quantity: number;
  createdAt: string;
  buyer: { id: string; username: string; email: string };
  seller: { id: string; username: string; email: string };
  product: {
    id: string;
    country: string;
    tld: string;
    hosting: string;
    price: number;
    checkStatus: string;
    categorySlug: string | null;
    deliveryType: string;
    fileUrl: string | null;
    metadata: Record<string, any>;
  };
};

export default function AdminOrderDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [shown, setShown] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/admin/orders/" + id)
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) setOrder(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const isSecret = (k: string) => /pass|secret|token|key/i.test(k);

  const toggle = (k: string) =>
    setShown((prev) => {
      const n = new Set(prev);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const copy = (v: string) => navigator.clipboard.writeText(v);

  if (loading) return <div className="p-8 text-zinc-500">Loading...</div>;
  if (!order) return <div className="p-8 text-red-500">Order not found.</div>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/admin/orders" className="inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-white">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Orders
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Order #{order.id.slice(-6)}</h1>
          <p className="mt-1 text-xs text-zinc-500">{new Date(order.createdAt).toLocaleString()}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
          order.status === "Completed" ? "bg-green-950 text-green-500" :
          order.status === "Cancelled" || order.status === "Refunded" ? "bg-zinc-800 text-zinc-400" :
          "bg-yellow-950 text-yellow-500"
        }`}>{order.status}</span>
      </div>

      {/* Parties */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
          <p className="text-xs font-semibold uppercase text-zinc-500">Buyer</p>
          <p className="mt-2 text-white">{order.buyer.username}</p>
          <p className="text-xs text-zinc-500">{order.buyer.email}</p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
          <p className="text-xs font-semibold uppercase text-zinc-500">Seller</p>
          <p className="mt-2 text-white">{order.seller.username}</p>
          <p className="text-xs text-zinc-500">{order.seller.email}</p>
        </div>
      </div>

      {/* Order summary */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
        <h3 className="mb-3 text-sm font-semibold uppercase text-red-500">Order Details</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between border-b border-zinc-800 pb-2">
            <span className="text-zinc-400">Product</span>
            <span className="text-white">
              {order.product.country} {order.product.tld || order.product.hosting}
            </span>
          </div>
          <div className="flex justify-between border-b border-zinc-800 pb-2">
            <span className="text-zinc-400">Category</span>
            <span className="text-white">{order.product.categorySlug || "—"}</span>
          </div>
          <div className="flex justify-between border-b border-zinc-800 pb-2">
            <span className="text-zinc-400">Delivery Type</span>
            <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold uppercase text-zinc-400">
              {order.product.deliveryType}
            </span>
          </div>
          <div className="flex justify-between border-b border-zinc-800 pb-2">
            <span className="text-zinc-400">Quantity</span>
            <span className="text-white">{order.quantity}</span>
          </div>
          <div className="flex justify-between pt-2 text-lg font-bold">
            <span className="text-white">Total</span>
            <span className="text-green-500">${order.totalPrice.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Delivered content */}
      <div className="rounded-lg border border-red-900/50 bg-red-950/20 p-4">
        <h3 className="mb-3 text-sm font-semibold uppercase text-red-500">
          🔓 Delivered Content (what the buyer received)
        </h3>

        {order.product.deliveryType === "file" && order.product.fileUrl ? (
          <div className="text-center">
            <p className="text-sm text-zinc-400">File delivery</p>
            <a
              href={order.product.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 rounded-md bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-500"
            >
              <Download className="h-4 w-4" /> Download File
            </a>
          </div>
        ) : Object.keys(order.product.metadata).length === 0 ? (
          <p className="text-sm text-zinc-500">No metadata on this product.</p>
        ) : (
          <div className="space-y-2">
            {Object.entries(order.product.metadata).map(([key, value]) => {
              const str = String(value);
              const secret = isSecret(key);
              const visible = shown.has(key);
              return (
                <div key={key} className="flex items-center justify-between gap-3 border-b border-zinc-800 pb-2">
                  <span className="text-sm capitalize text-zinc-400">{key.replace(/_/g, " ")}</span>
                  <div className="flex items-center gap-1">
                    <span className="max-w-md break-all text-right font-mono text-sm text-white">
                      {secret && !visible ? "\u2022".repeat(Math.min(str.length || 8, 12)) : str}
                    </span>
                    {secret && (
                      <button
                        onClick={() => toggle(key)}
                        className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-white"
                      >
                        {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    )}
                    <button
                      onClick={() => copy(str)}
                      className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-white"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="text-center text-xs text-zinc-600">
        Admin view · Visible for dispute resolution and audit
      </div>
    </div>
  );
}
