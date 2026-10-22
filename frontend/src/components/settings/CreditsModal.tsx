import React from 'react';
import { Award, X, ExternalLink } from 'lucide-react';

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
      desc: 'Powerful charting and data visualization library.',
      url: 'https://echarts.apache.org',
    },
    {
      name: 'Three.js & React Three Fiber',
      author: 'Ricardo Cabello & Poimandres',
      desc: '3D scene graph, procedural shaders, and WebGL rendering.',
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
      desc: 'Modern, high-performance web API framework for Python.',
      url: 'https://fastapi.tiangolo.com',
    },
    {
      name: 'Lucide Icons',
      author: 'Lucide Project',
      desc: 'Beautiful & consistent icon toolkit.',
      url: 'https://lucide.dev',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 flex flex-col gap-4 max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-[#7C6AF2] flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-[#18213B]">
                Acknowledgements &amp; Credits
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Open source technologies powering Lattice Framework
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Credits List */}
        <div className="overflow-y-auto flex flex-col divide-y divide-slate-100 pr-1 text-xs">
          {credits.map((item) => (
            <div key={item.name} className="py-2.5 flex items-start justify-between gap-3">
              <div>
                <div className="font-bold text-[#18213B]">{item.name}</div>
                <div className="text-[10.5px] text-slate-400 font-medium">
                  {item.author}
                </div>
                <div className="text-slate-600 font-medium mt-0.5">{item.desc}</div>
              </div>
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="text-slate-400 hover:text-[#7C6AF2] p-1 shrink-0"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
