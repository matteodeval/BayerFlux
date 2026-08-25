import React, { useState } from 'react';
import { X, Copy, Check, Download, Terminal, Sparkles, FileCode } from 'lucide-react';
import { AppConfig } from '../types';
import { generatePythonScript } from '../utils/pythonGenerator';

interface PythonCodeModalProps {
  config: AppConfig;
  isOpen: boolean;
  onClose: () => void;
}

export const PythonCodeModal: React.FC<PythonCodeModalProps> = ({ config, isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const pythonCode = generatePythonScript(config);

  const handleCopy = () => {
    navigator.clipboard.writeText(pythonCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([pythonCode], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bayer_attractor_gui.py';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#252526] border border-[#333333] rounded-lg w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden font-sans text-[#D4D4D4]">
        {/* Modal Header */}
        <div className="bg-[#2D2D2D] px-4 py-2.5 border-b border-[#333333] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-[#007ACC]/20 text-[#007ACC] border border-[#007ACC]/40 rounded">
              <FileCode className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-mono font-bold text-white text-xs flex items-center gap-2">
                <span>bayer_attractor_gui.py</span>
                <span className="text-[10px] bg-[#37373D] text-[#4EC9B0] border border-[#454545] px-1.5 py-0.2 rounded font-mono">
                  Python 3.11 / Tkinter
                </span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5 font-mono text-xs">
            <button
              onClick={handleCopy}
              className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-semibold transition ${
                copied
                  ? 'bg-[#27C93F] text-black'
                  : 'bg-[#007ACC] hover:bg-[#0062a3] text-white'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiato!' : 'Copia Codice'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1 px-3 py-1 rounded text-xs bg-[#37373D] hover:bg-[#454545] text-[#D4D4D4] border border-[#454545] transition"
            >
              <Download className="w-3.5 h-3.5 text-[#007ACC]" />
              <span>Scarica .py</span>
            </button>

            <button
              onClick={onClose}
              className="p-1 hover:bg-[#37373D] text-[#858585] hover:text-white rounded transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* PyCharm Setup Instructions Banner */}
        <div className="bg-[#1E1E1E] px-4 py-2 border-b border-[#333333] text-[11px] font-mono text-[#CCCCCC] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[#007ACC] font-semibold">
            <Terminal className="w-3.5 h-3.5 text-[#007ACC]" />
            <span>Istruzioni PyCharm:</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[#858585] text-[11px]">
            <span>1. Incolla in <code className="text-[#CE9178] bg-[#252526] px-1 py-0.5 rounded border border-[#333333]">main.py</code></span>
            <span>2. Terminale PyCharm: <code className="text-[#4EC9B0] bg-[#252526] px-1.5 py-0.5 rounded border border-[#333333]">pip install pillow numpy</code></span>
            <span>3. Clicca <strong className="text-[#27C93F]">Run 'main'</strong> (Shift+F10)</span>
          </div>
        </div>

        {/* Code View Area */}
        <div className="flex-1 overflow-auto bg-[#1E1E1E] p-4 font-mono text-xs text-[#D4D4D4] leading-relaxed custom-scrollbar select-text">
          <pre className="whitespace-pre">{pythonCode}</pre>
        </div>

        {/* Footer */}
        <div className="bg-[#2D2D2D] px-4 py-2 border-t border-[#333333] text-[11px] font-mono text-[#858585] flex justify-between items-center">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#FFBD2E]" />
            <span>Supporta rendering grafico desktop e esportazione vettoriale/raster.</span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-0.5 bg-[#37373D] hover:bg-[#454545] text-[#D4D4D4] border border-[#454545] rounded text-xs transition"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};
