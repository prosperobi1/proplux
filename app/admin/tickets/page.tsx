"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function AdminTicketsPage() {
  type Ticket = {
    id: string;
    user: string;
    subject: string;
    messages: number;
    status: string;
    createdAt: string;
  };
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/tickets").then(r => r.json()).then(d => { setTickets(Array.isArray(d) ? d : []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-red-500">Pending Tickets</h1>
        <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs text-zinc-400">Open: {tickets.length}</span>
      </div>
      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full min-w-[700px] text-sm">
          <thead className="bg-zinc-900 text-left text-xs font-semibold uppercase text-red-500">
            <tr>
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">Subject</th>
              <th className="px-3 py-2">Messages</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800 bg-zinc-950">
            {loading ? (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-zinc-500">Loading...</td></tr>
            ) : tickets.length === 0 ? (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-zinc-500">No open tickets. All caught up!</td></tr>
            ) : tickets.map((t, i) => (
              <tr key={t.id} className="hover:bg-zinc-900/50">
                <td className="px-3 py-3 font-mono text-xs text-zinc-500">{t.id.slice(-6)}</td>
                <td className="px-3 py-3 text-white">{t.user}</td>
                <td className="px-3 py-3 text-zinc-300">{t.subject}</td>
                <td className="px-3 py-3 text-zinc-400">{t.messages}</td>
                <td className="px-3 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${t.status === "OPEN" ? "bg-yellow-950 text-yellow-500" : "bg-green-950 text-green-500"}`}>{t.status}</span></td>
                <td className="px-3 py-3 text-xs text-zinc-500">{new Date(t.createdAt).toLocaleDateString()}</td>
                <td className="px-3 py-3"><Link href={`/admin/tickets/${t.id}`} className="rounded bg-zinc-800 px-3 py-1 text-xs text-white hover:bg-zinc-700">View</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
