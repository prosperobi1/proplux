"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard, ShoppingCart, Store, Server, Terminal, Monitor,
  Send, Mail, AtSign, CreditCard, Landmark, Sparkles, Headphones,
  User, Menu, X, Shield, Package, AlertTriangle, BookOpen, Users,
  Zap, Globe, Cloud, Database, Smartphone, Key, Lock, Fingerprint,
  Wallet, Bitcoin,
} from "lucide-react";

const ICON_MAP = {
  Package, Monitor, Terminal, Server, Mail, AtSign, Users, AlertTriangle,
  BookOpen, Landmark, CreditCard, Sparkles, Send, Shield, Zap, Globe,
  Cloud, Database, Smartphone, Key, Lock, Fingerprint, Wallet, Bitcoin,
};

export function SidebarLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const { data: session } = useSession();

  const role = session?.user?.role || "BUYER";
  const isSellerOrAdmin = role === "SELLER" || role === "ADMIN";

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setCategories(d); });
  }, []);

  const mainLinks = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Marketplace", href: "/products", icon: ShoppingCart },
  ];
  if (isSellerOrAdmin) mainLinks.push({ label: "Seller Panel", href: "/seller", icon: Store });

  return (
    <div className="flex h-screen w-full">
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside className={`fixed inset-y-0 left-0 z-50 w-64 flex-shrink-0 transform border-r border-zinc-800 bg-black transition-transform duration-200 md:relative md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-16 items-center justify-between border-b border-zinc-800 px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-600">
              <span className="text-sm font-bold">P</span>
            </div>
            <span className="text-lg font-bold">Proplux Home</span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="text-zinc-500 md:hidden"><X className="h-5 w-5" /></button>
        </div>

        <nav className="mt-4 flex flex-col gap-1 overflow-y-auto px-2 pb-4 text-sm">
          {mainLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link key={link.label} href={link.href} className="flex items-center gap-3 rounded-md px-4 py-2 text-zinc-300 hover:bg-zinc-900 hover:text-white">
                <Icon className="h-4 w-4" /> {link.label}
              </Link>
            );
          })}

          <div className="mt-4 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Marketplace</div>

          {categories.length === 0 ? (
            <p className="px-4 py-2 text-xs text-zinc-600">Loading...</p>
          ) : (
            categories.map((cat) => {
              const Icon = ICON_MAP[cat.icon] || Package;
              return (
                <Link key={cat.id} href={"/products?category=" + cat.slug} className="flex items-center justify-between rounded-md px-4 py-2 text-zinc-300 hover:bg-zinc-900 hover:text-white">
                  <span className="flex items-center gap-3"><Icon className="h-4 w-4" /> {cat.name}</span>
                  <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs text-white">0</span>
                </Link>
              );
            })
          )}
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto bg-zinc-950">
        <header className="flex h-16 items-center justify-between border-b border-zinc-800 px-4 md:px-8">
          <button onClick={() => setSidebarOpen(true)} className="text-zinc-400 hover:text-white md:hidden"><Menu className="h-5 w-5" /></button>
          <div className="hidden md:block" />
          <div className="flex items-center gap-4 text-sm md:gap-6">
            {role === "ADMIN" && (
              <Link href="/admin" className="flex items-center gap-2 text-red-500 hover:text-red-400">
                <Shield className="h-4 w-4" /> Admin
              </Link>
            )}
            <Link href="/tickets" className="flex items-center gap-2 text-red-500 hover:text-red-400">
              <Headphones className="h-4 w-4" /> Tickets
            </Link>
            <Link href="/account" className="flex items-center gap-2 text-red-500 hover:text-red-400">
              <User className="h-4 w-4" /> Account
            </Link>
          </div>
        </header>
        <div className="p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
