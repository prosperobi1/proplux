"use client";

import { useEffect, useState } from "react";
import { Layers, Plus, Trash2, Pencil, Check, X, ChevronUp, ChevronDown } from "lucide-react";

type Group = {
  id: string;
  name: string;
  order: number;
  categoryCount: number;
};

export default function AdminCategoryGroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = () => {
    fetch("/api/admin/category-groups")
      .then((r) => r.json())
      .then((d) => { setGroups(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const name = newName.trim().toUpperCase();
    if (!name) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/category-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data?.error || "Failed"); return; }
      setNewName("");
      load();
    } finally { setCreating(false); }
  };

  const saveEdit = async (id: string) => {
    setBusy(id);
    try {
      const res = await fetch("/api/admin/category-groups/" + id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim().toUpperCase() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { alert(data?.error || "Failed"); return; }
      setEditingId(null);
      load();
    } finally { setBusy(null); }
  };

  const del = async (id: string, name: string, count: number) => {
    if (count > 0) {
      alert(`"${name}" has ${count} categories. Move or delete them first.`);
      return;
    }
    if (!confirm(`Delete group "${name}"?`)) return;
    setBusy(id);
    try {
      const res = await fetch("/api/admin/category-groups/" + id, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { alert(data?.error || "Failed"); return; }
      load();
    } finally { setBusy(null); }
  };

  const move = async (group: Group, direction: "up" | "down") => {
    const idx = groups.findIndex((g) => g.id === group.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= groups.length) return;
    const other = groups[swapIdx];
    setBusy(group.id);
    try {
      await Promise.all([
        fetch("/api/admin/category-groups/" + group.id, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: other.order }),
        }),
        fetch("/api/admin/category-groups/" + other.id, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: group.order }),
        }),
      ]);
      load();
    } finally { setBusy(null); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-red-500">
          <Layers className="h-6 w-6" /> Category Groups
        </h1>
        <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs text-zinc-400">
          {groups.length} group{groups.length !== 1 ? "s" : ""}
        </span>
      </div>

      <p className="text-sm text-zinc-400">
        Groups are the top level of your marketplace sidebar. Create groups like HOSTS, SEND, ACCOUNTS, then assign categories to them.
      </p>

      <form onSubmit={create} className="flex flex-col gap-3 rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 sm:flex-row sm:items-center">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New group name (e.g. HOSTS)"
          maxLength={40}
          className="flex-1 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-red-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={creating || !newName.trim()}
          className="flex items-center justify-center gap-2 rounded-md bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> {creating ? "Creating..." : "Create Group"}
        </button>
      </form>

      {error && (
        <div className="rounded-lg border border-red-900/50 bg-red-950/20 p-3 text-sm text-red-500">{error}</div>
      )}

      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full min-w-[500px] text-sm">
          <thead className="bg-zinc-900 text-left text-xs font-semibold uppercase text-red-500">
            <tr>
              <th className="px-4 py-3 w-16">Order</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Categories</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800 bg-zinc-950">
            {loading ? (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-zinc-500">Loading...</td></tr>
            ) : groups.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-zinc-500">No groups yet.</td></tr>
            ) : (
              groups.map((g, i) => (
                <tr key={g.id} className="hover:bg-zinc-900/50">
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <button
                        onClick={() => move(g, "up")}
                        disabled={i === 0 || busy === g.id}
                        className="flex min-h-9 min-w-9 items-center justify-center text-zinc-500 hover:text-white disabled:opacity-20"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => move(g, "down")}
                        disabled={i === groups.length - 1 || busy === g.id}
                        className="flex min-h-9 min-w-9 items-center justify-center text-zinc-500 hover:text-white disabled:opacity-20"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {editingId === g.id ? (
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        autoFocus
                        className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm text-white focus:border-red-500 focus:outline-none"
                      />
                    ) : (
                      <span className="font-semibold text-white">{g.name}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{g.categoryCount}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-1">
                      {editingId === g.id ? (
                        <>
                          <button onClick={() => saveEdit(g.id)} disabled={busy === g.id} className="flex min-h-9 min-w-9 items-center justify-center rounded bg-green-600 p-1.5 text-white hover:bg-green-500 disabled:opacity-50">
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => setEditingId(null)} className="flex min-h-9 min-w-9 items-center justify-center rounded bg-zinc-800 p-1.5 text-white hover:bg-zinc-700">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => { setEditingId(g.id); setEditName(g.name); }}
                            className="flex min-h-9 min-w-9 items-center justify-center rounded bg-zinc-800 p-1.5 hover:bg-zinc-700"
                            title="Rename"
                          >
                            <Pencil className="h-3.5 w-3.5 text-blue-400" />
                          </button>
                          <button
                            onClick={() => del(g.id, g.name, g.categoryCount)}
                            disabled={busy === g.id || g.categoryCount > 0}
                            className="flex min-h-9 min-w-9 items-center justify-center rounded bg-zinc-800 p-1.5 hover:bg-zinc-700 disabled:opacity-30"
                            title={g.categoryCount > 0 ? "Move categories out first" : "Delete"}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          </button>
                        </>
                      )}
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
