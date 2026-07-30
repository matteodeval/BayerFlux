import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Move, Eye, Info } from 'lucide-react';
import { AppConfig, Point2D } from '../types';
import { getBayerMatrix, applyBayerDither } from '../utils/bayer';
import {
  sampleCurve,
  getMinDistanceToCurve,
  getProjectionOffset,
  getParallelogramVertices
} from '../utils/geometry';

interface Canvas2DProps {
  config: AppConfig;
  onUpdateConfig: (updated: Partial<AppConfig>) => void;
}

export const Canvas2D: React.FC<Canvas2DProps> = ({ config, onUpdateConfig }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Pan & Zoom state
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Control points dragging state
  const [draggingPointIndex, setDraggingPointIndex] = useState<number | null>(null);

  // Main Render Loop
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const parent = containerRef.current;
    if (!parent) return;

    // Handle high DPI crisp rendering
    const dpr = window.devicePixelRatio || 1;
    const rect = parent.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Clear background
    ctx.fillStyle = '#020617'; // slate-950
    ctx.fillRect(0, 0, width, height);

    // Grid size & cell size math
    const { gridWidth, gridHeight, bayerSize, bayerStrength, palette, shadowEnabled, diagonalLength, projectionAngle, shadowOpacity } = config;

    // Base cell size to fit canvas nicely
    const padding = 40;
    const availableW = width - padding * 2;
    const availableH = height - padding * 2;

    const baseCellSize = Math.max(2, Math.min(availableW / gridWidth, availableH / gridHeight));
    const cellSize = baseCellSize * zoom;

    const gridPixelWidth = gridWidth * cellSize;
    const gridPixelHeight = gridHeight * cellSize;

    // Center grid in canvas + pan offset
    const startX = (width - gridPixelWidth) / 2 + pan.x;
    const startY = (height - gridPixelHeight) / 2 + pan.y;

    // Sample Attractor Curve
    const curveSamples = sampleCurve(config.curvePreset, config.controlPoints, 100);

    // Bayer matrix
    const bayerMatrix = getBayerMatrix(bayerSize);

    // Pre-calculate grid cell shade levels
    const shadeGrid: number[][] = Array.from({ length: gridHeight }, () =>
      Array(gridWidth).fill(0)
    );

    const maxDim = Math.max(gridWidth, gridHeight);

    for (let gy = 0; gy < gridHeight; gy++) {
      for (let gx = 0; gx < gridWidth; gx++) {
        const dist = getMinDistanceToCurve(gx, gy, gridWidth, gridHeight, curveSamples);

        // Normalize distance by attractor radius & falloff power
        let normDist = Math.min(Math.max(dist / config.attractorRadius, 0), 1);
        normDist = Math.pow(normDist, config.falloffPower);

        if (config.invertAttractor) {
          normDist = 1 - normDist;
        }

        // Apply Bayer Dithering (4 levels)
        const shadeLevel = applyBayerDither(
          normDist,
          gx,
          gy,
          bayerMatrix,
          bayerStrength,
          4
        );

        shadeGrid[gy][gx] = shadeLevel;
      }
    }

    // 1. RENDER SQUARE GRID CELLS
    for (let gy = 0; gy < gridHeight; gy++) {
      for (let gx = 0; gx < gridWidth; gx++) {
        const shadeIdx = shadeGrid[gy][gx];
        const color = palette[shadeIdx] || palette[3];

        const px = startX + gx * cellSize;
        const py = startY + gy * cellSize;

        ctx.fillStyle = color;
        ctx.fillRect(px, py, cellSize, cellSize);
      }
    }

    // 2. RENDER 45° PARALLELOGRAM SHADOW PROJECTIONS
    if (shadowEnabled) {
      const { shiftX, shiftY } = getProjectionOffset(diagonalLength, cellSize, projectionAngle);

      const lightestColorHex = palette[3] || '#eaf4fe';

      ctx.save();
      ctx.globalAlpha = shadowOpacity;

      for (let gy = 0; gy < gridHeight; gy++) {
        for (let gx = 0; gx < gridWidth; gx++) {
          const shadeIdx = shadeGrid[gy][gx];

          // Check if cell qualifies for shadow projection
          let shouldProject = false;
          if (config.shadowTarget === 'lightest_only' && shadeIdx === 3) {
            shouldProject = true;
          } else if (config.shadowTarget === 'darkest_only' && shadeIdx === 0) {
            shouldProject = true;
          } else if (config.shadowTarget === 'all_weighted') {
            shouldProject = true;
          }

          if (shouldProject) {
            const px = startX + gx * cellSize;
            const py = startY + gy * cellSize;

            // Bottom edge vertices
            const p1 = { x: px, y: py + cellSize }; // Bottom-Left
            const p2 = { x: px + cellSize, y: py + cellSize }; // Bottom-Right

            // Projected vertices at 45 degrees
            const p3 = { x: p2.x + shiftX, y: p2.y + shiftY };
            const p4 = { x: p1.x + shiftX, y: p1.y + shiftY };

            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.lineTo(p3.x, p3.y);
            ctx.lineTo(p4.x, p4.y);
            ctx.closePath();

            // Fill with lightest color / override
            ctx.fillStyle = config.shadowColorOverride || lightestColorHex;
            ctx.fill();

            // Subtle outline for architectural clarity
            ctx.strokeStyle = lightestColorHex;
            ctx.lineWidth = Math.max(0.5, cellSize * 0.05);
            ctx.stroke();
          }
        }
      }
      ctx.restore();
    }

    // 3. OPTIONAL GRID LINES
    if (config.showGridLines && cellSize >= 3) {
      ctx.strokeStyle = config.gridLineColor;
      ctx.lineWidth = 0.5;

      ctx.beginPath();
      for (let gx = 0; gx <= gridWidth; gx++) {
        const x = startX + gx * cellSize;
        ctx.moveTo(x, startY);
        ctx.lineTo(x, startY + gridPixelHeight);
      }
      for (let gy = 0; gy <= gridHeight; gy++) {
        const y = startY + gy * cellSize;
        ctx.moveTo(startX, y);
        ctx.lineTo(startX + gridPixelWidth, y);
      }
      ctx.stroke();
    }

    // 4. DRAW BÉZIER ATTRACTOR CURVE & CONTROL HANDLES
    if (config.curvePreset === 'bezier') {
      // Draw sampled curve
      ctx.beginPath();
      ctx.strokeStyle = '#38bdf8'; // sky-400
      ctx.lineWidth = 3;

      curveSamples.forEach((pt, idx) => {
        const cx = startX + pt.x * gridPixelWidth;
        const cy = startY + pt.y * gridPixelHeight;
        if (idx === 0) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      });
      ctx.stroke();

      // Draw control lines
      const ptsPx = config.controlPoints.map((pt) => ({
        x: startX + pt.x * gridPixelWidth,
        y: startY + pt.y * gridPixelHeight,
      }));

      ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)'; // red dashed lines
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      ctx.moveTo(ptsPx[0].x, ptsPx[0].y);
      ctx.lineTo(ptsPx[1].x, ptsPx[1].y);
      ctx.moveTo(ptsPx[2].x, ptsPx[2].y);
      ctx.lineTo(ptsPx[3].x, ptsPx[3].y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw control handles
      ptsPx.forEach((pt, idx) => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 7, 0, Math.PI * 2);
        ctx.fillStyle = idx === 0 || idx === 3 ? '#38bdf8' : '#f43f5e';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Label
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(`P${idx}`, pt.x + 10, pt.y - 10);
      });
    }
  }, [config, zoom, pan]);

  useEffect(() => {
    render();
    window.addEventListener('resize', render);
    return () => window.removeEventListener('resize', render);
  }, [render]);

  // Mouse / Touch Dragging Logic
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const parent = containerRef.current;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const { gridWidth, gridHeight } = config;
    const availableW = rect.width - 80;
    const availableH = rect.height - 80;
    const baseCellSize = Math.max(2, Math.min(availableW / gridWidth, availableH / gridHeight));
    const cellSize = baseCellSize * zoom;
    const gridPixelWidth = gridWidth * cellSize;
    const gridPixelHeight = gridHeight * cellSize;

    const startX = (rect.width - gridPixelWidth) / 2 + pan.x;
    const startY = (rect.height - gridPixelHeight) / 2 + pan.y;

    // Check if user clicked on a Bézier control handle
    if (config.curvePreset === 'bezier') {
      for (let i = 0; i < config.controlPoints.length; i++) {
        const pt = config.controlPoints[i];
        const px = startX + pt.x * gridPixelWidth;
        const py = startY + pt.y * gridPixelHeight;

        const dist = Math.hypot(mx - px, my - py);
        if (dist <= 14) {
          setDraggingPointIndex(i);
          return;
        }
      }
    }

    // Otherwise start canvas panning
    setIsPanning(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const parent = containerRef.current;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (draggingPointIndex !== null && config.curvePreset === 'bezier') {
      const { gridWidth, gridHeight } = config;
      const availableW = rect.width - 80;
      const availableH = rect.height - 80;
      const baseCellSize = Math.max(2, Math.min(availableW / gridWidth, availableH / gridHeight));
      const cellSize = baseCellSize * zoom;
      const gridPixelWidth = gridWidth * cellSize;
      const gridPixelHeight = gridHeight * cellSize;

      const startX = (rect.width - gridPixelWidth) / 2 + pan.x;
      const startY = (rect.height - gridPixelHeight) / 2 + pan.y;

      const nx = Math.max(0, Math.min(1, (mx - startX) / gridPixelWidth));
      const ny = Math.max(0, Math.min(1, (my - startY) / gridPixelHeight));

      const updatedPts = [...config.controlPoints];
      updatedPts[draggingPointIndex] = { x: nx, y: ny };
      onUpdateConfig({ controlPoints: updatedPts });
    } else if (isPanning) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setDraggingPointIndex(null);
    setIsPanning(false);
  };

  return (
    <div
      ref={containerRef}
      className="relative flex-1 bg-slate-950 overflow-hidden flex items-center justify-center select-none"
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Floating Canvas Toolbar */}
      <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-800 shadow-xl z-10 text-slate-300 text-xs">
        <button
          onClick={() => setZoom((z) => Math.min(z + 0.2, 4.0))}
          className="p-1.5 hover:bg-slate-800 rounded-lg transition"
          title="Ingrandisci"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(z - 0.2, 0.4))}
          className="p-1.5 hover:bg-slate-800 rounded-lg transition"
          title="Riduci"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            setZoom(1.0);
            setPan({ x: 0, y: 0 });
          }}
          className="p-1.5 hover:bg-slate-800 rounded-lg transition"
          title="Centra vista"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Info Badge */}
      <div className="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
        <Info className="w-3.5 h-3.5 text-blue-400" />
        <span>
          Trascina i punti di controllo <strong className="text-blue-300">P0-P3</strong> per muovere la curva attrattore
        </span>
      </div>
    </div>
  );
};
