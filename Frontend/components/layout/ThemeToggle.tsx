"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

const CYCLE: Array<"dark" | "light" | "system"> = ["dark", "light", "system"];
const ICON: Record<(typeof CYCLE)[number], string> = {
  dark: "🌙",
  light: "☀️",
  system: "🖥️",
};

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const current = (mounted ? (theme as (typeof CYCLE)[number]) : undefined) ?? "dark";

  function cycle() {
    const next = CYCLE[(CYCLE.indexOf(current) + 1) % CYCLE.length];
    setTheme(next);
  }

  return (
    <button
      type="button"
      onClick={cycle}
      title={`Theme: ${current}`}
      aria-label={`Theme: ${current}`}
      className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-slate-100 px-2.5 py-1.5 text-xs text-slate-700 hover:border-sky-500 hover:bg-sky-100 hover:text-sky-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:border-sky-600 dark:hover:bg-sky-900/30 dark:hover:text-sky-200"
    >
      <span aria-hidden>{ICON[current]}</span>
      <span className="capitalize">{current}</span>
    </button>
  );
}
