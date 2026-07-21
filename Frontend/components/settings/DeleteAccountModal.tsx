"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";

interface DeleteAccountModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (payload: { confirmation?: string; password?: string }) => Promise<void>;
}

export default function DeleteAccountModal({ open, onClose, onConfirm }: DeleteAccountModalProps) {
  const { t } = useTranslation();
  const [confirmText, setConfirmText] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const isReady = confirmText.trim() === "DELETE" || password.length > 0;

  function reset() {
    setConfirmText("");
    setPassword("");
    setError(null);
    setSubmitting(false);
  }

  async function handleConfirm() {
    if (!isReady || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm(
        confirmText.trim() === "DELETE" ? { confirmation: "DELETE" } : { password },
      );
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("settings.deleteModal.errorGeneric"));
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg border border-red-900/60 bg-slate-950 p-5 shadow-2xl">
        <h2 className="text-base font-semibold text-red-300">{t("settings.deleteModal.title")}</h2>

        <p className="mt-3 rounded-md border border-red-900/50 bg-red-950/30 p-3 text-xs leading-relaxed text-red-200">
          {t("settings.deleteModal.warning")}
        </p>

        <div className="mt-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-xs text-slate-400">
            {t("settings.deleteModal.typeDelete")}
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
              className="rounded-md border border-slate-800 bg-slate-900/60 px-2 py-1.5 text-sm tracking-widest text-slate-100 placeholder:text-slate-700 focus:border-red-600 focus:outline-none"
            />
          </label>

          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-slate-600">
            <span className="h-px flex-1 bg-slate-800" />
            {t("settings.deleteModal.or")}
            <span className="h-px flex-1 bg-slate-800" />
          </div>

          <label className="flex flex-col gap-1 text-xs text-slate-400">
            {t("settings.deleteModal.passwordLabel")}
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-md border border-slate-800 bg-slate-900/60 px-2 py-1.5 text-sm text-slate-100 focus:border-red-600 focus:outline-none"
            />
          </label>
        </div>

        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              reset();
              onClose();
            }}
            className="rounded-md border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
          >
            {t("settings.deleteModal.cancel")}
          </button>
          <button
            type="button"
            disabled={!isReady || submitting}
            onClick={handleConfirm}
            className="rounded-md border border-red-700 bg-red-700/90 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-slate-800 disabled:text-slate-500"
          >
            {submitting ? t("settings.deleteModal.confirming") : t("settings.deleteModal.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
