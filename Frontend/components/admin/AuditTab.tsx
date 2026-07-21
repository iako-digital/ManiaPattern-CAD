"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { API_BASE } from "@/lib/apiBase";

interface AuditLogEntry {
  id: string;
  fileType: string;
  issuedAt: string;
  ipAddress: string | null;
  patternItem: { id: string; title: string };
  recipient: { id: string; email: string };
}

export default function AuditTab() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/api/admin/audit-logs`, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        return (await res.json()) as { logs: AuditLogEntry[] };
      })
      .then((body) => {
        if (!cancelled) setLogs(body.logs);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load audit logs");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <p className="text-sm text-red-400">{error}</p>;
  if (logs.length === 0) return <p className="text-sm text-slate-500">{t("admin.audit.empty")}</p>;

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-800">
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-900/60 text-slate-500">
          <tr>
            <th className="px-3 py-2">{t("admin.audit.pattern")}</th>
            <th className="px-3 py-2">{t("admin.audit.recipient")}</th>
            <th className="px-3 py-2">{t("admin.audit.fileType")}</th>
            <th className="px-3 py-2">{t("admin.audit.issuedAt")}</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className="border-t border-slate-800">
              <td className="px-3 py-2 text-slate-200">{log.patternItem.title}</td>
              <td className="px-3 py-2 text-slate-400">{log.recipient.email}</td>
              <td className="px-3 py-2 text-slate-400 uppercase">{log.fileType}</td>
              <td className="px-3 py-2 text-slate-500">{new Date(log.issuedAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
