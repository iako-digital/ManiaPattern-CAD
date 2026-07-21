"use client";

import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/lib/i18n";

const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  ka: "KA",
  en: "EN",
  ru: "RU",
};

interface HeaderProps {
  modelName: string;
  justSaved: boolean;
  onSave: () => void;
  onExportDxf: () => void;
  onExportHpgl: () => void;
  onExportGcode: () => void;
}

export default function Header({
  modelName,
  justSaved,
  onSave,
  onExportDxf,
  onExportHpgl,
  onExportGcode,
}: HeaderProps) {
  const { t, i18n } = useTranslation();

  return (
    <header className="flex items-center justify-between gap-4 border-b border-slate-800 bg-slate-950/90 px-4 py-2.5">
      <div className="flex items-center gap-3">
        <h1 className="text-base font-semibold tracking-tight text-slate-100">ManiaPattern CAD</h1>
        <span className="h-4 w-px bg-slate-700" />
        <span className="text-xs text-slate-500">{t("header.modelTitle")}:</span>
        <span className="rounded-md border border-slate-800 bg-slate-900/60 px-2 py-0.5 text-xs text-slate-200">
          {modelName}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onSave}
          title={t("header.save") ?? undefined}
          className="flex items-center gap-1.5 rounded-md border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-200 hover:border-emerald-600 hover:bg-emerald-900/30 hover:text-emerald-200"
        >
          <span aria-hidden>💾</span>
          {justSaved ? t("header.saved") : t("header.save")}
        </button>

        <div className="flex items-center gap-1 rounded-md border border-slate-800 bg-slate-900/40 p-1">
          <span className="px-1.5 text-[10px] uppercase tracking-wide text-slate-500">
            {t("header.export")}
          </span>
          <button
            type="button"
            onClick={onExportDxf}
            className="rounded-md px-2 py-1 text-xs text-slate-200 hover:bg-slate-800"
          >
            {t("header.exportDxf")}
          </button>
          <button
            type="button"
            onClick={onExportHpgl}
            className="rounded-md px-2 py-1 text-xs text-slate-200 hover:bg-slate-800"
          >
            {t("header.exportHpgl")}
          </button>
          <button
            type="button"
            onClick={onExportGcode}
            className="rounded-md px-2 py-1 text-xs text-slate-200 hover:bg-slate-800"
          >
            {t("header.exportGcode")}
          </button>
        </div>

        <div className="flex items-center gap-1 rounded-md border border-slate-800 bg-slate-900/40 p-1">
          {SUPPORTED_LANGUAGES.map((lng) => (
            <button
              key={lng}
              type="button"
              onClick={() => i18n.changeLanguage(lng)}
              className={`rounded-md px-2 py-1 text-xs transition-colors ${
                i18n.language === lng
                  ? "bg-sky-500/20 text-sky-200"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              {LANGUAGE_LABELS[lng]}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
