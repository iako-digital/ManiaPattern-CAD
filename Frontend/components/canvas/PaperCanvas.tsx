"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import paper from "paper";
import type {
  CanvasHandle,
  CanvasStatus,
  ContextMenuPosition,
  ToolId,
} from "./types";

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 40;
const DEFAULT_ZOOM = 4; // px per mm
const NOTCH_DEPTH_MM = 4;
const HIT_TOLERANCE_PX = 7;

type DragMode =
  | { kind: "none" }
  | { kind: "pan"; startClientX: number; startClientY: number; startCenter: paper.Point }
  | { kind: "marquee"; startMm: paper.Point; additive: boolean }
  | { kind: "drag-piece"; piece: paper.Group; startMm: paper.Point; startPos: paper.Point }
  | {
      kind: "drag-anchor";
      piece: paper.Group;
      path: paper.Path;
      segmentIndex: number;
    }
  | {
      kind: "drag-handle";
      piece: paper.Group;
      path: paper.Path;
      segmentIndex: number;
      which: "handleIn" | "handleOut";
      mirror: boolean;
    }
  | { kind: "digitize-handle"; path: paper.Path; segmentIndex: number };

interface HandleTarget {
  type: "anchor" | "handleIn" | "handleOut";
  piece: paper.Group;
  path: paper.Path;
  segmentIndex: number;
  pointMm: paper.Point;
}

export interface PaperCanvasProps {
  activeTool: ToolId;
  annotationText: string;
  annotationRotation: number;
  onContextMenuRequest: (pos: ContextMenuPosition) => void;
  onStatusChange: (status: CanvasStatus) => void;
  onToast: (message: string) => void;
}

function polylinesFromPath(path: paper.Path): number[][][] {
  const clone = path.clone({ insert: false, deep: false }) as paper.Path;
  clone.flatten(0.75);
  const pts: number[][] = clone.segments.map((s) => [
    Math.round(s.point.x * 100) / 100,
    Math.round(s.point.y * 100) / 100,
  ]);
  if (clone.closed && pts.length > 0) pts.push(pts[0]);
  clone.remove();
  return pts.length > 1 ? [pts] : [];
}

function collectPolylines(artLayer: paper.Layer): number[][][] {
  const out: number[][][] = [];
  for (const child of artLayer.children) {
    if (child.data?.kind !== "piece") continue;
    const group = child as paper.Group;
    for (const sub of group.children) {
      if (sub instanceof paper.Path) {
        out.push(...polylinesFromPath(sub));
      }
    }
  }
  return out;
}

function buildDxf(polylines: number[][][]): string {
  const lines: string[] = ["0", "SECTION", "2", "ENTITIES"];
  polylines.forEach((poly) => {
    lines.push("0", "LWPOLYLINE", "8", "PATTERN", "90", String(poly.length), "70", "0");
    poly.forEach(([x, y]) => {
      lines.push("10", x.toFixed(3), "20", (-y).toFixed(3));
    });
  });
  lines.push("0", "ENDSEC", "0", "EOF");
  return lines.join("\n");
}

function buildHpgl(polylines: number[][][]): string {
  const UNITS_PER_MM = 40; // HPGL default plotter unit = 1/40 mm
  const parts: string[] = ["IN;", "SP1;"];
  polylines.forEach((poly) => {
    if (poly.length === 0) return;
    const [x0, y0] = poly[0];
    parts.push(`PU${Math.round(x0 * UNITS_PER_MM)},${Math.round(-y0 * UNITS_PER_MM)};`);
    const rest = poly
      .slice(1)
      .map(([x, y]) => `${Math.round(x * UNITS_PER_MM)},${Math.round(-y * UNITS_PER_MM)}`)
      .join(",");
    if (rest) parts.push(`PD${rest};`);
  });
  parts.push("PU;", "SP0;");
  return parts.join("\n");
}

function buildGcode(polylines: number[][][]): string {
  const lines: string[] = ["; ManiaPattern CAD - cutter export", "G21", "G90"];
  polylines.forEach((poly, idx) => {
    if (poly.length === 0) return;
    lines.push(`; piece ${idx + 1}`);
    const [x0, y0] = poly[0];
    lines.push("G0 Z5", `G0 X${x0.toFixed(2)} Y${y0.toFixed(2)}`, "G1 Z0 F300");
    poly.slice(1).forEach(([x, y]) => {
      lines.push(`G1 X${x.toFixed(2)} Y${y.toFixed(2)} F800`);
    });
  });
  lines.push("G0 Z5", "M2");
  return lines.join("\n");
}

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const PaperCanvas = forwardRef<CanvasHandle, PaperCanvasProps>(function PaperCanvas(
  { activeTool, annotationText, annotationRotation, onContextMenuRequest, onStatusChange, onToast },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gridCanvasRef = useRef<HTMLCanvasElement>(null);
  const paperCanvasRef = useRef<HTMLCanvasElement>(null);

  const scopeRef = useRef<paper.PaperScope | null>(null);
  const artLayerRef = useRef<paper.Layer | null>(null);
  const uiLayerRef = useRef<paper.Layer | null>(null);

  const zoomRef = useRef(DEFAULT_ZOOM);
  const centerRef = useRef(new paper.Point(0, 0));
  const sizeRef = useRef({ width: 0, height: 0 });

  const toolRef = useRef<ToolId>(activeTool);
  const annotationTextRef = useRef(annotationText);
  const annotationRotationRef = useRef(annotationRotation);

  const selectedPiecesRef = useRef<Set<paper.Group>>(new Set());
  const handleTargetsRef = useRef<HandleTarget[]>([]);
  const dragRef = useRef<DragMode>({ kind: "none" });
  const digitizePathRef = useRef<paper.Path | null>(null);
  const marqueeItemRef = useRef<paper.Path | null>(null);

  const onStatusChangeRef = useRef(onStatusChange);
  const onToastRef = useRef(onToast);
  const onContextMenuRequestRef = useRef(onContextMenuRequest);
  useEffect(() => {
    onStatusChangeRef.current = onStatusChange;
    onToastRef.current = onToast;
    onContextMenuRequestRef.current = onContextMenuRequest;
  });

  useEffect(() => {
    toolRef.current = activeTool;
    dragRef.current = { kind: "none" };
    scheduleDraw();
    pushStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTool]);
  useEffect(() => {
    annotationTextRef.current = annotationText;
  }, [annotationText]);
  useEffect(() => {
    annotationRotationRef.current = annotationRotation;
  }, [annotationRotation]);

  function screenToMm(clientX: number, clientY: number): paper.Point {
    const canvas = paperCanvasRef.current;
    if (!canvas) return new paper.Point(0, 0);
    const rect = canvas.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    const { width, height } = sizeRef.current;
    const zoom = zoomRef.current;
    const c = centerRef.current;
    return new paper.Point(
      c.x + (sx - width / 2) / zoom,
      c.y + (sy - height / 2) / zoom,
    );
  }

  function pushStatus() {
    onStatusChangeRef.current({
      zoomPercent: Math.round((zoomRef.current / DEFAULT_ZOOM) * 100),
      toolId: toolRef.current,
      selectionCount: selectedPiecesRef.current.size,
    });
  }

  function applyView() {
    const scope = scopeRef.current;
    if (!scope) return;
    scope.view.zoom = zoomRef.current;
    scope.view.center = centerRef.current;
  }

  let rafHandle: number | null = null;
  function scheduleDraw() {
    if (rafHandle !== null) return;
    rafHandle = requestAnimationFrame(() => {
      rafHandle = null;
      applyView();
      drawGrid();
      refreshHandles();
    });
  }

  function drawGrid() {
    const canvas = gridCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { width, height } = sizeRef.current;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#020617";
    ctx.fillRect(0, 0, width, height);

    const zoom = zoomRef.current;
    const center = centerRef.current;

    let major = 10; // mm
    while (major * zoom < 70) major *= 10;
    const minor = major / 10;
    const showMinor = minor * zoom >= 6;

    const leftMm = center.x - width / 2 / zoom;
    const rightMm = center.x + width / 2 / zoom;
    const topMm = center.y - height / 2 / zoom;
    const bottomMm = center.y + height / 2 / zoom;

    const mmToScreenX = (mm: number) => width / 2 + (mm - center.x) * zoom;
    const mmToScreenY = (mm: number) => height / 2 + (mm - center.y) * zoom;

    if (showMinor) {
      ctx.strokeStyle = "rgba(100, 116, 139, 0.25)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      const start = Math.floor(leftMm / minor) * minor;
      for (let x = start; x <= rightMm; x += minor) {
        const sx = Math.round(mmToScreenX(x)) + 0.5;
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx, height);
      }
      const startY = Math.floor(topMm / minor) * minor;
      for (let y = startY; y <= bottomMm; y += minor) {
        const sy = Math.round(mmToScreenY(y)) + 0.5;
        ctx.moveTo(0, sy);
        ctx.lineTo(width, sy);
      }
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(148, 163, 184, 0.55)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    const startMajorX = Math.floor(leftMm / major) * major;
    for (let x = startMajorX; x <= rightMm; x += major) {
      const sx = Math.round(mmToScreenX(x)) + 0.5;
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, height);
    }
    const startMajorY = Math.floor(topMm / major) * major;
    for (let y = startMajorY; y <= bottomMm; y += major) {
      const sy = Math.round(mmToScreenY(y)) + 0.5;
      ctx.moveTo(0, sy);
      ctx.lineTo(width, sy);
    }
    ctx.stroke();

    ctx.fillStyle = "rgba(148, 163, 184, 0.7)";
    ctx.font = "10px ui-monospace, monospace";
    for (let x = startMajorX; x <= rightMm; x += major) {
      if (Math.abs(x) < major / 2) continue;
      ctx.fillText(`${Math.round(x)}`, mmToScreenX(x) + 3, 12);
    }
    for (let y = startMajorY; y <= bottomMm; y += major) {
      if (Math.abs(y) < major / 2) continue;
      ctx.fillText(`${Math.round(y)}`, 3, mmToScreenY(y) - 3);
    }

    ctx.strokeStyle = "rgba(56, 189, 248, 0.85)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const ox = mmToScreenX(0);
    const oy = mmToScreenY(0);
    ctx.moveTo(ox + 0.5, 0);
    ctx.lineTo(ox + 0.5, height);
    ctx.moveTo(0, oy + 0.5);
    ctx.lineTo(width, oy + 0.5);
    ctx.stroke();
  }

  function getPieceOutline(piece: paper.Group): paper.Path | null {
    const outline = piece.children.find((c) => c.data?.kind === "outline");
    return outline instanceof paper.Path ? outline : null;
  }
  function getPieceGrainline(piece: paper.Group): paper.Path | null {
    const g = piece.children.find((c) => c.data?.kind === "grainline");
    return g instanceof paper.Path ? g : null;
  }

  function refreshHandles() {
    const uiLayer = uiLayerRef.current;
    const artLayer = artLayerRef.current;
    if (!uiLayer || !artLayer) return;
    uiLayer.removeChildren();
    const targets: HandleTarget[] = [];
    const zoom = zoomRef.current;
    const anchorSize = 3 / zoom;
    const handleSize = 2.5 / zoom;

    for (const child of artLayer.children) {
      if (child.data?.kind !== "piece") continue;
      const piece = child as paper.Group;
      const outline = getPieceOutline(piece);
      if (!outline) continue;
      const selected = selectedPiecesRef.current.has(piece);

      if (selected) {
        const b = outline.bounds.expand(6 / zoom);
        const rect = new paper.Path.Rectangle(b);
        rect.strokeColor = new paper.Color("#22d3ee");
        rect.strokeWidth = 1 / zoom;
        rect.dashArray = [4 / zoom, 3 / zoom];
        uiLayer.addChild(rect);
      }

      outline.segments.forEach((seg, idx) => {
        const p = seg.point;
        if (selected && (!seg.handleIn.isZero() || !seg.handleOut.isZero())) {
          if (!seg.handleIn.isZero()) {
            const hp = p.add(seg.handleIn);
            const line = new paper.Path.Line(p, hp);
            line.strokeColor = new paper.Color("#e879f9");
            line.strokeWidth = 1 / zoom;
            uiLayer.addChild(line);
            const circle = new paper.Path.Circle(hp, handleSize);
            circle.fillColor = new paper.Color("#e879f9");
            uiLayer.addChild(circle);
            targets.push({ type: "handleIn", piece, path: outline, segmentIndex: idx, pointMm: hp });
          }
          if (!seg.handleOut.isZero()) {
            const hp = p.add(seg.handleOut);
            const line = new paper.Path.Line(p, hp);
            line.strokeColor = new paper.Color("#e879f9");
            line.strokeWidth = 1 / zoom;
            uiLayer.addChild(line);
            const circle = new paper.Path.Circle(hp, handleSize);
            circle.fillColor = new paper.Color("#e879f9");
            uiLayer.addChild(circle);
            targets.push({ type: "handleOut", piece, path: outline, segmentIndex: idx, pointMm: hp });
          }
        }

        const square = new paper.Path.Rectangle({
          center: p,
          size: [anchorSize * 2, anchorSize * 2],
        });
        square.fillColor = selected ? new paper.Color("#fbbf24") : new paper.Color("#64748b");
        square.strokeColor = new paper.Color("#0f172a");
        square.strokeWidth = 1 / zoom;
        uiLayer.addChild(square);
        targets.push({ type: "anchor", piece, path: outline, segmentIndex: idx, pointMm: p });
      });
    }
    handleTargetsRef.current = targets;
  }

  function findHandleTarget(mm: paper.Point): HandleTarget | null {
    const tol = HIT_TOLERANCE_PX / zoomRef.current;
    let best: HandleTarget | null = null;
    let bestDist = tol;
    for (const t of handleTargetsRef.current) {
      const d = t.pointMm.getDistance(mm);
      if (d <= bestDist) {
        bestDist = d;
        best = t;
      }
    }
    return best;
  }

  function setSelection(pieces: paper.Group[], additive: boolean) {
    if (!additive) selectedPiecesRef.current.clear();
    pieces.forEach((p) => selectedPiecesRef.current.add(p));
    scheduleDraw();
    pushStatus();
  }
  function toggleSelection(piece: paper.Group) {
    if (selectedPiecesRef.current.has(piece)) selectedPiecesRef.current.delete(piece);
    else selectedPiecesRef.current.add(piece);
    scheduleDraw();
    pushStatus();
  }
  function clearSelection() {
    selectedPiecesRef.current.clear();
    scheduleDraw();
    pushStatus();
  }
  function getTargetPieces(): paper.Group[] {
    if (selectedPiecesRef.current.size > 0) return Array.from(selectedPiecesRef.current);
    const artLayer = artLayerRef.current;
    if (!artLayer) return [];
    return artLayer.children.filter((c) => c.data?.kind === "piece") as paper.Group[];
  }

  function createPiece(opts: {
    outlineSegments: paper.Segment[];
    closed: boolean;
    withGrainline?: boolean;
    label?: string;
  }): paper.Group {
    const artLayer = artLayerRef.current!;
    const outline = new paper.Path({
      segments: opts.outlineSegments,
      closed: opts.closed,
    });
    outline.data = { kind: "outline" };
    outline.strokeColor = new paper.Color("#38bdf8");
    outline.strokeWidth = 1.2;
    outline.fillColor = new paper.Color(0.15, 0.35, 0.55, 0.12);
    const children: paper.Item[] = [outline];

    if (opts.withGrainline) {
      const b = outline.bounds;
      const gx = b.center.x;
      const line = new paper.Path.Line(
        new paper.Point(gx, b.top + b.height * 0.1),
        new paper.Point(gx, b.bottom - b.height * 0.1),
      );
      line.data = { kind: "grainline" };
      line.strokeColor = new paper.Color("#f97316");
      line.strokeWidth = 1;
      line.dashArray = [6, 4];
      children.push(line);
    }
    if (opts.label) {
      const text = new paper.PointText({
        point: outline.bounds.topCenter.add(new paper.Point(0, -6)),
        content: opts.label,
        fillColor: new paper.Color("#94a3b8"),
        fontSize: 10,
        justification: "center",
      });
      text.data = { kind: "label" };
      children.push(text);
    }

    const group = new paper.Group(children);
    group.data = { kind: "piece", mirrored: false };
    artLayer.addChild(group);
    return group;
  }

  function seedSamplePiece() {
    const s = (x: number, y: number, hi?: [number, number], ho?: [number, number]) =>
      new paper.Segment(
        new paper.Point(x, y),
        hi ? new paper.Point(hi[0], hi[1]) : undefined,
        ho ? new paper.Point(ho[0], ho[1]) : undefined,
      );
    const segments = [
      s(-90, -170),
      s(0, -190, undefined, [30, 2]),
      s(70, -165, [-20, -8]),
      s(95, -60, [-6, -40], [4, 30]),
      s(80, 170),
      s(-80, 170),
      s(-95, -60, [4, 30], [-6, -40]),
      s(-70, -165, undefined, [20, -8]),
    ];
    createPiece({ outlineSegments: segments, closed: true, withGrainline: true, label: "PANEL-01" });
  }

  function findNearestOutline(
    mm: paper.Point,
  ): { piece: paper.Group; path: paper.Path; location: paper.CurveLocation } | null {
    const artLayer = artLayerRef.current;
    if (!artLayer) return null;
    let best: { piece: paper.Group; path: paper.Path; location: paper.CurveLocation } | null = null;
    let bestDist = Infinity;
    for (const child of artLayer.children) {
      if (child.data?.kind !== "piece") continue;
      const piece = child as paper.Group;
      const outline = getPieceOutline(piece);
      if (!outline) continue;
      const loc = outline.getNearestLocation(mm);
      if (loc && loc.distance < bestDist) {
        bestDist = loc.distance;
        best = { piece, path: outline, location: loc };
      }
    }
    return best;
  }

  function pieceAtPoint(mm: paper.Point): paper.Group | null {
    const artLayer = artLayerRef.current;
    if (!artLayer) return null;
    const tol = HIT_TOLERANCE_PX / zoomRef.current;
    const result = artLayer.hitTest(mm, { fill: true, stroke: true, tolerance: tol, segments: true });
    if (!result || !result.item) return null;
    let item: paper.Item | null = result.item;
    while (item && item.data?.kind !== "piece" && item.parent && item.parent !== artLayer) {
      item = item.parent;
    }
    if (item && item.data?.kind === "piece") return item as paper.Group;
    if (result.item.parent && result.item.parent.data?.kind === "piece") {
      return result.item.parent as paper.Group;
    }
    return null;
  }

  useEffect(() => {
    const canvas = paperCanvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const scope = new paper.PaperScope();
    scope.setup(canvas);
    scopeRef.current = scope;
    const artLayer = new paper.Layer();
    const uiLayer = new paper.Layer();
    artLayerRef.current = artLayer;
    uiLayerRef.current = uiLayer;
    scope.project.addLayer(artLayer);
    scope.project.addLayer(uiLayer);
    artLayer.activate();

    seedSamplePiece();

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));
      sizeRef.current = { width, height };
      const dpr = window.devicePixelRatio || 1;

      scope.view.viewSize = new paper.Size(width, height);

      const grid = gridCanvasRef.current;
      if (grid) {
        grid.width = width * dpr;
        grid.height = height * dpr;
        grid.style.width = `${width}px`;
        grid.style.height = `${height}px`;
      }
      scheduleDraw();
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();
    autoCenterImpl();

    function handlePointerDown(e: PointerEvent) {
      const mm = screenToMm(e.clientX, e.clientY);
      canvas!.setPointerCapture(e.pointerId);

      if (e.button === 1) {
        dragRef.current = {
          kind: "pan",
          startClientX: e.clientX,
          startClientY: e.clientY,
          startCenter: centerRef.current.clone(),
        };
        return;
      }
      if (e.button !== 0) return;

      const tool = toolRef.current;

      if (tool === "select" || tool === "warp-node") {
        const handleTarget = findHandleTarget(mm);
        if (handleTarget && selectedPiecesRef.current.has(handleTarget.piece)) {
          if (handleTarget.type === "anchor") {
            dragRef.current = {
              kind: "drag-anchor",
              piece: handleTarget.piece,
              path: handleTarget.path,
              segmentIndex: handleTarget.segmentIndex,
            };
          } else {
            dragRef.current = {
              kind: "drag-handle",
              piece: handleTarget.piece,
              path: handleTarget.path,
              segmentIndex: handleTarget.segmentIndex,
              which: handleTarget.type,
              mirror: !e.altKey,
            };
          }
          return;
        }

        if (tool === "warp-node") {
          const nearest = findNearestOutline(mm);
          const tol = HIT_TOLERANCE_PX / zoomRef.current;
          if (nearest && nearest.location.distance <= tol) {
            const seg = nearest.path.divideAt(nearest.location);
            selectedPiecesRef.current.clear();
            selectedPiecesRef.current.add(nearest.piece);
            if (seg) {
              dragRef.current = {
                kind: "drag-anchor",
                piece: nearest.piece,
                path: nearest.path,
                segmentIndex: seg.index,
              };
            }
            scheduleDraw();
            pushStatus();
          }
          return;
        }

        const hitPiece = pieceAtPoint(mm);
        if (hitPiece) {
          if (e.shiftKey) toggleSelection(hitPiece);
          else if (!selectedPiecesRef.current.has(hitPiece)) setSelection([hitPiece], false);
          dragRef.current = {
            kind: "drag-piece",
            piece: hitPiece,
            startMm: mm,
            startPos: hitPiece.position.clone(),
          };
        } else {
          if (!e.shiftKey) clearSelection();
          dragRef.current = { kind: "marquee", startMm: mm, additive: e.shiftKey };
        }
        return;
      }

      if (tool === "point" || tool === "hole") {
        placeMarker(tool, mm);
        return;
      }

      if (tool === "notch") {
        placeNotch(mm);
        return;
      }

      if (tool === "annotation") {
        placeAnnotation(mm);
        return;
      }

      if (tool === "digitize-line" || tool === "digitize-bezier") {
        let path = digitizePathRef.current;
        if (!path) {
          path = new paper.Path({ segments: [], closed: false });
          path.strokeColor = new paper.Color("#4ade80");
          path.strokeWidth = 1.2;
          digitizePathRef.current = path;
        }
        path.add(new paper.Point(mm));
        if (tool === "digitize-bezier") {
          dragRef.current = {
            kind: "digitize-handle",
            path,
            segmentIndex: path.segments.length - 1,
          };
        }
      }
    }

    function handlePointerMove(e: PointerEvent) {
      const mm = screenToMm(e.clientX, e.clientY);
      const drag = dragRef.current;

      switch (drag.kind) {
        case "pan": {
          const dx = (e.clientX - drag.startClientX) / zoomRef.current;
          const dy = (e.clientY - drag.startClientY) / zoomRef.current;
          centerRef.current = new paper.Point(drag.startCenter.x - dx, drag.startCenter.y - dy);
          scheduleDraw();
          return;
        }
        case "drag-piece": {
          const delta = mm.subtract(drag.startMm);
          drag.piece.position = drag.startPos.add(delta);
          scheduleDraw();
          return;
        }
        case "drag-anchor": {
          drag.path.segments[drag.segmentIndex].point = mm;
          scheduleDraw();
          return;
        }
        case "drag-handle": {
          const seg = drag.path.segments[drag.segmentIndex];
          const rel = mm.subtract(seg.point);
          if (drag.which === "handleOut") {
            seg.handleOut = rel;
            if (drag.mirror) seg.handleIn = rel.multiply(-1);
          } else {
            seg.handleIn = rel;
            if (drag.mirror) seg.handleOut = rel.multiply(-1);
          }
          scheduleDraw();
          return;
        }
        case "digitize-handle": {
          const seg = drag.path.segments[drag.segmentIndex];
          const rel = mm.subtract(seg.point);
          seg.handleOut = rel;
          seg.handleIn = rel.multiply(-1);
          scheduleDraw();
          return;
        }
        case "marquee": {
          const uiLayer = uiLayerRef.current;
          if (!uiLayer) return;
          if (marqueeItemRef.current) marqueeItemRef.current.remove();
          const rect = new paper.Path.Rectangle(new paper.Rectangle(drag.startMm, mm));
          rect.strokeColor = new paper.Color("#22d3ee");
          rect.strokeWidth = 1 / zoomRef.current;
          rect.dashArray = [4 / zoomRef.current, 3 / zoomRef.current];
          uiLayer.addChild(rect);
          marqueeItemRef.current = rect;
          return;
        }
        default:
          return;
      }
    }

    function finishMarquee(drag: Extract<DragMode, { kind: "marquee" }>, mm: paper.Point) {
      const artLayer = artLayerRef.current;
      if (marqueeItemRef.current) {
        marqueeItemRef.current.remove();
        marqueeItemRef.current = null;
      }
      if (!artLayer) return;
      const rect = new paper.Rectangle(drag.startMm, mm);
      if (Math.abs(rect.width) < 1 / zoomRef.current && Math.abs(rect.height) < 1 / zoomRef.current) return;
      const hits: paper.Group[] = [];
      for (const child of artLayer.children) {
        if (child.data?.kind !== "piece") continue;
        const outline = getPieceOutline(child as paper.Group);
        if (outline && rect.intersects(outline.bounds)) hits.push(child as paper.Group);
      }
      if (hits.length) setSelection(hits, drag.additive);
    }

    function handlePointerUp(e: PointerEvent) {
      const mm = screenToMm(e.clientX, e.clientY);
      const drag = dragRef.current;
      if (drag.kind === "marquee") finishMarquee(drag, mm);
      dragRef.current = { kind: "none" };
      try {
        canvas!.releasePointerCapture(e.pointerId);
      } catch {
        /* pointer capture already released */
      }
      pushStatus();
    }

    function handleWheel(e: WheelEvent) {
      e.preventDefault();
      const mmBefore = screenToMm(e.clientX, e.clientY);
      const factor = Math.exp(-e.deltaY * 0.0015);
      const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoomRef.current * factor));
      const rect = canvas!.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const { width, height } = sizeRef.current;
      zoomRef.current = newZoom;
      centerRef.current = new paper.Point(
        mmBefore.x - (sx - width / 2) / newZoom,
        mmBefore.y - (sy - height / 2) / newZoom,
      );
      scheduleDraw();
      pushStatus();
    }

    function handleContextMenu(e: MouseEvent) {
      e.preventDefault();
      onContextMenuRequestRef.current({ x: e.clientX, y: e.clientY });
    }

    function handleDoubleClick(e: MouseEvent) {
      const tool = toolRef.current;
      if ((tool === "digitize-line" || tool === "digitize-bezier") && digitizePathRef.current) {
        finalizeDigitize(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (digitizePathRef.current) finalizeDigitize(true);
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedPiecesRef.current.size > 0 && document.activeElement === document.body) {
          selectedPiecesRef.current.forEach((p) => p.remove());
          selectedPiecesRef.current.clear();
          scheduleDraw();
          pushStatus();
        }
      }
    }

    function finalizeDigitize(cancel: boolean) {
      const path = digitizePathRef.current;
      digitizePathRef.current = null;
      dragRef.current = { kind: "none" };
      if (!path) return;
      if (cancel && path.segments.length < 2) {
        path.remove();
        return;
      }
      path.remove();
      const group = createPiece({
        outlineSegments: path.segments,
        closed: false,
        withGrainline: false,
      });
      setSelection([group], false);
      onToastRef.current("Path digitized");
    }

    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    canvas.addEventListener("contextmenu", handleContextMenu);
    canvas.addEventListener("dblclick", handleDoubleClick);
    window.addEventListener("keydown", handleKeyDown);

    pushStatus();

    return () => {
      resizeObserver.disconnect();
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", handlePointerUp);
      canvas.removeEventListener("wheel", handleWheel);
      canvas.removeEventListener("contextmenu", handleContextMenu);
      canvas.removeEventListener("dblclick", handleDoubleClick);
      window.removeEventListener("keydown", handleKeyDown);
      scope.project.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function placeMarker(tool: "point" | "hole", mm: paper.Point) {
    const artLayer = artLayerRef.current;
    if (!artLayer) return;
    let marker: paper.Path;
    if (tool === "point") {
      marker = new paper.Path.Circle(mm, 1.5);
      marker.fillColor = new paper.Color("#facc15");
    } else {
      marker = new paper.Path.Circle(mm, 3);
      marker.strokeColor = new paper.Color("#facc15");
      marker.strokeWidth = 1;
      const cross = new paper.Group([
        new paper.Path.Line(mm.add([-2, 0]), mm.add([2, 0])),
        new paper.Path.Line(mm.add([0, -2]), mm.add([0, 2])),
      ]);
      cross.strokeColor = new paper.Color("#facc15");
      marker.data = { kind: "hole" };
      const holeGroup = new paper.Group([marker, cross]);
      holeGroup.data = { kind: "hole" };
      artLayer.addChild(holeGroup);
      scheduleDraw();
      return;
    }
    marker.data = { kind: "point" };
    artLayer.addChild(marker);
    scheduleDraw();
  }

  function placeNotch(mm: paper.Point) {
    const nearest = findNearestOutline(mm);
    const artLayer = artLayerRef.current;
    if (!nearest || !artLayer) {
      onToastRef.current("No outline nearby for notch placement");
      return;
    }
    const loc = nearest.location;
    const normal = loc.normal.normalize(NOTCH_DEPTH_MM);
    const notch = new paper.Path.Line(loc.point, loc.point.add(normal));
    notch.strokeColor = new paper.Color("#f472b6");
    notch.strokeWidth = 1.4;
    notch.data = { kind: "notch" };
    artLayer.addChild(notch);
    scheduleDraw();
  }

  function placeAnnotation(mm: paper.Point) {
    const artLayer = artLayerRef.current;
    if (!artLayer) return;
    const text = new paper.PointText({
      point: mm,
      content: annotationTextRef.current || "Label",
      fillColor: new paper.Color("#e2e8f0"),
      fontSize: 12,
    });
    text.rotate(annotationRotationRef.current);
    text.data = { kind: "annotation" };
    artLayer.addChild(text);
    scheduleDraw();
  }

  function autoCenterImpl() {
    const artLayer = artLayerRef.current;
    if (!artLayer || artLayer.children.length === 0) {
      centerRef.current = new paper.Point(0, 0);
      zoomRef.current = DEFAULT_ZOOM;
      scheduleDraw();
      return;
    }
    const bounds = artLayer.bounds;
    centerRef.current = bounds.center.clone();
    const { width, height } = sizeRef.current;
    if (width > 0 && height > 0 && bounds.width > 0 && bounds.height > 0) {
      const padding = 0.82;
      const zx = (width / bounds.width) * padding;
      const zy = (height / bounds.height) * padding;
      zoomRef.current = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.min(zx, zy)));
    }
    scheduleDraw();
    pushStatus();
  }

  useImperativeHandle(ref, () => ({
    unfold() {
      const pieces = Array.from(selectedPiecesRef.current);
      if (pieces.length !== 1) {
        onToastRef.current("Select exactly one piece to unfold");
        return;
      }
      const piece = pieces[0];
      const outline = getPieceOutline(piece);
      const artLayer = artLayerRef.current;
      if (!outline || !artLayer) return;
      const b = outline.bounds;
      const mirror = outline.clone({ insert: false }) as paper.Path;
      mirror.scale(-1, 1, new paper.Point(b.left, b.center.y));

      let merged: paper.Path | paper.PathItem = outline;
      try {
        const unite = (outline as unknown as { unite: (p: paper.PathItem) => paper.PathItem }).unite(mirror);
        if (unite) merged = unite as paper.Path;
      } catch {
        const compound = new paper.CompoundPath({ children: [outline.clone({ insert: false }), mirror] });
        merged = compound as unknown as paper.Path;
      }
      mirror.remove();

      merged.strokeColor = new paper.Color("#38bdf8");
      merged.strokeWidth = 1.2;
      merged.fillColor = new paper.Color(0.15, 0.35, 0.55, 0.12);
      merged.data = { kind: "outline" };

      const grainline = getPieceGrainline(piece);
      const children: paper.Item[] = [merged];
      if (grainline) children.push(grainline.clone({ insert: false }) as paper.Path);
      outline.remove();
      piece.addChildren(children);

      scheduleDraw();
      pushStatus();
      onToastRef.current("Piece unfolded");
    },
    autoCenter() {
      autoCenterImpl();
      onToastRef.current("Auto-centered");
    },
    alignmentSnap() {
      const pieces = getTargetPieces();
      if (pieces.length === 0) {
        onToastRef.current("No piece to snap");
        return;
      }
      pieces.forEach((piece) => {
        const outline = getPieceOutline(piece);
        outline?.segments.forEach((seg) => {
          seg.point = new paper.Point(Math.round(seg.point.x), Math.round(seg.point.y));
        });
      });
      scheduleDraw();
      onToastRef.current("Snapped to 1mm grid");
    },
    clearStage() {
      artLayerRef.current?.removeChildren();
      uiLayerRef.current?.removeChildren();
      selectedPiecesRef.current.clear();
      digitizePathRef.current = null;
      dragRef.current = { kind: "none" };
      scheduleDraw();
      pushStatus();
      onToastRef.current("Stage cleared");
    },
    selectAll() {
      const artLayer = artLayerRef.current;
      if (!artLayer) return;
      const pieces = artLayer.children.filter((c) => c.data?.kind === "piece") as paper.Group[];
      setSelection(pieces, false);
    },
    deselectAll() {
      clearSelection();
    },
    changeSign() {
      const pieces = getTargetPieces();
      pieces.forEach((piece) => {
        const outline = getPieceOutline(piece);
        outline?.reverse();
        piece.data.mirrored = !piece.data.mirrored;
        if (outline) {
          outline.strokeColor = piece.data.mirrored
            ? new paper.Color("#fb923c")
            : new paper.Color("#38bdf8");
        }
      });
      scheduleDraw();
      onToastRef.current("Sign changed");
    },
    alignGrainline() {
      const pieces = getTargetPieces();
      let changed = 0;
      pieces.forEach((piece) => {
        const grainline = getPieceGrainline(piece);
        if (!grainline || grainline.segments.length < 2) return;
        const p0 = grainline.segments[0].point;
        const p1 = grainline.segments[grainline.segments.length - 1].point;
        const vector = p1.subtract(p0);
        const angle = vector.angle;
        const targetAngle = vector.y >= 0 ? 90 : -90;
        const rotation = targetAngle - angle;
        piece.rotate(rotation, piece.bounds.center);
        changed += 1;
      });
      scheduleDraw();
      onToastRef.current(changed > 0 ? "Grainline aligned" : "No grainline found on selection");
    },
    save() {
      const artLayer = artLayerRef.current;
      if (!artLayer) return;
      const json = artLayer.exportJSON({ asString: true });
      try {
        window.localStorage.setItem("maniapattern:lastSave", json as string);
      } catch {
        /* storage unavailable */
      }
      onToastRef.current("Saved");
    },
    exportDxf() {
      const artLayer = artLayerRef.current;
      if (!artLayer) return;
      downloadFile("pattern.dxf", buildDxf(collectPolylines(artLayer)), "application/dxf");
      onToastRef.current("DXF exported");
    },
    exportHpgl() {
      const artLayer = artLayerRef.current;
      if (!artLayer) return;
      downloadFile("pattern.hpgl", buildHpgl(collectPolylines(artLayer)), "application/vnd.hp-hpgl");
      onToastRef.current("HPGL exported");
    },
    exportGcode() {
      const artLayer = artLayerRef.current;
      if (!artLayer) return;
      downloadFile("pattern.gcode", buildGcode(collectPolylines(artLayer)), "text/plain");
      onToastRef.current("G-Code exported");
    },
    generateSleeve() {
      const artLayer = artLayerRef.current;
      if (!artLayer) return;
      const bounds = artLayer.bounds;
      const ox = artLayer.children.length > 0 ? bounds.right + 120 : 150;
      const oy = artLayer.children.length > 0 ? bounds.center.y : 0;
      const s = (x: number, y: number, hi?: [number, number], ho?: [number, number]) =>
        new paper.Segment(
          new paper.Point(ox + x, oy + y),
          hi ? new paper.Point(hi[0], hi[1]) : undefined,
          ho ? new paper.Point(ho[0], ho[1]) : undefined,
        );
      const segments = [
        s(-70, -20, undefined, [25, -30]),
        s(0, -70, [-25, -5], [25, -5]),
        s(70, -20, [-25, -30]),
        s(50, 140),
        s(-50, 140),
      ];
      const group = createPiece({ outlineSegments: segments, closed: true, withGrainline: true, label: "SLEEVE" });
      setSelection([group], false);
      onToastRef.current("Sleeve generated");
    },
    generateWaistband() {
      const artLayer = artLayerRef.current;
      if (!artLayer) return;
      const bounds = artLayer.bounds;
      const ox = artLayer.children.length > 0 ? bounds.left - 60 : -150;
      const oy = artLayer.children.length > 0 ? bounds.bottom + 90 : 200;
      const w = 320;
      const h = 45;
      const segments = [
        new paper.Segment(new paper.Point(ox, oy)),
        new paper.Segment(new paper.Point(ox + w, oy), undefined, undefined),
        new paper.Segment(new paper.Point(ox + w, oy + h)),
        new paper.Segment(new paper.Point(ox, oy + h)),
      ];
      const group = createPiece({ outlineSegments: segments, closed: true, withGrainline: true, label: "WAISTBAND" });
      setSelection([group], false);
      onToastRef.current("Waistband generated");
    },
    extractSubpiece() {
      const pieces = Array.from(selectedPiecesRef.current);
      if (pieces.length !== 1) {
        onToastRef.current("Select exactly one piece to extract from");
        return;
      }
      const piece = pieces[0];
      const outline = getPieceOutline(piece);
      const artLayer = artLayerRef.current;
      if (!outline || !artLayer) return;
      const clonedSegments = outline.segments.map(
        (seg) => new paper.Segment(seg.point.clone(), seg.handleIn.clone(), seg.handleOut.clone()),
      );
      const sub = createPiece({
        outlineSegments: clonedSegments,
        closed: outline.closed,
        withGrainline: false,
        label: "SUB-PIECE",
      });
      sub.scale(0.55, outline.bounds.center);
      sub.position = sub.position.add(new paper.Point(outline.bounds.width * 0.7, outline.bounds.height * 0.15));
      sub.data.parentId = piece.id;
      const subOutline = getPieceOutline(sub);
      if (subOutline) subOutline.strokeColor = new paper.Color("#a78bfa");
      setSelection([sub], false);
      onToastRef.current("Sub-piece extracted");
    },
    smoothSpline() {
      const pieces = getTargetPieces();
      pieces.forEach((piece) => {
        const outline = getPieceOutline(piece);
        outline?.smooth({ type: "continuous" });
      });
      scheduleDraw();
      onToastRef.current("Spline smoothed");
    },
    alignAxis() {
      const pieces = getTargetPieces();
      pieces.forEach((piece) => {
        const outline = getPieceOutline(piece);
        if (!outline || outline.segments.length < 2) return;
        let longest = 0;
        let angle = 0;
        for (let i = 0; i < outline.segments.length; i++) {
          const a = outline.segments[i].point;
          const b = outline.segments[(i + 1) % outline.segments.length].point;
          const len = b.getDistance(a);
          if (len > longest) {
            longest = len;
            angle = b.subtract(a).angle;
          }
        }
        const targetAngle = 90;
        piece.rotate(targetAngle - angle, piece.bounds.center);
      });
      scheduleDraw();
      onToastRef.current("Axis aligned");
    },
  }));

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden rounded-lg border border-slate-800">
      <canvas ref={gridCanvasRef} className="absolute inset-0 h-full w-full" style={{ pointerEvents: "none" }} />
      <canvas
        ref={paperCanvasRef}
        className="absolute inset-0 h-full w-full touch-none"
        style={{
          cursor:
            activeTool === "select"
              ? "default"
              : activeTool === "warp-node"
                ? "crosshair"
                : "copy",
        }}
      />
    </div>
  );
});

export default PaperCanvas;
