"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, AlertTriangle, XCircle } from "lucide-react";

type Request = {
  id: string;
  status: string;
  message: string;
  reviewNote: string | null;
  createdAt: string;
  messages: { id: string; content: string; isAdmin: boolean; createdAt: string; author: { username: string } }[];
};

export default function BecomeSellerPage() {
  const router = useRouter();
  const [request, setRequest] = useState<Request | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [replying, setReplying] = useState(false);

  const load = () => {
    fetch("/api/seller-request")
      .then((r) => r.json())
      .then((d) => {
        setRequest(d && !d.error ? d : null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/seller-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, agree }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Failed to submit request");
        return;
      }
      setMessage("");
      setAgree(false);
      load();
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  const sendReply = async () => {
    if (!request || !reply.trim()) return;
    setReplying(true);
    try {
      await fetch("/api/seller-request/" + request.id, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: reply }),
      });
      setReply("");
      load();
    } finally {
      setReplying(false);
    }
  };

  if (loading) return <div className="p-8 text-zinc-500">Loading...</div>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-red-500">Become a Seller</h1>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-6 space-y-4">
        <p className="text-white">Interested in becoming a seller at Proplux?</p>
        <p className="text-sm text-zinc-400">So read the below explanation and rules carefully.</p>

        <div>
          <h2 className="mb-2 font-semibold text-red-500">Your Features</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-300">
            <li>You get <strong>65%</strong> of your sales</li>
            <li><strong>Withdraw to your crypto wallet any time</strong> — no delays</li>
            <li>You get paid with the fastest</li>
            <li>You can sell any tool you like with no limit and choose your price!</li>
            <li>You will have your own Panel with tons of options</li>
          </ul>
        </div>

        <div>
          <h2 className="mb-2 font-semibold text-red-500">Our Rules</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-300">
            <li>All the tools have to be Fresh and not used or sold before.</li>
            <li>Don&apos;t try XSS / SQL Injection / add (minus) price and buy it — it will not work.</li>
            <li>Do not put links of other stores (e-mails) or any ads.</li>
            <li>Don&apos;t try to contact with buyer, and if this happens, you will be banned automatically.</li>
          </ul>
        </div>

        <div>
          <h2 className="mb-2 font-semibold text-red-500">When submitting</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-300">
            <li>Submit with a title of <strong>seller request</strong>.</li>
            <li>Make sure to mention what tools you have and include a mass example for each.</li>
            <li>Make sure all of your tools work before sending them to us.</li>
            <li>We&apos;ll reply as soon as we review your request.</li>
          </ul>
        </div>
      </div>

      {request ? (
        <div className="space-y-4">
          <div className={`flex items-start gap-3 rounded-lg border p-4 ${
            request.status === "APPROVED" ? "border-green-900/50 bg-green-950/20 text-green-400" :
            request.status === "REJECTED" ? "border-red-900/50 bg-red-950/20 text-red-400" :
            "border-yellow-900/50 bg-yellow-950/20 text-yellow-400"
          }`}>
            {request.status === "APPROVED" ? <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" /> :
             request.status === "REJECTED" ? <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0" /> :
             <Clock className="mt-0.5 h-4 w-4 flex-shrink-0" />}
            <div>
              <p className="text-sm font-semibold">
                {request.status === "APPROVED" ? "Request approved" :
                 request.status === "REJECTED" ? "Request rejected" :
                 "Request pending review"}
              </p>
              {request.reviewNote && (
                <p className="mt-1 text-xs opacity-80">Reason: {request.reviewNote}</p>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
            <p className="mb-2 text-xs font-semibold uppercase text-zinc-500">Your request</p>
            <p className="whitespace-pre-wrap break-words text-sm text-zinc-300">{request.message}</p>
          </div>

          {request.messages.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase text-zinc-500">Conversation</p>
              {request.messages.map((m) => (
                <div key={m.id} className={`rounded-lg border p-3 ${m.isAdmin ? "border-red-900/50 bg-red-950/20" : "border-zinc-800 bg-zinc-900/30"}`}>
                  <p className="text-xs font-semibold text-zinc-500">
                    {m.author.username} {m.isAdmin && <span className="text-red-500">· Admin</span>}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm text-zinc-300">{m.content}</p>
                </div>
              ))}
            </div>
          )}

          {request.status === "PENDING" && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 space-y-3">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={3}
                placeholder="Add more details or reply to admin..."
                className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-red-500 focus:outline-none"
              />
              <button
                onClick={sendReply}
                disabled={replying || !reply.trim()}
                className="min-h-9 rounded-md bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50"
              >
                {replying ? "Sending..." : "Send Reply"}
              </button>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={submit} className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-6 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-zinc-500">Seller Request Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              required
              placeholder="Mention what tools you have and include a sample for each..."
              className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-red-500 focus:outline-none"
            />
          </div>

          <label className="flex items-start gap-2 text-sm text-zinc-400">
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-red-600"
            />
            <span>I have read and agree to all the rules above.</span>
          </label>

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-red-900 bg-red-950/50 p-3 text-sm text-red-400">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" /> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !agree}
            className="rounded-md py-3 px-6 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "var(--brand-color, #dc2626)" }}
          >
            {submitting ? "Submitting..." : "Submit Seller Request"}
          </button>
        </form>
      )}

      <div className="text-center">
        <Link href="/dashboard" className="text-xs text-zinc-500 hover:text-white">← Back to Dashboard</Link>
      </div>
    </div>
  );
}
