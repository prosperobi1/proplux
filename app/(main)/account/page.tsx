"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { Loader2, User, Lock, Mail, Shield, LogOut, CheckCircle2, AlertCircle, Pencil, X } from "lucide-react";

type Me = {
  id: string;
  email: string;
  username: string;
  role: string;
  balance: number;
};

export default function AccountPage() {
  const { data: session, update } = useSession();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [editEmail, setEditEmail] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);

  const loadMe = () => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => {
        if (d && !d.error) setMe(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadMe();
  }, []);

  const openEdit = () => {
    if (!me) return;
    setEditEmail(me.email);
    setEditUsername(me.username);
    setEditPassword("");
    setEditError(null);
    setEditSuccess(false);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setEditError(null);
    setEditPassword("");
  };

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);
    setEditBusy(true);
    try {
      const res = await fetch("/api/me/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: editEmail,
          username: editUsername,
          currentPassword: editPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEditError(data?.error || "Failed to update profile");
        return;
      }
      setEditSuccess(true);
      setEditPassword("");
      await update();
      loadMe();
      setTimeout(() => {
        setEditing(false);
        setEditSuccess(false);
      }, 1500);
    } catch (err) {
      setEditError(String(err));
    } finally {
      setEditBusy(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(false);

    if (newPassword.length < 6) {
      setPwError("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError("New passwords do not match");
      return;
    }

    setPwBusy(true);
    try {
      const res = await fetch("/api/me/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPwError(data?.error || "Failed to update password");
        return;
      }
      setPwSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPwSuccess(false), 4000);
    } catch (err) {
      setPwError(String(err));
    } finally {
      setPwBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 p-8 text-zinc-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading...
      </div>
    );
  }

  if (!me) {
    return <div className="p-8 text-red-500">Could not load account details.</div>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-red-500">
        <User className="h-6 w-6" /> My Account
      </h1>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-zinc-400">
            <Shield className="h-4 w-4" /> Profile
          </h2>
          {!editing && (
            <button
              onClick={openEdit}
              className="flex min-h-9 items-center gap-1 rounded-md bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-700"
            >
              <Pencil className="h-3 w-3" /> Edit
            </button>
          )}
        </div>

        {editing ? (
          <form onSubmit={submitEdit} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-zinc-500">Username</label>
              <input
                type="text"
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
                required
                className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none"
              />
              <p className="mt-1 text-xs text-zinc-500">3-20 chars: letters, numbers, _ . -</p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-zinc-500">Email</label>
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                required
                className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-zinc-500">
                Current Password (to confirm)
              </label>
              <input
                type="password"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                required
                className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none"
              />
            </div>

            {editError && (
              <div className="flex items-start gap-2 rounded-md border border-red-900 bg-red-950/50 p-3 text-sm text-red-400">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" /> {editError}
              </div>
            )}
            {editSuccess && (
              <div className="flex items-start gap-2 rounded-md border border-green-900/50 bg-green-950/30 p-3 text-sm text-green-400">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" /> Profile updated.
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={editBusy}
                className="flex items-center justify-center gap-2 rounded-md py-2 px-5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: "var(--brand-color, #dc2626)" }}
              >
                {editBusy ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
                ) : (
                  "Save Changes"
                )}
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                disabled={editBusy}
                className="flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-900 px-5 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
              >
                <X className="h-3.5 w-3.5" /> Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <span className="flex items-center gap-2 text-sm text-zinc-400">
                <User className="h-4 w-4" /> Username
              </span>
              <span className="min-w-0 truncate text-sm text-white">{me.username}</span>
            </div>
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <span className="flex items-center gap-2 text-sm text-zinc-400">
                <Mail className="h-4 w-4" /> Email
              </span>
              <span className="min-w-0 truncate text-sm text-white">{me.email}</span>
            </div>
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <span className="flex items-center gap-2 text-sm text-zinc-400">
                <Shield className="h-4 w-4" /> Role
              </span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                me.role === "ADMIN" ? "bg-red-950 text-red-500" :
                me.role === "SELLER" ? "bg-yellow-950 text-yellow-500" :
                "bg-zinc-800 text-zinc-400"
              }`}>{me.role}</span>
            </div>
            <div className="flex items-center justify-between pb-1">
              <span className="text-sm text-zinc-400">Balance</span>
              <span className="text-sm font-semibold text-green-500">
                ${me.balance.toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-6">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-zinc-400">
          <Lock className="h-4 w-4" /> Change Password
        </h2>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-zinc-500">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-zinc-500">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-zinc-500">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none"
            />
          </div>

          {pwError && (
            <div className="flex items-start gap-2 rounded-md border border-red-900 bg-red-950/50 p-3 text-sm text-red-400">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" /> {pwError}
            </div>
          )}
          {pwSuccess && (
            <div className="flex items-start gap-2 rounded-md border border-green-900/50 bg-green-950/30 p-3 text-sm text-green-400">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" /> Password updated successfully.
            </div>
          )}

          <button
            type="submit"
            disabled={pwBusy}
            className="flex items-center justify-center gap-2 rounded-md py-3 px-6 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "var(--brand-color, #dc2626)" }}
          >
            {pwBusy ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Updating…</>
            ) : (
              "Update Password"
            )}
          </button>
        </form>
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-6">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-zinc-400">
          <LogOut className="h-4 w-4" /> Session
        </h2>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="rounded-md border border-red-700 px-4 py-2 text-sm font-semibold text-red-500 hover:bg-red-950"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
