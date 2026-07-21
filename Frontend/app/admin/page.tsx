"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/components/auth/AuthProvider";
import KpiTab from "@/components/admin/KpiTab";
import UsersTab from "@/components/admin/UsersTab";
import ModerationTab from "@/components/admin/ModerationTab";
import InfraTab from "@/components/admin/InfraTab";
import AuditTab from "@/components/admin/AuditTab";

type TabId = "kpis" | "users" | "moderation" | "infra" | "audit";

const TABS: { id: TabId; labelKey: string }[] = [
  { id: "kpis", labelKey: "admin.tabs.kpis" },
  { id: "users", labelKey: "admin.tabs.users" },
  { id: "moderation", labelKey: "admin.tabs.moderation" },
  { id: "infra", labelKey: "admin.tabs.infra" },
  { id: "audit", labelKey: "admin.tabs.audit" },
];

export default function AdminPage() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("kpis");

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">…</main>
    );
  }

  if (!user || user.role !== "ADMIN") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 p-8 text-slate-100">
        <p className="text-sm text-slate-400">{t("admin.accessDenied")}</p>
        <Link
          href="/"
          className="rounded-md border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-200 hover:border-sky-600 hover:bg-sky-900/30 hover:text-sky-200"
        >
          ← Canvas
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-5 bg-slate-950 p-8 text-slate-100">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">{t("admin.title")}</h1>
        <Link
          href="/"
          className="rounded-md border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-200 hover:border-sky-600 hover:bg-sky-900/30 hover:text-sky-200"
        >
          ← Canvas
        </Link>
      </div>

      <div className="flex flex-wrap gap-1 rounded-lg border border-slate-800 bg-slate-900/40 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-md px-3 py-1.5 text-xs transition-colors ${
              activeTab === tab.id
                ? "bg-sky-500/20 text-sky-200"
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      <div>
        {activeTab === "kpis" && <KpiTab />}
        {activeTab === "users" && <UsersTab />}
        {activeTab === "moderation" && <ModerationTab />}
        {activeTab === "infra" && <InfraTab />}
        {activeTab === "audit" && <AuditTab />}
      </div>
    </main>
  );
}
