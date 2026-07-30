import React from 'react';
import {
  Grid,
  Activity,
  Sliders,
  Box,
  Palette,
  Eye,
  Maximize2,
  Compass,
  Layers,
  Sparkles
} from 'lucide-react';
import {
  AppConfig,
  BayerSize,
  CurvePreset,
  ProjectionAngle,
  DEFAULT_BLUE_PALETTES
} from '../types';

interface ControlsPanelProps {
  config: AppConfig;
  onUpdateConfig: (updated: Partial<AppConfig>) => void;
}

export const ControlsPanel: React.FC<ControlsPanelProps> = ({ config, onUpdateConfig }) => {
  return (
    <div className="w-full lg:w-96 bg-slate-900 border-r border-slate-800 text-slate-200 p-4 overflow-y-auto space-y-6 shrink-0 custom-scrollbar">
      {/* SECTION 1: GRID SIZE */}
      <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/60 space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-cyan-400 uppercase tracking-wider">
          <span className="flex items-center gap-2">
            <Grid className="w-4 h-4 text-cyan-400" />
            1. Griglia Quadrati (Max 100x100)
          </span>
          <span className="text-slate-400 font-mono text-[11px]">
            {config.gridWidth} x {config.gridHeight}
          </span>
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs text-slate-300 mb-1">
              <span>Larghezza (N. Quadrati)</span>
              <span className="font-mono text-cyan-300">{config.gridWidth}</span>
            </div>
            <input
              type="range"
              min={5}
              max={100}
              value={config.gridWidth}
              onChange={(e) =>
                onUpdateConfig({
                  gridWidth: parseInt(e.target.value, 10),
                  // keep grid height aligned if user wants sync or let them be separate
                })
              }
              className="w-full accent-cyan-500 bg-slate-700 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-300 mb-1">
              <span>Altezza (N. Quadrati)</span>
              <span className="font-mono text-cyan-300">{config.gridHeight}</span>
            </div>
            <input
              type="range"
              min={5}
              max={100}
              value={config.gridHeight}
              onChange={(e) => onUpdateConfig({ gridHeight: parseInt(e.target.value, 10) })}
              className="w-full accent-cyan-500 bg-slate-700 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Quick Resolution Shortcuts */}
          <div className="flex gap-1.5 pt-1">
            {[20, 40, 60, 80, 100].map((dim) => (
              <button
                key={dim}
                onClick={() => onUpdateConfig({ gridWidth: dim, gridHeight: dim })}
                className={`flex-1 py-1 rounded text-[11px] font-mono border transition ${
                  config.gridWidth === dim && config.gridHeight === dim
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold'
                    : 'bg-slate-700/50 text-slate-400 border-slate-600/40 hover:bg-slate-700'
                }`}
              >
                {dim}x{dim}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 pt-1 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={config.showGridLines}
              onChange={(e) => onUpdateConfig({ showGridLines: e.target.checked })}
              className="rounded accent-cyan-500 w-4 h-4 bg-slate-700 border-slate-600"
            />
            <span>Mostra linee griglia</span>
          </label>
        </div>
      </div>

      {/* SECTION 2: ATTRACTOR CURVE */}
      <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/60 space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-blue-400 uppercase tracking-wider">
          <span className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-400" />
            2. Curva Attrattore (Grasshopper)
          </span>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-slate-300 mb-1">Tipo di Curva Attrattore</label>
            <select
              value={config.curvePreset}
              onChange={(e) => onUpdateConfig({ curvePreset: e.target.value as CurvePreset })}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg text-xs text-slate-200 px-2.5 py-1.5 focus:outline-none focus:border-blue-500"
            >
              <option value="bezier">Curva Bézier (Punti trascinabili)</option>
              <option value="sine">Onda Sinusoidale</option>
              <option value="circle">Attrattore Circolare</option>
              <option value="diagonal">Diagonale Principale</option>
              <option value="dual_point">Doppio Punto Attrattore</option>
            </select>
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-300 mb-1">
              <span>Raggio Falloff Attrattore</span>
              <span className="font-mono text-blue-300">{config.attractorRadius.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min={2}
              max={60}
              step={0.5}
              value={config.attractorRadius}
              onChange={(e) => onUpdateConfig({ attractorRadius: parseFloat(e.target.value) })}
              className="w-full accent-blue-500 bg-slate-700 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-300 mb-1">
              <span>Esponente Decadimento (Falloff)</span>
              <span className="font-mono text-blue-300">{config.falloffPower.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={3.0}
              step={0.05}
              value={config.falloffPower}
              onChange={(e) => onUpdateConfig({ falloffPower: parseFloat(e.target.value) })}
              className="w-full accent-blue-500 bg-slate-700 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={config.invertAttractor}
              onChange={(e) => onUpdateConfig({ invertAttractor: e.target.checked })}
              className="rounded accent-blue-500 w-4 h-4 bg-slate-700 border-slate-600"
            />
            <span>Inverti Gradiente Attrattore</span>
          </label>
        </div>
      </div>

      {/* SECTION 3: BAYER PATTERN & 4 BLUE SHADES */}
      <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/60 space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-indigo-400 uppercase tracking-wider">
          <span className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-indigo-400" />
            3. Pattern Bayer & 4 Sfumature
          </span>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-slate-300 mb-1.5">Matrice Bayer Dither</label>
            <div className="grid grid-cols-3 gap-2">
              {([2, 4, 8] as BayerSize[]).map((size) => (
                <button
                  key={size}
                  onClick={() => onUpdateConfig({ bayerSize: size })}
                  className={`py-1.5 rounded-lg text-xs font-bold font-mono border transition ${
                    config.bayerSize === size
                      ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500'
                      : 'bg-slate-700/50 text-slate-400 border-slate-600 hover:bg-slate-700'
                  }`}
                >
                  {size}x{size}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-300 mb-1">
              <span>Intensità Pattern Bayer</span>
              <span className="font-mono text-indigo-300">
                {Math.round(config.bayerStrength * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={config.bayerStrength}
              onChange={(e) => onUpdateConfig({ bayerStrength: parseFloat(e.target.value) })}
              className="w-full accent-indigo-500 bg-slate-700 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Palette Preset Selector */}
          <div>
            <label className="block text-xs text-slate-300 mb-1">Tavolozza Predefinita (4 Blu)</label>
            <div className="space-y-1.5">
              {DEFAULT_BLUE_PALETTES.map((p) => (
                <button
                  key={p.name}
                  onClick={() =>
                    onUpdateConfig({ palette: p.colors, presetPaletteName: p.name })
                  }
                  className={`w-full flex items-center justify-between p-2 rounded-lg border text-xs transition ${
                    config.presetPaletteName === p.name
                      ? 'bg-slate-700 border-indigo-500'
                      : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-700/40'
                  }`}
                >
                  <span className="text-slate-300">{p.name}</span>
                  <div className="flex items-center gap-1">
                    {p.colors.map((c, idx) => (
                      <span
                        key={idx}
                        className="w-3.5 h-3.5 rounded-full border border-slate-600/50 shadow-sm"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Palette Color Pickers */}
          <div>
            <label className="block text-xs text-slate-300 mb-1.5">
              Personalizza i 4 Livelli (Scurissimo → Sfondoclao)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {config.palette.map((color, idx) => (
                <div key={idx} className="flex flex-col items-center gap-1">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => {
                      const updated = [...config.palette];
                      updated[idx] = e.target.value;
                      onUpdateConfig({ palette: updated, presetPaletteName: 'Personalizzata' });
                    }}
                    className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border border-slate-600"
                  />
                  <span className="text-[10px] text-slate-400 font-mono">
                    {idx === 3 ? 'Sfondo' : `Blu ${idx + 1}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 4: 45 DEGREE PARALLELOGRAM SHADOW PROJECTION */}
      <div className="bg-slate-800/60 rounded-xl p-4 border border-amber-500/30 space-y-3 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />

        <div className="flex items-center justify-between text-xs font-bold text-amber-400 uppercase tracking-wider">
          <span className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-amber-400" />
            4. Ombra Parallelogrammi a 45°
          </span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.shadowEnabled}
              onChange={(e) => onUpdateConfig({ shadowEnabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
          </label>
        </div>

        {config.shadowEnabled && (
          <div className="space-y-3 pt-1">
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Lunghezza Diagonali Parallelogramma</span>
                <span className="font-mono text-amber-300">
                  {config.diagonalLength.toFixed(1)} diagg.
                </span>
              </div>
              <input
                type="range"
                min={0.5}
                max={10.0}
                step={0.1}
                value={config.diagonalLength}
                onChange={(e) => onUpdateConfig({ diagonalLength: parseFloat(e.target.value) })}
                className="w-full accent-amber-500 bg-slate-700 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
              <p className="text-[11px] text-slate-400 mt-1 italic">
                I lati del parallelogramma scorrono a 45° per una lunghezza pari a{' '}
                <strong className="text-amber-300">{config.diagonalLength.toFixed(1)} diagonali</strong>{' '}
                del quadrato.
              </p>
            </div>

            {/* Projection Angle Buttons */}
            <div>
              <label className="block text-xs text-slate-300 mb-1.5">
                Inclinazione Proiezione 45°
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'left_up', label: '↖ Sinistra In Alto' },
                  { id: 'left_down', label: '↙ Sinistra In Basso' },
                  { id: 'right_up', label: '↗ Destra In Alto' },
                  { id: 'right_down', label: '↘ Destra In Basso' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() =>
                      onUpdateConfig({ projectionAngle: item.id as ProjectionAngle })
                    }
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-medium border text-left transition ${
                      config.projectionAngle === item.id
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 font-semibold'
                        : 'bg-slate-700/50 text-slate-400 border-slate-600 hover:bg-slate-700'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Target Filter */}
            <div>
              <label className="block text-xs text-slate-300 mb-1">Applica Ombra A:</label>
              <select
                value={config.shadowTarget}
                onChange={(e) =>
                  onUpdateConfig({
                    shadowTarget: e.target.value as any,
                  })
                }
                className="w-full bg-slate-700 border border-slate-600 rounded-lg text-xs text-slate-200 px-2.5 py-1.5 focus:outline-none focus:border-amber-500"
              >
                <option value="lightest_only">
                  Solo Colore Più Chiaro (Colore Sfondo - Requisito)
                </option>
                <option value="all_weighted">
                  Tutti i Quadrati (Proporzionale al Livello)
                </option>
                <option value="darkest_only">Solo Quadrati Scuri</option>
              </select>
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Opacità Ombra</span>
                <span className="font-mono text-amber-300">
                  {Math.round(config.shadowOpacity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0.1}
                max={1.0}
                step={0.05}
                value={config.shadowOpacity}
                onChange={(e) => onUpdateConfig({ shadowOpacity: parseFloat(e.target.value) })}
                className="w-full accent-amber-500 bg-slate-700 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
