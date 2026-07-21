"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { API_BASE } from "@/lib/apiBase";

interface Kpis {
  totalRevenue: number;
  platformCommission: number;
  commissionRate: number;
  trailing30dRevenue: number;
  activeUsers: number;
  totalUsers: number;
  pendingModeration: number;
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-4">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-100">{value}</p>
    </div>
  );
}

export default function KpiTab() {
  const { t } = useTranslation();
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/api/admin/kpis`, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        return (await res.json()) as Kpis;
      })
      .then((data) => {
        if (!cancelled) setKpis(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load KPIs");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <p className="text-sm text-red-400">{error}</p>;
  if (!kpis) return <p className="text-sm text-slate-500">…</p>;

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      <Stat label={t("admin.kpis.totalRevenue")} value={formatUsd(kpis.totalRevenue)} />
      <Stat label={t("admin.kpis.commission")} value={formatUsd(kpis.platformCommission)} />
      <Stat label={t("admin.kpis.trailing30d")} value={formatUsd(kpis.trailing30dRevenue)} />
      <Stat label={t("admin.kpis.activeUsers")} value={kpis.activeUsers} />
      <Stat label={t("admin.kpis.totalUsers")} value={kpis.totalUsers} />
      <Stat label={t("admin.kpis.pendingModeration")} value={kpis.pendingModeration} />
    </div>
  );
}
