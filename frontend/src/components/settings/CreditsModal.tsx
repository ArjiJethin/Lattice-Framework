import React from 'react';
import { Award, X, ExternalLink } from 'lucide-react';
import { Button } from '../ui/primitives';

interface CreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreditsModal: React.FC<CreditsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const credits = [
    {
      name: 'llama.cpp',
      author: 'Georgi Gerganov & Contributors',
      desc: 'LLM inference in C/C++ with Metal, CUDA, and CPU acceleration.',
      url: 'https://github.com/ggerganov/llama.cpp',
    },
    {
      name: 'Apache ECharts',
      author: 'Apache Software Foundation',
      desc: 'Declarative charting and scientific data visualization library.',
      url: 'https://echarts.apache.org',
    },
    {
      name: 'Three.js & React Three Fiber',
      author: 'Ricardo Cabello & Poimandres',
      desc: '3D scene graph, procedural crystal geometries, and WebGL rendering.',
      url: 'https://threejs.org',
    },
    {
      name: 'Tauri 2',
      author: 'Tauri Programme within the Commons Conservancy',
      desc: 'Lightweight desktop application runtime shell.',
      url: 'https://v2.tauri.app',
    },
    {
      name: 'FastAPI & Pydantic',
      author: 'Sebastián Ramírez & Contributors',
      desc: 'High-performance Python web API framework for the optimization engine.',
      url: 'https://fastapi.tiangolo.com',
    },
    {
      name: 'Lucide Icons',
      author: 'Lucide Project',
      desc: 'Consistent technical icon toolkit.',
      url: 'https://lucide.dev',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#222938]/40 backdrop-blur-xs select-none">
      <div className="w-full max-w-lg bg-white rounded-lg border border-[#D9DEE7] shadow-glass p-5 flex flex-col gap-4 max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E6EAF0]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-[#F2F0FD] border border-[#D8D1FA] text-[#7562E8] flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-[14.5px] font-semibold text-[#222938]">
                Acknowledgements &amp; Credits
              </h3>
              <p className="text-[11.5px] text-[#647187]">
                Open-source technologies powering Lattice Framework
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close Credits Modal"
            onClick={onClose}
            className="h-7 w-7 rounded-sm flex items-center justify-center text-[#647187] hover:text-[#222938] hover:bg-[#F8F9FB] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Credits List */}
        <div className="overflow-y-auto flex flex-col divide-y divide-[#E6EAF0] pr-1 text-[12px]">
          {credits.map((item) => (
            <div
              key={item.name}
              className="py-2.5 flex items-start justify-between gap-3"
            >
              <div>
                <div className="font-semibold text-[#222938] font-mono">
                  {item.name}
                </div>
                <div className="text-[11px] text-[#647187]">{item.author}</div>
                <div className="text-[#222938] mt-0.5">{item.desc}</div>
              </div>
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                aria-label={`Open ${item.name} website`}
                className="text-[#647187] hover:text-[#7562E8] p-1 rounded-sm hover:bg-[#F8F9FB] shrink-0 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-[#E6EAF0] flex items-center justify-end">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};