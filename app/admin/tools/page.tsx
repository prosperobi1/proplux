"use client";

import { useEffect, useState } from "react";
import { Loader2, Package, Trash2, Eye, X, Pencil, KeyRound, FileText, Check } from "lucide-react";
import { minVisible } from "@/lib/ui";
import { isValidFileUrl, MAX_TEXT_CONTENT } from "@/lib/delivery";
import { LocalUpload } from "../../components/LocalUpload";

type FieldDef = {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  options?: string[];
  placeholder?: string;
  visible?: boolean;
};

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
  soldAt?: string | null;
  buyer?: string | null;
  orderCount?: number;
  deliveryType: string;
  fileUrl?: string | null;
  textContent?: string | null;
  metadata?: Record<string, unknown>;
};

type Category = { id: string; slug: string; name: string; fields?: string };

type EditForm = {
  price: string;
  deliveryType: "credentials" | "text" | "file";
  fileUrl: string;
  textContent: string;
  meta: Record<string, string>;
};

export default function AdminToolsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [viewing, setViewing] = useState<Product | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [edit, setEdit] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [editErr, setEditErr] = useState("");

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
    const vis = minVisible();
    setDeletingId(p.id);
    try {
      const r = await fetch(`/api/seller/products/${p.id}`, { method: "DELETE" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        await vis();
        alert(d.error || "Could not delete this listing.");
        return;
      }
      await vis();
      setProducts((prev) => prev.filter((x) => x.id !== p.id));
      if (viewing?.id === p.id) setViewing(null);
    } catch {
      await vis();
      alert("Network error — could not delete this listing.");
    } finally {
      setDeletingId(null);
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
  const fieldDefsFor = (slug: string | null): FieldDef[] => {
    const cat = categories.find((c) => c.slug === slug);
    if (!cat?.fields) return [];
    try {
      return JSON.parse(cat.fields) as FieldDef[];
    } catch {
      return [];
    }
  };

  const startEdit = () => {
    if (!viewing) return;
    const meta: Record<string, string> = {};
    fieldDefsFor(viewing.categorySlug).forEach((f) => {
      if (f.name === "price") return; // product price has its own input; never metadata
      const v = viewing.metadata?.[f.name];
      meta[f.name] =
        v !== undefined && v !== null
          ? String(v)
          : f.type === "select" && f.options
            ? f.options[0]
            : "";
    });
    setEdit({
      price: String(viewing.price),
      deliveryType: (viewing.deliveryType as EditForm["deliveryType"]) || "credentials",
      fileUrl: viewing.fileUrl || "",
      textContent: viewing.textContent || "",
      meta,
    });
    setEditErr("");
  };

  const saveEdit = async () => {
    if (!viewing || !edit) return;
    const price = Number(edit.price);
    if (!Number.isFinite(price) || price <= 0) {
      setEditErr("Enter a valid price.");
      return;
    }
    if (edit.deliveryType === "file" && !isValidFileUrl(edit.fileUrl)) {
      setEditErr("Delivery link must be an http(s) URL or an uploaded file path.");
      return;
    }
    if (edit.deliveryType === "text" && !edit.textContent.trim()) {
      setEditErr("Text delivery needs content — paste the list.");
      return;
    }
    if (edit.textContent.length > MAX_TEXT_CONTENT) {
      setEditErr(`Content too large (max ${MAX_TEXT_CONTENT} characters).`);
      return;
    }
    const vis = minVisible();
    setSaving(true);
    setEditErr("");
    try {
      const res = await fetch(`/api/seller/products/${viewing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          price,
          deliveryType: edit.deliveryType,
          fileUrl: edit.fileUrl,
          textContent: edit.textContent,
          metadata: edit.meta,
        }),
      });
      const data = await res.json().catch(() => ({}));
      await vis();
      setSaving(false);
      if (!res.ok) {
        setEditErr(data.error || "Failed to save changes.");
        return;
      }
      // PATCH returns the row with ENCRYPTED metadata — keep the plaintext we
      // hold instead, then refresh from the API for full server truth.
      const updated: Product = {
        ...viewing,
        price,
        country: String(edit.meta.country ?? edit.meta.location ?? viewing.country),
        deliveryType: edit.deliveryType,
        fileUrl: edit.fileUrl || null,
        textContent: edit.textContent || null,
        metadata: { ...viewing.metadata, ...edit.meta },
      };
      setProducts((prev) => prev.map((x) => (x.id === updated.id ? { ...x, ...updated } : x)));
      setViewing(updated);
      setEdit(null);
      fetch("/api/admin/products")
        .then((r) => r.json())
        .then((p) => Array.isArray(p) && setProducts(p))
        .catch(() => {});
    } catch {
      await vis();
      setSaving(false);
      setEditErr("Network error — try again.");
    }
  };

  const filtered = products.filter((p) => {
    if (categoryFilter !== "ALL" && p.categorySlug !== categoryFilter) return false;
    if (!q) return true;
    // Matches a reported product ID (full or the last-6 code shown in listings),
    // seller/country text, a pasted delivery URL, delivery content, or price
    return (
      p.id.toLowerCase().includes(q) ||
      p.seller.toLowerCase().includes(q) ||
      p.country.toLowerCase().includes(q) ||
      p.tld.toLowerCase().includes(q) ||
      p.hosting.toLowerCase().includes(q) ||
      (p.fileUrl || "").toLowerCase().includes(q) ||
      (p.textContent || "").toLowerCase().includes(q) ||
      p.price.toFixed(2).includes(q) ||
      String(p.price).includes(q)
    );
  });

  const inputCls =
    "w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-red-500 focus:outline-none";

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
          // Hide empty categories to keep the tab row scannable (except the active one)
          if (count === 0 && categoryFilter !== c.slug) return null;
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
        placeholder="Search by product ID, seller, country, file URL, content, price..."
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
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold uppercase text-zinc-400">
                        {p.deliveryType || "credentials"}
                      </span>
                      {p.sold && (
                        <span
                          title={p.soldAt ? `Sold ${new Date(p.soldAt).toLocaleString()}` : "Sold"}
                          className="cursor-help rounded-full bg-red-950 px-2 py-0.5 text-[10px] font-bold uppercase text-red-500"
                        >
                          SOLD
                        </span>
                      )}
                    </div>
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
                        disabled={p.sold || deletingId === p.id}
                        title={p.sold ? "Can't delete — this listing has orders" : "Delete listing"}
                        className="flex min-h-9 min-w-9 items-center justify-center rounded bg-zinc-800 p-1.5 hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {deletingId === p.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-red-500" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        )}
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
            className={`max-h-[80vh] w-full ${edit ? "max-w-2xl" : "max-w-lg"} overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900 p-5`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold text-white">
                  {edit ? "Editing" : "Listing"} <span className="font-mono">…{viewing.id.slice(-6)}</span>
                </h2>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {viewing.categorySlug || "—"} · seller {viewing.seller} · added{" "}
                  {new Date(viewing.addedOn).toLocaleDateString()}
                </p>
                <p className="mt-0.5 break-all font-mono text-[10px] text-zinc-600" title="Full product ID">
                  {viewing.id}
                </p>
              </div>
              <button onClick={() => { setViewing(null); setEdit(null); setEditErr(""); }} title="Close" className="rounded p-1 hover:bg-zinc-800">
                <X className="h-4 w-4 text-zinc-400" />
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="rounded bg-zinc-800 px-2 py-1 text-zinc-300">${viewing.price.toFixed(2)}</span>
              <span className="rounded bg-zinc-800 px-2 py-1 text-zinc-300">{viewing.deliveryType || "credentials"}</span>
              <span className="rounded bg-zinc-800 px-2 py-1 text-zinc-300">Check: {viewing.check}</span>
            </div>

            {viewing.sold && viewing.buyer && (
              <p className="mt-2 text-xs text-zinc-400">
                Sold to <span className="font-mono text-zinc-200">{viewing.buyer}</span>
                {viewing.soldAt && <> · {new Date(viewing.soldAt).toLocaleString()}</>}
                {(viewing.orderCount || 0) > 1 && <> · {viewing.orderCount} orders</>}
              </p>
            )}

            {!edit && (
              <>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={startEdit}
                className="inline-flex items-center gap-1.5 rounded bg-zinc-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-600"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit listing
              </button>
              {viewing.deliveryType === "file" && viewing.fileUrl && (
                <a
                  href={viewing.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500"
                >
                  Open listing file ↗
                </a>
              )}
            </div>

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
                    <dd className="break-words font-mono text-xs text-zinc-200">
                      {/^https?:\/\/\S+$/i.test(String(value)) ? (
                        <a
                          href={String(value)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-400 underline decoration-zinc-600 underline-offset-2 hover:text-blue-300"
                        >
                          {String(value)}
                        </a>
                      ) : (
                        String(value)
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
              </>
            )}

            {edit && (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  {([
                    ["credentials", "Credentials", KeyRound],
                    ["text", "Text List", FileText],
                    ["file", "File / Link", Package],
                  ] as const).map(([val, lbl, Icon]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setEdit({ ...edit, deliveryType: val })}
                      className={`rounded-lg border p-3 text-left transition ${
                        edit.deliveryType === val
                          ? "border-red-500 bg-red-950/30"
                          : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${edit.deliveryType === val ? "text-red-500" : "text-zinc-500"}`} />
                      <span className="mt-1 block text-xs font-semibold text-zinc-200">{lbl}</span>
                    </button>
                  ))}
                </div>

                {edit.deliveryType === "text" && (
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                      Delivery content
                    </label>
                    <textarea
                      rows={6}
                      value={edit.textContent}
                      onChange={(e) => setEdit({ ...edit, textContent: e.target.value })}
                      placeholder={"One entry per line…"}
                      className={inputCls}
                    />
                    {edit.textContent.trim() && (
                      <p className="mt-1 text-xs text-zinc-500">
                        {edit.textContent.trim().split("\n").length} line
                        {edit.textContent.trim().split("\n").length === 1 ? "" : "s"} · {edit.textContent.length} chars
                      </p>
                    )}
                  </div>
                )}

                {edit.deliveryType === "file" && (
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                      Delivery link
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={edit.fileUrl}
                        onChange={(e) => setEdit({ ...edit, fileUrl: e.target.value })}
                        placeholder="https://mega.nz/file/..."
                        className={inputCls + " flex-1"}
                      />
                      <LocalUpload
                        kind="product"
                        onUploaded={(url) => setEdit({ ...edit, fileUrl: url })}
                        label="Upload"
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-zinc-600">
                      Paste an external link (MEGA/Drive/…) or upload a file (≤64MB) stored in the project.
                    </p>
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                    Price (USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={edit.price}
                    onChange={(e) => setEdit({ ...edit, price: e.target.value })}
                    className={inputCls}
                  />
                </div>

                {fieldDefsFor(viewing.categorySlug).filter((f) => f.name !== "price").length > 0 && (
                  <div>
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                      Listing fields
                    </p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {fieldDefsFor(viewing.categorySlug)
                        .filter((f) => f.name !== "price")
                        .map((f) => (
                        <div key={f.name}>
                          <label className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                            {f.label}
                            {f.required && <span className="text-red-500">*</span>}
                            {f.visible === false && (
                              <span className="rounded bg-zinc-800 px-1 py-0.5 text-[9px] font-medium normal-case text-zinc-400">
                                hidden
                              </span>
                            )}
                          </label>
                          {f.type === "select" && f.options ? (
                            <select
                              value={edit.meta[f.name] || ""}
                              onChange={(e) => setEdit({ ...edit, meta: { ...edit.meta, [f.name]: e.target.value } })}
                              className={inputCls}
                            >
                              {!f.options.includes(edit.meta[f.name] || "") && <option value="">—</option>}
                              {f.options.map((o) => (
                                <option key={o} value={o}>
                                  {o}
                                </option>
                              ))}
                            </select>
                          ) : f.type === "textarea" ? (
                            <textarea
                              rows={3}
                              value={edit.meta[f.name] || ""}
                              onChange={(e) => setEdit({ ...edit, meta: { ...edit.meta, [f.name]: e.target.value } })}
                              className={inputCls}
                            />
                          ) : (
                            <input
                              type={f.type === "number" ? "number" : "text"}
                              value={edit.meta[f.name] || ""}
                              onChange={(e) => setEdit({ ...edit, meta: { ...edit.meta, [f.name]: e.target.value } })}
                              className={inputCls}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {editErr && <p className="text-xs font-medium text-red-400">{editErr}</p>}

                <div className="flex justify-end gap-2 border-t border-zinc-800 pt-3">
                  <button
                    type="button"
                    onClick={() => { setEdit(null); setEditErr(""); }}
                    disabled={saving}
                    className="rounded-md bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveEdit}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    Save changes
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
