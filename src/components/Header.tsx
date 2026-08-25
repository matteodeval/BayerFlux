import React from 'react';
import { Code2, RefreshCw, Sparkles, Layers, Image as ImageIcon, Play, Bug, Box } from 'lucide-react';
import { AppConfig, DEFAULT_CONFIG } from '../types';

interface HeaderProps {
  config: AppConfig;
  onUpdateConfig: (updated: Partial<AppConfig>) => void;
  onOpenPythonModal: () => void;
  onExportImage: () => void;
  onExportDXF: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onUpdateConfig,
  onOpenPythonModal,
  onExportImage,
  onExportDXF,
}) => {
  return (
    <header className="bg-[#252526] border-b border-[#333333] text-[#D4D4D4] px-4 h-12 flex items-center justify-between gap-3 shrink-0 select-none z-30">
      <div className="flex items-center gap-3">
        {/* macOS style window buttons */}
        <div className="flex items-center gap-1.5 mr-1">
          <div className="w-3 h-3 rounded-full bg-[#FF5F57]"></div>
          <div className="w-3 h-3 rounded-full bg-[#FFBD2E]"></div>
          <div className="w-3 h-3 rounded-full bg-[#27C93F]"></div>
        </div>

        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#007ACC]" />
          <h1 className="font-mono text-xs font-semibold text-[#D4D4D4] flex items-center gap-2">
            <span>bayer_attractor_v1.py</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#37373D] text-[#007ACC] border border-[#454545] font-mono">
              SIMULATION
            </span>
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-[#858585] font-mono mr-2">
          <button
            onClick={onOpenPythonModal}
            className="flex items-center gap-1 px-2.5 py-1 bg-[#37373D] hover:bg-[#454545] text-[#D4D4D4] rounded border border-[#454545] text-[11px] transition"
          >
            <Play className="w-3 h-3 text-[#27C93F] fill-[#27C93F]" />
            <span>RUN</span>
          </button>
          <button
            onClick={onOpenPythonModal}
            className="flex items-center gap-1 px-2.5 py-1 bg-[#37373D] hover:bg-[#454545] text-[#D4D4D4] rounded border border-[#454545] text-[11px] transition"
          >
            <Bug className="w-3 h-3 text-[#FFBD2E]" />
            <span>DEBUG</span>
          </button>
        </div>

        <button
          onClick={() => onUpdateConfig(DEFAULT_CONFIG)}
          className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono text-[#D4D4D4] bg-[#37373D] hover:bg-[#454545] border border-[#454545] transition"
          title="Reset Parameters"
        >
          <RefreshCw className="w-3 h-3 text-[#858585]" />
          <span>Reset</span>
        </button>

        <button
          onClick={onExportDXF}
          className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono text-[#FFBD2E] bg-[#37373D] hover:bg-[#454545] border border-[#FFBD2E]/40 font-bold transition"
          title="Export CAD (.dxf) for Rhino"
        >
          <Box className="w-3.5 h-3.5 text-[#FFBD2E]" />
          <span>CAD (.dxf)</span>
        </button>

        <button
          onClick={onExportImage}
          className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono text-[#D4D4D4] bg-[#37373D] hover:bg-[#454545] border border-[#454545] transition"
          title="Export PNG"
        >
          <ImageIcon className="w-3 h-3 text-[#007ACC]" />
          <span>PNG</span>
        </button>

        <button
          onClick={onOpenPythonModal}
          className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold text-white bg-[#007ACC] hover:bg-[#0062a3] transition font-mono shadow"
        >
          <Code2 className="w-3.5 h-3.5 text-white" />
          <span>Python PyCharm</span>
          <Sparkles className="w-3 h-3 text-[#FFBD2E]" />
        </button>
      </div>
    </header>
  );
};
