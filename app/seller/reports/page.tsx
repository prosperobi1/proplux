"use client";

import { useEffect, useState } from "react";
import { Loader2, Flag } from "lucide-react";

type Report = {
  id: string;
  reason: string;
  details: string | null;
  status: string;
  createdAt: string;
  reporter?: { username: string };
};

export default function SellerReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/seller/reports")
      .then((r) => r.json())
      .then((d) => {
        setReports(Array.isArray(d) ? d : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="flex items-center gap-2 text-3xl font-bold text-red-600">
        <Flag className="h-7 w-7" /> My Reports
      </h1>

      <p className="text-sm text-zinc-400">
        Reports filed against your products by buyers. Status updates are handled by admin.
      </p>

      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full min-w-[700px] text-sm">
          <thead className="bg-zinc-900 text-left text-xs font-semibold uppercase text-red-500">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3">Details</th>
              <th className="px-4 py-3">Reporter</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800 bg-zinc-950">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-zinc-500"><span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</span></td></tr>
            ) : reports.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-zinc-500">No reports against you. Keep up the good work.</td></tr>
            ) : (
              reports.map((r, i) => (
                <tr key={r.id} className="hover:bg-zinc-900/50">
                  <td className="px-4 py-3 font-mono text-xs text-zinc-500">{r.id.slice(-6)}</td>
                  <td className="px-4 py-3 text-white">{r.reason}</td>
                  <td className="px-4 py-3 max-w-xs text-zinc-400">{r.details || "—"}</td>
                  <td className="px-4 py-3 text-zinc-400">{r.reporter?.username || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      r.status === "RESOLVED" ? "bg-green-950 text-green-500" :
                      r.status === "DISMISSED" ? "bg-zinc-800 text-zinc-400" :
                      r.status === "REVIEWED" ? "bg-blue-950 text-blue-400" :
                      "bg-yellow-950 text-yellow-500"
                    }`}>{r.status}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">{new Date(r.createdAt).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
