"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowLeft, Send, Lock } from "lucide-react";

export default function AdminTicketView() {
  const params = useParams();
  const id = params.id;
  type TicketMessage = { id: string; content: string; isStaff: boolean; createdAt: string };
  type Ticket = {
    id: string;
    subject: string;
    status: string;
    createdAt: string;
    user: { username: string; email: string };
    messages: TicketMessage[];
  };
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const load = () => {
    fetch(`/api/admin/tickets/${id}`).then(r => r.json()).then(d => { setTicket(d.error ? null : d); setLoading(false); });
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
    await fetch(`/api/admin/tickets/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: reply }),
    });
    setReply("");
    setSending(false);
    load();
  };

  const closeTicket = async () => {
    await fetch(`/api/admin/tickets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CLOSED" }),
    });
    load();
  };

  if (loading) return <p className="flex items-center justify-center gap-2 p-8 text-zinc-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading ticket...</p>;
  if (!ticket) return <p className="p-8 text-zinc-500">Ticket not found.</p>;

  return (
    <div className="space-y-6">
      <Link href="/admin/tickets" className="flex items-center gap-2 text-sm text-red-500 hover:text-red-400">
        <ArrowLeft className="h-4 w-4" /> Back to Tickets
      </Link>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">{ticket.subject}</h1>
            <p className="mt-1 text-xs text-zinc-500">From {ticket.user.username} ({ticket.user.email}) on {new Date(ticket.createdAt).toLocaleString()}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${ticket.status === "OPEN" ? "bg-yellow-950 text-yellow-500" : "bg-green-950 text-green-500"}`}>{ticket.status}</span>
            {ticket.status === "OPEN" && (
              <button onClick={closeTicket} className="flex items-center gap-2 rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800">
                <Lock className="h-3.5 w-3.5" /> Close Ticket
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {ticket.messages.map(m => (
          <div key={m.id} className={`rounded-lg border p-4 ${m.isStaff ? "border-red-900/50 bg-red-950/10 mr-8" : "border-zinc-800 bg-zinc-900/30 ml-8"}`}>
            <div className="flex items-center justify-between text-xs">
              <span className={m.isStaff ? "font-semibold text-red-500" : "font-semibold text-zinc-300"}>{m.isStaff ? "Support Staff (You)" : ticket.user.username}</span>
              <span className="text-zinc-500">{new Date(m.createdAt).toLocaleString()}</span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-200">{m.content}</p>
          </div>
        ))}
      </div>

      {ticket.status === "OPEN" && (
        <form onSubmit={handleReply} className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
          <textarea value={reply} onChange={e => setReply(e.target.value)} placeholder="Type your reply as support staff..." rows={3} className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-red-500 focus:outline-none" required />
          <button type="submit" disabled={sending} className="flex items-center gap-2 rounded-md bg-red-600 px-6 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} {sending ? "Sending..." : "Send Reply"}
          </button>
        </form>
      )}
    </div>
  );
}
