"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Loader2, LayoutDashboard, ShoppingCart, Store, Server, Terminal, Monitor,
  Send, Mail, AtSign, CreditCard, Landmark, Sparkles, Headphones,
  User, Menu, X, Shield, Package, AlertTriangle, BookOpen, Users,
  Zap, Globe, Cloud, Database, Smartphone, Key, Lock, Fingerprint,
  Wallet, Bitcoin, LogOut,
} from "lucide-react";
import { LogoMark } from "./components/Branding";
import { NotificationsBell } from "./components/NotificationsBell";

const ICON_MAP = {
  Package, Monitor, Terminal, Server, Mail, AtSign, Users, AlertTriangle,
  BookOpen, Landmark, CreditCard, Sparkles, Send, Shield, Zap, Globe,
  Cloud, Database, Smartphone, Key, Lock, Fingerprint, Wallet, Bitcoin,
};

function SidebarLayoutInner({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const { data: session } = useSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category") || "";

  const role = (session?.user as any)?.role || "BUYER";
  const username = (session?.user as any)?.name || "User";
  const isSellerOrAdmin = role === "SELLER" || role === "ADMIN";
  const initial = username.charAt(0).toUpperCase();

  // Auto-close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname, categoryParam]);

  // Close account menu when clicking outside
  useEffect(() => {
    const handleClick = () => setAccountMenuOpen(false);
    if (accountMenuOpen) {
      document.addEventListener("click", handleClick);
      return () => document.removeEventListener("click", handleClick);
    }
  }, [accountMenuOpen]);

  // Lock body scroll when sidebar is open
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  // Fetch categories + counts + tickets
  useEffect(() => {
    Promise.all([
      fetch("/api/categories").then((r) => r.json()),
      fetch("/api/categories/counts").then((r) => r.json()),
    ])
      .then(([cats, countData]) => {
        if (Array.isArray(cats)) setCategories(cats);
        if (countData && countData.counts) setCounts(countData.counts);
      })
      .catch(() => {});
  }, []);

  const mainLinks: { label: string; href: string; icon: any }[] = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "My Orders", href: "/orders", icon: Package },
    { label: "Marketplace", href: "/products", icon: ShoppingCart },
  ];
  if (isSellerOrAdmin) mainLinks.push({ label: "Seller Panel", href: "/seller", icon: Store });

  return (
    <div className="flex h-dvh w-full overflow-hidden">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-dvh max-h-dvh w-64 flex-shrink-0 transform flex-col border-r border-zinc-800 bg-black transition-transform duration-200 md:relative md:sticky md:top-0 md:h-dvh md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-zinc-800 px-6">
          <Link href="/dashboard" className="text-lg font-bold text-white">Home</Link>
          <button onClick={() => setSidebarOpen(false)} className="text-zinc-500 md:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-4 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2 pb-16 text-sm">
          {mainLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.label}
                href={link.href}
                className="flex items-center gap-3 rounded-md px-4 py-2 text-zinc-300 hover:bg-zinc-900 hover:text-white"
              >
                <Icon className="h-4 w-4" /> {link.label}
              </Link>
            );
          })}

          <div className="mt-4 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Marketplace
          </div>

          {categories.length === 0 ? (
            <p className="flex items-center gap-2 px-4 py-2 text-xs text-zinc-600"><Loader2 className="h-3 w-3 animate-spin" /> Loading...</p>
          ) : (
            (() => {
              // Group categories by group name; ungrouped go to "OTHER"
              const grouped: Record<string, { order: number; items: any[] }> = {};
              for (const cat of categories) {
                const gName = cat.group?.name || "OTHER";
                const gOrder = cat.group?.order ?? 999;
                if (!grouped[gName]) grouped[gName] = { order: gOrder, items: [] };
                grouped[gName].items.push(cat);
              }
              // Sort categories within each group by order
              for (const g of Object.values(grouped)) {
                g.items.sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
              }
              // Sort groups by order
              const sortedGroups = Object.entries(grouped).sort((a, b) => a[1].order - b[1].order);
              return sortedGroups.map(([gName, gData]) => (
                <div key={gName} className="mb-2">
                  <div className="mt-3 px-4 py-1 text-[10px] font-bold uppercase tracking-widest text-red-500/70">
                    {gName}
                  </div>
                  {gData.items.map((cat: any) => {
                    const Icon = (ICON_MAP as any)[cat.icon] || Package;
                    const count = counts[cat.slug] ?? 0;
                    return (
                      <Link
                        key={cat.id}
                        href={"/products?category=" + cat.slug}
                        className="flex items-center justify-between rounded-md px-4 py-2 text-zinc-300 hover:bg-zinc-900 hover:text-white"
                      >
                        <span className="flex items-center gap-3">
                          <Icon className="h-4 w-4" /> {cat.name}
                        </span>
                        <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs text-white">{count}</span>
                      </Link>
                    );
                  })}
                </div>
              ));
            })()
          )}
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto bg-zinc-950">
        <header className="flex h-16 items-center justify-between border-b border-zinc-800 px-4 md:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-zinc-400 hover:text-white md:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link href="/dashboard" className="flex items-center">
              <LogoMark size={36} />
            </Link>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            {/* Unread messages */}
            <NotificationsBell />

            {/* Account dropdown */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setAccountMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-md p-1 pr-2 text-sm text-zinc-300 hover:bg-zinc-900 hover:text-white"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-sm font-bold text-white">
                  {initial}
                </span>
                <span className="hidden max-w-[140px] truncate md:inline">{username}</span>
              </button>

              {accountMenuOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 shadow-xl">
                  <Link
                    href="/account"
                    onClick={() => setAccountMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white"
                  >
                    <User className="h-4 w-4" /> Account Settings
                  </Link>
                  {role === "ADMIN" && (
                    <Link
                      href="/admin"
                      onClick={() => setAccountMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white"
                    >
                      <Shield className="h-4 w-4 text-yellow-500" /> Admin Panel
                    </Link>
                  )}
                  {isSellerOrAdmin && (
                    <Link
                      href="/seller"
                      onClick={() => setAccountMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white"
                    >
                      <Store className="h-4 w-4 text-yellow-500" /> Seller Panel
                    </Link>
                  )}
                  <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="flex w-full items-center gap-3 border-t border-zinc-800 px-4 py-3 text-left text-sm text-red-500 hover:bg-zinc-800"
                  >
                    <LogOut className="h-4 w-4" /> Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <div className="p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="flex items-center justify-center gap-2 p-8 text-zinc-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>}>
      <SidebarLayoutInner>{children}</SidebarLayoutInner>
    </Suspense>
  );
}
