"use client";

import { useEffect, useState } from "react";
import { Loader2, Package, Trash2, Eye, X } from "lucide-react";

type Product = {
  id: string;
  country: string;
  tld: string;
  hosting: string;
  check: string;
  price: number;
  categorySlug: string | null;
  addedOn: string;
  seller: string;
  sold: boolean;
  deliveryType: string;
  fileUrl?: string | null;
  textContent?: string | null;
  metadata?: Record<string, unknown>;
};

type Category = { id: string; slug: string; name: string; fields?: string };

export default function AdminToolsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [viewing, setViewing] = useState<Product | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/products").then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
    ])
      .then(([p, c]) => {
        setProducts(Array.isArray(p) ? p : []);
        setCategories(Array.isArray(c) ? c : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const deleteProduct = async (p: Product) => {
    if (!confirm(`Delete listing …${p.id.slice(-6)} (seller: ${p.seller})? This cannot be undone.`)) return;
    try {
      const r = await fetch(`/api/seller/products/${p.id}`, { method: "DELETE" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        alert(d.error || "Could not delete this listing.");
        return;
      }
      setProducts((prev) => prev.filter((x) => x.id !== p.id));
    } catch {
      alert("Network error — could not delete this listing.");
    }
  };

  const q = search.trim().toLowerCase();

  const labelFor = (categorySlug: string | null, key: string) => {
    const cat = categories.find((c) => c.slug === categorySlug);
    if (!cat?.fields) return key;
    try {
      const defs = JSON.parse(cat.fields) as Array<{ name: string; label?: string }>;
      return defs.find((f) => f.name === key)?.label || key;
    } catch {
      return key;
    }
  };
  const filtered = products.filter((p) => {
    if (categoryFilter !== "ALL" && p.categorySlug !== categoryFilter) return false;
    if (!q) return true;
    // Matches a reported product ID (full or the last-6 code shown in listings)
    return (
      p.id.toLowerCase().includes(q) ||
      p.seller.toLowerCase().includes(q) ||
      p.country.toLowerCase().includes(q) ||
      p.tld.toLowerCase().includes(q) ||
      p.hosting.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-red-500">
          <Package className="h-6 w-6" /> Visualize Tools
        </h1>
        <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs text-zinc-400">
          Total: {filtered.length}
        </span>
      </div>

      <p className="text-sm text-zinc-400">
        Every product listed across every seller. Use category tabs to filter, search by the
        product ID shown on listings and in reports/tickets, or remove a bad listing with the
        delete action — listings with order history can&apos;t be deleted.
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setCategoryFilter("ALL")}
          className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
            categoryFilter === "ALL" ? "bg-red-600 text-white" : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
          }`}
        >
          ALL ({products.length})
        </button>
        {categories.map((c) => {
          const count = products.filter((p) => p.categorySlug === c.slug).length;
          return (
            <button
              key={c.id}
              onClick={() => setCategoryFilter(c.slug)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                categoryFilter === c.slug ? "bg-red-600 text-white" : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
              }`}
            >
              {c.name} ({count})
            </button>
          );
        })}
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by product ID, seller, country..."
        className="w-full max-w-sm rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-red-500 focus:outline-none"
      />

      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full min-w-[880px] text-sm">
          <thead className="bg-zinc-900 text-left text-xs font-semibold uppercase text-red-500">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Country</th>
              <th className="px-4 py-3">TLD</th>
              <th className="px-4 py-3">Hosting</th>
              <th className="px-4 py-3">Seller</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Check</th>
              <th className="px-4 py-3">Added</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800 bg-zinc-950">
            {loading ? (
              <tr><td colSpan={10} className="px-4 py-6 text-center text-zinc-500"><span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</span></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={10} className="px-4 py-6 text-center text-zinc-500">No products in this category.</td></tr>
            ) : (
              filtered.map((p) => (
                <tr key={p.id} className="hover:bg-zinc-900/50">
                  <td className="px-4 py-3 font-mono text-xs text-zinc-500" title={p.id}>{p.id.slice(-6)}</td>
                  <td className="px-4 py-3 text-zinc-300">{p.country}</td>
                  <td className="px-4 py-3 text-zinc-300">{p.tld || "—"}</td>
                  <td className="px-4 py-3 text-zinc-300">{p.hosting}</td>
                  <td className="px-4 py-3 text-zinc-400">{p.seller}</td>
                  <td className="px-4 py-3 font-semibold text-green-500">${p.price.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    {p.sold ? (
                      <span className="rounded-full bg-red-950 px-2 py-0.5 text-[10px] font-bold uppercase text-red-500">
                        SOLD
                      </span>
                    ) : (
                      <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold uppercase text-zinc-400">
                        {p.deliveryType || "credentials"}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-400">{p.check}</td>
                  <td className="px-4 py-3 text-xs text-zinc-500">
                    {new Date(p.addedOn).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => setViewing(p)}
                        title="View full listing (credentials & file)"
                        className="flex min-h-9 min-w-9 items-center justify-center rounded bg-zinc-800 p-1.5 hover:bg-zinc-700"
                      >
                        <Eye className="h-3.5 w-3.5 text-blue-400" />
                      </button>
                      <button
                        onClick={() => deleteProduct(p)}
                        disabled={p.sold}
                        title={p.sold ? "Can't delete — this listing has orders" : "Delete listing"}
                        className="flex min-h-9 min-w-9 items-center justify-center rounded bg-zinc-800 p-1.5 hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {viewing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setViewing(null)}
        >
          <div
            className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold text-white">
                  Listing <span className="font-mono">…{viewing.id.slice(-6)}</span>
                </h2>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {viewing.categorySlug || "—"} · seller {viewing.seller} · added{" "}
                  {new Date(viewing.addedOn).toLocaleDateString()}
                </p>
                <p className="mt-0.5 break-all font-mono text-[10px] text-zinc-600" title="Full product ID">
                  {viewing.id}
                </p>
              </div>
              <button onClick={() => setViewing(null)} title="Close" className="rounded p-1 hover:bg-zinc-800">
                <X className="h-4 w-4 text-zinc-400" />
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="rounded bg-zinc-800 px-2 py-1 text-zinc-300">${viewing.price.toFixed(2)}</span>
              <span className="rounded bg-zinc-800 px-2 py-1 text-zinc-300">{viewing.deliveryType || "credentials"}</span>
              <span className="rounded bg-zinc-800 px-2 py-1 text-zinc-300">Check: {viewing.check}</span>
            </div>

            {viewing.deliveryType === "file" && viewing.fileUrl && (
              <a
                href={viewing.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-block rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500"
              >
                Open listing file ↗
              </a>
            )}

            {viewing.deliveryType === "text" && (
              <div className="mt-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                  Text list delivery
                  {viewing.textContent
                    ? ` · ${viewing.textContent.trim().split("\n").length} line${
                        viewing.textContent.trim().split("\n").length === 1 ? "" : "s"
                      }`
                    : ""}
                </p>
                {viewing.textContent ? (
                  <pre className="mt-1 max-h-48 overflow-y-auto whitespace-pre-wrap break-words rounded border border-zinc-800 bg-zinc-950 p-2 font-mono text-xs text-zinc-200">
                    {viewing.textContent}
                  </pre>
                ) : (
                  <p className="mt-1 text-sm text-zinc-500">No text content set.</p>
                )}
              </div>
            )}

            <h3 className="mt-5 text-xs font-semibold uppercase tracking-wider text-red-500">
              Listing details (decrypted)
            </h3>
            {Object.keys(viewing.metadata || {}).length === 0 ? (
              <p className="mt-2 text-sm text-zinc-500">No metadata on this product.</p>
            ) : (
              <dl className="mt-2 space-y-2.5">
                {Object.entries(viewing.metadata || {}).map(([key, value]) => (
                  <div key={key}>
                    <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                      {labelFor(viewing.categorySlug, key)}
                    </dt>
                    <dd className="break-words font-mono text-xs text-zinc-200">{String(value)}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
