"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowLeft, Send } from "lucide-react";

export default function TicketViewPage() {
  const params = useParams();
  const id = params.id;
  type TicketMessage = { id: string; content: string; isStaff: boolean; createdAt: string };
  type Ticket = {
    id: string;
    subject: string;
    status: string;
    createdAt: string;
    user: { username: string };
    messages: TicketMessage[];
  };
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const load = () => {
    fetch(`/api/tickets/${id}`).then(r => r.json()).then(d => { setTicket(d.error ? null : d); setLoading(false); });
  };

  useEffect(() => {
    if (!id) return;
    load();
    // Opening the thread marks its messages as read for the bell
    fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId: id }),
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    await fetch(`/api/tickets/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: reply }),
    });
    setReply("");
    setSending(false);
    load();
  };

  if (loading) return <p className="flex items-center justify-center gap-2 p-8 text-zinc-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading ticket...</p>;
  if (!ticket) return <p className="p-8 text-zinc-500">Ticket not found.</p>;

  return (
    <div className="space-y-6">
      <Link href="/tickets" className="flex items-center gap-2 text-sm text-red-500 hover:text-red-400">
        <ArrowLeft className="h-4 w-4" /> Back to Tickets
      </Link>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-6">
        <div className="flex items-center justify-between">
          <h1 className="min-w-0 truncate text-xl font-bold text-white">{ticket.subject}</h1>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${ticket.status === "OPEN" ? "bg-yellow-950 text-yellow-500" : "bg-green-950 text-green-500"}`}>{ticket.status}</span>
        </div>
        <p className="mt-1 text-xs text-zinc-500">Created {new Date(ticket.createdAt).toLocaleString()}</p>
      </div>

      <div className="space-y-3">
        {ticket.messages.map(m => (
          <div key={m.id} className={`rounded-lg border p-4 ${m.isStaff ? "border-red-900/50 bg-red-950/10 ml-4 md:ml-8" : "border-zinc-800 bg-zinc-900/30 mr-4 md:mr-8"}`}>
            <div className="flex flex-wrap items-center justify-between text-xs">
              <span className={`min-w-0 truncate font-semibold ${m.isStaff ? "text-red-500" : "text-zinc-300"}`}>{m.isStaff ? "Support Staff" : ticket.user.username}</span>
              <span className="text-zinc-500">{new Date(m.createdAt).toLocaleString()}</span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-200">{m.content}</p>
          </div>
        ))}
      </div>

      <form onSubmit={handleReply} className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
        <textarea value={reply} onChange={e => setReply(e.target.value)} placeholder="Type your reply..." rows={3} className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-red-500 focus:outline-none" required />
        <button type="submit" disabled={sending} className="flex items-center gap-2 rounded-md bg-red-600 px-6 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} {sending ? "Sending..." : "Send Reply"}
        </button>
      </form>
    </div>
  );
}
