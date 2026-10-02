"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Flame, Star, Search, ChevronLeft, ChevronRight, Trash2, AlertTriangle, X } from "lucide-react";

type Seller = {
  id: string;
  username: string;
  email: string;
  balance: number;
  totalRevenue: number;
  banned: boolean;
  createdAt: string;
  productCount: number;
  orderCount: number;
  averageRating: number;
  ratingCount: number;
};

const PER_PAGE = 20;

export default function AdminSellersPage() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showBulk, setShowBulk] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const load = () => {
    fetch("/api/admin/sellers")
      .then((r) => r.json())
      .then((d) => { setSellers(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sellers;
    return sellers.filter(
      (s) => s.username.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
    );
  }, [sellers, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PER_PAGE;
  const paged = filtered.slice(pageStart, pageStart + PER_PAGE);
  const allSelected = paged.length > 0 && paged.every((s) => selected.has(s.id));

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
      setSelected((prev) => { const n = new Set(prev); for (const s of paged) n.delete(s.id); return n; });
    } else {
      setSelected((prev) => { const n = new Set(prev); for (const s of paged) n.add(s.id); return n; });
    }
  };

  const confirmBulk = async () => {
    if (bulkText !== "DELETE") { setBulkError("Type DELETE exactly"); return; }
    setBulkBusy(true);
    setBulkError(null);
    try {
      const res = await fetch("/api/admin/sellers/bulk-delete", {
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
          <Flame className="h-6 w-6" /> Sellers
        </h1>
        <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs text-zinc-400">
          Showing {paged.length} of {filtered.length}
        </span>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative md:max-w-md md:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by username or email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-md border border-zinc-800 bg-zinc-950 pl-10 pr-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-red-500 focus:outline-none"
          />
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
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Username</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Products</th>
              <th className="px-4 py-3">Sales</th>
              <th className="px-4 py-3">Lifetime</th>
              <th className="px-4 py-3">Balance</th>
              <th className="px-4 py-3">Rating</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800 bg-zinc-950">
            {loading ? (
              <tr><td colSpan={11} className="px-4 py-6 text-center text-zinc-500">Loading...</td></tr>
            ) : paged.length === 0 ? (
              <tr><td colSpan={11} className="px-4 py-6 text-center text-zinc-500">
                {search ? "No sellers match." : "No sellers yet."}
              </td></tr>
            ) : (
              paged.map((s) => {
                const isSelected = selected.has(s.id);
                return (
                  <tr key={s.id} className={`hover:bg-zinc-900/50 ${isSelected ? "bg-red-950/10" : ""}`}>
                    <td className="px-3 py-3">
                      <input type="checkbox" checked={isSelected} onChange={() => toggleOne(s.id)} className="h-4 w-4 cursor-pointer accent-red-600" />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-500">{s.id.slice(-6)}</td>
                    <td className="px-4 py-3 text-white">{s.username}</td>
                    <td className="px-4 py-3 text-zinc-400">{s.email}</td>
                    <td className="px-4 py-3 text-zinc-300">{s.productCount}</td>
                    <td className="px-4 py-3 text-zinc-300">{s.orderCount}</td>
                    <td className="px-4 py-3 font-semibold text-green-500">${s.totalRevenue.toFixed(2)}</td>
                    <td className="px-4 py-3 font-semibold text-green-500">${s.balance.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      {s.ratingCount > 0 ? (
                        <span className="flex items-center gap-1 text-yellow-500">
                          <Star className="h-3.5 w-3.5 fill-yellow-500" />
                          {s.averageRating.toFixed(1)}
                          <span className="text-xs text-zinc-500">({s.ratingCount})</span>
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {s.banned ? (
                        <span className="rounded-full bg-red-950 px-2 py-0.5 text-[10px] font-semibold uppercase text-red-500">Banned</span>
                      ) : (
                        <span className="rounded-full bg-green-950 px-2 py-0.5 text-[10px] font-semibold uppercase text-green-500">Active</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link href="/admin/users" className="inline-flex min-h-9 items-center rounded bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-700">Manage</Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-zinc-500">Page {currentPage} of {totalPages}</span>
          <div className="flex flex-wrap items-center justify-center gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1} className="flex min-h-9 items-center gap-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-30">
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
                  className={`min-w-9 min-h-9 rounded-md px-2 py-1.5 text-xs font-semibold ${
                    p === currentPage ? "bg-red-600 text-white" : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
                  }`}
                >
                  {p}
                </button>
              );
            })}
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="flex min-h-9 items-center gap-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-30">
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
                <h2 className="text-lg font-bold text-white">Delete {selectedCount} sellers?</h2>
                <p className="mt-2 text-sm text-zinc-400">
                  This will delete the sellers <strong>and all their products, orders, ratings, and reports</strong>.
                  Cannot be undone.
                </p>
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
