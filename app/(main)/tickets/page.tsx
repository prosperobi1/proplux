"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, MessageSquare } from "lucide-react";

export default function TicketsPage() {
  type Ticket = {
    id: string;
    subject: string;
    status: string;
    _count: { messages: number };
  };
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const load = () => {
    fetch("/api/tickets").then(r => r.json()).then(d => { setTickets(Array.isArray(d) ? d : []); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, message }),
    });
    setSubject(""); setMessage(""); setShowForm(false);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-red-500">Support Tickets</h1>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500">
          <Plus className="h-4 w-4" /> New Ticket
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-900/30 p-6">
          <input type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject" required className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-red-500 focus:outline-none" />
          <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Describe your issue..." required rows={4} className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-red-500 focus:outline-none" />
          <button type="submit" className="rounded-md bg-red-600 px-6 py-2 text-sm font-semibold text-white hover:bg-red-500">Submit Ticket</button>
        </form>
      )}

      <div className="space-y-3">
        {loading ? (
          <p className="flex items-center justify-center gap-2 text-center text-sm text-zinc-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</p>
        ) : tickets.length === 0 ? (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-8 text-center text-sm text-zinc-500">No tickets yet. Click &quot;New Ticket&quot; to open one.</div>
        ) : tickets.map(t => (
          <Link key={t.id} href={`/tickets/${t.id}`} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 hover:border-red-900/50">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-red-500" />
              <div>
                <p className="font-semibold text-white">{t.subject}</p>
                <p className="font-mono text-xs text-zinc-500">#{t.id.slice(-6)}</p>
                <p className="text-xs text-zinc-500">{t._count.messages} message{t._count.messages !== 1 ? "s" : ""}</p>
              </div>
            </div>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${t.status === "OPEN" ? "bg-yellow-950 text-yellow-500" : "bg-green-950 text-green-500"}`}>{t.status}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
