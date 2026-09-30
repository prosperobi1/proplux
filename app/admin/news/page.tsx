"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Pencil, X } from "lucide-react";

type NewsItem = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
};

export default function AdminNewsPage() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editMessage, setEditMessage] = useState("");
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const load = () => {
    fetch("/api/admin/news")
      .then((r) => r.json())
      .then((d) => {
        setNews(Array.isArray(d) ? d : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Failed to publish");
        return;
      }
      setSaved(true);
      setTitle("");
      setMessage("");
      load();
      setTimeout(() => setSaved(false), 3000);
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this news item?")) return;
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/news/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data?.error || "Delete failed");
        return;
      }
      load();
    } finally { setBusy(null); }
  };

  const openEdit = (n: NewsItem) => {
    setEditId(n.id);
    setEditTitle(n.title);
    setEditMessage(n.message);
    setEditError(null);
  };

  const closeEdit = () => {
    setEditId(null);
    setEditError(null);
  };

  const saveEdit = async () => {
    if (!editId) return;
    setEditBusy(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/admin/news/${editId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle, message: editMessage }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEditError(data?.error || "Save failed");
        return;
      }
      closeEdit();
      load();
    } finally { setEditBusy(false); }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-red-500">Add News</h1>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-4 rounded-lg border border-zinc-800 bg-zinc-900/30 p-6">
        <div>
          <label className="mb-1 block text-sm font-semibold text-red-500">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., New product category available"
            required
            className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-red-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-red-500">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write the announcement..."
            required
            rows={5}
            className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-red-500 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="flex items-center gap-2 rounded-md bg-red-600 px-6 py-3 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> {submitting ? "Publishing..." : "Publish News"}
        </button>
        {saved && (
          <div className="rounded-lg border border-green-900/50 bg-green-950/20 p-3 text-sm text-green-500">
            News posted successfully!
          </div>
        )}
        {error && (
          <div className="rounded-lg border border-red-900/50 bg-red-950/20 p-3 text-sm text-red-500">
            {error}
          </div>
        )}
      </form>

      <div className="max-w-2xl">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">
          Published News ({news.length})
        </h2>
        <div className="space-y-3">
          {loading ? (
            <p className="text-sm text-zinc-500">Loading...</p>
          ) : news.length === 0 ? (
            <p className="text-sm text-zinc-500">No news yet.</p>
          ) : (
            news.map((n) => {
              const editing = editId === n.id;
              return (
                <div key={n.id} className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
                  {editing ? (
                    <div className="space-y-3">
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase text-zinc-500">Title</label>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase text-zinc-500">Message</label>
                        <textarea
                          value={editMessage}
                          onChange={(e) => setEditMessage(e.target.value)}
                          rows={4}
                          className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none"
                        />
                      </div>
                      {editError && (
                        <div className="rounded-md border border-red-900 bg-red-950/50 p-2 text-xs text-red-400">
                          {editError}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={saveEdit}
                          disabled={editBusy}
                          className="rounded-md bg-green-600 px-4 py-2 text-xs font-semibold text-white hover:bg-green-500 disabled:opacity-50"
                        >
                          {editBusy ? "Saving..." : "Save Changes"}
                        </button>
                        <button
                          onClick={closeEdit}
                          disabled={editBusy}
                          className="flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800"
                        >
                          <X className="h-3 w-3" /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-white">{n.title}</h3>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-400">{n.message}</p>
                        <p className="mt-2 text-xs text-zinc-600">
                          {new Date(n.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => openEdit(n)}
                          className="rounded bg-zinc-800 p-1.5 hover:bg-zinc-700"
                          title="Edit news"
                        >
                          <Pencil className="h-3.5 w-3.5 text-blue-400" />
                        </button>
                        <button
                          onClick={() => handleDelete(n.id)}
                          disabled={busy === n.id}
                          className="rounded bg-zinc-800 p-1.5 hover:bg-zinc-700 disabled:opacity-50"
                          title="Delete news"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
