"use client";

import { useEffect, useState } from "react";
import { Loader2, Clock, AlertTriangle, Users, Flame, ShoppingCart } from "lucide-react";

type RecentUser = {
  id: string;
  username: string;
  email: string;
  createdAt: string;
};

type Stats = {
  totalUsers: number;
  totalSellers: number;
  totalOrders: number;
  pendingTickets: number;
  pendingReports: number;
  recentUsers: RecentUser[];
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) setStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const cards = [
    {
      label: "Pending Tickets",
      value: stats?.pendingTickets ?? 0,
      icon: Clock,
      color: "blue" as const,
    },
    {
      label: "Pending Reports",
      value: stats?.pendingReports ?? 0,
      icon: AlertTriangle,
      color: "blue" as const,
    },
    {
      label: "Total Users",
      value: stats?.totalUsers ?? 0,
      icon: Users,
      color: "red" as const,
    },
    {
      label: "Total Sellers",
      value: stats?.totalSellers ?? 0,
      icon: Flame,
      color: "red" as const,
    },
    {
      label: "Total Orders",
      value: stats?.totalOrders ?? 0,
      icon: ShoppingCart,
      color: "red" as const,
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-red-500">Admin Dashboard</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5 md:gap-6">
        {cards.map((card) => {
          const Icon = card.icon;
          const iconColor =
            card.color === "blue" ? "text-blue-400" : "text-red-500";
          const barBg = card.color === "blue" ? "bg-blue-500" : "bg-red-600";
          return (
            <div
              key={card.label}
              className="overflow-hidden rounded-lg border border-zinc-800"
            >
              <div className="flex flex-col items-center justify-center bg-zinc-900 p-6 md:p-8">
                <Icon className={`h-8 w-8 md:h-12 md:w-12 ${iconColor}`} />
                <p className={`mt-4 text-2xl md:text-3xl font-bold ${iconColor}`}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : card.value}
                </p>
              </div>
              <div
                className={`p-3 text-center text-xs md:text-sm font-semibold text-white ${barBg}`}
              >
                {card.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Users */}
      <div>
        <h2 className="mb-3 text-lg font-bold text-red-500">Latest Users</h2>
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full min-w-[500px] text-sm">
            <thead className="bg-zinc-900 text-left text-xs font-semibold uppercase text-red-500">
              <tr>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 bg-zinc-950">
              {loading ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 py-6 text-center text-zinc-500"
                  >
                    <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading users...</span>
                  </td>
                </tr>
              ) : !stats?.recentUsers?.length ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 py-6 text-center text-zinc-500"
                  >
                    No users yet.
                  </td>
                </tr>
              ) : (
                stats.recentUsers.map((user, i) => (
                  <tr key={user.id}>
                    <td className="px-3 py-3 text-red-500">{i + 1}</td>
                    <td className="px-3 py-3 text-white">{user.username}</td>
                    <td className="px-3 py-3 text-zinc-400">{user.email}</td>
                    <td className="px-3 py-3 text-zinc-500">
                      {new Date(user.createdAt).toLocaleDateString()}
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