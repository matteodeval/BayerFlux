import React from 'react';
import {
  Grid,
  Activity,
  Palette,
  Compass,
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
    <div className="w-full lg:w-80 bg-[#252526] border-r border-[#333333] text-[#D4D4D4] p-3 overflow-y-auto space-y-4 shrink-0 font-sans custom-scrollbar text-xs">
      {/* SECTION 1: GRID SIZE */}
      <div className="bg-[#1E1E1E] rounded border border-[#333333] p-3 space-y-2.5">
        <div className="flex items-center justify-between text-[11px] font-mono font-bold text-[#007ACC] uppercase tracking-wider">
          <span className="flex items-center gap-1.5">
            <Grid className="w-3.5 h-3.5 text-[#007ACC]" />
            1. Dimensioni Griglia (Max 100x100)
          </span>
          <span className="text-[#858585]">
            {config.gridWidth}x{config.gridHeight}
          </span>
        </div>

        <div className="space-y-2">
          <div>
            <div className="flex justify-between text-[11px] text-[#CCCCCC] mb-1 font-mono">
              <span>Larghezza (N. Quadrati)</span>
              <span className="text-[#007ACC] font-bold">{config.gridWidth}</span>
            </div>
            <input
              type="range"
              min={5}
              max={100}
              value={config.gridWidth}
              onChange={(e) =>
                onUpdateConfig({
                  gridWidth: parseInt(e.target.value, 10),
                })
              }
              className="w-full accent-[#007ACC] bg-[#37373D] h-1 rounded appearance-none cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-[11px] text-[#CCCCCC] mb-1 font-mono">
              <span>Altezza (N. Quadrati)</span>
              <span className="text-[#007ACC] font-bold">{config.gridHeight}</span>
            </div>
            <input
              type="range"
              min={5}
              max={100}
              value={config.gridHeight}
              onChange={(e) => onUpdateConfig({ gridHeight: parseInt(e.target.value, 10) })}
              className="w-full accent-[#007ACC] bg-[#37373D] h-1 rounded appearance-none cursor-pointer"
            />
          </div>

          {/* Quick Resolution Shortcuts */}
          <div className="flex gap-1 pt-0.5">
            {[20, 40, 60, 80, 100].map((dim) => (
              <button
                key={dim}
                onClick={() => onUpdateConfig({ gridWidth: dim, gridHeight: dim })}
                className={`flex-1 py-0.5 rounded text-[10px] font-mono border transition ${
                  config.gridWidth === dim && config.gridHeight === dim
                    ? 'bg-[#007ACC] text-white border-[#007ACC] font-bold'
                    : 'bg-[#37373D] text-[#858585] border-[#454545] hover:bg-[#454545] hover:text-[#D4D4D4]'
                }`}
              >
                {dim}x{dim}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 pt-0.5 text-[11px] text-[#CCCCCC] cursor-pointer font-mono">
            <input
              type="checkbox"
              checked={config.showGridLines}
              onChange={(e) => onUpdateConfig({ showGridLines: e.target.checked })}
              className="rounded accent-[#007ACC] w-3.5 h-3.5 bg-[#37373D] border-[#454545]"
            />
            <span>Mostra linee griglia</span>
          </label>
        </div>
      </div>

      {/* SECTION 2: ATTRACTOR CURVE */}
      <div className="bg-[#1E1E1E] rounded border border-[#333333] p-3 space-y-2.5">
        <div className="flex items-center justify-between text-[11px] font-mono font-bold text-[#4EC9B0] uppercase tracking-wider">
          <span className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-[#4EC9B0]" />
            2. Curva Attrattore (Grasshopper)
          </span>
        </div>

        <div className="space-y-2">
          <div>
            <label className="block text-[11px] text-[#858585] mb-1 font-mono">Tipo di Curva Attrattore</label>
            <select
              value={config.curvePreset}
              onChange={(e) => onUpdateConfig({ curvePreset: e.target.value as CurvePreset })}
              className="w-full bg-[#37373D] border border-[#454545] rounded text-[11px] text-[#D4D4D4] px-2 py-1 font-mono focus:outline-none focus:border-[#007ACC]"
            >
              <option value="bezier">Curva Bézier (Punti trascinabili)</option>
              <option value="sine">Onda Sinusoidale</option>
              <option value="circle">Attrattore Circolare</option>
              <option value="diagonal">Diagonale Principale</option>
              <option value="dual_point">Doppio Punto Attrattore</option>
            </select>
          </div>

          <div>
            <div className="flex justify-between text-[11px] text-[#CCCCCC] mb-1 font-mono">
              <span>Raggio Falloff Attrattore</span>
              <span className="text-[#4EC9B0] font-bold">{config.attractorRadius.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min={2}
              max={60}
              step={0.5}
              value={config.attractorRadius}
              onChange={(e) => onUpdateConfig({ attractorRadius: parseFloat(e.target.value) })}
              className="w-full accent-[#4EC9B0] bg-[#37373D] h-1 rounded appearance-none cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-[11px] text-[#CCCCCC] mb-1 font-mono">
              <span>Esponente Decadimento</span>
              <span className="text-[#4EC9B0] font-bold">{config.falloffPower.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={3.0}
              step={0.05}
              value={config.falloffPower}
              onChange={(e) => onUpdateConfig({ falloffPower: parseFloat(e.target.value) })}
              className="w-full accent-[#4EC9B0] bg-[#37373D] h-1 rounded appearance-none cursor-pointer"
            />
          </div>

          <label className="flex items-center gap-2 text-[11px] text-[#CCCCCC] cursor-pointer pt-0.5 font-mono">
            <input
              type="checkbox"
              checked={config.invertAttractor}
              onChange={(e) => onUpdateConfig({ invertAttractor: e.target.checked })}
              className="rounded accent-[#4EC9B0] w-3.5 h-3.5 bg-[#37373D] border-[#454545]"
            />
            <span>Inverti Gradiente Attrattore</span>
          </label>
        </div>
      </div>

      {/* SECTION 3: BAYER PATTERN & 4 BLUE SHADES */}
      <div className="bg-[#1E1E1E] rounded border border-[#333333] p-3 space-y-2.5">
        <div className="flex items-center justify-between text-[11px] font-mono font-bold text-[#CE9178] uppercase tracking-wider">
          <span className="flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-[#CE9178]" />
            3. Pattern Bayer & 4 Sfumature
          </span>
        </div>

        <div className="space-y-2">
          <div>
            <label className="block text-[11px] text-[#858585] mb-1 font-mono">Matrice Bayer Dither</label>
            <div className="grid grid-cols-3 gap-1.5">
              {([2, 4, 8] as BayerSize[]).map((size) => (
                <button
                  key={size}
                  onClick={() => onUpdateConfig({ bayerSize: size })}
                  className={`py-1 rounded text-[11px] font-bold font-mono border transition ${
                    config.bayerSize === size
                      ? 'bg-[#CE9178] text-black border-[#CE9178]'
                      : 'bg-[#37373D] text-[#858585] border-[#454545] hover:bg-[#454545] hover:text-[#D4D4D4]'
                  }`}
                >
                  {size}x{size}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between text-[11px] text-[#CCCCCC] mb-1 font-mono">
              <span>Intensità Pattern Bayer</span>
              <span className="text-[#CE9178] font-bold">
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
              className="w-full accent-[#CE9178] bg-[#37373D] h-1 rounded appearance-none cursor-pointer"
            />
          </div>

          {/* Palette Preset Selector */}
          <div>
            <label className="block text-[11px] text-[#858585] mb-1 font-mono">Tavolozza (4 Sfumature Blu)</label>
            <div className="space-y-1">
              {DEFAULT_BLUE_PALETTES.map((p) => (
                <button
                  key={p.name}
                  onClick={() =>
                    onUpdateConfig({ palette: p.colors, presetPaletteName: p.name })
                  }
                  className={`w-full flex items-center justify-between p-1.5 rounded border text-[11px] font-mono transition ${
                    config.presetPaletteName === p.name
                      ? 'bg-[#37373D] border-[#007ACC] text-[#D4D4D4]'
                      : 'bg-[#1E1E1E] border-[#333333] text-[#858585] hover:bg-[#252526] hover:text-[#CCCCCC]'
                  }`}
                >
                  <span>{p.name}</span>
                  <div className="flex items-center gap-1">
                    {p.colors.map((c, idx) => (
                      <span
                        key={idx}
                        className="w-3 h-3 rounded-full border border-[#454545]"
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
            <label className="block text-[11px] text-[#858585] mb-1 font-mono">
              I 4 Livelli (Scurissimo → Sfondo)
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {config.palette.map((color, idx) => (
                <div key={idx} className="flex flex-col items-center gap-0.5">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => {
                      const updated = [...config.palette];
                      updated[idx] = e.target.value;
                      onUpdateConfig({ palette: updated, presetPaletteName: 'Personalizzata' });
                    }}
                    className="w-7 h-7 rounded cursor-pointer bg-transparent border border-[#454545]"
                  />
                  <span className="text-[9px] text-[#858585] font-mono">
                    {idx === 3 ? 'Sfondo' : `Blu ${idx + 1}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 4: 45 DEGREE PARALLELOGRAM SHADOW PROJECTION */}
      <div className="bg-[#1E1E1E] rounded border border-[#D16969]/40 p-3 space-y-2.5">
        <div className="flex items-center justify-between text-[11px] font-mono font-bold text-[#D16969] uppercase tracking-wider">
          <span className="flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-[#D16969]" />
            4. Ombra Parallelogrammi a 45°
          </span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.shadowEnabled}
              onChange={(e) => onUpdateConfig({ shadowEnabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-8 h-4 bg-[#37373D] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#D16969]"></div>
          </label>
        </div>

        {config.shadowEnabled && (
          <div className="space-y-2.5">
            {/* Discrete Integer Grid Diagonal Length */}
            <div>
              <div className="flex justify-between text-[11px] text-[#CCCCCC] mb-1 font-mono">
                <span>Lunghezza Ombra (Multiplo Griglia)</span>
                <span className="text-[#D16969] font-bold">
                  {Math.round(config.diagonalLength)} {Math.round(config.diagonalLength) === 1 ? 'blocco' : 'blocchi'}
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={12}
                step={1}
                value={Math.round(config.diagonalLength)}
                onChange={(e) => onUpdateConfig({ diagonalLength: parseInt(e.target.value, 10) })}
                className="w-full accent-[#D16969] bg-[#37373D] h-1 rounded appearance-none cursor-pointer"
              />
            </div>

            {/* Max Plank Length for Parquet */}
            <div>
              <div className="flex justify-between text-[11px] text-[#CCCCCC] mb-1 font-mono">
                <span>Lunghezza Max Piastrella Parquet</span>
                <span className="text-[#4EC9B0] font-bold">
                  {Math.round(config.maxPlankLength)} {Math.round(config.maxPlankLength) === 1 ? 'blocco' : 'blocchi'}
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                step={1}
                value={Math.round(config.maxPlankLength)}
                onChange={(e) => onUpdateConfig({ maxPlankLength: parseInt(e.target.value, 10) })}
                className="w-full accent-[#4EC9B0] bg-[#37373D] h-1 rounded appearance-none cursor-pointer"
              />
            </div>

            {/* Projection Angle Buttons */}
            <div>
              <label className="block text-[11px] text-[#858585] mb-1 font-mono">
                Angolo Inclinazione 45°
              </label>
              <div className="grid grid-cols-2 gap-1">
                {[
                  { id: 'left_up', label: '↖ Sinistra Alto' },
                  { id: 'left_down', label: '↙ Sinistra Basso' },
                  { id: 'right_up', label: '↗ Destra Alto' },
                  { id: 'right_down', label: '↘ Destra Basso' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() =>
                      onUpdateConfig({ projectionAngle: item.id as ProjectionAngle })
                    }
                    className={`py-1 px-1.5 rounded text-[10px] font-mono border text-left transition ${
                      config.projectionAngle === item.id
                        ? 'bg-[#D16969] text-white border-[#D16969] font-bold'
                        : 'bg-[#37373D] text-[#858585] border-[#454545] hover:bg-[#454545] hover:text-[#D4D4D4]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Target Filter */}
            <div>
              <label className="block text-[11px] text-[#858585] mb-1 font-mono">Filtro Bersaglio Ombre:</label>
              <select
                value={config.shadowTarget}
                onChange={(e) =>
                  onUpdateConfig({
                    shadowTarget: e.target.value as any,
                  })
                }
                className="w-full bg-[#37373D] border border-[#454545] rounded text-[11px] text-[#D4D4D4] px-2 py-1 font-mono focus:outline-none focus:border-[#D16969]"
              >
                <option value="lightest_only">Solo Colore Sfondo (Colore Più Chiaro)</option>
                <option value="all_weighted">Tutti i Quadrati (Proporzionale)</option>
                <option value="darkest_only">Solo Quadrati Scuri</option>
              </select>
            </div>

            {/* Parquet Merge Checkbox */}
            <div className="pt-1 space-y-1.5 border-t border-[#37373D]">
              <label className="flex items-center gap-2 text-[11px] text-[#CCCCCC] cursor-pointer font-mono">
                <input
                  type="checkbox"
                  checked={config.mergeShadows ?? true}
                  onChange={(e) => onUpdateConfig({ mergeShadows: e.target.checked })}
                  className="rounded accent-[#D16969] w-3.5 h-3.5 bg-[#37373D] border-[#454545]"
                />
                <span className="font-semibold text-white">
                  Unisci Ombre Adiacenti (Effetto Parquet)
                </span>
              </label>

              <label className="flex items-center gap-2 pl-5 text-[11px] text-[#CCCCCC] cursor-pointer font-mono">
                <input
                  type="checkbox"
                  checked={config.staggerParquet ?? true}
                  onChange={(e) => onUpdateConfig({ staggerParquet: e.target.checked })}
                  className="rounded accent-[#4EC9B0] w-3.5 h-3.5 bg-[#37373D] border-[#454545]"
                />
                <span className="text-[#D4D4D4]">
                  Sfalsamento Giunti Alternato tra Righe
                </span>
              </label>

              <label className="flex items-center gap-2 pl-5 text-[11px] text-[#CCCCCC] cursor-pointer font-mono">
                <input
                  type="checkbox"
                  checked={config.clipShadowsToGrid ?? true}
                  onChange={(e) => onUpdateConfig({ clipShadowsToGrid: e.target.checked })}
                  className="rounded accent-[#D16969] w-3.5 h-3.5 bg-[#37373D] border-[#454545]"
                />
                <span className="text-[#D4D4D4]">
                  Rifila Ombre ai Bordi Griglia (Clip Canvas)
                </span>
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
