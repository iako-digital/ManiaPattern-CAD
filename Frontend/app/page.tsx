"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Header from "@/components/canvas/Header";
import Toolbar from "@/components/canvas/Toolbar";
import ContextMenu from "@/components/canvas/ContextMenu";
import { useHotkeys } from "@/components/canvas/useHotkeys";
import type { CanvasHandle, CanvasStatus, ContextMenuPosition, ToolId } from "@/components/canvas/types";

const PaperCanvas = dynamic(() => import("@/components/canvas/PaperCanvas"), {
  ssr: false,
});

const TOOL_KEY: Record<ToolId, string> = {
  select: "tools.select",
  point: "tools.point",
  hole: "tools.hole",
  notch: "tools.notch",
  "digitize-line": "tools.digitizeLine",
  "digitize-bezier": "tools.digitizeBezier",
  annotation: "tools.annotation",
  "warp-node": "tools.warpNode",
};

export default function HomePage() {
  const { t } = useTranslation();
  const canvasRef = useRef<CanvasHandle>(null);

  const [activeTool, setActiveTool] = useState<ToolId>("select");
  const [annotationText, setAnnotationText] = useState("");
  const [annotationRotation, setAnnotationRotation] = useState(0);
  const [contextMenuPos, setContextMenuPos] = useState<ContextMenuPosition | null>(null);
  const [status, setStatus] = useState<CanvasStatus>({ zoomPercent: 100, toolId: "select", selectionCount: 0 });
  const [justSaved, setJustSaved] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(message: string) {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2000);
  }

  function handleSave() {
    canvasRef.current?.save();
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1500);
  }

  useHotkeys({
    onUnfold: () => canvasRef.current?.unfold(),
    onAutoCenter: () => canvasRef.current?.autoCenter(),
    onAlignmentSnap: () => canvasRef.current?.alignmentSnap(),
    onClearStage: () => canvasRef.current?.clearStage(),
  });

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-950 text-slate-100">
      <Header
        modelName={t("header.untitled")}
        justSaved={justSaved}
        onSave={handleSave}
        onExportDxf={() => canvasRef.current?.exportDxf()}
        onExportHpgl={() => canvasRef.current?.exportHpgl()}
        onExportGcode={() => canvasRef.current?.exportGcode()}
      />

      <div className="relative flex flex-1 gap-3 overflow-hidden p-3">
        <Toolbar
          activeTool={activeTool}
          onSelectTool={setActiveTool}
          annotationText={annotationText}
          onAnnotationTextChange={setAnnotationText}
          annotationRotation={annotationRotation}
          onAnnotationRotationChange={setAnnotationRotation}
          onGenerateSleeve={() => canvasRef.current?.generateSleeve()}
          onGenerateWaistband={() => canvasRef.current?.generateWaistband()}
          onExtractSubpiece={() => canvasRef.current?.extractSubpiece()}
          onSmoothSpline={() => canvasRef.current?.smoothSpline()}
          onAlignAxis={() => canvasRef.current?.alignAxis()}
        />

        <div className="relative flex-1">
          <PaperCanvas
            ref={canvasRef}
            activeTool={activeTool}
            annotationText={annotationText}
            annotationRotation={annotationRotation}
            onContextMenuRequest={setContextMenuPos}
            onStatusChange={setStatus}
            onToast={showToast}
          />

          <div className="pointer-events-none absolute bottom-2 left-2 flex items-center gap-3 rounded-md border border-slate-800 bg-slate-950/80 px-3 py-1 text-[11px] text-slate-400 backdrop-blur">
            <span>{t("canvas.gridLabel")}</span>
            <span className="h-3 w-px bg-slate-700" />
            <span>
              {t("status.zoom")}: {status.zoomPercent}%
            </span>
            <span>
              {t("status.tool")}: {t(TOOL_KEY[status.toolId])}
            </span>
            <span>
              {t("status.selection")}: {status.selectionCount}
            </span>
          </div>

          {toast && (
            <div className="pointer-events-none absolute bottom-2 right-2 rounded-md border border-emerald-700 bg-emerald-950/80 px-3 py-1 text-[11px] text-emerald-200 backdrop-blur">
              {toast}
            </div>
          )}
        </div>
      </div>

      <ContextMenu
        position={contextMenuPos}
        onClose={() => setContextMenuPos(null)}
        onSave={handleSave}
        onSelectAll={() => canvasRef.current?.selectAll()}
        onDeselectAll={() => canvasRef.current?.deselectAll()}
        onChangeSign={() => canvasRef.current?.changeSign()}
        onAlignGrainline={() => canvasRef.current?.alignGrainline()}
      />
    </div>
  );
}
