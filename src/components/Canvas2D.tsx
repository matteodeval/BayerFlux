import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Move, Eye, Info } from 'lucide-react';
import { AppConfig, Point2D } from '../types';
import { getBayerMatrix, applyBayerDither } from '../utils/bayer';
import {
  sampleCurve,
  getMinDistanceToCurve,
  getProjectionOffset,
  getParallelogramVertices,
  computeMergedShadowPolygons
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
    ctx.fillStyle = '#1E1E1E'; // High density dark editor background
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

    // 2. RENDER 45° PARALLELOGRAM SHADOW PROJECTIONS (100% OPAQUE - PARQUET MERGE)
    if (shadowEnabled) {
      const lightestColorHex = config.shadowColorOverride || palette[3] || '#eaf4fe';
      const shadowStrokeColor = palette[0] || '#031b33';

      const shadowPolygons = computeMergedShadowPolygons(
        gridWidth,
        gridHeight,
        shadeGrid,
        config.shadowTarget,
        projectionAngle,
        diagonalLength,
        cellSize,
        startX,
        startY,
        config.mergeShadows ?? true,
        config.maxPlankLength ?? 4,
        config.staggerParquet ?? true,
        config.clipShadowsToGrid ?? true
      );

      ctx.save();
      // 100% Opaque fill - directly transforms tile colors
      ctx.fillStyle = lightestColorHex;
      ctx.strokeStyle = shadowStrokeColor;
      ctx.lineWidth = Math.max(0.6, cellSize * 0.04);

      for (const poly of shadowPolygons) {
        if (!poly.points || poly.points.length < 3) continue;
        ctx.beginPath();
        ctx.moveTo(poly.points[0].x, poly.points[0].y);
        for (let i = 1; i < poly.points.length; i++) {
          ctx.lineTo(poly.points[i].x, poly.points[i].y);
        }
        ctx.closePath();

        ctx.fill();
        ctx.stroke();
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
      className="relative flex-1 bg-[#1E1E1E] overflow-hidden flex items-center justify-center select-none"
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
      <div className="absolute top-3 right-3 flex items-center gap-1 bg-[#252526] p-1 rounded border border-[#333333] shadow-lg z-10 text-[#D4D4D4] text-xs font-mono">
        <button
          onClick={() => setZoom((z) => Math.min(z + 0.2, 4.0))}
          className="p-1 hover:bg-[#37373D] rounded transition"
          title="Ingrandisci"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(z - 0.2, 0.4))}
          className="p-1 hover:bg-[#37373D] rounded transition"
          title="Riduci"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => {
            setZoom(1.0);
            setPan({ x: 0, y: 0 });
          }}
          className="p-1 hover:bg-[#37373D] rounded transition"
          title="Centra vista"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Info Badge */}
      <div className="absolute bottom-3 left-3 bg-[#252526]/90 backdrop-blur-sm px-2.5 py-1 rounded border border-[#333333] text-[10px] font-mono text-[#858585] flex items-center gap-2">
        <Info className="w-3 h-3 text-[#007ACC]" />
        <span>
          Trascina punti <strong className="text-[#007ACC]">P0-P3</strong> per muovere la curva attrattore
        </span>
      </div>
    </div>
  );
};
