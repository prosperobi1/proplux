"use client";

import { useEffect, useState, useMemo } from "react";
import { Search, CheckCircle2, XCircle, DollarSign, ChevronLeft, ChevronRight, Trash2, AlertTriangle, X } from "lucide-react";

type Withdrawal = {
  id: string;
  seller: string;
  sellerEmail: string;
  amount: number;
  wallet: string;
  network: string;
  status: string;
  reason?: string | null;
  createdAt: string;
};

const STATUSES = ["PENDING", "APPROVED", "REJECTED", "PAID"];
const PER_PAGE = 20;

export default function AdminWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [showBulk, setShowBulk] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const load = () => {
    fetch("/api/admin/withdrawals")
      .then((r) => r.json())
      .then((d) => {
        setWithdrawals(Array.isArray(d) ? d : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return withdrawals.filter((w) => {
      const matchesStatus = statusFilter === "ALL" || w.status === statusFilter;
      if (!matchesStatus) return false;
      if (!q) return true;
      return (
        w.seller.toLowerCase().includes(q) ||
        w.sellerEmail.toLowerCase().includes(q) ||
        w.wallet.toLowerCase().includes(q) ||
        w.id.toLowerCase().includes(q)
      );
    });
  }, [withdrawals, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PER_PAGE;
  const paged = filtered.slice(pageStart, pageStart + PER_PAGE);

  const selectableOnPage = paged.filter((w) => w.status === "PENDING" || w.status === "REJECTED");
  const allSelected = selectableOnPage.length > 0 && selectableOnPage.every((w) => selected.has(w.id));

  const toggleOne = (id: string, status: string) => {
    if (status !== "PENDING" && status !== "REJECTED") return;
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
        for (const w of selectableOnPage) next.delete(w.id);
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const w of selectableOnPage) next.add(w.id);
        return next;
      });
    }
  };

  const updateStatus = async (id: string, status: string, reason?: string) => {
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/withdrawals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reason === undefined ? { status } : { status, reason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data?.error || "Update failed");
        return;
      }
      load();
    } finally { setBusy(null); }
  };

  // Reject asks why — the reason is stored and emailed to the seller
  const rejectWithReason = (id: string) => {
    const reason = window.prompt("Reason for rejection (shown to the seller):", "");
    if (reason === null) return; // cancelled
    updateStatus(id, "REJECTED", reason.trim());
  };

  const confirmBulkDelete = async () => {
    if (bulkText !== "DELETE") {
      setBulkError("Type DELETE exactly");
      return;
    }
    setBulkBusy(true);
    setBulkError(null);
    try {
      const res = await fetch("/api/admin/withdrawals/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBulkError(data?.error || "Delete failed");
        return;
      }
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
        <h1 className="text-2xl font-bold text-red-500">Withdrawals</h1>
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
              placeholder="Search seller, email, wallet, ID..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full rounded-md border border-zinc-800 bg-zinc-950 pl-10 pr-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-red-500 focus:outline-none"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        {selectedCount > 0 && (
          <button
            onClick={() => { setShowBulk(true); setBulkText(""); setBulkError(null); }}
            className="flex items-center justify-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
          >
            <Trash2 className="h-4 w-4" /> Delete {selectedCount} selected
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full min-w-[1000px] text-sm">
          <thead className="bg-zinc-900 text-left text-xs font-semibold uppercase text-red-500">
            <tr>
              <th className="w-10 px-3 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  disabled={selectableOnPage.length === 0}
                  className="h-4 w-4 cursor-pointer accent-red-600 disabled:opacity-30"
                  title="Select all pending/rejected on this page"
                />
              </th>
              <th className="px-3 py-3">ID</th>
              <th className="px-3 py-3">Seller</th>
              <th className="px-3 py-3">Amount</th>
              <th className="px-3 py-3">Wallet</th>
              <th className="px-3 py-3">Network</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Date</th>
              <th className="px-3 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800 bg-zinc-950">
            {loading ? (
              <tr><td colSpan={9} className="px-4 py-6 text-center text-zinc-500">Loading...</td></tr>
            ) : paged.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-6 text-center text-zinc-500">No withdrawals match.</td></tr>
            ) : (
              paged.map((w) => {
                const selectable = w.status === "PENDING" || w.status === "REJECTED";
                const isSelected = selected.has(w.id);
                return (
                  <tr key={w.id} className={`hover:bg-zinc-900/50 ${isSelected ? "bg-red-950/10" : ""}`}>
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={!selectable}
                        onChange={() => toggleOne(w.id, w.status)}
                        className="h-4 w-4 cursor-pointer accent-red-600 disabled:opacity-30"
                        title={selectable ? "Select" : "Only PENDING or REJECTED can be deleted"}
                      />
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-zinc-500">{w.id.slice(-6)}</td>
                    <td className="px-3 py-3">
                      <div className="text-white">{w.seller}</div>
                      <div className="text-xs text-zinc-500">{w.sellerEmail}</div>
                    </td>
                    <td className="px-3 py-3 font-semibold text-green-500">${w.amount.toFixed(2)}</td>
                    <td className="px-3 py-3 font-mono text-xs text-zinc-400 max-w-[180px] truncate" title={w.wallet}>{w.wallet}</td>
                    <td className="px-3 py-3 text-zinc-300">{w.network}</td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        w.status === "PAID" ? "bg-green-950 text-green-500" :
                        w.status === "APPROVED" ? "bg-blue-950 text-blue-400" :
                        w.status === "REJECTED" ? "bg-red-950 text-red-500" :
                        "bg-yellow-950 text-yellow-500"
                      }`}>{w.status}</span>
                      {w.status === "REJECTED" && w.reason && (
                        <div className="mt-1 max-w-[200px] truncate text-[11px] text-zinc-500" title={w.reason}>
                          {w.reason}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs text-zinc-500">{new Date(w.createdAt).toLocaleString()}</td>
                    <td className="px-3 py-3">
                      <div className="flex gap-1">
                        {w.status === "PENDING" && (
                          <>
                            <button
                              onClick={() => updateStatus(w.id, "APPROVED")}
                              disabled={busy === w.id}
                              className="min-h-9 rounded bg-zinc-800 p-1.5 hover:bg-zinc-700 disabled:opacity-50"
                              title="Approve"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 text-blue-400" />
                            </button>
                            <button
                              onClick={() => rejectWithReason(w.id)}
                              disabled={busy === w.id}
                              className="min-h-9 rounded bg-zinc-800 p-1.5 hover:bg-zinc-700 disabled:opacity-50"
                              title="Reject (asks for a reason)"
                            >
                              <XCircle className="h-3.5 w-3.5 text-red-500" />
                            </button>
                          </>
                        )}
                        {w.status === "APPROVED" && (
                          <button
                            onClick={() => updateStatus(w.id, "PAID")}
                            disabled={busy === w.id}
                            className="min-h-9 rounded bg-zinc-800 p-1.5 hover:bg-zinc-700 disabled:opacity-50"
                            title="Mark as paid (deducts balance)"
                          >
                            <DollarSign className="h-3.5 w-3.5 text-green-400" />
                          </button>
                        )}
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-zinc-500">Page {currentPage} of {totalPages}</span>
          <div className="flex flex-wrap items-center justify-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="flex min-h-9 items-center gap-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-30"
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
                  className={`min-w-9 min-h-9 rounded-md px-2 py-1.5 text-xs font-semibold ${
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
              className="flex min-h-9 items-center gap-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-30"
            >
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
              <div>
                <h2 className="text-lg font-bold text-white">Delete {selectedCount} withdrawals?</h2>
                <p className="mt-2 text-sm text-zinc-400">
                  Only <strong>PENDING</strong> and <strong>REJECTED</strong> withdrawals can be deleted.
                  PAID withdrawals are records of transactions that already happened.
                </p>
                <p className="mt-2 text-sm text-zinc-400">This cannot be undone.</p>
              </div>
              <button onClick={() => setShowBulk(false)} className="ml-auto text-zinc-500 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-zinc-500">
                  Type <code className="text-red-500">DELETE</code> to confirm
                </label>
                <input
                  type="text"
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder="DELETE"
                  autoFocus
                  className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm text-white focus:border-red-500 focus:outline-none"
                />
              </div>
              {bulkError && <div className="rounded-md border border-red-900 bg-red-950/50 p-3 text-sm text-red-400">{bulkError}</div>}
              <div className="flex gap-2">
                <button
                  onClick={confirmBulkDelete}
                  disabled={bulkBusy || bulkText !== "DELETE"}
                  className="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
                >
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
