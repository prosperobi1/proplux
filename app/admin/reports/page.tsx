"use client";

import { useEffect, useState, useMemo } from "react";
import { Flag, Search, ChevronLeft, ChevronRight, Trash2, AlertTriangle, X } from "lucide-react";

type Report = {
  id: string;
  reason: string;
  details: string | null;
  status: string;
  createdAt: string;
  reporter: { username: string; email: string };
  seller: { username: string; email: string };
};

const STATUSES = ["PENDING", "REVIEWED", "RESOLVED", "DISMISSED"];
const PER_PAGE = 20;

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showBulk, setShowBulk] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const load = () => {
    fetch("/api/admin/reports")
      .then((r) => r.json())
      .then((d) => { setReports(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return reports.filter((r) => {
      const matchesStatus = filter === "ALL" || r.status === filter;
      if (!matchesStatus) return false;
      if (!q) return true;
      return (
        r.reporter.username.toLowerCase().includes(q) ||
        r.reporter.email.toLowerCase().includes(q) ||
        r.seller.username.toLowerCase().includes(q) ||
        r.seller.email.toLowerCase().includes(q) ||
        r.reason.toLowerCase().includes(q) ||
        (r.details || "").toLowerCase().includes(q)
      );
    });
  }, [reports, search, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PER_PAGE;
  const paged = filtered.slice(pageStart, pageStart + PER_PAGE);

  const allSelected = paged.length > 0 && paged.every((r) => selected.has(r.id));

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const r of paged) next.delete(r.id);
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const r of paged) next.add(r.id);
        return next;
      });
    }
  };

  const updateStatus = async (id: string, status: string) => {
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); alert(d?.error || "Update failed"); return; }
      load();
    } finally { setBusy(null); }
  };

  const confirmBulk = async () => {
    if (bulkText !== "DELETE") { setBulkError("Type DELETE exactly"); return; }
    setBulkBusy(true);
    setBulkError(null);
    try {
      const res = await fetch("/api/admin/reports/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setBulkError(data?.error || "Delete failed"); return; }
      setSelected(new Set());
      setShowBulk(false);
      setBulkText("");
      load();
      setPage(1);
    } finally { setBulkBusy(false); }
  };

  const selectedCount = selected.size;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-red-500">
          <Flag className="h-6 w-6" /> Reports
        </h1>
        <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs text-zinc-400">
          Showing {paged.length} of {filtered.length}
        </span>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:flex-1">
          <div className="relative md:max-w-md md:flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search reporter, seller, reason..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full rounded-md border border-zinc-800 bg-zinc-950 pl-10 pr-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-red-500 focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {["ALL", ...STATUSES].map((s) => (
              <button
                key={s}
                onClick={() => { setFilter(s); setPage(1); }}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold ${filter === s ? "bg-red-600 text-white" : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        {selectedCount > 0 && (
          <button
            onClick={() => { setShowBulk(true); setBulkText(""); setBulkError(null); }}
            className="flex items-center justify-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
          >
            <Trash2 className="h-4 w-4" /> Delete {selectedCount}
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full min-w-[1000px] text-sm">
          <thead className="bg-zinc-900 text-left text-xs font-semibold uppercase text-red-500">
            <tr>
              <th className="w-10 px-3 py-3">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} disabled={paged.length === 0} className="h-4 w-4 cursor-pointer accent-red-600 disabled:opacity-30" />
              </th>
              <th className="px-3 py-3">ID</th>
              <th className="px-3 py-3">Reporter</th>
              <th className="px-3 py-3">Against Seller</th>
              <th className="px-3 py-3">Reason</th>
              <th className="px-3 py-3">Details</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Date</th>
              <th className="px-3 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800 bg-zinc-950">
            {loading ? (
              <tr><td colSpan={9} className="px-4 py-6 text-center text-zinc-500">Loading...</td></tr>
            ) : paged.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-6 text-center text-zinc-500">No reports match.</td></tr>
            ) : (
              paged.map((r) => {
                const isSelected = selected.has(r.id);
                return (
                  <tr key={r.id} className={`hover:bg-zinc-900/50 ${isSelected ? "bg-red-950/10" : ""}`}>
                    <td className="px-3 py-3">
                      <input type="checkbox" checked={isSelected} onChange={() => toggleOne(r.id)} className="h-4 w-4 cursor-pointer accent-red-600" />
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-zinc-500">{r.id.slice(-6)}</td>
                    <td className="px-3 py-3">
                      <div className="text-white">{r.reporter.username}</div>
                      <div className="text-xs text-zinc-500">{r.reporter.email}</div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="text-zinc-300">{r.seller.username}</div>
                      <div className="text-xs text-zinc-500">{r.seller.email}</div>
                    </td>
                    <td className="px-3 py-3 text-white">{r.reason}</td>
                    <td className="px-3 py-3 max-w-[240px] truncate text-zinc-400" title={r.details || ""}>{r.details || "—"}</td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        r.status === "RESOLVED" ? "bg-green-950 text-green-500" :
                        r.status === "DISMISSED" ? "bg-zinc-800 text-zinc-400" :
                        r.status === "REVIEWED" ? "bg-blue-950 text-blue-400" :
                        "bg-yellow-950 text-yellow-500"
                      }`}>{r.status}</span>
                    </td>
                    <td className="px-3 py-3 text-xs text-zinc-500">{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td className="px-3 py-3">
                      <select
                        value={r.status}
                        onChange={(e) => updateStatus(r.id, e.target.value)}
                        disabled={busy === r.id}
                        className="rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-white focus:border-red-500 focus:outline-none disabled:opacity-50"
                      >
                        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-zinc-500">Page {currentPage} of {totalPages}</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1} className="flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-30">
              <ChevronLeft className="h-3.5 w-3.5" /> Prev
            </button>
            {Array.from({ length: totalPages }).map((_, i) => (
              <button key={i} onClick={() => setPage(i + 1)} className={`min-w-[32px] rounded-md px-2 py-1.5 text-xs font-semibold ${i + 1 === currentPage ? "bg-red-600 text-white" : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"}`}>
                {i + 1}
              </button>
            ))}
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-30">
              Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {showBulk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setShowBulk(false)}>
          <div className="w-full max-w-md rounded-lg border border-red-900/50 bg-zinc-900 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-6 w-6 flex-shrink-0 text-red-500" />
              <div className="flex-1">
                <h2 className="text-lg font-bold text-white">Delete {selectedCount} reports?</h2>
                <p className="mt-2 text-sm text-zinc-400">This cannot be undone.</p>
              </div>
              <button onClick={() => setShowBulk(false)} className="text-zinc-500 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-zinc-500">Type <code className="text-red-500">DELETE</code> to confirm</label>
                <input type="text" value={bulkText} onChange={(e) => setBulkText(e.target.value)} placeholder="DELETE" autoFocus className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm text-white focus:border-red-500 focus:outline-none" />
              </div>
              {bulkError && <div className="rounded-md border border-red-900 bg-red-950/50 p-3 text-sm text-red-400">{bulkError}</div>}
              <div className="flex gap-2">
                <button onClick={confirmBulk} disabled={bulkBusy || bulkText !== "DELETE"} className="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50">
                  {bulkBusy ? "Deleting..." : `Delete ${selectedCount}`}
                </button>
                <button onClick={() => setShowBulk(false)} disabled={bulkBusy} className="rounded-md border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
