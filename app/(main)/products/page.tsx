"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/products").then(r => r.json()).then(d => { setProducts(Array.isArray(d) ? d : []); setLoading(false); });
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-red-500">Marketplace</h1>
      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full min-w-[800px] text-sm">
          <thead className="bg-zinc-900 text-left text-xs font-semibold uppercase text-red-500">
            <tr>
              <th className="px-4 py-3">Country</th>
              <th className="px-4 py-3">TLD</th>
              <th className="px-4 py-3">Hosting</th>
              <th className="px-4 py-3">Seller</th>
              <th className="px-4 py-3">Check</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Added on</th>
              <th className="px-4 py-3">Buy</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800 bg-zinc-950">
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-zinc-500">Loading products...</td></tr>
            ) : products.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-zinc-500">No products available yet.</td></tr>
            ) : products.map(p => (
              <tr key={p.id} className="hover:bg-zinc-900/50">
                <td className="px-4 py-3 text-zinc-300">{p.country}</td>
                <td className="px-4 py-3 text-zinc-300">{p.tld}</td>
                <td className="px-4 py-3 text-zinc-300">{p.hosting}</td>
                <td className="px-4 py-3 text-zinc-300">{p.seller}</td>
                <td className="px-4 py-3 text-zinc-300">{p.check}</td>
                <td className="px-4 py-3 font-semibold text-green-500">${p.price.toFixed(2)}</td>
                <td className="px-4 py-3 text-zinc-500">{new Date(p.addedOn).toLocaleDateString()}</td>
                <td className="px-4 py-3"><Link href={`/checkout/${p.id}`} className="rounded-md bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-500">Buy</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
