"use client";

import { useEffect, useRef } from "react";
import paper from "paper";

export default function PaperCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    paper.setup(canvas);

    const path = new paper.Path.Rectangle({
      point: [40, 40],
      size: [160, 100],
      strokeColor: new paper.Color("#38bdf8"),
      strokeWidth: 2,
    });
    path.fillColor = new paper.Color(0.15, 0.2, 0.3, 0.4);

    paper.view.update();

    return () => {
      paper.project?.clear();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="h-full w-full rounded-lg border border-slate-800 bg-slate-900"
      data-paper-resize="true"
    />
  );
}
