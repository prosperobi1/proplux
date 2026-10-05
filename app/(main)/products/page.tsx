"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { ProofModal } from "@/components/ProofModal";
import { SampleModal } from "@/components/SampleModal";
import { CheckResult } from "@/components/CheckResult";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ShoppingCart, Search, X, Loader2 } from "lucide-react";

type Product = {
  id: string;
  country: string;
  tld: string;
  hosting: string;
  check: string;
  price: number;
  seller: string;
  categorySlug?: string | null;
  addedOn?: string;
  metadata?: Record<string, unknown> | null;
};

type FieldDef = {
  name: string;
  label: string;
  type?: string;
  visible?: boolean;
  options?: string[];
};

function ProductsContent() {
  const searchParams = useSearchParams();
  const category = searchParams.get("category");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryName, setCategoryName] = useState("Marketplace");
  const [fields, setFields] = useState<FieldDef[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [proofUrls, setProofUrls] = useState<string[] | null>(null);
  const [sampleContent, setSampleContent] = useState<string | null>(null);
  const [ownedIds, setOwnedIds] = useState<string[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [smtpChecks, setSmtpChecks] = useState<
    Record<string, { email: string; status: "idle" | "loading" | "ok" | "fail"; message?: string }>
  >({});
  const [rdpChecks, setRdpChecks] = useState<
    Record<string, { status: "idle" | "loading" | "ok" | "fail"; message?: string }>
  >({});

  const [search, setSearch] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sellerFilter, setSellerFilter] = useState("ALL");

  useEffect(() => {
    if (category) {
      fetch("/api/categories")
        .then((r) => r.json())
        .then((cats) => {
          if (Array.isArray(cats)) {
            const match = cats.find((c) => c.slug === category);
            if (match) {
              setCategoryName(match.name);
              if (match.fields) {
                try {
                  const parsed = typeof match.fields === "string" ? JSON.parse(match.fields) : match.fields;
                  setFields(parsed.filter((f: FieldDef) => f.name !== "price"));
                } catch {}
              }
            }
          }
        });
    } else {
      setCategoryName("Marketplace");
      setFields([]);
    }

    setLoading(true);
    setSelectedIds([]);
    setSearch("");
    setMinPrice("");
    setMaxPrice("");
    setSellerFilter("ALL");

    const url = category ? "/api/products?category=" + category : "/api/products";
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        setProducts(Array.isArray(d) ? d : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [category]);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => { if (d && !d.error) setBalance(d.balance); })
      .catch(() => {});

    fetch("/api/orders")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) {
          const active = d
            .filter((o) => o.status === "Pending Confirmation" || o.status === "Completed")
            .map((o) => o.product?.id)
            .filter(Boolean);
          setOwnedIds(active);
        }
      })
      .catch(() => {});
  }, []);

  const sellers = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) if (p.seller) set.add(p.seller);
    return Array.from(set).sort();
  }, [products]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (sellerFilter !== "ALL" && p.seller !== sellerFilter) return false;

      const min = parseFloat(minPrice);
      if (Number.isFinite(min) && p.price < min) return false;
      const max = parseFloat(maxPrice);
      if (Number.isFinite(max) && p.price > max) return false;

      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const metaStr = p.metadata ? JSON.stringify(p.metadata).toLowerCase() : "";
        const haystack = [
          p.country, p.tld, p.hosting, p.seller, p.categorySlug,
          String(p.price), metaStr,
        ].filter(Boolean).join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [products, search, minPrice, maxPrice, sellerFilter]);

  const hasFilters = search || minPrice || maxPrice || sellerFilter !== "ALL";

  const toggle = (id: string) => {
    if (ownedIds.includes(id)) return;
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const setCheckEmail = (id: string, email: string) => {
    setSmtpChecks((prev) => ({ ...prev, [id]: { email, status: "idle" } }));
  };

  const runSmtpCheck = async (p: Product) => {
    const email = (smtpChecks[p.id]?.email || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setSmtpChecks((prev) => ({
        ...prev,
        [p.id]: { email, status: "fail", message: "Enter a valid email first." },
      }));
      return;
    }
    setSmtpChecks((prev) => ({ ...prev, [p.id]: { email, status: "loading" } }));
    try {
      const r = await fetch(`/api/products/${p.id}/check-smtp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const d = await r.json();
      setSmtpChecks((prev) => ({
        ...prev,
        [p.id]: {
          email,
          status: d.ok ? "ok" : "fail",
          message: d.message || (d.ok ? "Working" : "Check failed."),
        },
      }));
    } catch {
      setSmtpChecks((prev) => ({
        ...prev,
        [p.id]: { email, status: "fail", message: "Network error — try again." },
      }));
    }
  };

  const smtpCheckCell = (p: Product) => {
    // Only SMTP-type listings can send a test email; every row shows the
    // product ID (same last-6 code as the admin tools list) for tracing reports.
    const type = String(p.metadata?.type || "SMTP").toUpperCase();
    const canCheck = type === "SMTP";
    const s = smtpChecks[p.id];
    const loading = s?.status === "loading";
    return (
      <div className="flex min-w-[190px] flex-col gap-1">
        {canCheck && (
          <>
            <div className="flex gap-1">
              <input
                type="email"
                value={s?.email || ""}
                onChange={(e) => setCheckEmail(p.id, e.target.value)}
                placeholder="you@email.com"
                className="w-full min-w-0 rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-white placeholder-zinc-600 focus:border-red-500 focus:outline-none"
              />
              <button
                onClick={() => runSmtpCheck(p)}
                disabled={loading}
                className="flex min-h-9 shrink-0 items-center gap-1 rounded bg-red-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    ...
                  </>
                ) : (
                  "Check"
                )}
              </button>
            </div>
            {loading && <p className="text-[11px] text-zinc-500">Sending test email…</p>}
            <CheckResult status={s?.status} detail={s?.message} />
          </>
        )}
      </div>
    );
  };

  const runRdpCheck = async (p: Product) => {
    setRdpChecks((prev) => ({ ...prev, [p.id]: { status: "loading" } }));
    try {
      const r = await fetch(`/api/products/${p.id}/check-rdp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const d = await r.json();
      setRdpChecks((prev) => ({
        ...prev,
        [p.id]: {
          status: d.ok ? "ok" : "fail",
          message: d.message || (d.ok ? "Online" : "Check failed."),
        },
      }));
    } catch {
      setRdpChecks((prev) => ({
        ...prev,
        [p.id]: { status: "fail", message: "Network error — try again." },
      }));
    }
  };

  const rdpCheckCell = (p: Product) => {
    const s = rdpChecks[p.id];
    const loading = s?.status === "loading";
    return (
      <div className="flex min-w-[150px] flex-col gap-1">
        <button
          onClick={() => runRdpCheck(p)}
          disabled={loading}
          className="flex min-h-9 w-fit items-center gap-1 rounded bg-red-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-70"
        >
          {loading ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              ...
            </>
          ) : (
            "Check"
          )}
        </button>
        {loading && <p className="text-[11px] text-zinc-500">Pinging RDP server…</p>}
        <CheckResult status={s?.status} detail={s?.message} />
      </div>
    );
  };

  const selectedProducts = filtered.filter((p) => selectedIds.includes(p.id));
  const selectedTotal = selectedProducts.reduce((sum, p) => sum + p.price, 0);
  const canAfford = balance !== null && balance >= selectedTotal;
  const shortfall = balance !== null && !canAfford ? selectedTotal - balance : 0;
  const bulkHref = "/checkout/bulk?ids=" + selectedIds.join(",");

  const displayFields = fields.filter((f) => f.visible !== false);
  const isSmtpCategory = category === "smtps";
  const isRdpCategory = category === "rdp";
  const showTestCol = isSmtpCategory || isRdpCategory;
  const colCount =
    displayFields.length > 0
      ? displayFields.length + 5 + (showTestCol ? 1 : 0)
      : 10 + (showTestCol ? 1 : 0);

  const clearFilters = () => {
    setSearch("");
    setMinPrice("");
    setMaxPrice("");
    setSellerFilter("ALL");
  };

  return (
    <div className="space-y-6 pb-32">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-red-500">{categoryName}</h1>
        <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs text-zinc-400">
          {filtered.length} of {products.length} product{products.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 md:grid-cols-4">
        <div className="relative md:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search by ${displayFields.slice(0, 4).map((f) => f.label).join(", ")}${displayFields.length > 4 ? "..." : ""}`}
            className="w-full rounded-md border border-zinc-700 bg-zinc-950 pl-10 pr-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-red-500 focus:outline-none"
          />
        </div>
        <div className="flex gap-2">
          <input
            type="number"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            placeholder="Min $"
            className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-red-500 focus:outline-none"
          />
          <input
            type="number"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            placeholder="Max $"
            className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-red-500 focus:outline-none"
          />
        </div>
        <select
          value={sellerFilter}
          onChange={(e) => setSellerFilter(e.target.value)}
          className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none"
        >
          <option value="ALL">All Sellers</option>
          {sellers.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        {hasFilters && (
          <div className="md:col-span-4">
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 rounded-md bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-700"
            >
              <X className="h-3 w-3" /> Clear Filters
            </button>
          </div>
        )}
      </div>

      {isSmtpCategory && (
        <p className="text-xs text-zinc-500">
          Test before buying: enter your email and click{" "}
          <span className="font-semibold text-zinc-300">Check</span> — a working SMTP sends you a
          test email immediately. You can still buy either way.
        </p>
      )}

      {isRdpCategory && (
        <p className="text-xs text-zinc-500">
          Test before buying: click <span className="font-semibold text-zinc-300">Check</span> to
          confirm the server is online and speaking RDP. Login details aren&apos;t tested. You can
          still buy either way.
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full min-w-[800px] text-sm">
          <thead className="bg-zinc-900 text-left text-xs font-semibold uppercase text-red-500">
            <tr>
              {displayFields.length > 0 ? (
                <>
                  <th className="px-4 py-3">ID</th>
                  {displayFields.map((f) => (
                    <th key={f.name} className="px-4 py-3">{f.label}</th>
                  ))}
                  {showTestCol && (
                    <th className="px-4 py-3">{isSmtpCategory ? "SMTP Test" : "RDP Test"}</th>
                  )}
                  <th className="px-4 py-3">Seller</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Buy</th>
                  <th className="px-4 py-3">Bulk Purchase</th>
                </>
              ) : (
                <>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Country</th>
                  <th className="px-4 py-3">TLD</th>
                  <th className="px-4 py-3">Hosting</th>
                  {showTestCol && (
                    <th className="px-4 py-3">{isSmtpCategory ? "SMTP Test" : "RDP Test"}</th>
                  )}
                  <th className="px-4 py-3">Seller</th>
                  <th className="px-4 py-3">Check</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Added on</th>
                  <th className="px-4 py-3">Buy</th>
                  <th className="px-4 py-3">Bulk Purchase</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800 bg-zinc-950">
            {loading ? (
              <tr>
                <td colSpan={colCount} className="px-4 py-6 text-center text-zinc-500">
                  <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading products...</span>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={colCount} className="px-4 py-6 text-center text-zinc-500">
                  {products.length === 0 ? "No products available in this category yet." : "No products match your filters."}
                </td>
              </tr>
            ) : (
              filtered.map((p) => {
                const owned = ownedIds.includes(p.id);
                const checked = selectedIds.includes(p.id);
                return (
                  <tr key={p.id} className="hover:bg-zinc-900/50">
                    {displayFields.length > 0 ? (
                      <>
                        <td className="px-4 py-3 font-mono text-xs text-zinc-500" title={p.id}>{p.id.slice(-6)}</td>
                        {displayFields.map((f) => (
                          <td key={f.name} className="px-4 py-3 text-zinc-300">
                            {f.type === "image_urls" ? (
                              (() => {
                                const raw = String(p.metadata?.[f.name] || "");
                                const urls = raw.split("\n").map((u: string) => u.trim()).filter(Boolean);
                                return urls.length > 0 ? (
                                  <button
                                    onClick={() => setProofUrls(urls)}
                                    className="rounded bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-500"
                                  >
                                    View {urls.length}
                                  </button>
                                ) : (
                                  <span className="text-zinc-600">—</span>
                                );
                              })()
                            ) : f.type === "sample_text" ? (
                              (() => {
                                const raw = String(p.metadata?.[f.name] || "");
                                const lines = raw.split("\n").filter((l: string) => l.trim());
                                return lines.length > 0 ? (
                                  <button
                                    onClick={() => setSampleContent(raw)}
                                    className="rounded bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-500"
                                  >
                                    View Sample
                                  </button>
                                ) : (
                                  <span className="text-zinc-600">—</span>
                                );
                              })()
                            ) : (
                              String(p.metadata?.[f.name] ?? "") || "-"
                            )}
                          </td>
                        ))}
                        {showTestCol && (
                          <td className="px-4 py-3 align-top">
                            {isSmtpCategory ? smtpCheckCell(p) : rdpCheckCell(p)}
                          </td>
                        )}
                        <td className="px-4 py-3 text-zinc-400">{p.seller}</td>
                        <td className="px-4 py-3 font-semibold text-green-500">${p.price.toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <Link href={"/checkout/" + p.id} className="inline-flex min-h-9 items-center rounded-md bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-500">
                            Buy
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          {owned ? (
                            <span className="inline-block rounded bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold uppercase text-zinc-500">
                              Owned
                            </span>
                          ) : (
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggle(p.id)}
                              className="h-4 w-4 cursor-pointer accent-red-600"
                            />
                          )}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 font-mono text-xs text-zinc-500" title={p.id}>{p.id.slice(-6)}</td>
                        <td className="px-4 py-3 text-zinc-300">{p.country}</td>
                        <td className="px-4 py-3 text-zinc-300">{p.tld}</td>
                        <td className="px-4 py-3 text-zinc-300">{p.hosting}</td>
                        {showTestCol && (
                          <td className="px-4 py-3 align-top">
                            {isSmtpCategory ? smtpCheckCell(p) : rdpCheckCell(p)}
                          </td>
                        )}
                        <td className="px-4 py-3 text-zinc-300">{p.seller}</td>
                        <td className="px-4 py-3 text-zinc-300">{p.check}</td>
                        <td className="px-4 py-3 font-semibold text-green-500">${p.price.toFixed(2)}</td>
                        <td className="px-4 py-3 text-zinc-500">{p.addedOn ? new Date(p.addedOn).toLocaleDateString() : "—"}</td>
                        <td className="px-4 py-3">
                          <Link href={"/checkout/" + p.id} className="inline-flex min-h-9 items-center rounded-md bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-500">
                            Buy
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          {owned ? (
                            <span className="inline-block rounded bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold uppercase text-zinc-500">
                              Owned
                            </span>
                          ) : (
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggle(p.id)}
                              className="h-4 w-4 cursor-pointer accent-red-600"
                            />
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {selectedIds.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-zinc-800 bg-black/95 backdrop-blur md:left-64">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3 md:px-8">
            <div className="flex min-w-0 flex-wrap items-center gap-3 text-sm">
              <ShoppingCart className="h-4 w-4 text-red-500" />
              <span className="text-white">
                <span className="font-semibold">{selectedIds.length}</span>{" "}
                {selectedIds.length === 1 ? "item" : "items"} selected
              </span>
              <span className="text-zinc-500">·</span>
              <span className="font-semibold text-green-500">
                ${selectedTotal.toFixed(2)}
              </span>
              {!canAfford && (
                <span className="text-xs text-red-400">
                  · Insufficient balance — need ${shortfall.toFixed(2)} more
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setSelectedIds([])}
                className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-semibold text-white hover:bg-zinc-800"
              >
                Clear
              </button>
              {canAfford ? (
                <Link
                  href={bulkHref}
                  className="rounded-md bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500 w-full sm:w-auto"
                >
                  Buy {selectedIds.length} {selectedIds.length === 1 ? "item" : "items"} (${selectedTotal.toFixed(2)})
                </Link>
              ) : (
                <Link
                  href="/deposit"
                  className="rounded-md bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500 w-full sm:w-auto"
                >
                  Deposit Funds
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {proofUrls && (
        <ProofModal urls={proofUrls} onClose={() => setProofUrls(null)} />
      )}

      {sampleContent && (
        <SampleModal content={sampleContent} onClose={() => setSampleContent(null)} />
      )}
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<p className="flex items-center gap-2 text-zinc-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</p>}>
      <ProductsContent />
    </Suspense>
  );
}
