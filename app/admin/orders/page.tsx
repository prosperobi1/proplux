"use client";

import { useEffect, useState, useMemo } from "react";
import { Search, Check, X } from "lucide-react";

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

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    fetch("/api/admin/orders")
      .then((res) => res.json())
      .then((data) => {
        setOrders(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <h1 className="text-2xl font-bold text-red-500">Orders</h1>
        <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs text-zinc-400">
          Total: {filtered.length}
        </span>
      </div>

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
                  Loading orders...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-zinc-500">
                  No orders found.
                </td>
              </tr>
            ) : (
              filtered.map((order) => (
                <tr key={order.id} className="hover:bg-zinc-900/50">
                  <td className="px-3 py-3 font-mono text-xs text-zinc-500">
                    {order.id.slice(-8).toUpperCase()}
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
                    <div className="flex gap-2">
                      <button
                        className="rounded bg-zinc-800 p-1.5 hover:bg-zinc-700"
                        title="Mark as complete"
                      >
                        <Check className="h-3.5 w-3.5 text-green-400" />
                      </button>
                      <button
                        className="rounded bg-zinc-800 p-1.5 hover:bg-zinc-700"
                        title="Cancel order"
                      >
                        <X className="h-3.5 w-3.5 text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}