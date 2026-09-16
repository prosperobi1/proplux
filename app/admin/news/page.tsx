"use client";
import { useState } from "react";
import { Plus } from "lucide-react";

export default function AdminNewsPage() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await fetch("/api/admin/news", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, message }),
    });
    setSaved(true);
    setTitle("");
    setMessage("");
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-red-500">Add News</h1>
      <form onSubmit={handleSubmit} className="max-w-2xl space-y-4 rounded-lg border border-zinc-800 bg-zinc-900/30 p-6">
        <div>
          <label className="mb-1 block text-sm font-semibold text-red-500">Title</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., New product category available" required className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-red-500 focus:outline-none" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-red-500">Message</label>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Write the announcement..." required rows={5} className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-red-500 focus:outline-none" />
        </div>
        <button type="submit" className="flex items-center gap-2 rounded-md bg-red-600 px-6 py-3 text-sm font-semibold text-white hover:bg-red-500">
          <Plus className="h-4 w-4" /> Publish News
        </button>
        {saved && <div className="rounded-lg border border-green-900/50 bg-green-950/20 p-3 text-sm text-green-500">News posted successfully!</div>}
      </form>
    </div>
  );
}
