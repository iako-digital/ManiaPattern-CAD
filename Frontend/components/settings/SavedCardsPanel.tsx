"use client";

import { useTranslation } from "react-i18next";

export interface SavedCard {
  id: string;
  brand: string;
  last4: string;
  isDefault: boolean;
}

interface SavedCardsPanelProps {
  cards: SavedCard[];
  removingId?: string | null;
  onRemove: (id: string) => void;
}

export default function SavedCardsPanel({ cards, removingId, onRemove }: SavedCardsPanelProps) {
  const { t } = useTranslation();

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-4">
      <h3 className="text-sm font-semibold text-slate-200">{t("settings.cards.title")}</h3>

      {cards.length === 0 ? (
        <p className="mt-2 text-xs text-slate-500">{t("settings.cards.empty")}</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {cards.map((card) => (
            <li
              key={card.id}
              className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-900/60 px-3 py-2"
            >
              <div className="flex items-center gap-2 text-sm text-slate-200">
                <span className="font-medium uppercase">{card.brand}</span>
                <span className="text-slate-500">•••• {card.last4}</span>
                {card.isDefault && (
                  <span className="rounded-full border border-sky-700 bg-sky-900/40 px-2 py-0.5 text-[10px] text-sky-300">
                    {t("settings.cards.default")}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => onRemove(card.id)}
                disabled={removingId === card.id}
                className="rounded-md border border-slate-800 px-2 py-1 text-xs text-slate-400 transition-colors hover:border-red-700 hover:bg-red-950/40 hover:text-red-300 disabled:opacity-50"
              >
                {removingId === card.id ? t("settings.cards.removing") : t("settings.cards.remove")}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
