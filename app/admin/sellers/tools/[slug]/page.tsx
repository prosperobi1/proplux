"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";

type Product = {
  id: string;
  country: string;
  tld: string;
  hosting: string;
  checkStatus: string;
  price: number;
  createdAt: string;
};

export default function SellerToolPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [tab, setTab] = useState<"static" | "all" | "deleted" | "add" | "mass">("add");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    country: "",
    tld: "",
    hosting: "",
    checkStatus: "Valid",
    price: "",
  });
  const [saving, setSaving] = useState(false);
  const [response, setResponse] = useState("");

  const [categoryDisplay, setCategoryDisplay] = useState(
  slug === "rdp" ? "RDP" : slug.charAt(0).toUpperCase() + slug.slice(1)
);

useEffect(() => {
  fetch("/api/categories")
    .then((r) => r.json())
    .then((cats) => {
      if (Array.isArray(cats)) {
        const match = cats.find((c: any) => c.slug === slug);
        if (match) setCategoryDisplay(match.name);
      }
    });
}, [slug]);

  const load = () => {
    fetch("/api/seller/products")
      .then((r) => r.json())
      .then((d) => {
        setProducts(Array.isArray(d) ? d : []);
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setResponse("");
    const res = await fetch("/api/seller/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, price: Number(form.price) }),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      setResponse("✓ Product added successfully");
      setForm({ country: "", tld: "", hosting: "", checkStatus: "Valid", price: "" });
      load();
      setTab("all");
    } else {
      setResponse("✗ " + (data.error || "Failed"));
    }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    await fetch(`/api/seller/products/${id}`, { method: "DELETE" });
    load();
  };

  const tabs = [
    { id: "static", label: "Static" },
    { id: "all", label: "All" },
    { id: "deleted", label: "Deleted" },
    { id: "add", label: "Add" },
    { id: "mass", label: "Mass Add" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-red-600">{categoryDisplay}</h1>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-zinc-800 text-sm font-semibold">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`whitespace-nowrap px-4 py-2 ${
              tab === t.id
                ? "border-b-2 border-white text-white"
                : "text-zinc-500 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Add Form */}
      {tab === "add" && (
        <form onSubmit={handleSubmit} className="max-w-3xl space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-red-500">Country</label>
              <input
                type="text"
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                placeholder="USA"
                required
                className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-red-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-red-500">TLD</label>
              <input
                type="text"
                value={form.tld}
                onChange={(e) => setForm({ ...form, tld: e.target.value })}
                placeholder=".com"
                required
                className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-red-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-red-500">Hosting</label>
            <input
              type="text"
              value={form.hosting}
              onChange={(e) => setForm({ ...form, hosting: e.target.value })}
              placeholder="AWS, Cloudflare, DigitalOcean..."
              required
              className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-red-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-red-500">Check Status</label>
              <select
                value={form.checkStatus}
                onChange={(e) => setForm({ ...form, checkStatus: e.target.value })}
                className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none"
              >
                <option value="Valid">Valid</option>
                <option value="Checking">Checking</option>
                <option value="Invalid">Invalid</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-red-500">Price (USD)</label>
              <input
                type="number"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="12.50"
                required
                className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-red-500 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-md bg-red-600 px-6 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> {saving ? "Adding..." : "Add Product"}
          </button>

          {response && (
            <div className={`rounded-lg border p-3 text-sm ${response.startsWith("✓") ? "border-green-900/50 bg-green-950/20 text-green-500" : "border-red-900/50 bg-red-950/20 text-red-500"}`}>
              {response}
            </div>
          )}
        </form>
      )}

      {/* Products List */}
      {(tab === "all" || tab === "static") && (
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full min-w-[700px] text-sm">
            <thead className="bg-zinc-900 text-left text-xs font-semibold uppercase text-red-500">
              <tr>
                <th className="px-3 py-2">Country</th>
                <th className="px-3 py-2">TLD</th>
                <th className="px-3 py-2">Hosting</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Price</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 bg-zinc-950">
              {loading ? (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-zinc-500">Loading...</td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-zinc-500">No products yet. Click the "Add" tab to create one.</td></tr>
              ) : products.map((p) => (
                <tr key={p.id} className="hover:bg-zinc-900/50">
                  <td className="px-3 py-3 text-white">{p.country}</td>
                  <td className="px-3 py-3 text-zinc-300">{p.tld}</td>
                  <td className="px-3 py-3 text-zinc-300">{p.hosting}</td>
                  <td className="px-3 py-3 text-zinc-300">{p.checkStatus}</td>
                  <td className="px-3 py-3 font-semibold text-green-500">${p.price.toFixed(2)}</td>
                  <td className="px-3 py-3">
                    <button
                      onClick={() => deleteProduct(p.id)}
                      className="rounded bg-zinc-800 p-1.5 hover:bg-zinc-700"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "deleted" && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-8 text-center text-sm text-zinc-500">
          No deleted products.
        </div>
      )}

      {tab === "mass" && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-8 text-center text-sm text-zinc-500">
          Mass add coming soon — paste multiple products in CSV format.
        </div>
      )}
    </div>
  );
}