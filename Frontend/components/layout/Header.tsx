"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/lib/i18n";
import { useAuth } from "@/components/auth/AuthProvider";
import ThemeToggle from "./ThemeToggle";

const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  ka: "🇬🇪 KA — ქართული",
  en: "🇺🇸 EN — English",
  zh: "🇨🇳 ZH — 中文",
  tr: "🇹🇷 TR — Türkçe",
  fr: "🇫🇷 FR — Français",
  it: "🇮🇹 IT — Italiano",
  hi: "🇮🇳 HI — हिन्दी",
  ru: "🇷🇺 RU — Русский",
};

interface HeaderProps {
  modelName: string;
  justSaved: boolean;
  onSave: () => void;
  onExportDxf: () => void;
  onExportHpgl: () => void;
  onExportGcode: () => void;
  onExportPdf: () => void;
}

export default function Header({
  modelName,
  justSaved,
  onSave,
  onExportDxf,
  onExportHpgl,
  onExportGcode,
  onExportPdf,
}: HeaderProps) {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  return (
    <header className="flex items-center justify-between gap-4 border-b border-slate-300 bg-white/90 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-950/90">
      <div className="flex items-center gap-3">
        <h1 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          ManiaPattern CAD
        </h1>
        <span className="h-4 w-px bg-slate-300 dark:bg-slate-700" />
        <span className="text-xs text-slate-500">{t("header.modelTitle")}:</span>
        <span className="rounded-md border border-slate-300 bg-slate-100 px-2 py-0.5 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200">
          {modelName}
        </span>
        <span className="h-4 w-px bg-slate-300 dark:bg-slate-700" />
        <Link
          href="/marketplace"
          className="rounded-md px-2 py-1 text-xs text-sky-600 transition-colors hover:bg-slate-100 hover:text-sky-700 dark:text-sky-300 dark:hover:bg-slate-800 dark:hover:text-sky-200"
        >
          {t("header.marketplace")}
        </Link>
        <Link
          href="/settings"
          className="rounded-md px-2 py-1 text-xs text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          {t("header.settings")}
        </Link>
        {user?.role === "ADMIN" && (
          <Link
            href="/admin"
            className="rounded-md px-2 py-1 text-xs text-amber-600 transition-colors hover:bg-slate-100 hover:text-amber-700 dark:text-amber-300 dark:hover:bg-slate-800 dark:hover:text-amber-200"
          >
            {t("header.admin")}
          </Link>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onSave}
          title={t("header.save") ?? undefined}
          className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-slate-100 px-3 py-1.5 text-xs text-slate-800 hover:border-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:border-emerald-600 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-200"
        >
          <span aria-hidden>💾</span>
          {justSaved ? t("header.saved") : t("header.save")}
        </button>

        <div className="flex items-center gap-1 rounded-md border border-slate-300 bg-slate-100/70 p-1 dark:border-slate-800 dark:bg-slate-900/40">
          <span className="px-1.5 text-[10px] uppercase tracking-wide text-slate-500">
            {t("header.export")}
          </span>
          <button
            type="button"
            onClick={onExportDxf}
            className="rounded-md px-2 py-1 text-xs text-slate-800 hover:bg-slate-200 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {t("header.exportDxf")}
          </button>
          <button
            type="button"
            onClick={onExportHpgl}
            className="rounded-md px-2 py-1 text-xs text-slate-800 hover:bg-slate-200 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {t("header.exportHpgl")}
          </button>
          <button
            type="button"
            onClick={onExportGcode}
            className="rounded-md px-2 py-1 text-xs text-slate-800 hover:bg-slate-200 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {t("header.exportGcode")}
          </button>
          <button
            type="button"
            onClick={onExportPdf}
            className="rounded-md px-2 py-1 text-xs text-slate-800 hover:bg-slate-200 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {t("header.exportPdf")}
          </button>
        </div>

        <select
          value={i18n.language}
          onChange={(e) => i18n.changeLanguage(e.target.value)}
          title={t("header.language") ?? undefined}
          className="rounded-md border border-slate-300 bg-slate-100 px-2 py-1.5 text-xs text-slate-800 focus:border-sky-600 focus:outline-none dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200"
        >
          {SUPPORTED_LANGUAGES.map((lng) => (
            <option key={lng} value={lng}>
              {LANGUAGE_LABELS[lng]}
            </option>
          ))}
        </select>

        <ThemeToggle />

        {user ? (
          <button
            type="button"
            onClick={handleLogout}
            title={user.email}
            className="rounded-md border border-slate-300 bg-slate-100 px-3 py-1.5 text-xs text-slate-800 hover:border-red-700 hover:bg-red-100 hover:text-red-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:border-red-700 dark:hover:bg-red-950/30 dark:hover:text-red-200"
          >
            {t("header.logout")}
          </button>
        ) : (
          <Link
            href="/login"
            className="rounded-md border border-slate-300 bg-slate-100 px-3 py-1.5 text-xs text-slate-800 hover:border-sky-600 hover:bg-sky-100 hover:text-sky-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:border-sky-600 dark:hover:bg-sky-900/30 dark:hover:text-sky-200"
          >
            {t("header.login")}
          </Link>
        )}
      </div>
    </header>
  );
}
