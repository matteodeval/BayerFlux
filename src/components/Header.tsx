import React from 'react';
import { Code2, Download, RefreshCw, Sparkles, Layers, Image as ImageIcon } from 'lucide-react';
import { AppConfig, DEFAULT_CONFIG } from '../types';

interface HeaderProps {
  config: AppConfig;
  onUpdateConfig: (updated: Partial<AppConfig>) => void;
  onOpenPythonModal: () => void;
  onExportImage: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onUpdateConfig,
  onOpenPythonModal,
  onExportImage,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-lg sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center shadow-md shadow-blue-500/20">
          <Layers className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-lg leading-tight flex items-center gap-2">
            Griglia Attrattore & Ombre a 45°
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
              Grasshopper / PyCharm
            </span>
          </h1>
          <p className="text-xs text-slate-400">
            Pattern Bayer (2x2, 4x4, 8x8) con 4 sfumature di blu & proiezioni di parallelogrammi a 45°
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onUpdateConfig(DEFAULT_CONFIG)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
          title="Ripristina impostazioni iniziali"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>

        <button
          onClick={onExportImage}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
          title="Esporta rendering PNG"
        >
          <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
          <span>Esporta PNG</span>
        </button>

        <button
          onClick={onOpenPythonModal}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-600/30 transition transform hover:-translate-y-0.5"
        >
          <Code2 className="w-4 h-4 text-cyan-300" />
          <span>Codice Python (PyCharm)</span>
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
        </button>
      </div>
    </header>
  );
};
