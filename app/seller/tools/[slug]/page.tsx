"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { Plus, Trash2, KeyRound, FileText, Package, Check, Pencil, X, Search, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { LocalUpload } from "../../../components/LocalUpload";
import { isValidFileUrl, MAX_TEXT_CONTENT } from "@/lib/delivery";
import { CheckResult } from "@/components/CheckResult";
import { COUNTRIES } from "@/lib/countries";

type FieldDef = { name: string; label: string; type?: string; required?: boolean; options?: string[]; placeholder?: string };
type Product = { id: string; country: string; tld: string; hosting: string; price: number; createdAt: string; metadata?: Record<string, any>; deliveryType?: string; fileUrl?: string; textContent?: string; sold?: boolean };

export default function SellerToolPage() {
  const params = useParams();
  const slug = params.slug as string;
  // Buyers get a pre-purchase Check column for these categories — sellers get
  // the same test here so they can verify their own listing before it sells.
  const showTestCol = slug === "smtps" || slug === "rdp";
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
  const [checks, setChecks] = useState<
    Record<string, { email?: string; status: "idle" | "loading" | "ok" | "fail"; message?: string }>
  >({});
  const PER_PAGE = 20;

  const load = () => {
    fetch("/api/seller/products?category=" + slug)
      .then((r) => r.json())
      .then((d) => { setProducts(Array.isArray(d) ? d : []); setLoading(false); });
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
                parsed.forEach((f: FieldDef) => { initial[f.name] = f.type === "select" && f.options ? f.options[0] : ""; });
                setValues(initial);
              } catch {}
            }
          }
        }
      });
    load();
  }, [slug]);

  const resetForm = () => {
    const reset: Record<string, string> = {};
    fields.forEach((f) => { reset[f.name] = f.type === "select" && f.options ? f.options[0] : ""; });
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
    const price = values["price"] || "0";
    const metadata = { ...values };
    delete metadata.price;
    const isEdit = !!editingId;
    const url = isEdit ? "/api/seller/products/" + editingId : "/api/seller/products";
    const res = await fetch(url, {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categorySlug: slug, price: Number(price), metadata, deliveryType, fileUrl, textContent, country: metadata["country"] || metadata["location"] || "Unknown" }),
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
    fields.forEach((f) => { next[f.name] = meta[f.name] !== undefined ? String(meta[f.name]) : (f.type === "select" && f.options ? f.options[0] : ""); });
    next["price"] = String(p.price);
    setValues(next);
    setTab("add");
  };

  const cancelEdit = () => { resetForm(); setResponse(""); };

  const deleteProduct = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    const r = await fetch("/api/seller/products/" + id, { method: "DELETE" }).catch(() => null);
    const d = await r?.json().catch(() => null);
    if (!r || !r.ok) alert(d?.error || "Could not delete this listing.");
    load();
  };

  const setCheckEmail = (id: string, email: string) => {
    setChecks((prev) => ({ ...prev, [id]: { email, status: "idle" } }));
  };

  const runSmtpCheck = async (p: Product) => {
    const email = (checks[p.id]?.email || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setChecks((prev) => ({ ...prev, [p.id]: { email, status: "fail", message: "Enter a valid email first." } }));
      return;
    }
    setChecks((prev) => ({ ...prev, [p.id]: { email, status: "loading" } }));
    try {
      const r = await fetch(`/api/products/${p.id}/check-smtp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const d = await r.json();
      setChecks((prev) => ({
        ...prev,
        [p.id]: { email, status: d.ok ? "ok" : "fail", message: d.message || (d.ok ? "Working" : "Check failed.") },
      }));
    } catch {
      setChecks((prev) => ({ ...prev, [p.id]: { email, status: "fail", message: "Network error — try again." } }));
    }
  };

  const runRdpCheck = async (p: Product) => {
    setChecks((prev) => ({ ...prev, [p.id]: { status: "loading" } }));
    try {
      const r = await fetch(`/api/products/${p.id}/check-rdp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const d = await r.json();
      setChecks((prev) => ({
        ...prev,
        [p.id]: { status: d.ok ? "ok" : "fail", message: d.message || (d.ok ? "Online" : "Check failed.") },
      }));
    } catch {
      setChecks((prev) => ({ ...prev, [p.id]: { status: "fail", message: "Network error — try again." } }));
    }
  };

  const testCell = (p: Product) => {
    const s = checks[p.id];
    const loading = s?.status === "loading";
    const message = <CheckResult status={s?.status} detail={s?.message} />;

    if (slug === "smtps") {
      const type = String(p.metadata?.type || "SMTP").toUpperCase();
      if (type !== "SMTP") return <span className="text-[11px] text-zinc-600">—</span>;
      return (
        <div className="flex min-w-[190px] flex-col gap-1">
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
          {message}
        </div>
      );
    }

    // RDP
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
        {message}
      </div>
    );
  };

  const renderField = (field: FieldDef) => {
    const common = "w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-red-500 focus:outline-none";
    if (field.type === "select") {
      return (<select value={values[field.name] || ""} onChange={(e) => handleChange(field.name, e.target.value)} required={field.required} className={common}>{field.options?.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}</select>);
    }
    if (field.type === "country") {
      return (
        <CountryCombobox
          value={values[field.name] || ""}
          onChange={(v) => handleChange(field.name, v)}
          required={field.required}
        />
      );
    }
    if (field.type === "textarea") {
      return (<textarea value={values[field.name] || ""} onChange={(e) => handleChange(field.name, e.target.value)} placeholder={field.placeholder} required={field.required} rows={5} className={common} />);
    }
    if (field.type === "image_urls") {
      const raw = values[field.name] || "";
      const urls = raw.split("\n").map((u: string) => u.trim()).filter(Boolean);
      const isValidUrl = (u: string) => /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(u);
      const validCount = urls.filter(isValidUrl).length;

      return (
        <div className="space-y-3">
          <textarea
            value={raw}
            onChange={(e) => {
              const lines = e.target.value.split("\n").filter((l) => l.trim());
              if (lines.length > 10) {
                e.target.value = lines.slice(0, 10).join("\n");
              }
              handleChange(field.name, e.target.value);
            }}
            placeholder={"Paste any image URL, one per line:\n1. https://i.postimg.cc/xxx/image.jpg\n2. https://i.ibb.co/xxx/image.jpg\n3. https://anything.com/your-image.png"}
            rows={5}
            required={field.required}
            className={common}
          />

          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500">
              {urls.length} / 10 images
            </span>
            <span className={validCount === urls.length && urls.length > 0 ? "text-green-500" : validCount > 0 ? "text-yellow-500" : "text-zinc-500"}>
              {urls.length === 0 ? "No images" : `${validCount} valid · ${urls.length - validCount} broken`}
            </span>
          </div>

          {urls.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {urls.map((url, i) => (
                <div key={i} className="relative h-16 w-16 overflow-hidden rounded border border-zinc-800 bg-zinc-950">
                  <img
                    src={url}
                    alt={`Preview ${i + 1}`}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'><rect fill='%2318181b' width='64' height='64'/><text x='32' y='36' font-size='9' fill='%2371717a' text-anchor='middle'>Broken</text></svg>";
                    }}
                  />
                </div>
              ))}
            </div>
          )}

          <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
            <p className="mb-2 text-xs text-zinc-400">
              No image link? Upload at any of these (no account needed):
            </p>
            <div className="flex flex-wrap gap-2">
              <a
                href="https://postimages.org"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:border-red-500 hover:bg-zinc-800"
              >
                postimages.org ↗
              </a>
              <a
                href="https://imgbb.com"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:border-red-500 hover:bg-zinc-800"
              >
                imgbb.com ↗
              </a>
              <a
                href="https://imgbox.com"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:border-red-500 hover:bg-zinc-800"
              >
                imgbox.com ↗
              </a>
            </div>
            <p className="mt-2 text-[10px] text-zinc-600">
              After upload, copy the <strong>Direct Link</strong> (ends in .jpg, .png, etc.) and paste above.
            </p>
          </div>
        </div>
      );
    }

    if (field.type === "sample_text") {
      const raw = values[field.name] || "";
      const lines = raw.split("\n").map((l: string) => l.trim()).filter(Boolean);
      return (
        <div className="space-y-2">
          <textarea
            value={raw}
            onChange={(e) => handleChange(field.name, e.target.value)}
            placeholder={"Paste 10 sample leads, one per line:\nlead1@gmail.com\nlead2@gmail.com\nlead3@gmail.com\n..."}
            rows={8}
            required={field.required}
            className={common}
          />
          <p className="text-xs text-zinc-500">
            {lines.length} lead{lines.length !== 1 ? "s" : ""} · Buyers will see a &quot;View Sample&quot; button
          </p>
        </div>
      );
    }

    if (field.type === "expiry") {
      const raw = values[field.name] || "";
      return (<input type="text" inputMode="numeric" maxLength={5} value={raw} onChange={(e) => { let v = e.target.value.replace(/[^0-9]/g, ""); if (v.length >= 3) v = v.slice(0, 2) + "/" + v.slice(2, 4); if (v.length >= 2) { const m = parseInt(v.slice(0, 2), 10); if (m > 12) v = "12" + v.slice(2); if (m === 0) v = "01" + v.slice(2); } handleChange(field.name, v.slice(0, 5)); }} placeholder="MM/YY" required={field.required} className={common} />);
    }
    return (<input type={field.type === "number" ? "number" : "text"} value={values[field.name] || ""} onChange={(e) => handleChange(field.name, e.target.value)} placeholder={field.placeholder} required={field.required} className={common} />);
  };

  const filteredProducts = search.trim()
    ? products.filter((p) => {
        const q = search.trim().toLowerCase();
        const metaStr = p.metadata ? JSON.stringify(p.metadata).toLowerCase() : "";
        return (p.country || "").toLowerCase().includes(q) || (p.hosting || "").toLowerCase().includes(q) || p.id.toLowerCase().includes(q) || String(p.price).includes(q) || metaStr.includes(q);
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
      <h1 className="text-3xl font-bold text-red-600">{categoryName}</h1>

      <div className="flex overflow-x-auto border-b border-zinc-800 text-sm font-semibold">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id as any)} className={`whitespace-nowrap px-4 py-2 ${tab === t.id ? "border-b-2 border-white text-white" : "text-zinc-500 hover:text-white"}`}>{t.label}</button>
        ))}
      </div>

      {tab === "add" && (
        <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
          {editingId && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-blue-900/50 bg-blue-950/20 p-4">
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
              <input type="number" step="0.01" value={values["price"] || ""} onChange={(e) => handleChange("price", e.target.value)} placeholder="12.50" required className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-red-500 focus:outline-none" />
            </div>
          </section>

          <button type="submit" disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-md bg-red-600 px-6 py-3 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50">
            <Plus className="h-4 w-4" /> {saving ? "Saving..." : editingId ? "Save Changes" : "Add Product"}
          </button>

          {response && (
            <div className={`rounded-lg border p-3 text-sm ${response.includes("successfully") ? "border-green-900/50 bg-green-950/20 text-green-500" : "border-red-900/50 bg-red-950/20 text-red-500"}`}>{response}</div>
          )}
        </form>
      )}

      {tab === "mass" && (
        <MassAddTab
          displayFields={displayFields}
          fields={fields}
          slug={slug}
          onDone={() => { load(); setTab("all"); }}
        />
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
            <span className="text-xs text-zinc-500">Showing {pagedProducts.length} of {filteredProducts.length}</span>
          </div>

          {showTestCol && (
            <p className="text-xs text-zinc-500">
              {slug === "smtps"
                ? "Test your own SMTP: enter an email and click Check — buyers run the same test before buying."
                : "Test your own RDP: click Check to confirm the server is online and responding (login details aren't tested)."}
            </p>
          )}

          <div className="overflow-x-auto rounded-lg border border-zinc-800">
            <table className={`w-full ${showTestCol ? "min-w-[1030px]" : "min-w-[780px]"} text-sm`}>
              <thead className="bg-zinc-900 text-left text-xs font-semibold uppercase text-red-500">
                <tr>
                  <th className="px-3 py-2">ID</th>
                  {displayFields.slice(0, 4).map((f) => (<th key={f.name} className="px-3 py-2">{f.label}</th>))}
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Price</th>
                  {showTestCol && <th className="px-3 py-2">Test</th>}
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 bg-zinc-950">
                {loading ? (
                  <tr><td colSpan={displayFields.slice(0, 4).length + (showTestCol ? 5 : 4)} className="px-3 py-6 text-center text-zinc-500">Loading...</td></tr>
                ) : pagedProducts.length === 0 ? (
                  <tr><td colSpan={displayFields.slice(0, 4).length + (showTestCol ? 5 : 4)} className="px-3 py-6 text-center text-zinc-500">
                    {search ? "No products match." : "No products yet."}
                  </td></tr>
                ) : (
                  pagedProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-zinc-900/50">
                      <td className="px-3 py-3 font-mono text-xs text-zinc-500" title={p.id}>{p.id.slice(-6)}</td>
                      {displayFields.slice(0, 4).map((f) => (<td key={f.name} className="px-3 py-3 text-zinc-300">{p.metadata?.[f.name] || "—"}</td>))}
                      <td className="px-3 py-3">
                        <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold uppercase text-zinc-400">{p.deliveryType || "credentials"}</span>
                      </td>
                      <td className="px-3 py-3 font-semibold text-green-500">${p.price.toFixed(2)}</td>
                      {showTestCol && <td className="px-3 py-3 align-top">{testCell(p)}</td>}
                      <td className="px-3 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => startEdit(p)} className="min-h-9 rounded bg-zinc-800 p-1.5 hover:bg-zinc-700" title="Edit">
                            <Pencil className="h-3.5 w-3.5 text-blue-400" />
                          </button>
                          <button
                            onClick={() => deleteProduct(p.id)}
                            disabled={p.sold}
                            title={p.sold ? "Can't delete — this listing has orders" : "Delete"}
                            className="min-h-9 rounded bg-zinc-800 p-1.5 hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
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

          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <span className="text-xs text-zinc-500">Page {currentPage} of {totalPages}</span>
              <div className="flex flex-wrap items-center justify-center gap-1">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1} className="flex min-h-9 items-center gap-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-30">
                  <ChevronLeft className="h-3.5 w-3.5" /> Prev
                </button>
                {Array.from({ length: totalPages }).map((_, i) => {
                  const p = i + 1;
                  if (totalPages > 7 && Math.abs(p - currentPage) > 2 && p !== 1 && p !== totalPages) {
                    if (p === 2 || p === totalPages - 1) return <span key={p} className="px-2 text-zinc-600">…</span>;
                    return null;
                  }
                  return (
                    <button key={p} onClick={() => setPage(p)} className={`min-w-9 min-h-9 rounded-md px-2 py-1.5 text-xs font-semibold ${p === currentPage ? "bg-red-600 text-white" : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"}`}>{p}</button>
                  );
                })}
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="flex min-h-9 items-center gap-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-30">
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "deleted" && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-8 text-center text-sm text-zinc-500">No deleted products.</div>
      )}
    </div>
  );
}

function MassAddTab({
  displayFields,
  fields,
  slug,
  onDone,
}: {
  displayFields: FieldDef[];
  fields: FieldDef[];
  slug: string;
  onDone: () => void;
}) {
  const [massDeliveryType, setMassDeliveryType] = useState<"credentials" | "text" | "file">("credentials");
  const [massFileUrl, setMassFileUrl] = useState("");
  const [massTextContent, setMassTextContent] = useState("");
  const [massText, setMassText] = useState("");
  const [parsedRows, setParsedRows] = useState<{ values: Record<string, string>; valid: boolean; error?: string }[]>([]);
  const [massSaving, setMassSaving] = useState(false);
  const [massResponse, setMassResponse] = useState("");

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === "," && !inQuotes) { result.push(cur); cur = ""; continue; }
      cur += ch;
    }
    result.push(cur);
    return result.map((s) => s.trim());
  };

  const handleParse = (text: string) => {
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) { setParsedRows([]); return; }
    const firstRow = parseCSVLine(lines[0]).map((h) => h.toLowerCase());
    const fieldNames = displayFields.map((f) => f.name);
    const hasHeader = firstRow.some((h) => fieldNames.includes(h) || h === "price");
    const columns = hasHeader ? firstRow : [...fieldNames, "price"];
    const dataLines = hasHeader ? lines.slice(1) : lines;

    const parsed = dataLines.map((line) => {
      const cells = parseCSVLine(line);
      const obj: Record<string, string> = {};
      columns.forEach((col, idx) => { if (cells[idx] !== undefined) obj[col] = cells[idx]; });
      const missing: string[] = [];
      displayFields.forEach((f) => { if (f.required && !obj[f.name]) missing.push(f.label); });
      const price = Number(obj.price);
      if (!Number.isFinite(price) || price <= 0) missing.push("price");
      if (missing.length > 0) return { values: obj, valid: false, error: "Missing: " + missing.join(", ") };
      return { values: obj, valid: true };
    });
    setParsedRows(parsed);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert("CSV too large"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = String(ev.target?.result || "");
      setMassText(text);
      handleParse(text);
    };
    reader.readAsText(file);
  };

  const handleSubmit = async () => {
    const validRows = parsedRows.filter((r) => r.valid);
    if (validRows.length === 0) { setMassResponse("No valid rows"); return; }
    if (parsedRows.some((r) => !r.valid)) {
      if (!confirm(parsedRows.filter((r) => !r.valid).length + " rows have errors and will be skipped. Continue?")) return;
    }
    if (massDeliveryType === "file" && !massFileUrl) { setMassResponse("Upload a file or paste a download link first"); return; }
    if (massDeliveryType === "file" && !isValidFileUrl(massFileUrl)) { setMassResponse("Invalid link — use an http(s) URL (e.g. https://mega.nz/...)"); return; }
    if (massDeliveryType === "text" && (massTextContent.trim().length === 0 || massTextContent.length > MAX_TEXT_CONTENT)) {
      setMassResponse(massTextContent.trim() ? `Content too large (max ${MAX_TEXT_CONTENT} characters)` : "Paste the delivery content first");
      return;
    }

    setMassSaving(true);
    setMassResponse("");

    const rows = validRows.map((r) => {
      const v = { ...r.values };
      const price = Number(v.price);
      delete v.price;
      return { ...v, price };
    });

    try {
      const res = await fetch("/api/seller/products/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categorySlug: slug, deliveryType: massDeliveryType, fileUrl: massFileUrl, textContent: massTextContent, rows }),
      });
      const data = await res.json();
      if (!res.ok) { setMassResponse(data.error || "Failed"); return; }
      setMassResponse("Added " + data.added + " products successfully");
      setMassText("");
      setMassTextContent("");
      setParsedRows([]);
      setMassFileUrl("");
      onDone();
    } finally {
      setMassSaving(false);
    }
  };

  const validCount = parsedRows.filter((r) => r.valid).length;
  const invalidCount = parsedRows.length - validCount;

  return (
    <div className="max-w-5xl space-y-6">
      <section className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-5 space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-red-500">Delivery Type (applies to all rows)</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <button type="button" onClick={() => setMassDeliveryType("credentials")} className={`rounded-lg border p-3 text-left transition ${massDeliveryType === "credentials" ? "border-red-500 bg-red-950/30" : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"}`}>
            <KeyRound className={`h-5 w-5 ${massDeliveryType === "credentials" ? "text-red-500" : "text-zinc-500"}`} />
            <p className="mt-2 text-sm font-semibold text-white">Credentials</p>
          </button>
          <button type="button" onClick={() => setMassDeliveryType("text")} className={`rounded-lg border p-3 text-left transition ${massDeliveryType === "text" ? "border-red-500 bg-red-950/30" : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"}`}>
            <FileText className={`h-5 w-5 ${massDeliveryType === "text" ? "text-red-500" : "text-zinc-500"}`} />
            <p className="mt-2 text-sm font-semibold text-white">Text List</p>
          </button>
          <button type="button" onClick={() => setMassDeliveryType("file")} className={`rounded-lg border p-3 text-left transition ${massDeliveryType === "file" ? "border-red-500 bg-red-950/30" : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"}`}>
            <Package className={`h-5 w-5 ${massDeliveryType === "file" ? "text-red-500" : "text-zinc-500"}`} />
            <p className="mt-2 text-sm font-semibold text-white">File (shared)</p>
          </button>
        </div>
        {massDeliveryType === "text" && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
            <label className="mb-2 block text-xs font-semibold uppercase text-zinc-500">Delivery content (shared by all rows) — buyers receive this after purchase</label>
            <textarea
              value={massTextContent}
              onChange={(e) => setMassTextContent(e.target.value)}
              rows={8}
              maxLength={MAX_TEXT_CONTENT}
              placeholder={"Paste the full list here — one entry per line…"}
              className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs text-white placeholder-zinc-600 focus:border-red-500 focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-zinc-600">Only buyers who purchased see this. Line breaks are preserved.</p>
            {massTextContent.trim() && (
              <p className="mt-2 flex items-center gap-1 text-xs text-green-500">
                <Check className="h-3 w-3" /> Content set ({massTextContent.trim().split("\n").length} {massTextContent.trim().split("\n").length === 1 ? "line" : "lines"})
              </p>
            )}
          </div>
        )}
        {massDeliveryType === "file" && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
            <label className="mb-2 block text-xs font-semibold uppercase text-zinc-500">Upload File (shared by all rows)</label>
            <LocalUpload
              kind="product"
              label="Choose file"
              hint="Any file up to 64MB"
              onUploaded={setMassFileUrl}
            />
            <div className="mt-4 border-t border-zinc-800 pt-3">
              <label className="mb-1 block text-xs font-semibold uppercase text-zinc-500">…or paste a download link (large files hosted elsewhere)</label>
              <input
                type="url"
                value={massFileUrl.startsWith("/api/files/") ? "" : massFileUrl}
                onChange={(e) => setMassFileUrl(e.target.value.trim())}
                placeholder="https://mega.nz/file/..."
                className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-red-500 focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-zinc-600">Share setting must be “anyone with the link”. Buyers only see it after purchase.</p>
            </div>
            {massFileUrl && (
              <p className={`mt-2 flex items-center gap-1 text-xs ${isValidFileUrl(massFileUrl) ? "text-green-500" : "text-red-500"}`}>
                {isValidFileUrl(massFileUrl) ? (
                  <><Check className="h-3 w-3" /> {massFileUrl.startsWith("/api/files/") ? "File uploaded" : "Link set"}</>
                ) : (
                  "Link must start with http:// or https://"
                )}
              </p>
            )}
          </div>
        )}
      </section>

      <section className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-red-500">Paste CSV or Upload File</h3>
            <p className="mt-1 text-xs text-zinc-500">Columns: <code className="text-zinc-400">{displayFields.map((f) => f.name).join(", ")}, price</code></p>
          </div>
          <label className="flex cursor-pointer items-center gap-2 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-semibold text-white hover:bg-zinc-800">
            Upload CSV
            <input type="file" accept=".csv,.txt" onChange={handleFile} className="hidden" />
          </label>
        </div>

        <textarea
          value={massText}
          onChange={(e) => { setMassText(e.target.value); handleParse(e.target.value); }}
          rows={12}
          placeholder={displayFields.map((f) => f.name).join(",") + ",price"}
          className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs text-white placeholder-zinc-600 focus:border-red-500 focus:outline-none"
        />

        {parsedRows.length > 0 && (
          <div className={`rounded-lg border p-3 text-sm ${invalidCount > 0 ? "border-yellow-900/50 bg-yellow-950/20 text-yellow-500" : "border-green-900/50 bg-green-950/20 text-green-500"}`}>
            {validCount} valid · {invalidCount} error{invalidCount !== 1 ? "s" : ""}
          </div>
        )}

        {invalidCount > 0 && (
          <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-red-900/50 bg-red-950/20 p-3 text-xs text-red-400">
            {parsedRows.map((r, i) => !r.valid && <div key={i}>Line {i + 1}: {r.error}</div>)}
          </div>
        )}

        {validCount > 0 && (
          <div className="overflow-x-auto rounded-lg border border-zinc-800">
            <table className="w-full text-xs">
              <thead className="bg-zinc-900 text-left text-[10px] font-semibold uppercase text-zinc-500">
                <tr>
                  <th className="px-2 py-2">#</th>
                  {displayFields.slice(0, 4).map((f) => <th key={f.name} className="px-2 py-2">{f.label}</th>)}
                  <th className="px-2 py-2">Price</th>
                  <th className="px-2 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 bg-zinc-950">
                {parsedRows.slice(0, 10).map((r, i) => (
                  <tr key={i} className={r.valid ? "" : "bg-red-950/10"}>
                    <td className="px-2 py-2 text-zinc-500">{i + 1}</td>
                    {displayFields.slice(0, 4).map((f) => <td key={f.name} className="px-2 py-2 text-zinc-300">{r.values[f.name] || "—"}</td>)}
                    <td className="px-2 py-2 text-green-500">${r.values.price || "—"}</td>
                    <td className="px-2 py-2">{r.valid ? <span className="text-green-500">OK</span> : <span className="text-red-500">Error</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <button
        onClick={handleSubmit}
        disabled={massSaving || validCount === 0}
        className="flex w-full items-center justify-center gap-2 rounded-md bg-red-600 px-6 py-3 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
      >
        <Plus className="h-4 w-4" /> {massSaving ? "Adding..." : "Add " + validCount + " Product" + (validCount !== 1 ? "s" : "")}
      </button>

      {massResponse && (
        <div className={`rounded-lg border p-3 text-sm ${massResponse.includes("successfully") ? "border-green-900/50 bg-green-950/20 text-green-500" : "border-red-900/50 bg-red-950/20 text-red-500"}`}>
          {massResponse}
        </div>
      )}
    </div>
  );
}


function CountryCombobox({
  value,
  onChange,
  required,
}: {
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const filtered = query.trim()
    ? COUNTRIES.filter((c) => c.toLowerCase().includes(query.trim().toLowerCase()))
    : COUNTRIES;

  const commit = (country: string) => {
    onChange(country);
    setQuery("");
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") { setOpen(true); e.preventDefault(); }
      return;
    }
    if (e.key === "ArrowDown") { setHighlighted((h) => Math.min(h + 1, filtered.length - 1)); e.preventDefault(); }
    else if (e.key === "ArrowUp") { setHighlighted((h) => Math.max(h - 1, 0)); e.preventDefault(); }
    else if (e.key === "Enter") {
      if (filtered[highlighted]) commit(filtered[highlighted]);
      e.preventDefault();
    } else if (e.key === "Escape") { setOpen(false); }
  };

  return (
    <div ref={containerRef} className="relative">
      {value && !open ? (
        <button
          type="button"
          onClick={() => { setOpen(true); setQuery(""); setHighlighted(0); }}
          className="flex w-full items-center justify-between rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-left text-sm text-white hover:border-zinc-600 focus:border-red-500 focus:outline-none"
        >
          <span>{value}</span>
          <Search className="h-3.5 w-3.5 text-zinc-500" />
        </button>
      ) : (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); setHighlighted(0); }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={required ? "Search country *" : "Search country"}
            required={required && !value}
            className="w-full rounded-md border border-zinc-700 bg-zinc-950 pl-10 pr-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-red-500 focus:outline-none"
          />
        </div>
      )}

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-md border border-zinc-700 bg-zinc-900 shadow-xl">
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-xs text-zinc-500">No countries match &quot;{query}&quot;</p>
          ) : (
            filtered.slice(0, 100).map((country, idx) => (
              <button
                key={country}
                type="button"
                onClick={() => commit(country)}
                onMouseEnter={() => setHighlighted(idx)}
                className={`block w-full px-3 py-2 text-left text-sm ${
                  idx === highlighted ? "bg-red-950/30 text-white" : "text-zinc-300 hover:bg-zinc-800"
                }`}
              >
                {country}
              </button>
            ))
          )}
          {filtered.length > 100 && (
            <p className="border-t border-zinc-800 px-3 py-2 text-[10px] text-zinc-500">
              {filtered.length - 100} more — keep typing to narrow
            </p>
          )}
        </div>
      )}
    </div>
  );
}
