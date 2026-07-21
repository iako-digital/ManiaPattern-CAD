"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/components/auth/AuthProvider";

export default function RegisterPage() {
  const { t } = useTranslation();
  const { register } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await register(email, password, name || undefined);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.error.generic"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-8 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg border border-slate-300 bg-white/80 p-6 dark:border-slate-800 dark:bg-slate-950/80"
      >
        <h1 className="text-lg font-semibold">{t("auth.register.title")}</h1>

        <label className="mt-4 flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
          {t("auth.register.name")}
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md border border-slate-300 bg-slate-100 px-2 py-1.5 text-sm text-slate-900 focus:border-sky-600 focus:outline-none dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-100"
          />
        </label>

        <label className="mt-3 flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
          {t("auth.register.email")}
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-slate-300 bg-slate-100 px-2 py-1.5 text-sm text-slate-900 focus:border-sky-600 focus:outline-none dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-100"
          />
        </label>

        <label className="mt-3 flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
          {t("auth.register.password")}
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-slate-300 bg-slate-100 px-2 py-1.5 text-sm text-slate-900 focus:border-sky-600 focus:outline-none dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-100"
          />
        </label>

        {error && <p className="mt-3 text-xs text-red-500 dark:text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-5 w-full rounded-md border border-sky-700 bg-sky-700/90 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-60"
        >
          {t("auth.register.submit")}
        </button>

        <p className="mt-4 text-center text-xs text-slate-500">
          {t("auth.register.haveAccount")}{" "}
          <Link href="/login" className="text-sky-600 hover:text-sky-700 dark:text-sky-300 dark:hover:text-sky-200">
            {t("auth.register.loginLink")}
          </Link>
        </p>
      </form>
    </main>
  );
}
