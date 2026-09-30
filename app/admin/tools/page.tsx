"use client";

import { useEffect, useState } from "react";
import { Package } from "lucide-react";

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
};

type Category = { id: string; slug: string; name: string };

export default function AdminToolsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [search, setSearch] = useState("");

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

  const q = search.trim().toLowerCase();
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
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-red-500">
          <Package className="h-6 w-6" /> Visualize Tools
        </h1>
        <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs text-zinc-400">
          Total: {filtered.length}
        </span>
      </div>

      <p className="text-sm text-zinc-400">
        Read-only view of all products listed across every seller. Use category tabs to filter,
        or search by the product ID shown on listings and in reports/tickets.
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
        <table className="w-full min-w-[800px] text-sm">
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
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800 bg-zinc-950">
            {loading ? (
              <tr><td colSpan={9} className="px-4 py-6 text-center text-zinc-500">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-6 text-center text-zinc-500">No products in this category.</td></tr>
            ) : (
              filtered.map((p) => (
                <tr key={p.id} className="hover:bg-zinc-900/50">
                  <td className="px-4 py-3 font-mono text-xs text-zinc-500">{p.id.slice(-6)}</td>
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
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
