"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, Plus, Trash2, KeyRound, FileText, Package, Check, Pencil, X, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { LocalUpload } from "../../../../components/LocalUpload";
import { isValidFileUrl, MAX_TEXT_CONTENT } from "@/lib/delivery";

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
  price: number;
  createdAt: string;
  metadata?: Record<string, any>;
  deliveryType?: string;
  fileUrl?: string;
  textContent?: string;
};

export default function SellerToolPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [tab, setTab] = useState<"static" | "all" | "deleted" | "add" | "mass">("add");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryName, setCategoryName] = useState(slug.charAt(0).toUpperCase() + slug.slice(1));
  const [fields, setFields] = useState<FieldDef[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [response, setResponse] = useState("");
  const [deliveryType, setDeliveryType] = useState<"credentials" | "text" | "file">("credentials");
  const [fileUrl, setFileUrl] = useState("");
  const [textContent, setTextContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PER_PAGE = 20;

  const load = () => {
    fetch("/api/seller/products?category=" + slug)
      .then((r) => r.json())
      .then((d) => {
        setProducts(Array.isArray(d) ? d : []);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((cats) => {
        if (Array.isArray(cats)) {
          const match = cats.find((c: any) => c.slug === slug);
          if (match) {
            setCategoryName(match.name);
            if (match.fields) {
              try {
                const parsed = typeof match.fields === "string" ? JSON.parse(match.fields) : match.fields;
                setFields(parsed);
                const initial: Record<string, string> = {};
                parsed.forEach((f: FieldDef) => {
                  initial[f.name] = f.type === "select" && f.options ? f.options[0] : "";
                });
                setValues(initial);
              } catch {}
            }
          }
        }
      });
    load();
  }, [slug]);

  // Categories with no non-public field can't support Login Credentials
  // delivery — there'd be nothing secret to hand over after purchase.
  const hasHiddenFields = fields.some((f) => f.visible !== true);

  const resetForm = () => {
    const reset: Record<string, string> = {};
    fields.forEach((f) => {
      reset[f.name] = f.type === "select" && f.options ? f.options[0] : "";
    });
    setValues(reset);
    setDeliveryType("credentials");
    setFileUrl("");
    setTextContent("");
    setEditingId(null);
  };

  const handleChange = (name: string, value: string) => {
    setValues((v) => ({ ...v, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setResponse("");

    if (deliveryType === "file" && !fileUrl) {
      setResponse("Please upload a file or paste a download link for File delivery");
      setSaving(false);
      return;
    }
    if (deliveryType === "file" && fileUrl && !isValidFileUrl(fileUrl)) {
      setResponse("Invalid link — use an http(s) URL (e.g. https://mega.nz/...)");
      setSaving(false);
      return;
    }
    if (deliveryType === "text" && (textContent.trim().length === 0 || textContent.length > MAX_TEXT_CONTENT)) {
      setResponse(
        textContent.trim()
          ? `Content too large (max ${MAX_TEXT_CONTENT} characters)`
          : "Please paste the delivery content for Text List"
      );
      setSaving(false);
      return;
    }

    if (fields.length > 0 && deliveryType === "credentials" && !hasHiddenFields) {
      setResponse("This category has no hidden fields — switch to Text List delivery, or ask the admin to add hidden fields.");
      setSaving(false);
      return;
    }

    const price = values["price"] || "0";
    const metadata = { ...values };
    delete metadata.price;

    const isEdit = !!editingId;
    const url = isEdit ? "/api/seller/products/" + editingId : "/api/seller/products";

    const res = await fetch(url, {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categorySlug: slug,
        price: Number(price),
        metadata,
        deliveryType,
        fileUrl,
        textContent,
        country: metadata["country"] || metadata["location"] || "Unknown",
      }),
    });
    const data = await res.json();
    setSaving(false);

    if (res.ok) {
      setResponse(isEdit ? "Product updated successfully" : "Product added successfully");
      resetForm();
      load();
      setTab("all");
    } else {
      setResponse(data.error || "Failed");
    }
  };

  const startEdit = (p: Product) => {
    setEditingId(p.id);
    setDeliveryType((p.deliveryType as any) || "credentials");
    setFileUrl(p.fileUrl || "");
    setTextContent(p.textContent || "");
    const meta = p.metadata || {};
    const next: Record<string, string> = {};
    fields.forEach((f) => {
      next[f.name] = meta[f.name] !== undefined ? String(meta[f.name]) : (f.type === "select" && f.options ? f.options[0] : "");
    });
    next["price"] = String(p.price);
    setValues(next);
    setTab("add");
  };

  const cancelEdit = () => {
    resetForm();
    setResponse("");
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    await fetch("/api/seller/products/" + id, { method: "DELETE" });
    load();
  };

  const renderField = (field: FieldDef) => {
    const common = "w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-red-500 focus:outline-none";

    if (field.type === "select") {
      return (
        <select value={values[field.name] || ""} onChange={(e) => handleChange(field.name, e.target.value)} required={field.required} className={common}>
          {field.options?.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );
    }

    if (field.type === "textarea") {
      return (
        <textarea
          value={values[field.name] || ""}
          onChange={(e) => handleChange(field.name, e.target.value)}
          placeholder={field.placeholder}
          required={field.required}
          rows={5}
          className={common}
        />
      );
    }

    return (
      <input
        type={field.type === "number" ? "number" : "text"}
        value={values[field.name] || ""}
        onChange={(e) => handleChange(field.name, e.target.value)}
        placeholder={field.placeholder}
        required={field.required}
        className={common}
      />
    );
  };

  const filteredProducts = search.trim()
    ? products.filter((p) => {
        const q = search.trim().toLowerCase();
        const metaStr = p.metadata ? JSON.stringify(p.metadata).toLowerCase() : "";
        return (
          (p.country || "").toLowerCase().includes(q) ||
          (p.hosting || "").toLowerCase().includes(q) ||
          String(p.price).includes(q) ||
          metaStr.includes(q)
        );
      })
    : products;
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PER_PAGE;
  const pagedProducts = filteredProducts.slice(pageStart, pageStart + PER_PAGE);

  const displayFields = fields.filter((f) => f.name !== "price");
  const tabs = [
    { id: "static", label: "Static" },
    { id: "all", label: "All" },
    { id: "deleted", label: "Deleted" },
    { id: "add", label: "Add" },
    { id: "mass", label: "Mass Add" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-red-600 sm:text-3xl">{categoryName}</h1>

      <div className="flex overflow-x-auto border-b border-zinc-800 text-sm font-semibold">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`whitespace-nowrap px-4 py-2 ${tab === t.id ? "border-b-2 border-white text-white" : "text-zinc-500 hover:text-white"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "add" && (
        <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
          {editingId && (
            <div className="flex items-center justify-between rounded-lg border border-blue-900/50 bg-blue-950/20 p-4">
              <div>
                <p className="text-sm font-semibold text-blue-400">Editing product</p>
                <p className="text-xs text-zinc-500">Changes overwrite the existing listing.</p>
              </div>
              <button type="button" onClick={cancelEdit} className="flex items-center gap-1 rounded bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-700">
                <X className="h-3 w-3" /> Cancel Edit
              </button>
            </div>
          )}

          <section className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-red-500">Step 1 — How buyers receive this</h3>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <button type="button" onClick={() => setDeliveryType("credentials")} className={`rounded-lg border p-4 text-left transition ${deliveryType === "credentials" ? "border-red-500 bg-red-950/30" : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"}`}>
                <KeyRound className={`h-5 w-5 ${deliveryType === "credentials" ? "text-red-500" : "text-zinc-500"}`} />
                <p className="mt-2 text-sm font-semibold text-white">Login Credentials</p>
                <p className="mt-1 text-xs text-zinc-500">IP, login, password</p>
              </button>
              <button type="button" onClick={() => setDeliveryType("text")} className={`rounded-lg border p-4 text-left transition ${deliveryType === "text" ? "border-red-500 bg-red-950/30" : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"}`}>
                <FileText className={`h-5 w-5 ${deliveryType === "text" ? "text-red-500" : "text-zinc-500"}`} />
                <p className="mt-2 text-sm font-semibold text-white">Text List</p>
                <p className="mt-1 text-xs text-zinc-500">Email:pass lines</p>
              </button>
              <button type="button" onClick={() => setDeliveryType("file")} className={`rounded-lg border p-4 text-left transition ${deliveryType === "file" ? "border-red-500 bg-red-950/30" : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"}`}>
                <Package className={`h-5 w-5 ${deliveryType === "file" ? "text-red-500" : "text-zinc-500"}`} />
                <p className="mt-2 text-sm font-semibold text-white">File Download</p>
                <p className="mt-1 text-xs text-zinc-500">ZIP, PDF</p>
              </button>
            </div>
            {fields.length > 0 && deliveryType === "credentials" && !hasHiddenFields && (
              <p className="rounded-lg border border-yellow-900/60 bg-yellow-950/20 p-3 text-xs leading-relaxed text-yellow-400">
                ⚠ This category has no hidden fields — there&apos;s nothing secret to deliver as
                Login Credentials. Switch to <strong>Text List</strong>, or ask the admin to add
                hidden fields to this category.
              </p>
            )}
            {deliveryType === "text" && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                <label className="mb-2 block text-xs font-semibold uppercase text-zinc-500">Delivery content — what buyers receive after purchase</label>
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  rows={8}
                  maxLength={MAX_TEXT_CONTENT}
                  placeholder={"Paste the full list here — one entry per line…"}
                  className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs text-white placeholder-zinc-600 focus:border-red-500 focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-zinc-600">Only buyers who purchased see this. Line breaks are preserved.</p>
                {textContent.trim() && (
                  <p className="mt-2 flex items-center gap-1 text-xs text-green-500">
                    <Check className="h-3 w-3" /> Content set ({textContent.trim().split("\n").length} {textContent.trim().split("\n").length === 1 ? "line" : "lines"})
                  </p>
                )}
              </div>
            )}
            {deliveryType === "file" && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                <label className="mb-2 block text-xs font-semibold uppercase text-zinc-500">Upload File (max 64MB)</label>
                <LocalUpload
                  kind="product"
                  label="Choose file"
                  hint="Any file up to 64MB"
                  onUploaded={setFileUrl}
                />
                <div className="mt-4 border-t border-zinc-800 pt-3">
                  <label className="mb-1 block text-xs font-semibold uppercase text-zinc-500">…or paste a download link (large files hosted elsewhere)</label>
                  <input
                    type="url"
                    value={fileUrl.startsWith("/api/files/") ? "" : fileUrl}
                    onChange={(e) => setFileUrl(e.target.value.trim())}
                    placeholder="https://mega.nz/file/..."
                    className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-red-500 focus:outline-none"
                  />
                  <p className="mt-1 text-[11px] text-zinc-600">Share setting must be “anyone with the link”. Buyers only see it after purchase.</p>
                </div>
                {fileUrl && (
                  <p className={`mt-2 flex items-center gap-1 text-xs ${isValidFileUrl(fileUrl) ? "text-green-500" : "text-red-500"}`}>
                    {isValidFileUrl(fileUrl) ? (
                      <><Check className="h-3 w-3" /> {fileUrl.startsWith("/api/files/") ? "File uploaded" : "Link set"}</>
                    ) : (
                      "Link must start with http:// or https://"
                    )}
                  </p>
                )}
              </div>
            )}
          </section>

          <section className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-red-500">Step 2 — Product Details</h3>
            </div>
            {displayFields.map((field) => (
              <div key={field.name}>
                <label className="mb-1 block text-sm font-semibold text-zinc-300">
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </label>
                {renderField(field)}
              </div>
            ))}
          </section>

          <section className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-red-500">Step 3 — Pricing</h3>
              <p className="mt-1 text-xs text-zinc-500">You earn 65% of every sale.</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-zinc-300">Price (USD) *</label>
              <input
                type="number"
                step="0.01"
                value={values["price"] || ""}
                onChange={(e) => handleChange("price", e.target.value)}
                placeholder="12.50"
                required
                className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-red-500 focus:outline-none"
              />
            </div>
          </section>

          <button type="submit" disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-md bg-red-600 px-6 py-3 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} {saving ? "Saving..." : editingId ? "Save Changes" : "Add Product"}
          </button>

          {response && (
            <div className={`rounded-lg border p-3 text-sm ${response.includes("successfully") ? "border-green-900/50 bg-green-950/20 text-green-500" : "border-red-900/50 bg-red-950/20 text-red-500"}`}>
              {response}
            </div>
          )}
        </form>
      )}

      {tab === "mass" && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-8 text-center text-sm text-zinc-500">
          Mass Add coming soon.
        </div>
      )}

      {(tab === "all" || tab === "static") && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative md:max-w-md md:flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Search by country, IP, login..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full rounded-md border border-zinc-800 bg-zinc-950 pl-10 pr-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-red-500 focus:outline-none"
              />
            </div>
            <span className="text-xs text-zinc-500">
              Showing {pagedProducts.length} of {filteredProducts.length}
            </span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-zinc-800">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="bg-zinc-900 text-left text-xs font-semibold uppercase text-red-500">
                <tr>
                  {displayFields.slice(0, 4).map((f) => (
                    <th key={f.name} className="px-3 py-2">{f.label}</th>
                  ))}
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Price</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 bg-zinc-950">
                {loading ? (
                  <tr><td colSpan={displayFields.slice(0, 4).length + 3} className="px-3 py-6 text-center text-zinc-500"><span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</span></td></tr>
                ) : pagedProducts.length === 0 ? (
                  <tr><td colSpan={displayFields.slice(0, 4).length + 3} className="px-3 py-6 text-center text-zinc-500">
                    {search ? "No products match." : "No products yet."}
                  </td></tr>
                ) : (
                  pagedProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-zinc-900/50">
                      {displayFields.slice(0, 4).map((f) => (
                        <td key={f.name} className="px-3 py-3 text-zinc-300">{p.metadata?.[f.name] || "—"}</td>
                      ))}
                      <td className="px-3 py-3">
                        <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold uppercase text-zinc-400">
                          {p.deliveryType || "credentials"}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-semibold text-green-500">${p.price.toFixed(2)}</td>
                      <td className="px-3 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => startEdit(p)} className="rounded bg-zinc-800 p-1.5 hover:bg-zinc-700" title="Edit">
                            <Pencil className="h-3.5 w-3.5 text-blue-400" />
                          </button>
                          <button onClick={() => deleteProduct(p.id)} className="rounded bg-zinc-800 p-1.5 hover:bg-zinc-700" title="Delete">
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

          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <span className="text-xs text-zinc-500">Page {currentPage} of {totalPages}</span>
              <div className="flex flex-wrap items-center justify-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="flex min-h-9 items-center gap-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-30"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Prev
                </button>
                {Array.from({ length: totalPages }).map((_, i) => {
                  const p = i + 1;
                  if (totalPages > 7 && Math.abs(p - currentPage) > 2 && p !== 1 && p !== totalPages) {
                    if (p === 2 || p === totalPages - 1) return <span key={p} className="px-2 text-zinc-600">…</span>;
                    return null;
                  }
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`min-w-9 min-h-9 rounded-md px-2 py-1.5 text-xs font-semibold ${
                        p === currentPage ? "bg-red-600 text-white" : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="flex min-h-9 items-center gap-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-30"
                >
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "deleted" && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-8 text-center text-sm text-zinc-500">
          No deleted products.
        </div>
      )}
    </div>
  );
}