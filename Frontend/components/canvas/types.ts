export type ToolId =
  | "select"
  | "point"
  | "hole"
  | "notch"
  | "digitize-line"
  | "digitize-bezier"
  | "annotation"
  | "warp-node";

export interface CanvasStatus {
  zoomPercent: number;
  toolId: ToolId;
  selectionCount: number;
}

export interface CanvasHandle {
  unfold: () => void;
  autoCenter: () => void;
  alignmentSnap: () => void;
  clearStage: () => void;
  selectAll: () => void;
  deselectAll: () => void;
  changeSign: () => void;
  alignGrainline: () => void;
  save: () => void;
  exportDxf: () => void;
  exportHpgl: () => void;
  exportGcode: () => void;
  exportPdf: () => void;
  generateSleeve: () => void;
  generateWaistband: () => void;
  extractSubpiece: () => void;
  smoothSpline: () => void;
  alignAxis: () => void;
}

export interface ContextMenuPosition {
  x: number;
  y: number;
}
