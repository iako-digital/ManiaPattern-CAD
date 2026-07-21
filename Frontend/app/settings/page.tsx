"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import DeleteAccountModal from "@/components/settings/DeleteAccountModal";
import SavedCardsPanel, { type SavedCard } from "@/components/settings/SavedCardsPanel";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

type AccountStatus = "ACTIVE" | "PENDING_DELETION";

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    return body.error ?? `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}

export default function SettingsPage() {
  const { t } = useTranslation();

  const [userId, setUserId] = useState("");
  const [cards, setCards] = useState<SavedCard[]>([
    { id: "demo-card-1", brand: "visa", last4: "4242", isDefault: true },
    { id: "demo-card-2", brand: "mastercard", last4: "4444", isDefault: false },
  ]);
  const [removingCardId, setRemovingCardId] = useState<string | null>(null);

  const [accountStatus, setAccountStatus] = useState<AccountStatus>("ACTIVE");
  const [scheduledFor, setScheduledFor] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(message: string) {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }

  async function handleRemoveCard(id: string) {
    if (!userId) {
      showToast(t("settings.userIdRequired"));
      return;
    }
    setRemovingCardId(id);
    try {
      const res = await fetch(`${API_BASE}/api/user/payment-methods/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok && res.status !== 404) {
        throw new Error(await readErrorMessage(res));
      }
      setCards((prev) => prev.filter((c) => c.id !== id));
      showToast(t("settings.cards.removed"));
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("settings.deleteModal.errorGeneric"));
    } finally {
      setRemovingCardId(null);
    }
  }

  async function handleConfirmDeletion(payload: { confirmation?: string; password?: string }) {
    if (!userId) throw new Error(t("settings.userIdRequired"));
    const res = await fetch(`${API_BASE}/api/user/request-deletion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, ...payload }),
    });
    if (!res.ok) throw new Error(await readErrorMessage(res));
    const body = (await res.json()) as { status: AccountStatus; scheduledPermanentDeletionAt: string };
    setAccountStatus(body.status);
    setScheduledFor(body.scheduledPermanentDeletionAt);
    setModalOpen(false);
    showToast(t("settings.deletionScheduled"));
  }

  async function handleCancelDeletion() {
    if (!userId) {
      showToast(t("settings.userIdRequired"));
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/user/cancel-deletion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) throw new Error(await readErrorMessage(res));
      setAccountStatus("ACTIVE");
      setScheduledFor(null);
      showToast(t("settings.deletionCancelled"));
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("settings.deleteModal.errorGeneric"));
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 bg-slate-950 p-8 text-slate-100">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{t("settings.title")}</h1>
          <p className="text-sm text-slate-500">{t("settings.subtitle")}</p>
        </div>
        <Link
          href="/"
          className="rounded-md border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-200 hover:border-sky-600 hover:bg-sky-900/30 hover:text-sky-200"
        >
          ← Canvas
        </Link>
      </div>

      <label className="flex flex-col gap-1 text-xs text-slate-400">
        {t("settings.userIdLabel")}
        <input
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="user-uuid"
          className="rounded-md border border-slate-800 bg-slate-900/60 px-2 py-1.5 text-sm text-slate-100 focus:border-sky-600 focus:outline-none"
        />
        <span className="text-slate-600">{t("settings.userIdHint")}</span>
      </label>

      <SavedCardsPanel cards={cards} removingId={removingCardId} onRemove={handleRemoveCard} />

      <div className="rounded-lg border border-red-900/50 bg-slate-950/80 p-4">
        <h3 className="text-sm font-semibold text-red-300">{t("settings.dangerZone")}</h3>

        {accountStatus === "ACTIVE" ? (
          <>
            <p className="mt-1 text-xs text-slate-500">{t("settings.accountStatusActive")}</p>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="mt-3 rounded-md border border-red-700 bg-red-700/90 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600"
            >
              {t("settings.deleteAccountButton")}
            </button>
          </>
        ) : (
          <>
            <p className="mt-1 text-xs text-amber-300">
              {t("settings.accountStatusPending")}
              {scheduledFor && (
                <>
                  {" "}
                  {t("settings.scheduledFor")}: {new Date(scheduledFor).toLocaleString()}
                </>
              )}
            </p>
            <button
              type="button"
              onClick={handleCancelDeletion}
              className="mt-3 rounded-md border border-emerald-700 bg-emerald-700/90 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-600"
            >
              {t("settings.cancelDeletionButton")}
            </button>
          </>
        )}
      </div>

      <DeleteAccountModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleConfirmDeletion}
      />

      {toast && (
        <div className="pointer-events-none fixed bottom-4 right-4 rounded-md border border-slate-700 bg-slate-900/95 px-3 py-2 text-xs text-slate-200 shadow-xl">
          {toast}
        </div>
      )}
    </main>
  );
}
