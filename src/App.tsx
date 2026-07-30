import React, { useState } from 'react';
import { AppConfig, DEFAULT_CONFIG } from './types';
import { Header } from './components/Header';
import { ControlsPanel } from './components/ControlsPanel';
import { Canvas2D } from './components/Canvas2D';
import { PythonCodeModal } from './components/PythonCodeModal';
import { sampleCurve, getMinDistanceToCurve, getProjectionOffset } from './utils/geometry';
import { getBayerMatrix, applyBayerDither } from './utils/bayer';

export default function App() {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [isPythonModalOpen, setIsPythonModalOpen] = useState<boolean>(false);

  const handleUpdateConfig = (updated: Partial<AppConfig>) => {
    setConfig((prev) => ({ ...prev, ...updated }));
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
      const { shiftX, shiftY } = getProjectionOffset(
        config.diagonalLength,
        cellSize,
        config.projectionAngle
      );
      const lightestColorHex = config.palette[3] || '#eaf4fe';

      ctx.save();
      ctx.globalAlpha = config.shadowOpacity;

      for (let gy = 0; gy < config.gridHeight; gy++) {
        for (let gx = 0; gx < config.gridWidth; gx++) {
          if (shadeGrid[gy][gx] === 3) {
            const px = gx * cellSize;
            const py = gy * cellSize;

            const p1 = { x: px, y: py + cellSize };
            const p2 = { x: px + cellSize, y: py + cellSize };
            const p3 = { x: p2.x + shiftX, y: p2.y + shiftY };
            const p4 = { x: p1.x + shiftX, y: p1.y + shiftY };

            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.lineTo(p3.x, p3.y);
            ctx.lineTo(p4.x, p4.y);
            ctx.closePath();

            ctx.fillStyle = lightestColorHex;
            ctx.fill();

            ctx.strokeStyle = lightestColorHex;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
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
    <div className="flex flex-col h-screen w-screen bg-slate-950 font-sans text-slate-100 overflow-hidden">
      <Header
        config={config}
        onUpdateConfig={handleUpdateConfig}
        onOpenPythonModal={() => setIsPythonModalOpen(true)}
        onExportImage={handleExportPNG}
      />

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        <ControlsPanel config={config} onUpdateConfig={handleUpdateConfig} />
        <Canvas2D config={config} onUpdateConfig={handleUpdateConfig} />
      </main>

      <PythonCodeModal
        config={config}
        isOpen={isPythonModalOpen}
        onClose={() => setIsPythonModalOpen(false)}
      />
    </div>
  );
}
