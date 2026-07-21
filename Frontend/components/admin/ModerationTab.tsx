"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { API_BASE } from "@/lib/apiBase";

interface PendingPattern {
  id: string;
  title: string;
  category: string;
  price: string;
  currency: string;
  moderationStatus: "PENDING" | "APPROVED" | "REJECTED";
  author: { id: string; email: string; name: string | null };
}

export default function ModerationTab() {
  const { t } = useTranslation();
  const [patterns, setPatterns] = useState<PendingPattern[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/patterns?status=PENDING`, { credentials: "include" });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const body = (await res.json()) as { patterns: PendingPattern[] };
      setPatterns(body.patterns);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load patterns");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function decide(id: string, decision: "approve" | "reject") {
    setBusyId(id);
    try {
      const res = await fetch(`${API_BASE}/api/admin/patterns/${id}/${decision}`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      setPatterns((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  }

  if (error) return <p className="text-sm text-red-400">{error}</p>;
  if (patterns.length === 0) return <p className="text-sm text-slate-500">{t("admin.moderation.empty")}</p>;

  return (
    <ul className="flex flex-col gap-2">
      {patterns.map((p) => (
        <li
          key={p.id}
          className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/80 px-4 py-3"
        >
          <div>
            <p className="text-sm text-slate-100">{p.title}</p>
            <p className="text-xs text-slate-500">
              {p.category} · {p.currency} {p.price} · {t("admin.moderation.byAuthor")} {p.author.email}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busyId === p.id}
              onClick={() => decide(p.id, "approve")}
              className="rounded-md border border-emerald-700 bg-emerald-700/90 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
            >
              {t("admin.moderation.approve")}
            </button>
            <button
              type="button"
              disabled={busyId === p.id}
              onClick={() => decide(p.id, "reject")}
              className="rounded-md border border-red-700 bg-red-700/90 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-50"
            >
              {t("admin.moderation.reject")}
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
