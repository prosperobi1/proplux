"use client";

import { useEffect, useState } from "react";
import { Shield, Trash2, ShieldOff } from "lucide-react";

type UserRow = {
  id: string;
  email: string;
  username: string;
  role: string;
  balance: number;
  createdAt: string;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const loadUsers = async () => {
    const res = await fetch("/api/admin/users");
    const data = await res.json();
    setUsers(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const changeRole = async (userId: string, newRole: string) => {
    setBusy(userId);
    const res = await fetch(`/api/admin/users/${userId}/role`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    if (res.ok) await loadUsers();
    setBusy(null);
  };

  const deleteUser = async (userId: string, username: string) => {
    if (!confirm(`Are you sure you want to delete "${username}"? This cannot be undone.`)) return;
    setBusy(userId);
    const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
    if (res.ok) {
      await loadUsers();
    } else {
      const err = await res.json();
      alert(err.error || "Failed to delete user");
    }
    setBusy(null);
  };

  const cycleRole = (role: string) => {
    if (role === "BUYER") return "SELLER";
    if (role === "SELLER") return "ADMIN";
    return "BUYER";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-red-500">Users List</h1>
        <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs text-zinc-400">
          Total: {users.length}
        </span>
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 text-left text-xs font-semibold uppercase text-red-500">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Username</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Balance</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800 bg-zinc-950">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-zinc-500">
                  Loading users...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-zinc-500">
                  No users found.
                </td>
              </tr>
            ) : (
              users.map((user, i) => {
                const isBusy = busy === user.id;
                return (
                  <tr key={user.id} className={`hover:bg-zinc-900/50 ${isBusy ? "opacity-50" : ""}`}>
                    <td className="px-4 py-3 text-red-500">{i + 1}</td>
                    <td className="px-4 py-3 text-white">{user.username}</td>
                    <td className="px-4 py-3 text-zinc-400">{user.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          user.role === "ADMIN"
                            ? "bg-red-950 text-red-500"
                            : user.role === "SELLER"
                            ? "bg-yellow-950 text-yellow-500"
                            : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-green-500">
                      ${user.balance.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-zinc-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => changeRole(user.id, cycleRole(user.role))}
                          disabled={isBusy}
                          className="rounded bg-zinc-800 p-1.5 hover:bg-zinc-700 disabled:opacity-50"
                          title={`Change role (current: ${user.role})`}
                        >
                          {user.role === "ADMIN" ? (
                            <ShieldOff className="h-3.5 w-3.5 text-yellow-400" />
                          ) : (
                            <Shield className="h-3.5 w-3.5 text-green-400" />
                          )}
                        </button>
                        <button
                          onClick={() => deleteUser(user.id, user.username)}
                          disabled={isBusy}
                          className="rounded bg-zinc-800 p-1.5 hover:bg-zinc-700 disabled:opacity-50"
                          title="Delete user"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-zinc-500">
        <strong>Role cycle:</strong> BUYER → SELLER → ADMIN → BUYER. Click the shield icon to cycle.
      </p>
    </div>
  );
}