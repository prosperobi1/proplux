"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { UserPlus } from "lucide-react";

type Req = {
  id: string;
  status: string;
  message: string;
  createdAt: string;
  username: string;
  userEmail: string;
  messageCount: number;
};

const STATUSES = ["PENDING", "APPROVED", "REJECTED"];

export default function AdminSellerRequestsPage() {
  const [requests, setRequests] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("PENDING");

  useEffect(() => {
    fetch("/api/admin/seller-requests")
      .then((r) => r.json())
      .then((d) => { setRequests(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = filter === "ALL" ? requests : requests.filter((r) => r.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-red-500">
          <UserPlus className="h-6 w-6" /> Seller Requests
        </h1>
        <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs text-zinc-400">Total: {filtered.length}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {["ALL", ...STATUSES].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-md px-3 py-1.5 min-h-9 text-xs font-semibold ${filter === s ? "bg-red-600 text-white" : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"}`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full min-w-[700px] text-sm">
          <thead className="bg-zinc-900 text-left text-xs font-semibold uppercase text-red-500">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Message preview</th>
              <th className="px-4 py-3">Replies</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800 bg-zinc-950">
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-zinc-500">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-zinc-500">No requests.</td></tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="hover:bg-zinc-900/50">
                  <td className="px-4 py-3 font-mono text-xs text-zinc-500">{r.id.slice(-6)}</td>
                  <td className="px-4 py-3 text-white">{r.username}</td>
                  <td className="px-4 py-3 text-zinc-400">{r.userEmail}</td>
                  <td className="px-4 py-3 max-w-md truncate text-zinc-400">{r.message}</td>
                  <td className="px-4 py-3 text-zinc-400">{r.messageCount}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      r.status === "APPROVED" ? "bg-green-950 text-green-500" :
                      r.status === "REJECTED" ? "bg-zinc-800 text-zinc-400" :
                      "bg-yellow-950 text-yellow-500"
                    }`}>{r.status}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">{new Date(r.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <Link href={"/admin/seller-requests/" + r.id} className="rounded-md bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-700">
                      Open
                    </Link>
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
