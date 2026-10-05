"use client";

import { useEffect, useState, useMemo } from "react";
import { Loader2, Trash2, DollarSign, X, Pencil, Shield, Search, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";

type UserRow = {
  id: string;
  email: string;
  username: string;
  role: string;
  balance: number;
  banned: boolean;
  createdAt: string;
};

const ROLES = ["BUYER", "SELLER", "ADMIN"];
const PER_PAGE = 20;

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [creditFor, setCreditFor] = useState<string | null>(null);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditMode, setCreditMode] = useState<"credit" | "debit">("credit");
  const [creditBusy, setCreditBusy] = useState(false);

  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [editUsername, setEditUsername] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState("BUYER");
  const [editBanned, setEditBanned] = useState(false);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [bulkConfirmText, setBulkConfirmText] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const loadUsers = async () => {
    const res = await fetch("/api/admin/users");
    const data = await res.json();
    setUsers(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { loadUsers(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
    );
  }, [users, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PER_PAGE;
  const pagedUsers = filtered.slice(pageStart, pageStart + PER_PAGE);

  const selectableOnPage = pagedUsers.filter((u) => u.role !== "ADMIN");
  const allSelectedOnPage = selectableOnPage.length > 0 && selectableOnPage.every((u) => selected.has(u.id));

  const toggleOne = (id: string, role: string) => {
    if (role === "ADMIN") return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllOnPage = () => {
    if (allSelectedOnPage) {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const u of selectableOnPage) next.delete(u.id);
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const u of selectableOnPage) next.add(u.id);
        return next;
      });
    }
  };

  const changeRole = async (userId: string, newRole: string) => {
    setBusy(userId);
    const res = await fetch(`/api/admin/users/${userId}/role`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    if (res.ok) await loadUsers();
    setBusy(null);
  };

  const deleteUser = async (userId: string, username: string) => {
    if (!confirm(`Delete "${username}"? This cannot be undone.`)) return;
    setBusy(userId);
    const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
    if (res.ok) {
      await loadUsers();
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    } else {
      const err = await res.json();
      alert(err.error || "Failed to delete user");
    }
    setBusy(null);
  };

  const openCredit = (userId: string) => {
    setCreditFor(userId);
    setCreditAmount("");
    setCreditMode("credit");
  };
  const closeCredit = () => {
    setCreditFor(null);
    setCreditAmount("");
  };

  const handleCredit = async (userId: string) => {
    const amount = Number(creditAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      alert("Enter a valid positive amount");
      return;
    }
    setCreditBusy(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/balance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, mode: creditMode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data?.error || "Failed to update balance");
        return;
      }
      closeCredit();
      await loadUsers();
    } finally { setCreditBusy(false); }
  };

  const openEdit = (u: UserRow) => {
    setEditUser(u);
    setEditUsername(u.username);
    setEditEmail(u.email);
    setEditRole(u.role);
    setEditBanned(u.banned);
    setEditError(null);
  };
  const closeEdit = () => {
    setEditUser(null);
    setEditError(null);
  };

  const saveEdit = async () => {
    if (!editUser) return;
    setEditBusy(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/admin/users/${editUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: editUsername,
          email: editEmail,
          role: editRole,
          banned: editBanned,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setEditError(data?.error || "Failed"); return; }
      closeEdit();
      await loadUsers();
    } catch (err) { setEditError(String(err)); }
    finally { setEditBusy(false); }
  };

  const openBulkDelete = () => {
    setBulkConfirmText("");
    setBulkError(null);
    setShowBulkDelete(true);
  };

  const closeBulkDelete = () => {
    setShowBulkDelete(false);
    setBulkConfirmText("");
    setBulkError(null);
  };

  const confirmBulkDelete = async () => {
    if (bulkConfirmText !== "DELETE") {
      setBulkError("Type DELETE exactly to confirm");
      return;
    }
    setBulkBusy(true);
    setBulkError(null);
    try {
      const res = await fetch("/api/admin/users/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBulkError(data?.error || "Failed");
        return;
      }
      setSelected(new Set());
      closeBulkDelete();
      await loadUsers();
      setPage(1);
    } finally { setBulkBusy(false); }
  };

  const selectedCount = selected.size;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold text-red-500">Users List</h1>
        <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs text-zinc-400">
          Showing {pagedUsers.length} of {filtered.length} (Total: {users.length})
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
            onClick={openBulkDelete}
            className="flex items-center justify-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
          >
            <Trash2 className="h-4 w-4" /> Delete {selectedCount} selected
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-zinc-900 text-left text-xs font-semibold uppercase text-red-500">
            <tr>
              <th className="w-10 px-3 py-3">
                <input
                  type="checkbox"
                  checked={allSelectedOnPage}
                  onChange={toggleAllOnPage}
                  disabled={selectableOnPage.length === 0}
                  className="h-4 w-4 cursor-pointer accent-red-600 disabled:opacity-30"
                  title="Select all on this page"
                />
              </th>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Username</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Balance</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800 bg-zinc-950">
            {loading ? (
              <tr><td colSpan={9} className="px-4 py-6 text-center text-zinc-500"><span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading users...</span></td></tr>
            ) : pagedUsers.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-6 text-center text-zinc-500">
                {search ? "No users match your search." : "No users found."}
              </td></tr>
            ) : (
              pagedUsers.map((user, idx) => {
                const isBusy = busy === user.id;
                const isCrediting = creditFor === user.id;
                const isSelected = selected.has(user.id);
                const isAdmin = user.role === "ADMIN";
                return (
                  <>
                    <tr key={user.id} className={`hover:bg-zinc-900/50 ${isBusy ? "opacity-50" : ""} ${isSelected ? "bg-red-950/10" : ""}`}>
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={isAdmin}
                          onChange={() => toggleOne(user.id, user.role)}
                          className="h-4 w-4 cursor-pointer accent-red-600 disabled:opacity-30"
                          title={isAdmin ? "Admins cannot be deleted" : "Select"}
                        />
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-500">{user.id.slice(-6)}</td>
                      <td className="px-4 py-3 text-white">{user.username}</td>
                      <td className="px-4 py-3 text-zinc-400">{user.email}</td>
                      <td className="px-4 py-3">
                        <select
                          value={user.role}
                          disabled={isBusy}
                          onChange={(e) => changeRole(user.id, e.target.value)}
                          className={`rounded-full border-0 px-3 py-1 text-xs font-semibold cursor-pointer focus:outline-none focus:ring-1 focus:ring-red-500 disabled:opacity-50 ${
                            user.role === "ADMIN" ? "bg-red-950 text-red-500"
                            : user.role === "SELLER" ? "bg-yellow-950 text-yellow-500"
                            : "bg-zinc-800 text-zinc-400"
                          }`}
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r} className="bg-zinc-950 text-white">{r}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 font-semibold text-green-500">${user.balance.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        {user.banned ? (
                          <span className="rounded-full bg-red-950 px-2 py-0.5 text-[10px] font-semibold uppercase text-red-500">Banned</span>
                        ) : (
                          <span className="text-[10px] uppercase text-zinc-600">Active</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-zinc-500">{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(user)} disabled={isBusy} className="flex min-h-9 min-w-9 items-center justify-center rounded bg-zinc-800 p-1.5 hover:bg-zinc-700 disabled:opacity-50" title="Edit user">
                            <Pencil className="h-3.5 w-3.5 text-blue-400" />
                          </button>
                          <button onClick={() => (isCrediting ? closeCredit() : openCredit(user.id))} disabled={isBusy} className="flex min-h-9 min-w-9 items-center justify-center rounded bg-zinc-800 p-1.5 hover:bg-zinc-700 disabled:opacity-50" title="Credit or debit balance">
                            <DollarSign className="h-3.5 w-3.5 text-green-400" />
                          </button>
                          <button onClick={() => deleteUser(user.id, user.username)} disabled={isBusy || isAdmin} className="flex min-h-9 min-w-9 items-center justify-center rounded bg-zinc-800 p-1.5 hover:bg-zinc-700 disabled:opacity-30" title={isAdmin ? "Cannot delete admins" : "Delete user"}>
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isCrediting && (
                      <tr key={`${user.id}-credit`} className="bg-zinc-900/50">
                        <td colSpan={9} className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="text-xs text-zinc-400">Adjust for <strong className="text-white">{user.username}</strong>:</span>
                            <div className="flex overflow-hidden rounded-md border border-zinc-700">
                              <button onClick={() => setCreditMode("credit")} className={`px-3 py-1.5 text-xs font-semibold ${creditMode === "credit" ? "bg-green-600 text-white" : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"}`}>Credit</button>
                              <button onClick={() => setCreditMode("debit")} className={`px-3 py-1.5 text-xs font-semibold ${creditMode === "debit" ? "bg-red-600 text-white" : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"}`}>Debit</button>
                            </div>
                            <input type="number" min="0.01" step="0.01" value={creditAmount} onChange={(e) => setCreditAmount(e.target.value)} placeholder="Amount" autoFocus className="w-32 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm text-white focus:border-red-500 focus:outline-none" />
                            <button onClick={() => handleCredit(user.id)} disabled={creditBusy || !creditAmount} className={`rounded-md px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50 ${creditMode === "debit" ? "bg-red-600 hover:bg-red-500" : "bg-green-600 hover:bg-green-500"}`}>
                              {creditBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : creditMode === "debit" ? "Debit" : "Credit"}
                            </button>
                            <button onClick={closeCredit} disabled={creditBusy} className="rounded-md border border-zinc-700 bg-zinc-900 p-1.5 text-zinc-400 hover:bg-zinc-800">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-zinc-500">
            Page {currentPage} of {totalPages}
          </span>
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

      {/* Edit Modal */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={closeEdit}>
          <div className="w-full max-w-md rounded-lg border border-zinc-800 bg-zinc-900 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Edit User</h2>
                <p className="mt-1 text-xs text-zinc-500">{editUser.email}</p>
              </div>
              <button onClick={closeEdit} className="text-zinc-500 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-zinc-500">Username</label>
                <input type="text" value={editUsername} onChange={(e) => setEditUsername(e.target.value)} className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-zinc-500">Email</label>
                <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-zinc-500">Role</label>
                <select value={editRole} onChange={(e) => setEditRole(e.target.value)} className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none">
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-red-500" />
                  <div>
                    <p className="text-sm font-semibold text-white">Banned</p>
                    <p className="text-xs text-zinc-500">Banned users cannot log in.</p>
                  </div>
                </div>
                <button type="button" onClick={() => setEditBanned(!editBanned)} className={`relative h-6 w-11 flex-shrink-0 rounded-full transition ${editBanned ? "bg-red-600" : "bg-zinc-700"}`}>
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${editBanned ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
              </div>
              {editError && <div className="rounded-md border border-red-900 bg-red-950/50 p-3 text-sm text-red-400">{editError}</div>}
              <div className="flex gap-2 pt-2">
                <button onClick={saveEdit} disabled={editBusy} className="flex flex-1 items-center justify-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50">
                  {editBusy ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
                  ) : (
                    "Save Changes"
                  )}
                </button>
                <button onClick={closeEdit} className="rounded-md border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Modal */}
      {showBulkDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={closeBulkDelete}>
          <div className="w-full max-w-md rounded-lg border border-red-900/50 bg-zinc-900 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-6 w-6 flex-shrink-0 text-red-500" />
              <div>
                <h2 className="text-lg font-bold text-white">Delete {selectedCount} users?</h2>
                <p className="mt-2 text-sm text-zinc-400">
                  This will permanently delete the selected users <strong>and all related data</strong>:
                  orders, products, tickets, reports, and withdrawals.
                </p>
                <p className="mt-2 text-sm text-zinc-400">
                  This action <strong className="text-red-500">cannot be undone</strong>.
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-zinc-500">
                  Type <code className="text-red-500">DELETE</code> to confirm
                </label>
                <input
                  type="text"
                  value={bulkConfirmText}
                  onChange={(e) => setBulkConfirmText(e.target.value)}
                  placeholder="DELETE"
                  autoFocus
                  className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm text-white focus:border-red-500 focus:outline-none"
                />
              </div>
              {bulkError && <div className="rounded-md border border-red-900 bg-red-950/50 p-3 text-sm text-red-400">{bulkError}</div>}
              <div className="flex gap-2">
                <button
                  onClick={confirmBulkDelete}
                  disabled={bulkBusy || bulkConfirmText !== "DELETE"}
                  className="flex flex-1 items-center justify-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {bulkBusy ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Deleting…</>
                  ) : (
                    `Delete ${selectedCount} users`
                  )}
                </button>
                <button onClick={closeBulkDelete} disabled={bulkBusy} className="rounded-md border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
