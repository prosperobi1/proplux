"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ArrowLeft, LayoutDashboard, ShoppingCart, DollarSign, Flag,
  LogOut, Menu, X, Package, Monitor, Terminal, Server, Mail,
  AtSign, Users, AlertTriangle, BookOpen, Landmark, CreditCard,
  Sparkles, Send, Shield, Zap, Globe, Cloud, Database, Smartphone,
  Key, Lock, Fingerprint, Wallet, Bitcoin,
} from "lucide-react";

const ICON_MAP = {
  Package, Monitor, Terminal, Server, Mail, AtSign, Users, AlertTriangle,
  BookOpen, Landmark, CreditCard, Sparkles, Send, Shield, Zap, Globe,
  Cloud, Database, Smartphone, Key, Lock, Fingerprint, Wallet, Bitcoin,
};

export function SellerSidebar({ children }) {
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const pathname = usePathname();
  const { data: session } = useSession();
  const username = session?.user?.name || "Seller";
  const role = session?.user?.role;
  const close = () => setOpen(false);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setCategories(d); });
  }, []);

  return (
    <div className="flex h-screen w-full bg-zinc-950 text-white">
      {open && <div className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={close} />}

      <aside className={`fixed inset-y-0 left-0 z-50 w-64 flex-shrink-0 transform border-r-4 border-red-600 bg-black transition-transform duration-200 md:relative md:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-16 items-center justify-between border-b border-zinc-800 px-6">
          <Link href="/seller" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-600">
              <span className="text-sm font-bold">P</span>
            </div>
            <span className="text-lg font-bold">Seller Panel</span>
          </Link>
          <button onClick={close} className="text-zinc-500 md:hidden"><X className="h-5 w-5" /></button>
        </div>

        <nav className="mt-4 flex flex-col gap-1 overflow-y-auto px-2 pb-4 text-sm">
          <Link href="/" className="flex items-center gap-2 px-4 py-2 text-red-500 hover:text-red-400">
            <ArrowLeft className="h-4 w-4" /> Back to Proplux Shop
          </Link>

          {role === "ADMIN" && (
            <Link href="/admin" className="flex items-center gap-2 px-4 py-2 text-yellow-500 hover:text-yellow-400">
              <Shield className="h-4 w-4" /> Go to Admin Panel
            </Link>
          )}

          <div className="mt-4 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Seller Dashboard</div>
          <Link href="/seller" className={`flex items-center gap-3 rounded-md px-4 py-2 ${pathname === "/seller" ? "bg-zinc-900 text-white" : "text-zinc-300 hover:bg-zinc-900 hover:text-white"}`}>
            <LayoutDashboard className="h-4 w-4" /> Main
          </Link>
          <Link href="/seller/sales" className={`flex items-center justify-between rounded-md px-4 py-2 ${pathname === "/seller/sales" ? "bg-zinc-900 text-white" : "text-zinc-300 hover:bg-zinc-900 hover:text-white"}`}>
            <span className="flex items-center gap-3"><ShoppingCart className="h-4 w-4" /> Sales</span>
            <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs text-white">0</span>
          </Link>
          <Link href="/seller/withdraw" className={`flex items-center gap-3 rounded-md px-4 py-2 ${pathname === "/seller/withdraw" ? "bg-zinc-900 text-white" : "text-zinc-300 hover:bg-zinc-900 hover:text-white"}`}>
            <DollarSign className="h-4 w-4" /> Withdraw
          </Link>
          <Link href="/seller/reports" className="flex items-center justify-between rounded-md px-4 py-2 text-zinc-300 hover:bg-zinc-900 hover:text-white">
            <span className="flex items-center gap-3"><Flag className="h-4 w-4" /> My Reports</span>
            <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs text-white">0</span>
          </Link>

          <div className="mt-4 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Tools Management</div>

          {categories.length === 0 ? (
            <p className="px-4 py-2 text-xs text-zinc-600">Loading tools...</p>
          ) : (
            categories.map((cat) => {
              const Icon = ICON_MAP[cat.icon] || Package;
              const href = "/seller/tools/" + cat.slug;
              const active = pathname === href;
              return (
                <Link key={cat.id} href={href} className={`flex items-center justify-between rounded-md px-4 py-2 ${active ? "bg-zinc-900 text-white" : "text-zinc-300 hover:bg-zinc-900 hover:text-white"}`}>
                  <span className="flex items-center gap-3"><Icon className="h-4 w-4" /> {cat.name}</span>
                  <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs text-white">0</span>
                </Link>
              );
            })
          )}

          <Link href="/api/auth/signout" className="mt-6 flex items-center gap-3 rounded-md px-4 py-2 text-zinc-500 hover:text-red-500">
            <LogOut className="h-4 w-4" /> Logout
          </Link>
        </nav>
      </aside>

      <main className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b border-zinc-800 px-4 md:px-8">
          <button onClick={() => setOpen(true)} className="text-zinc-400 hover:text-white md:hidden"><Menu className="h-6 w-6" /></button>
          <div className="hidden md:block" />
          <div className="flex items-center gap-4 text-sm">
            <span className="text-zinc-500">Signed in as</span>
            <span className="font-semibold text-white">{username}</span>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
