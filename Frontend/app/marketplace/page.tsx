"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";

export default function MarketplacePage() {
  const { t } = useTranslation();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 p-8 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <h1 className="text-2xl font-semibold tracking-tight">{t("header.marketplace")}</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400">Pattern marketplace listings are coming soon.</p>
      <Link
        href="/"
        className="rounded-md border border-slate-300 bg-slate-100 px-3 py-1.5 text-xs text-slate-800 hover:border-sky-600 hover:bg-sky-100 hover:text-sky-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-sky-900/30 dark:hover:text-sky-200"
      >
        ← Back to Canvas
      </Link>
    </main>
  );
}
