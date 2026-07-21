"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { API_BASE } from "@/lib/apiBase";

interface InfraStatus {
  dbHealthy: boolean;
  uptimeSeconds: number;
  nodeVersion: string;
  blobStorageConfigured: boolean;
  exportQueue: { implemented: boolean; note: string };
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

export default function InfraTab() {
  const { t } = useTranslation();
  const [infra, setInfra] = useState<InfraStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/api/admin/infra`, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        return (await res.json()) as InfraStatus;
      })
      .then((data) => {
        if (!cancelled) setInfra(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load infra status");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <p className="text-sm text-red-400">{error}</p>;
  if (!infra) return <p className="text-sm text-slate-500">…</p>;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-4">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Database</p>
          <p className={`mt-1 text-sm font-medium ${infra.dbHealthy ? "text-emerald-300" : "text-red-300"}`}>
            {infra.dbHealthy ? t("admin.infra.dbHealthy") : t("admin.infra.dbDown")}
          </p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-4">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">{t("admin.infra.uptime")}</p>
          <p className="mt-1 text-sm font-medium text-slate-100">{formatUptime(infra.uptimeSeconds)}</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-4">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">{t("admin.infra.nodeVersion")}</p>
          <p className="mt-1 text-sm font-medium text-slate-100">{infra.nodeVersion}</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-4">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Azure Blob</p>
          <p
            className={`mt-1 text-sm font-medium ${infra.blobStorageConfigured ? "text-emerald-300" : "text-slate-400"}`}
          >
            {infra.blobStorageConfigured ? t("admin.infra.blobConfigured") : t("admin.infra.blobNotConfigured")}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-4">
        <p className="text-[11px] uppercase tracking-wide text-slate-500">{t("admin.infra.exportQueueTitle")}</p>
        <p className="mt-1 text-xs text-amber-300">{infra.exportQueue.note}</p>
      </div>
    </div>
  );
}
