"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { API_BASE } from "@/lib/apiBase";

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  status: "ACTIVE" | "SUSPENDED" | "PENDING_DELETION";
  createdAt: string;
  scheduledPermanentDeletionAt: string | null;
}

const STATUS_COLORS: Record<AdminUser["status"], string> = {
  ACTIVE: "text-emerald-600 dark:text-emerald-300",
  SUSPENDED: "text-amber-600 dark:text-amber-300",
  PENDING_DELETION: "text-red-600 dark:text-red-300",
};

export default function UsersTab() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/users`, { credentials: "include" });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const body = (await res.json()) as { users: AdminUser[] };
      setUsers(body.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function runAction(id: string, action: "freeze" | "restore" | "purge") {
    if (action === "purge" && !window.confirm(t("admin.users.purgeConfirm") ?? "")) return;
    setBusyId(id);
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${id}/${action}`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      if (action === "purge") {
        setUsers((prev) => prev.filter((u) => u.id !== id));
      } else {
        await load();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  }

  if (error) return <p className="text-sm text-red-500 dark:text-red-400">{error}</p>;

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-300 dark:border-slate-800">
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-100 text-slate-500 dark:bg-slate-900/60">
          <tr>
            <th className="px-3 py-2">{t("admin.users.email")}</th>
            <th className="px-3 py-2">{t("admin.users.role")}</th>
            <th className="px-3 py-2">{t("admin.users.status")}</th>
            <th className="px-3 py-2">{t("admin.users.createdAt")}</th>
            <th className="px-3 py-2">{t("admin.users.actions")}</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-t border-slate-300 dark:border-slate-800">
              <td className="px-3 py-2 text-slate-800 dark:text-slate-200">{u.email}</td>
              <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{u.role}</td>
              <td className={`px-3 py-2 font-medium ${STATUS_COLORS[u.status]}`}>{u.status}</td>
              <td className="px-3 py-2 text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</td>
              <td className="px-3 py-2">
                <div className="flex gap-1.5">
                  {u.status !== "SUSPENDED" && (
                    <button
                      type="button"
                      disabled={busyId === u.id}
                      onClick={() => runAction(u.id, "freeze")}
                      className="rounded border border-slate-300 px-2 py-1 text-slate-700 hover:border-amber-600 hover:text-amber-700 disabled:opacity-50 dark:border-slate-800 dark:text-slate-300 dark:hover:text-amber-300"
                    >
                      {t("admin.users.freeze")}
                    </button>
                  )}
                  {u.status !== "ACTIVE" && (
                    <button
                      type="button"
                      disabled={busyId === u.id}
                      onClick={() => runAction(u.id, "restore")}
                      className="rounded border border-slate-300 px-2 py-1 text-slate-700 hover:border-emerald-600 hover:text-emerald-700 disabled:opacity-50 dark:border-slate-800 dark:text-slate-300 dark:hover:text-emerald-300"
                    >
                      {t("admin.users.restore")}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busyId === u.id}
                    onClick={() => runAction(u.id, "purge")}
                    className="rounded border border-slate-300 px-2 py-1 text-slate-700 hover:border-red-700 hover:text-red-700 disabled:opacity-50 dark:border-slate-800 dark:text-slate-300 dark:hover:text-red-300"
                  >
                    {t("admin.users.purge")}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
