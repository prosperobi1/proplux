"use client";

import { useEffect, useState, Fragment } from "react";
import Link from "next/link";

import { Flag, X, Eye, EyeOff, Copy, Download, AlertCircle, Star } from "lucide-react";

type Order = {
  id: string;
  status: string;
  totalPrice: number;
  quantity: number;
  createdAt: string;
  reported: boolean;
  rating: number | null;
  product: {
    id: string;
    country: string;
    tld: string;
    hosting: string;
    price: number;
    seller: string;
    categorySlug: string | null;
    metadata: Record<string, any>;
  };
};

type Report = {
  id: string;
  reason: string;
  details: string | null;
  status: string;
  createdAt: string;
};

const REASONS = [
  "Not delivered",
  "Wrong item / not as described",
  "Poor quality",
  "Seller unresponsive",
  "Scam / fraud",
  "Other",
];

function metadataSummary(meta: Record<string, any>): string {
  if (!meta) return "—";
  const keys = ["country", "ip", "host", "email", "login", "user"];
  const parts: string[] = [];
  for (const k of keys) {
    if (meta[k]) parts.push(String(meta[k]));
    if (parts.length >= 3) break;
  }
  if (parts.length === 0) {
    const first = Object.values(meta).slice(0, 3).map(String);
    return first.join(" | ") || "—";
  }
  return parts.join(" | ");
}

function StarRow({
  value,
  onChange,
  size = 20,
}: {
  value: number;
  onChange: (v: number) => void;
  size?: number;
}) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="transition hover:scale-110"
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
        >
          <Star
            style={{ width: size, height: size }}
            className={n <= value ? "fill-yellow-500 text-yellow-500" : "text-zinc-600"}
          />
        </button>
      ))}
    </div>
  );
}


function DeliveryContent({ product }: { product: any }) {
  const [shown, setShown] = useState<Set<string>>(new Set());
  const type = product.deliveryType || "credentials";
  const meta = product.metadata || {};

  const isSecret = (k: string) => /pass|secret|token|key/i.test(k);

  const toggle = (k: string) =>
    setShown((prev) => {
      const n = new Set(prev);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const copy = (v: string) => navigator.clipboard.writeText(v);

  const downloadTxt = () => {
    const content = Object.entries(meta).map(([k, v]) => k + ": " + v).join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "order-" + product.id.slice(-6) + ".txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (type === "file") {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-6 text-center">
        <p className="text-sm text-zinc-400">Your file is ready to download:</p>
        {product.fileUrl ? (
          <a
            href={product.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-500"
          >
            <Download className="h-4 w-4" /> Download File
          </a>
        ) : (
          <p className="mt-3 text-sm text-red-500">No file attached to this order.</p>
        )}
      </div>
    );
  }

  if (type === "text") {
    const content = Object.values(meta).join("\n");
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase text-zinc-500">Content</p>
          <button
            onClick={downloadTxt}
            className="flex items-center gap-1.5 rounded bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-700"
          >
            <Download className="h-3.5 w-3.5" /> Download .txt
          </button>
        </div>
        <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded bg-zinc-950 p-3 text-xs text-zinc-300">{content}</pre>
      </div>
    );
  }

  const entries = Object.entries(meta);
  return (
    <div className="space-y-2">
      {entries.length === 0 ? (
        <p className="text-sm text-zinc-500">No details available.</p>
      ) : (
        entries.map(([key, value]) => {
          const str = String(value);
          const secret = isSecret(key);
          const visible = shown.has(key);
          return (
            <div key={key} className="flex items-center justify-between gap-3 border-b border-zinc-800 pb-2">
              <span className="text-sm capitalize text-zinc-400">{key.replace(/_/g, " ")}</span>
              <div className="flex items-center gap-1">
                <span className="max-w-md break-all text-right font-mono text-sm text-white">
                  {secret && !visible ? "\u2022".repeat(Math.min(str.length || 8, 12)) : str}
                </span>
                {secret && (
                  <button
                    onClick={() => toggle(key)}
                    className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-white"
                    title={visible ? "Hide" : "Show"}
                  >
                    {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                )}
                <button
                  onClick={() => copy(str)}
                  className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-white"
                  title="Copy"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

export default function MyOrdersPage() {
  const [tab, setTab] = useState<"orders" | "reports">("orders");
  const [orders, setOrders] = useState<Order[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [openOrder, setOpenOrder] = useState<Order | null>(null);
  const [reportWindowHours, setReportWindowHours] = useState(16);

  const [reportFor, setReportFor] = useState<string | null>(null);
  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [rateFor, setRateFor] = useState<string | null>(null);
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");
  const [ratingBusy, setRatingBusy] = useState(false);
  const [ratingError, setRatingError] = useState<string | null>(null);

  const load = () => {
    Promise.all([
      fetch("/api/orders").then((r) => r.json()),
      fetch("/api/reports").then((r) => r.json()),
      fetch("/api/settings/public").then((r) => r.json()),
    ])
      .then(([o, r, s]) => {
        setOrders(Array.isArray(o) ? o : []);
        setReports(Array.isArray(r) ? r : []);
        if (s && typeof s.reportWindowHours === "number") {
          setReportWindowHours(s.reportWindowHours);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const canReport = (status: string, createdAt: string) => {
    if (status !== "Pending Confirmation" && status !== "Completed") return false;
    const ageMs = Date.now() - new Date(createdAt).getTime();
    const windowMs = reportWindowHours * 60 * 60 * 1000;
    return ageMs <= windowMs;
  };

  const openReport = (orderId: string) => {
    setReportFor(orderId);
    setReason(REASONS[0]);
    setDetails("");
    setError(null);
  };

  const closeReport = () => {
    setReportFor(null);
    setDetails("");
    setError(null);
  };

  const submitReport = async (orderId: string) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, reason, details }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Failed to submit report");
        return;
      }
      closeReport();
      load();
    } catch (err) {
      setError(String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const openRate = (orderId: string) => {
    setRateFor(orderId);
    setStars(5);
    setComment("");
    setRatingError(null);
  };

  const closeRate = () => {
    setRateFor(null);
    setComment("");
    setRatingError(null);
  };

  const submitRating = async (orderId: string) => {
    setRatingBusy(true);
    setRatingError(null);
    try {
      const res = await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, stars, comment }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRatingError(data?.error || "Failed to submit rating");
        return;
      }
      closeRate();
      load();
    } catch (err) {
      setRatingError(String(err));
    } finally {
      setRatingBusy(false);
    }
  };

  const filteredOrders = filter === "ALL" ? orders : orders.filter((o) => o.status === filter);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-red-500">Your Orders</h1>

      <div className="flex items-start gap-3 rounded-lg border border-blue-900/50 bg-blue-950/20 p-4 text-sm text-blue-300">
        <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <p>
          You can only report a bad tool within <strong>{reportWindowHours} hours</strong> by
          clicking on <strong>Report #ID</strong>. Otherwise we can&apos;t give you a refund or
          replacement!
        </p>
      </div>

      <div className="flex gap-2 border-b border-zinc-800">
        <button
          onClick={() => setTab("orders")}
          className={`px-4 py-2 text-sm font-semibold ${
            tab === "orders" ? "border-b-2 border-red-500 text-white" : "text-zinc-500 hover:text-white"
          }`}
        >
          Orders ({orders.length})
        </button>
        <button
          onClick={() => setTab("reports")}
          className={`px-4 py-2 text-sm font-semibold ${
            tab === "reports" ? "border-b-2 border-red-500 text-white" : "text-zinc-500 hover:text-white"
          }`}
        >
          My Reports ({reports.length})
        </button>
      </div>

      {tab === "orders" && (
        <>
          <div className="flex flex-wrap gap-2">
            {["ALL", "Pending Confirmation", "Completed", "Cancelled", "Refunded"].map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                  filter === s ? "bg-red-600 text-white" : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto rounded-lg border border-zinc-800">
            <table className="w-full min-w-[1100px] text-sm">
              <thead className="bg-zinc-900 text-left text-xs font-semibold uppercase text-red-500">
                <tr>
                  <th className="px-3 py-3">ID</th>
                  <th className="px-3 py-3">Type</th>
                  <th className="px-3 py-3">Items</th>
                  <th className="px-3 py-3">Open</th>
                  <th className="px-3 py-3">Price</th>
                  <th className="px-3 py-3">Seller</th>
                  <th className="px-3 py-3">Report</th>
                  <th className="px-3 py-3">Rate Seller</th>
                  <th className="px-3 py-3">Date</th>
                  <th className="px-3 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 bg-zinc-950">
                {loading ? (
                  <tr><td colSpan={10} className="px-4 py-6 text-center text-zinc-500">Loading...</td></tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-6 text-center text-zinc-500">
                      No orders yet.{" "}
                      <Link href="/products" className="text-red-500 hover:underline">
                        Browse Marketplace
                      </Link>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((o) => {
                    const isOpen = reportFor === o.id;
                    const isRating = rateFor === o.id;
                    const reportable = canReport(o.status, o.createdAt);
                    return (
                      <Fragment key={o.id}>
                        <tr className="hover:bg-zinc-900/50">
                          <td className="px-3 py-3 font-mono text-xs text-zinc-500">
                            {o.id.slice(-6)}
                          </td>
                          <td className="px-3 py-3 text-zinc-300">
                            {o.product.categorySlug || o.product.hosting || "—"}
                          </td>
                          <td className="px-3 py-3 max-w-md truncate text-zinc-400">
                            {metadataSummary(o.product.metadata)}
                          </td>
                          <td className="px-3 py-3">
                            <button
                              onClick={() => setOpenOrder(o)}
                              className="flex items-center gap-1 rounded bg-zinc-800 px-2 py-1 text-xs font-semibold text-white hover:bg-zinc-700"
                            >
                              <Eye className="h-3 w-3" /> Open
                            </button>
                          </td>
                          <td className="px-3 py-3 font-semibold text-green-500">
                            ${o.totalPrice.toFixed(2)}
                          </td>
                          <td className="px-3 py-3 text-zinc-400">{o.product.seller}</td>
                          <td className="px-3 py-3">
                            {o.reported ? (
                              <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold uppercase text-yellow-500">
                                Reported
                              </span>
                            ) : reportable ? (
                              <button
                                onClick={() => (isOpen ? closeReport() : openReport(o.id))}
                                className="flex items-center gap-1 rounded bg-zinc-800 px-2 py-1 text-xs font-semibold text-red-400 hover:bg-zinc-700"
                              >
                                <Flag className="h-3 w-3" /> Report #{o.id.slice(-6)}
                              </button>
                            ) : (
                              <span
                                className="text-xs text-zinc-600"
                                title={`Report window of ${reportWindowHours}h has expired`}
                              >
                                Expired
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            {o.status !== "Completed" ? (
                              <span className="text-xs text-zinc-600">—</span>
                            ) : o.rating ? (
                              <span className="flex items-center gap-0.5 text-yellow-500" title={`You rated ${o.rating}/5`}>
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-3.5 w-3.5 ${i < o.rating! ? "fill-yellow-500 text-yellow-500" : "text-zinc-700"}`}
                                  />
                                ))}
                              </span>
                            ) : (
                              <button
                                onClick={() => (isRating ? closeRate() : openRate(o.id))}
                                className="flex items-center gap-1 rounded bg-zinc-800 px-2 py-1 text-xs font-semibold text-yellow-400 hover:bg-zinc-700"
                              >
                                <Star className="h-3 w-3" /> Rate
                              </button>
                            )}
                          </td>
                          <td className="px-3 py-3 text-xs text-zinc-500">
                            {new Date(o.createdAt).toLocaleString()}
                          </td>
                          <td className="px-3 py-3">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                              o.status === "Completed" ? "bg-green-950 text-green-500" :
                              o.status === "Cancelled" || o.status === "Refunded" ? "bg-zinc-800 text-zinc-400" :
                              "bg-yellow-950 text-yellow-500"
                            }`}>{o.status}</span>
                          </td>
                        </tr>

                        {isOpen && (
                          <tr key={`${o.id}-form`} className="bg-zinc-900/50">
                            <td colSpan={10} className="px-4 py-4">
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-semibold text-white">
                                    Report order #{o.id.slice(-6)}
                                  </p>
                                  <button onClick={closeReport} className="text-zinc-500 hover:text-white">
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                                <div>
                                  <label className="mb-1 block text-xs font-semibold uppercase text-zinc-500">Reason</label>
                                  <select
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none"
                                  >
                                    {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <label className="mb-1 block text-xs font-semibold uppercase text-zinc-500">Details (optional)</label>
                                  <textarea
                                    value={details}
                                    onChange={(e) => setDetails(e.target.value)}
                                    rows={3}
                                    placeholder="Describe what went wrong..."
                                    className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-red-500 focus:outline-none"
                                  />
                                </div>
                                {error && <p className="text-xs text-red-500">{error}</p>}
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => submitReport(o.id)}
                                    disabled={submitting}
                                    className="rounded-md bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50"
                                  >
                                    {submitting ? "Submitting..." : "Submit Report"}
                                  </button>
                                  <button
                                    onClick={closeReport}
                                    className="rounded-md border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}

                        {isRating && (
                          <tr key={`${o.id}-rate`} className="bg-zinc-900/50">
                            <td colSpan={10} className="px-4 py-4">
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-semibold text-white">
                                    Rate seller for order #{o.id.slice(-6)}
                                  </p>
                                  <button onClick={closeRate} className="text-zinc-500 hover:text-white">
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                                <div>
                                  <label className="mb-1 block text-xs font-semibold uppercase text-zinc-500">Your rating</label>
                                  <StarRow value={stars} onChange={setStars} />
                                </div>
                                <div>
                                  <label className="mb-1 block text-xs font-semibold uppercase text-zinc-500">Comment (optional)</label>
                                  <textarea
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    rows={2}
                                    placeholder="How was the seller?"
                                    className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-red-500 focus:outline-none"
                                  />
                                </div>
                                {ratingError && <p className="text-xs text-red-500">{ratingError}</p>}
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => submitRating(o.id)}
                                    disabled={ratingBusy}
                                    className="rounded-md bg-yellow-500 px-4 py-2 text-xs font-semibold text-black hover:bg-yellow-400 disabled:opacity-50"
                                  >
                                    {ratingBusy ? "Submitting..." : "Submit Rating"}
                                  </button>
                                  <button
                                    onClick={closeRate}
                                    className="rounded-md border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "reports" && (
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full min-w-[600px] text-sm">
            <thead className="bg-zinc-900 text-left text-xs font-semibold uppercase text-red-500">
              <tr>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Details</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 bg-zinc-950">
              {reports.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-zinc-500">No reports filed.</td></tr>
              ) : (
                reports.map((r) => (
                  <tr key={r.id} className="hover:bg-zinc-900/50">
                    <td className="px-4 py-3 text-white">{r.reason}</td>
                    <td className="px-4 py-3 max-w-md text-zinc-400">{r.details || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        r.status === "RESOLVED" ? "bg-green-950 text-green-500" :
                        r.status === "DISMISSED" ? "bg-zinc-800 text-zinc-400" :
                        r.status === "REVIEWED" ? "bg-blue-950 text-blue-400" :
                        "bg-yellow-950 text-yellow-500"
                      }`}>{r.status}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {openOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setOpenOrder(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-900 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">
                  Order #{openOrder.id.slice(-6)}
                </h2>
                <p className="mt-1 text-xs text-zinc-500">
                  {openOrder.product.categorySlug || openOrder.product.hosting} ·{" "}
                  {openOrder.product.seller} ·{" "}
                  {new Date(openOrder.createdAt).toLocaleString()}
                </p>
              </div>
              <button onClick={() => setOpenOrder(null)} className="text-zinc-500 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between border-b border-zinc-800 pb-2">
                <span className="text-sm text-zinc-400">Price</span>
                <span className="text-sm font-semibold text-green-500">
                  ${openOrder.totalPrice.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between border-b border-zinc-800 pb-2">
                <span className="text-sm text-zinc-400">Quantity</span>
                <span className="text-sm text-white">{openOrder.quantity}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-800 pb-2">
                <span className="text-sm text-zinc-400">Country</span>
                <span className="text-sm text-white">{openOrder.product.country}</span>
              </div>

              <div className="rounded-lg border border-zinc-800 bg-zinc-950/30 p-4">
                <p className="mb-3 text-xs font-semibold uppercase text-zinc-500">What you bought</p>
                <DeliveryContent product={openOrder.product} />
              </div>

              <div className="flex justify-between border-b border-zinc-800 pb-2">
                <span className="text-sm text-zinc-400">Detected Hosting</span>
                <span className="text-sm text-white">{openOrder.product.hosting}</span>
              </div>
              <div className="flex justify-between pb-2">
                <span className="text-sm text-zinc-400">Status</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  openOrder.status === "Completed" ? "bg-green-950 text-green-500" :
                  openOrder.status === "Cancelled" || openOrder.status === "Refunded" ? "bg-zinc-800 text-zinc-400" :
                  "bg-yellow-950 text-yellow-500"
                }`}>{openOrder.status}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
