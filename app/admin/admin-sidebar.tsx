"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard, DollarSign, ShoppingCart, Newspaper, Eye, Clock,
  AlertTriangle, Users, CreditCard, Bitcoin, Flame, Headphones,
  LogOut, ArrowLeft, Menu, X, Package, Settings, Layers, UserPlus,
} from "lucide-react";
import { NotificationsBell } from "../components/NotificationsBell";

const Badge = ({ value }: { value: number }) => (
  <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs text-white">{value}</span>
);

export function AdminSidebar({ children }: { children: React.ReactNode }) {  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const [counts, setCounts] = useState({ pendingTickets: 0, pendingReports: 0, pendingWithdrawals: 0, pendingSellerRequests: 0 });
  const close = () => setSidebarOpen(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    fetch("/api/admin/counts")
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) setCounts({
          pendingTickets: d.pendingTickets ?? 0,
          pendingReports: d.pendingReports ?? 0,
          pendingWithdrawals: d.pendingWithdrawals ?? 0,
          pendingSellerRequests: d.pendingSellerRequests ?? 0,
        });
      })
      .catch(() => {});
  }, []);

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-zinc-950 text-white">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={close} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-dvh max-h-dvh w-64 flex-shrink-0 transform flex-col border-l-4 border-red-600 bg-black transition-transform duration-200 md:sticky md:top-0 md:h-dvh md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-zinc-800 px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-600">
              <Flame className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold">Admin Panel</span>
          </div>
          <div className="flex items-center gap-1">
            <NotificationsBell anchor="left" />
            <button onClick={close} className="flex min-h-10 min-w-10 items-center justify-center p-2.5 text-zinc-500 md:hidden">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <nav className="mt-4 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2 pb-16 text-sm">
          <Link href="/dashboard" onClick={close} className="flex items-center gap-2 px-4 py-2 text-red-500 hover:text-red-400">
            <ArrowLeft className="h-4 w-4" /> Back to Shop
          </Link>

          <Link href="/admin" onClick={close} className="mt-2 flex items-center gap-3 rounded-md bg-zinc-900 px-4 py-2 text-white">
            <LayoutDashboard className="h-4 w-4" /> Admin Dashboard
          </Link>

          <div className="mt-4 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Management
          </div>
          <Link href="/admin" onClick={close} className="flex items-center gap-3 rounded-md px-4 py-2 text-zinc-300 hover:bg-zinc-900 hover:text-white">
            <LayoutDashboard className="h-4 w-4" /> Main
          </Link>
          <Link href="/admin/category-groups" onClick={close} className="flex items-center gap-3 rounded-md px-4 py-2 text-zinc-300 hover:bg-zinc-900 hover:text-white">
            <Layers className="h-4 w-4" /> Category Groups
          </Link>
          <Link href="/admin/categories" onClick={close} className="flex items-center gap-3 rounded-md px-4 py-2 text-zinc-300 hover:bg-zinc-900 hover:text-white">
            <Package className="h-4 w-4" /> Categories
          </Link>
          <Link href="/admin/settings" onClick={close} className="flex items-center gap-3 rounded-md px-4 py-2 text-zinc-300 hover:bg-zinc-900 hover:text-white">
            <Settings className="h-4 w-4" /> Site Settings
          </Link>
          <Link href="/admin/financial" onClick={close} className="flex items-center gap-3 rounded-md px-4 py-2 text-zinc-300 hover:bg-zinc-900 hover:text-white">
            <DollarSign className="h-4 w-4" /> Financial Status
          </Link>
          <Link href="/admin/payments" onClick={close} className="flex items-center gap-3 rounded-md px-4 py-2 text-zinc-300 hover:bg-zinc-900 hover:text-white">
            <CreditCard className="h-4 w-4" /> Payments
          </Link>
          <Link href="/admin/orders" onClick={close} className="flex items-center gap-3 rounded-md px-4 py-2 text-zinc-300 hover:bg-zinc-900 hover:text-white">
            <ShoppingCart className="h-4 w-4" /> Orders
          </Link>
          <Link href="/admin/news" onClick={close} className="flex items-center gap-3 rounded-md px-4 py-2 text-zinc-300 hover:bg-zinc-900 hover:text-white">
            <Newspaper className="h-4 w-4" /> Add News
          </Link>
          <Link href="/admin/tools" onClick={close} className="flex items-center gap-3 rounded-md px-4 py-2 text-zinc-300 hover:bg-zinc-900 hover:text-white">
            <Eye className="h-4 w-4" /> Visualize Tools
          </Link>

          <div className="mt-4 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Support & Users
          </div>
          <Link href="/admin/tickets" onClick={close} className="flex items-center justify-between rounded-md px-4 py-2 text-zinc-300 hover:bg-zinc-900 hover:text-white">
            <span className="flex items-center gap-3"><Clock className="h-4 w-4" /> Pending Tickets</span>
            <Badge value={counts.pendingTickets} />
          </Link>
          <Link href="/admin/reports" onClick={close} className="flex items-center justify-between rounded-md px-4 py-2 text-zinc-300 hover:bg-zinc-900 hover:text-white">
            <span className="flex items-center gap-3"><AlertTriangle className="h-4 w-4" /> Pending Reports</span>
            <Badge value={counts.pendingReports} />
          </Link>
          <Link href="/admin/seller-requests" onClick={close} className="flex items-center justify-between rounded-md px-4 py-2 text-zinc-300 hover:bg-zinc-900 hover:text-white">
            <span className="flex items-center gap-3"><UserPlus className="h-4 w-4" /> Seller Requests</span>
            <Badge value={counts.pendingSellerRequests} />
          </Link>
          <Link href="/admin/users" onClick={close} className="flex items-center gap-3 rounded-md px-4 py-2 text-zinc-300 hover:bg-zinc-900 hover:text-white">
            <Users className="h-4 w-4" /> Users List
          </Link>
          <Link href="/admin/withdrawals" onClick={close} className="flex items-center justify-between rounded-md px-4 py-2 text-zinc-300 hover:bg-zinc-900 hover:text-white">
            <span className="flex items-center gap-3"><CreditCard className="h-4 w-4" /> Withdraw Approval</span>
            <Badge value={counts.pendingWithdrawals} />
          </Link>
          <Link href="/admin/sellers" onClick={close} className="flex items-center gap-3 rounded-md px-4 py-2 text-zinc-300 hover:bg-zinc-900 hover:text-white">
            <Flame className="h-4 w-4" /> Sellers
          </Link>

          <Link href="/api/auth/signout" className="mt-6 flex items-center gap-3 rounded-md px-4 py-2 text-zinc-500 hover:text-red-500">
            <LogOut className="h-4 w-4" /> Logout
          </Link>
        </nav>
      </aside>

      <main className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center border-b border-zinc-800 px-4 md:hidden">
          <button onClick={() => setSidebarOpen(true)} className="flex min-h-10 min-w-10 items-center justify-center p-2.5 text-zinc-400 hover:text-white">
            <Menu className="h-6 w-6" />
          </button>
          <span className="ml-4 font-bold">Admin Panel</span>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
