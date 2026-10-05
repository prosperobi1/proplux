"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowLeft, CheckCircle2, XCircle, Send } from "lucide-react";

type Req = {
  id: string;
  status: string;
  message: string;
  reviewNote: string | null;
  createdAt: string;
  user: { username: string; email: string };
  messages: { id: string; content: string; isAdmin: boolean; createdAt: string; author: { username: string } }[];
};

export default function AdminSellerRequestDetail() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [req, setReq] = useState<Req | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [showReject, setShowReject] = useState(false);

  const load = () => {
    fetch("/api/admin/seller-requests/" + id)
      .then((r) => r.json())
      .then((d) => { if (!d.error) setReq(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const act = async (status: string) => {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/seller-requests/" + id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reviewNote: status === "REJECTED" ? rejectNote : undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data?.error || "Failed");
        return;
      }
      load();
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const sendReply = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/admin/seller-requests/" + id, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: reply }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        alert(d?.error || "Failed");
        return;
      }
      setReply("");
      load();
    } finally {
      setSending(false);
    }
  };

  if (loading) return (
   <div className="flex items-center justify-center gap-2 p-8 text-zinc-500">
     <Loader2 className="h-4 w-4 animate-spin" /> Loading...
   </div>
 );
  if (!req) return <div className="p-8 text-red-500">Not found.</div>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/admin/seller-requests" className="inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-white">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to requests
      </Link>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Seller Request</h1>
            <p className="mt-1 text-sm text-zinc-400">
              From <strong className="text-white">{req.user.username}</strong> ({req.user.email}) ·{" "}
              {new Date(req.createdAt).toLocaleString()}
            </p>
          </div>
          <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
            req.status === "APPROVED" ? "bg-green-950 text-green-500" :
            req.status === "REJECTED" ? "bg-zinc-800 text-zinc-400" :
            "bg-yellow-950 text-yellow-500"
          }`}>{req.status}</span>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
        <p className="mb-2 text-xs font-semibold uppercase text-zinc-500">Initial request</p>
        <p className="whitespace-pre-wrap text-sm text-zinc-300">{req.message}</p>
      </div>

      {req.reviewNote && (
        <div className="rounded-lg border border-red-900/50 bg-red-950/20 p-4 text-sm text-red-400">
          <strong>Review note:</strong> {req.reviewNote}
        </div>
      )}

      {req.messages.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase text-zinc-500">Thread</p>
          {req.messages.map((m) => (
            <div key={m.id} className={`rounded-lg border p-3 ${m.isAdmin ? "border-red-900/50 bg-red-950/20" : "border-zinc-800 bg-zinc-900/30"}`}>
              <p className="text-xs font-semibold text-zinc-500">{m.author.username} {m.isAdmin && <span className="text-red-500">· Admin</span>}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-300">{m.content}</p>
            </div>
          ))}
        </div>
      )}

      {req.status === "PENDING" && (
        <>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 space-y-3">
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              rows={3}
              placeholder="Ask the seller a question..."
              className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-red-500 focus:outline-none"
            />
            <button
              onClick={sendReply}
              disabled={sending || !reply.trim()}
              className="flex items-center gap-2 rounded-md bg-zinc-800 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-700 disabled:opacity-50"
            >
              {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />} {sending ? "Sending..." : "Send Reply"}
            </button>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 space-y-3">
            <p className="text-xs font-semibold uppercase text-zinc-500">Decision</p>
            {!showReject ? (
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={() => act("APPROVED")}
                  disabled={busy}
                  className="flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-50 w-full sm:w-auto"
                >
                  <CheckCircle2 className="h-4 w-4" /> Approve (make seller)
                </button>
                <button
                  onClick={() => setShowReject(true)}
                  disabled={busy}
                  className="flex items-center gap-2 rounded-md border border-red-700 bg-red-950/30 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-950/50 disabled:opacity-50 w-full sm:w-auto"
                >
                  <XCircle className="h-4 w-4" /> Reject
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <textarea
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  rows={2}
                  placeholder="Reason for rejection (optional)"
                  className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-red-500 focus:outline-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => act("REJECTED")}
                    disabled={busy}
                    className="rounded-md bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50"
                  >
                    Confirm Reject
                  </button>
                  <button
                    onClick={() => { setShowReject(false); setRejectNote(""); }}
                    className="rounded-md border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
