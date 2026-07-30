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
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="bg-slate-800/90 px-6 py-4 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-xl">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-white text-base flex items-center gap-2">
                Script Python Completo per PyCharm
                <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono">
                  Tkinter + Pillow GUI
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Incolla direttamente in PyCharm per eseguire l'interfaccia a slider nativa desktop
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30'
              }`}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copiato!' : 'Copia Codice'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600 transition"
            >
              <Download className="w-4 h-4 text-cyan-400" />
              <span>Scarica .py</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PyCharm Setup Instructions Banner */}
        <div className="bg-slate-950 px-6 py-3 border-b border-slate-800 text-xs text-slate-300 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-cyan-300 font-semibold">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span>Come usarlo in PyCharm in 3 passaggi:</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-slate-400 text-[11px] font-mono">
            <span>1. Crea <code className="text-cyan-300 bg-slate-900 px-1 py-0.5 rounded">bayer_attractor.py</code></span>
            <span>2. Incolla il codice</span>
            <span>
              3. Terminale PyCharm: <code className="text-amber-300 bg-slate-900 px-1.5 py-0.5 rounded border border-amber-500/30">pip install pillow numpy</code>
            </span>
          </div>
        </div>

        {/* Code View Area */}
        <div className="flex-1 overflow-auto bg-slate-950 p-6 font-mono text-xs text-slate-200 leading-relaxed custom-scrollbar">
          <pre className="whitespace-pre">{pythonCode}</pre>
        </div>

        {/* Footer */}
        <div className="bg-slate-800/80 px-6 py-3 border-t border-slate-700/80 text-xs text-slate-400 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Include griglia max 100x100, dither Bayer 2x2/4x4/8x8 e ombra 45° a parallelogramma.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs transition"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};
