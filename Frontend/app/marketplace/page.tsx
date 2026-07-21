"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";

export default function MarketplacePage() {
  const { t } = useTranslation();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 p-8 text-slate-100">
      <h1 className="text-2xl font-semibold tracking-tight">{t("header.marketplace")}</h1>
      <p className="text-sm text-slate-400">Pattern marketplace listings are coming soon.</p>
      <Link
        href="/"
        className="rounded-md border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-200 hover:border-sky-600 hover:bg-sky-900/30 hover:text-sky-200"
      >
        ← Back to Canvas
      </Link>
    </main>
  );
}
