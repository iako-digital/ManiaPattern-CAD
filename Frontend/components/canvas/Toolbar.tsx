"use client";

import { useTranslation } from "react-i18next";
import type { ToolId } from "./types";

interface ToolbarProps {
  activeTool: ToolId;
  onSelectTool: (tool: ToolId) => void;
  annotationText: string;
  onAnnotationTextChange: (value: string) => void;
  annotationRotation: number;
  onAnnotationRotationChange: (value: number) => void;
  onGenerateSleeve: () => void;
  onGenerateWaistband: () => void;
  onExtractSubpiece: () => void;
  onSmoothSpline: () => void;
  onAlignAxis: () => void;
}

function ToolButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-md border px-2 py-1.5 text-left text-xs transition-colors ${
        active
          ? "border-sky-500 bg-sky-500/20 text-sky-200"
          : "border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-600 hover:bg-slate-800"
      }`}
    >
      {children}
    </button>
  );
}

function ActionButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-md border border-slate-800 bg-slate-900/60 px-2 py-1.5 text-left text-xs text-slate-300 transition-colors hover:border-emerald-600 hover:bg-emerald-900/30 hover:text-emerald-200"
    >
      {children}
    </button>
  );
}

function GroupPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-2 shadow-lg backdrop-blur">
      <h3 className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h3>
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  );
}

export default function Toolbar({
  activeTool,
  onSelectTool,
  annotationText,
  onAnnotationTextChange,
  annotationRotation,
  onAnnotationRotationChange,
  onGenerateSleeve,
  onGenerateWaistband,
  onExtractSubpiece,
  onSmoothSpline,
  onAlignAxis,
}: ToolbarProps) {
  const { t } = useTranslation();

  return (
    <div className="pointer-events-auto flex w-56 flex-col gap-2 overflow-y-auto pr-1">
      <GroupPanel title={t("toolbar.groups.point.title")}>
        <ToolButton active={activeTool === "point"} onClick={() => onSelectTool("point")}>
          {t("toolbar.groups.point.point")}
        </ToolButton>
        <ToolButton active={activeTool === "hole"} onClick={() => onSelectTool("hole")}>
          {t("toolbar.groups.point.hole")}
        </ToolButton>
      </GroupPanel>

      <GroupPanel title={t("toolbar.groups.notch.title")}>
        <ToolButton active={activeTool === "notch"} onClick={() => onSelectTool("notch")}>
          {t("toolbar.groups.notch.typology1")}
        </ToolButton>
      </GroupPanel>

      <GroupPanel title={t("toolbar.groups.digitize.title")}>
        <ToolButton active={activeTool === "digitize-line"} onClick={() => onSelectTool("digitize-line")}>
          {t("toolbar.groups.digitize.line")}
        </ToolButton>
        <ToolButton active={activeTool === "digitize-bezier"} onClick={() => onSelectTool("digitize-bezier")}>
          {t("toolbar.groups.digitize.bezier")}
        </ToolButton>
      </GroupPanel>

      <GroupPanel title={t("toolbar.groups.annotation.title")}>
        <input
          value={annotationText}
          onChange={(e) => onAnnotationTextChange(e.target.value)}
          placeholder={t("toolbar.groups.annotation.placeholder") ?? undefined}
          className="w-full rounded-md border border-slate-800 bg-slate-900/60 px-2 py-1 text-xs text-slate-200 placeholder:text-slate-600 focus:border-sky-600 focus:outline-none"
        />
        <label className="flex items-center gap-2 px-1 text-[11px] text-slate-400">
          {t("toolbar.groups.annotation.rotation")}
          <input
            type="number"
            value={annotationRotation}
            onChange={(e) => onAnnotationRotationChange(Number(e.target.value))}
            className="w-16 rounded-md border border-slate-800 bg-slate-900/60 px-1.5 py-0.5 text-xs text-slate-200 focus:border-sky-600 focus:outline-none"
          />
        </label>
        <ToolButton active={activeTool === "annotation"} onClick={() => onSelectTool("annotation")}>
          {t("toolbar.groups.annotation.place")}
        </ToolButton>
      </GroupPanel>

      <GroupPanel title={t("toolbar.groups.macros.title")}>
        <ActionButton onClick={onGenerateSleeve}>{t("toolbar.groups.macros.sleeve")}</ActionButton>
        <ActionButton onClick={onGenerateWaistband}>{t("toolbar.groups.macros.waistband")}</ActionButton>
        <ActionButton onClick={onExtractSubpiece}>{t("toolbar.groups.macros.extract")}</ActionButton>
      </GroupPanel>

      <GroupPanel title={t("toolbar.groups.geometry.title")}>
        <ToolButton active={activeTool === "warp-node"} onClick={() => onSelectTool("warp-node")}>
          {t("toolbar.groups.geometry.warp")}
        </ToolButton>
        <ActionButton onClick={onSmoothSpline}>{t("toolbar.groups.geometry.smooth")}</ActionButton>
        <ActionButton onClick={onAlignAxis}>{t("toolbar.groups.geometry.align")}</ActionButton>
      </GroupPanel>
    </div>
  );
}
