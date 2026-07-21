"use client";

import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { ContextMenuPosition } from "./types";

interface ContextMenuProps {
  position: ContextMenuPosition | null;
  onClose: () => void;
  onSave: () => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onChangeSign: () => void;
  onAlignGrainline: () => void;
}

export default function ContextMenu({
  position,
  onClose,
  onSave,
  onSelectAll,
  onDeselectAll,
  onChangeSign,
  onAlignGrainline,
}: ContextMenuProps) {
  const { t } = useTranslation();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!position) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [position, onClose]);

  if (!position) return null;

  const items: Array<{ label: string; action: () => void }> = [
    { label: t("contextMenu.save"), action: onSave },
    { label: t("contextMenu.selectAll"), action: onSelectAll },
    { label: t("contextMenu.deselectAll"), action: onDeselectAll },
    { label: t("contextMenu.changeSign"), action: onChangeSign },
    { label: t("contextMenu.alignGrainline"), action: onAlignGrainline },
  ];

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[180px] rounded-lg border border-slate-700 bg-slate-900/95 py-1 shadow-2xl backdrop-blur"
      style={{ left: position.x, top: position.y }}
    >
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={() => {
            item.action();
            onClose();
          }}
          className="block w-full px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-sky-500/20 hover:text-sky-200"
        >
          [{item.label}]
        </button>
      ))}
    </div>
  );
}
