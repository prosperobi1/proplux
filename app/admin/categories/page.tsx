"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Pencil, Eye, EyeOff, Check, X, Package, GripVertical, Settings2 } from "lucide-react";

type Category = {
  id: string;
  name: string;
  slug: string;
  icon: string;
  visible: boolean;
  order: number;
  sellOnce: boolean;
  groupId?: string | null;
  group?: { id: string; name: string; order: number } | null;
};

type Group = { id: string; name: string; order: number; categoryCount: number };

const ICONS = [
  "Package", "Monitor", "Terminal", "Server", "Mail", "AtSign",
  "CreditCard", "Landmark", "Sparkles", "Users", "AlertTriangle",
  "BookOpen", "Shield", "Zap", "Globe", "Cloud", "Database",
  "Smartphone", "Key", "Lock", "Fingerprint", "Wallet", "Bitcoin",
];

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("Package");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editIcon, setEditIcon] = useState("Package");
  const [editOrder, setEditOrder] = useState(0);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupId, setGroupId] = useState("");
  const [editGroupId, setEditGroupId] = useState("");

  const load = () => {
    fetch("/api/admin/categories")
      .then((r) => r.json())
      .then((d) => {
        setCategories(Array.isArray(d) ? d : []);
        setLoading(false);
      });
    fetch("/api/admin/category-groups")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setGroups(d); })
      .catch(() => {});
  };

  useEffect(() => {
    load();
  }, []);

  const createCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, icon, groupId }),
    });
    setName("");
    setIcon("Package");
    setGroupId("");
    setSaving(false);
    load();
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditIcon(cat.icon);
    setEditOrder(cat.order);
    setEditGroupId(cat.groupId || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    await fetch(`/api/admin/categories/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, icon: editIcon, order: editOrder, groupId: editGroupId }),
    });
    setEditingId(null);
    load();
  };

  const toggleVisible = async (cat: Category) => {
    await fetch(`/api/admin/categories/${cat.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visible: !cat.visible }),
    });
    load();
  };

  const toggleSellOnce = async (cat: Category) => {
    await fetch(`/api/admin/categories/${cat.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sellOnce: !cat.sellOnce }),
    });
    load();
  };

  const deleteCategory = async (id: string, catName: string) => {
    if (!confirm(`Delete category "${catName}"? This cannot be undone.`)) return;
    await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-red-500">Manage Categories</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Add, edit, reorder, or hide product categories. Changes appear instantly on buyer and seller sidebars.
        </p>
      </div>

      {/* Add Form */}
      <form
        onSubmit={createCategory}
        className="flex flex-col gap-3 rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 md:flex-row"
      >
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Category name (e.g., VPNs)"
          className="flex-1 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-red-500 focus:outline-none"
        />
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center">
          <span className="text-xs font-semibold uppercase text-zinc-500">Icon:</span>
          <select
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white"
          >
            {ICONS.map((i) => (
              <option key={i} value={i}>{i}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center">
          <span className="text-xs font-semibold uppercase text-zinc-500">Group:</span>
          <select
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white"
          >
            <option value="">— None —</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center justify-center gap-2 rounded-md bg-red-600 px-6 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Add Category
        </button>
      </form>

      {/* Categories Table */}
      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 text-left text-xs font-semibold uppercase text-red-500">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Slug</th>
              <th className="px-3 py-2">Icon</th>
              <th className="px-3 py-2">Sell Once</th>
              <th className="px-3 py-2">Group</th>
              <th className="px-3 py-2">Order</th>
              <th className="px-3 py-2">Visible</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800 bg-zinc-950">
            {loading ? (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-zinc-500">
                  <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading categories...</span>
                </td>
              </tr>
            ) : categories.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-zinc-500">
                  No categories yet.
                </td>
              </tr>
            ) : (
              categories.map((c, i) => {
                const isEditing = editingId === c.id;
                return (
                  <tr key={c.id} className="hover:bg-zinc-900/50">
                    <td className="px-3 py-3 text-red-500">{i + 1}</td>
                    <td className="px-3 py-3 text-white">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-white"
                        />
                      ) : (
                        <span className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-red-500" /> {c.name}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-zinc-500">
                      {c.slug}
                    </td>
                    <td className="px-3 py-3 text-zinc-400">
                      {isEditing ? (
                        <select
                          value={editIcon}
                          onChange={(e) => setEditIcon(e.target.value)}
                          className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-white"
                        >
                          {ICONS.map((i) => (
                            <option key={i} value={i}>{i}</option>
                          ))}
                        </select>
                      ) : (
                        c.icon
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <button
                        onClick={() => toggleSellOnce(c)}
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                          c.sellOnce ? "bg-red-950 text-red-400" : "bg-zinc-800 text-zinc-500"
                        }`}
                        title={c.sellOnce ? "Sold once — hidden after purchase" : "Unlimited — can be sold many times"}
                      >
                        {c.sellOnce ? "Yes" : "No"}
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      {isEditing ? (
                        <select
                          value={editGroupId}
                          onChange={(e) => setEditGroupId(e.target.value)}
                          className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-white text-xs"
                        >
                          <option value="">— None —</option>
                          {groups.map((g) => (
                            <option key={g.id} value={g.id}>{g.name}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={c.group ? "rounded-full bg-red-950 px-2 py-0.5 text-[10px] font-semibold uppercase text-red-400" : "text-[10px] uppercase text-zinc-600"}>
                          {c.group?.name || "None"}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-zinc-400">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editOrder}
                          onChange={(e) => setEditOrder(Number(e.target.value))}
                          className="w-20 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-white"
                        />
                      ) : (
                        c.order
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <button
                        onClick={() => toggleVisible(c)}
                        className="rounded p-1 hover:bg-zinc-800"
                        title={c.visible ? "Visible - click to hide" : "Hidden - click to show"}
                      >
                        {c.visible ? (
                          <Eye className="h-4 w-4 text-green-500" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-zinc-500" />
                        )}
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        {isEditing ? (
                          <>
                            <button
                              onClick={saveEdit}
                              className="flex min-h-9 min-w-9 items-center justify-center rounded bg-green-900/50 p-1.5 hover:bg-green-900"
                              title="Save"
                            >
                              <Check className="h-3.5 w-3.5 text-green-400" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="flex min-h-9 min-w-9 items-center justify-center rounded bg-zinc-800 p-1.5 hover:bg-zinc-700"
                              title="Cancel"
                            >
                              <X className="h-3.5 w-3.5 text-zinc-400" />
                            </button>
                          </>
                        ) : (
                          <>
                            <a
                              href={`/admin/categories/${c.id}/fields`}
                              className="inline-flex min-h-9 min-w-9 items-center justify-center rounded bg-zinc-800 p-1.5 hover:bg-zinc-700"
                              title="Edit fields"
                            >
                              <Settings2 className="h-3.5 w-3.5 text-purple-400" />
                            </a>
                            <button
                              onClick={() => startEdit(c)}
                              className="flex min-h-9 min-w-9 items-center justify-center rounded bg-zinc-800 p-1.5 hover:bg-zinc-700"
                              title="Edit"
                            >
                              <Pencil className="h-3.5 w-3.5 text-blue-400" />
                            </button>
                            <button
                              onClick={() => deleteCategory(c.id, c.name)}
                              className="flex min-h-9 min-w-9 items-center justify-center rounded bg-zinc-800 p-1.5 hover:bg-zinc-700"
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-red-500" />
                            </button>
                          </>
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

      <div className="rounded-lg border border-blue-900/50 bg-blue-950/20 p-4 text-sm text-blue-400">
        <strong>Tip:</strong> Click the eye icon to hide a category from the shop without deleting it. Click the pencil to edit name, icon, or order.
      </div>
    </div>
  );
}