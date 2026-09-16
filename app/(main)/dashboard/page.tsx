"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

type Order = {
  id: string;
  status: string;
  totalPrice: number;
  createdAt: string;
  product: {
    country: string;
    tld: string;
    price: number;
  };
};

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;

    fetch("/api/orders")
      .then((res) => res.json())
      .then((data) => {
        setOrders(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [status]);

  if (status === "loading" || loading) {
    return <div className="p-8 text-zinc-500">Loading...</div>;
  }

  const totalSpent = orders.reduce((sum, order) => sum + order.totalPrice, 0);
  const username = session?.user?.name || "User";

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-lg border border-red-900/50 bg-red-950/20 p-6">
        <h2 className="text-lg font-semibold text-red-500">Hello {username}</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Welcome to your Proplux dashboard. Here you can manage your orders, check your balance, and contact support.
        </p>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="mt-4 rounded-md border border-red-700 px-3 py-1 text-xs font-semibold text-red-500 hover:bg-red-950"
        >
          Sign Out
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <p className="text-xs font-semibold uppercase text-zinc-500">Balance</p>
          <p className="mt-2 text-3xl font-bold text-green-500">$0.00</p>
          <button className="mt-4 rounded-md bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500">
            Add Funds
          </button>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <p className="text-xs font-semibold uppercase text-zinc-500">Total Orders</p>
          <p className="mt-2 text-3xl font-bold text-white">{orders.length}</p>
          <p className="mt-4 text-xs text-zinc-500">Total spent: ${totalSpent.toFixed(2)}</p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <p className="text-xs font-semibold uppercase text-zinc-500">Open Tickets</p>
          <p className="mt-2 text-3xl font-bold text-white">0</p>
          <a href="#" className="mt-4 inline-block text-xs text-red-500 hover:text-red-400">
            Open a Ticket →
          </a>
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h3 className="mb-4 flex items-center gap-2 text-xl font-bold text-red-500">
          <span>📋</span> Recent Activity
        </h3>
        <div className="overflow-hidden rounded-lg border border-zinc-800">
          <table className="w-full">
            <thead className="bg-zinc-900">
              <tr className="text-left text-xs font-semibold uppercase text-red-500">
                <th className="px-4 py-3">Order ID</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {orders.length === 0 ? (
                <tr className="bg-zinc-950">
                  <td className="px-4 py-6 text-center text-sm text-zinc-500" colSpan={5}>
                    No orders yet. Browse the{" "}
                    <a href="/products" className="text-red-500 underline">marketplace</a>{" "}
                    to get started.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="bg-zinc-950 hover:bg-zinc-900/50">
                    <td className="px-4 py-3 text-sm font-mono text-zinc-400">
                      {order.id.slice(0, 12)}...
                    </td>
                    <td className="px-4 py-3 text-sm text-white">
                      {order.product.country} {order.product.tld}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-green-500">
                      ${order.totalPrice.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-yellow-950 px-2 py-1 text-xs font-semibold text-yellow-500">
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-500">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}