"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Search, Check, X, ChevronLeft, ChevronRight, Eye } from "lucide-react";

type Order = {
  id: string;
  status: string;
  totalPrice: number;
  createdAt: string;
  buyer: string;
  buyerEmail: string;
  product: string;
  seller: string;
  hosting: string;
};

const TERMINAL_STATUSES = ["Completed", "Cancelled", "Refunded"];
const isTerminal = (status: string) => TERMINAL_STATUSES.includes(status);

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const PER_PAGE = 20;
  const router = useRouter();

  const loadOrders = () => {
    setLoading(true);
    fetch("/api/admin/orders")
      .then((res) => res.json())
      .then((data) => {
        setOrders(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleStatusChange = async (id: string, newStatus: string) => {
    if (newStatus === "Cancelled") {
      const ok = window.confirm(
        "Cancel this order? The seller's balance will be reduced by the credited amount."
      );
      if (!ok) return;
    }

    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data?.error || "Failed to update order");
        return;
      }
      loadOrders();
      router.refresh();
    } catch (err) {
      alert("Something went wrong: " + String(err));
    } finally {
      setBusyId(null);
    }
  };

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const matchesSearch =
        search === "" ||
        o.buyer.toLowerCase().includes(search.toLowerCase()) ||
        o.buyerEmail.toLowerCase().includes(search.toLowerCase()) ||
        o.id.toLowerCase().includes(search.toLowerCase());
      const matchesStatus =
        statusFilter === "ALL" || o.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PER_PAGE;
  const paged = filtered.slice(pageStart, pageStart + PER_PAGE);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  return (
    <div className="space-y-6">


      {/* Filters */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="relative md:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by buyer, email, or order ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-zinc-800 bg-zinc-950 pl-10 pr-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-red-500 focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none"
        >
          <option value="ALL">All Statuses</option>
          <option value="Pending Confirmation">Pending Confirmation</option>
          <option value="Completed">Completed</option>
          <option value="Refunded">Refunded</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      {/* Orders Table */}
      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-zinc-900 text-left text-xs font-semibold uppercase text-red-500">
            <tr>
              <th className="px-3 py-2">Order ID</th>
              <th className="px-3 py-2">Buyer</th>
              <th className="px-3 py-2">Product</th>
              <th className="px-3 py-2">Seller</th>
              <th className="px-3 py-2">Amount</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800 bg-zinc-950">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-zinc-500">
                  <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading orders...</span>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-zinc-500">
                  No orders found.
                </td>
              </tr>
            ) : (
              paged.map((order) => {
                const terminal = isTerminal(order.status);
                const busy = busyId === order.id;
                return (
                  <tr key={order.id} className="hover:bg-zinc-900/50">
                    <td className="px-3 py-3 font-mono text-xs text-zinc-500">
                      {order.id.slice(-6)}
                    </td>
                    <td className="px-3 py-3">
                      <div className="text-white">{order.buyer}</div>
                      <div className="text-xs text-zinc-500">
                        {order.buyerEmail}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-zinc-300">{order.product}</td>
                    <td className="px-3 py-3 text-zinc-400">{order.seller}</td>
                    <td className="px-3 py-3 font-semibold text-green-500">
                      ${order.totalPrice.toFixed(2)}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          order.status === "Completed"
                            ? "bg-green-950 text-green-500"
                            : order.status === "Refunded"
                            ? "bg-blue-950 text-blue-400"
                            : order.status === "Cancelled"
                            ? "bg-zinc-800 text-zinc-400"
                            : "bg-yellow-950 text-yellow-500"
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-zinc-500">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={"/admin/orders/" + order.id}
                          className="flex min-h-9 min-w-9 items-center justify-center rounded bg-zinc-800 p-1.5 hover:bg-zinc-700"
                          title="View delivered content"
                        >
                          <Eye className="h-3.5 w-3.5 text-blue-400" />
                        </Link>
                        <button
                          onClick={() =>
                            handleStatusChange(order.id, "Completed")
                          }
                          disabled={terminal || busy}
                          className="flex min-h-9 min-w-9 items-center justify-center rounded bg-zinc-800 p-1.5 hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-30"
                          title={
                            terminal
                              ? `Already ${order.status}`
                              : "Mark as complete"
                          }
                        >
                          <Check className="h-3.5 w-3.5 text-green-400" />
                        </button>
                        <button
                          onClick={() =>
                            handleStatusChange(order.id, "Cancelled")
                          }
                          disabled={terminal || busy}
                          className="flex min-h-9 min-w-9 items-center justify-center rounded bg-zinc-800 p-1.5 hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-30"
                          title={
                            terminal
                              ? `Already ${order.status}`
                              : "Cancel order (reverses seller credit)"
                          }
                        >
                          <X className="h-3.5 w-3.5 text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex flex-wrap flex-col items-center justify-between gap-3 pt-2 md:flex-row">
          <span className="text-xs text-zinc-500">
            Page {currentPage} of {totalPages} · Showing {paged.length} of {filtered.length}
          </span>
          <div className="flex flex-wrap items-center justify-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-30"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Prev
            </button>
            {Array.from({ length: totalPages }).map((_, i) => {
              const p = i + 1;
              if (totalPages > 7 && Math.abs(p - currentPage) > 2 && p !== 1 && p !== totalPages) {
                if (p === 2 || p === totalPages - 1) return <span key={p} className="px-2 text-zinc-600">…</span>;
                return null;
              }
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`min-w-[32px] rounded-md px-2 py-1.5 text-xs font-semibold ${
                    p === currentPage ? "bg-red-600 text-white" : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
                  }`}
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-30"
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
