import React, { useState } from 'react';
import { AppConfig, DEFAULT_CONFIG } from './types';
import { Header } from './components/Header';
import { ControlsPanel } from './components/ControlsPanel';
import { Canvas2D } from './components/Canvas2D';
import { PythonCodeModal } from './components/PythonCodeModal';
import { sampleCurve, getMinDistanceToCurve, computeMergedShadowPolygons } from './utils/geometry';
import { getBayerMatrix, applyBayerDither } from './utils/bayer';
import { downloadDXF } from './utils/dxfGenerator';

export default function App() {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [isPythonModalOpen, setIsPythonModalOpen] = useState<boolean>(false);

  const handleUpdateConfig = (updated: Partial<AppConfig>) => {
    setConfig((prev) => ({ ...prev, ...updated }));
  };

  const handleExportDXF = () => {
    downloadDXF(config, `bayer_attractor_${config.gridWidth}x${config.gridHeight}.dxf`);
  };

  // Export High Resolution PNG Image
  const handleExportPNG = () => {
    const exportCanvas = document.createElement('canvas');
    const cellSize = 20; // High res 20px per cell
    const width = config.gridWidth * cellSize;
    const height = config.gridHeight * cellSize;

    exportCanvas.width = width;
    exportCanvas.height = height;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;

    // Background
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, width, height);

    const curveSamples = sampleCurve(config.curvePreset, config.controlPoints, 100);
    const bayerMatrix = getBayerMatrix(config.bayerSize);

    // Compute grid shades
    const shadeGrid: number[][] = Array.from({ length: config.gridHeight }, () =>
      Array(config.gridWidth).fill(0)
    );

    for (let gy = 0; gy < config.gridHeight; gy++) {
      for (let gx = 0; gx < config.gridWidth; gx++) {
        const dist = getMinDistanceToCurve(gx, gy, config.gridWidth, config.gridHeight, curveSamples);
        let normDist = Math.min(Math.max(dist / config.attractorRadius, 0), 1);
        normDist = Math.pow(normDist, config.falloffPower);
        if (config.invertAttractor) normDist = 1 - normDist;

        shadeGrid[gy][gx] = applyBayerDither(
          normDist,
          gx,
          gy,
          bayerMatrix,
          config.bayerStrength,
          4
        );
      }
    }

    // 1. Draw Squares
    for (let gy = 0; gy < config.gridHeight; gy++) {
      for (let gx = 0; gx < config.gridWidth; gx++) {
        const shadeIdx = shadeGrid[gy][gx];
        ctx.fillStyle = config.palette[shadeIdx] || config.palette[3];
        ctx.fillRect(gx * cellSize, gy * cellSize, cellSize, cellSize);
      }
    }

    // 2. Draw 45° Parallelogram Shadow Projections
    if (config.shadowEnabled) {
      const lightestColorHex = config.shadowColorOverride || config.palette[3] || '#eaf4fe';
      const shadowStrokeColor = config.palette[0] || '#031b33';

      const shadowPolygons = computeMergedShadowPolygons(
        config.gridWidth,
        config.gridHeight,
        shadeGrid,
        config.shadowTarget,
        config.projectionAngle,
        config.diagonalLength,
        cellSize,
        0,
        0,
        config.mergeShadows ?? true,
        config.maxPlankLength ?? 4,
        config.staggerParquet ?? true,
        config.clipShadowsToGrid ?? true
      );

      ctx.save();
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

    // Trigger Download
    const dataUrl = exportCanvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `bayer_attractor_${config.gridWidth}x${config.gridHeight}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#1E1E1E] font-sans text-[#D4D4D4] overflow-hidden">
      <Header
        config={config}
        onUpdateConfig={handleUpdateConfig}
        onOpenPythonModal={() => setIsPythonModalOpen(true)}
        onExportImage={handleExportPNG}
        onExportDXF={handleExportDXF}
      />

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative bg-[#1E1E1E]">
        <ControlsPanel config={config} onUpdateConfig={handleUpdateConfig} />
        <Canvas2D config={config} onUpdateConfig={handleUpdateConfig} />
      </main>

      {/* High Density IDE Status Bar Footer */}
      <footer className="h-6 bg-[#007ACC] text-white px-3 flex items-center justify-between text-[11px] font-mono shrink-0 select-none z-30">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 font-bold">
            <span className="w-2 h-2 rounded-full bg-[#27C93F] animate-pulse"></span>
            PyCharm / Grasshopper Ready
          </span>
          <span className="hidden sm:inline text-white/80">
            Grid: {config.gridWidth}x{config.gridHeight} ({config.gridWidth * config.gridHeight} cells)
          </span>
          <span className="hidden md:inline text-white/80">
            Bayer: {config.bayerSize}x{config.bayerSize} Matrix
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-white/90">
            Shadows: {config.shadowEnabled ? `ON (${config.diagonalLength}d @ 45°)` : 'OFF'}
          </span>
          <span className="bg-[#005a9e] px-1.5 py-0.5 rounded text-[10px] font-bold">
            Python 3.11 / Rhino 8
          </span>
        </div>
      </footer>

      <PythonCodeModal
        config={config}
        isOpen={isPythonModalOpen}
        onClose={() => setIsPythonModalOpen(false)}
      />
    </div>
  );
}
