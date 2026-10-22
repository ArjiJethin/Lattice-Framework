import React, { useState } from 'react';
import {
  ModelFamily,
  QuantizationVariant,
  ModelInspectorTab,
} from '../../types/modelLibrary';
import { getColorPaletteById } from '../model-entities/SharedModelMaterials';
import { ModelPerformanceTab } from './ModelPerformanceTab';
import { ModelCompatibilityTab } from './ModelCompatibilityTab';
import { ModelFilesTab } from './ModelFilesTab';
import {
  Play,
  FileSpreadsheet,
  MoreHorizontal,
  Copy,
  Check,
  CheckCircle2,
} from 'lucide-react';

interface ModelDetailsInspectorProps {
  model: ModelFamily;
  selectedVariant: QuantizationVariant;
  onRunBenchmark?: () => void;
  onViewExperiments?: () => void;
}

export const ModelDetailsInspector: React.FC<ModelDetailsInspectorProps> = ({
  model,
  selectedVariant,
  onRunBenchmark,
  onViewExperiments,
}) => {
  const [activeTab, setActiveTab] = useState<ModelInspectorTab>('overview');
  const [copied, setCopied] = useState(false);

  const activeArchetype = selectedVariant.archetype || model.archetype;
  const activePalette = getColorPaletteById(selectedVariant.paletteId || model.paletteId);

  const localPath =
    selectedVariant.filePath ||
    `D:\\models\\${model.id}-${selectedVariant.name.toLowerCase()}.gguf`;

  const handleCopyPath = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(localPath);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="w-full h-full flex flex-col justify-between p-4 rounded-2xl bg-white/88 backdrop-blur-xl border border-white/95 shadow-[0_4px_20px_rgba(24,33,59,0.03)] select-none overflow-hidden">
      <div className="flex-1 min-h-0 flex flex-col">
        {/* Top Header Row */}
        <div className="flex items-center justify-between mb-3 shrink-0">
          <span className="text-[14px] font-extrabold text-[#18213B] tracking-tight">
            Model Details
          </span>

          {model.status === 'Installed' ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-[#E6F4EA] text-[#0D8A58] border border-emerald-200/70">
              <span className="text-[11px] leading-none">◇</span>
              <span>Installed</span>
            </span>
          ) : model.status === 'Ready' ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-[#E0F2FE] text-[#0369A1] border border-sky-200/70">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
              <span>Ready</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-medium bg-slate-100 text-slate-500">
              <span>Not Installed</span>
            </span>
          )}
        </div>

        {/* Model Summary Card with Dynamic Palette Crystal Badge */}
        <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/70 mb-3 shrink-0">
          <div
            className="w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 transition-colors"
            style={{
              backgroundColor: activePalette.badgeBg,
              borderColor: activePalette.badgeBorder,
            }}
          >
            <svg className="w-6 h-6" viewBox="0 0 32 32" fill="none">
              <polygon points="16,3 27,9.5 16,16 5,9.5" fill={activePalette.wireframe} opacity="0.9" />
              <polygon points="5,9.5 16,16 16,29 5,22.5" fill={activePalette.secondaryShell} opacity="0.85" />
              <polygon points="16,16 27,9.5 27,22.5 16,29" fill={activePalette.primaryShell} opacity="0.9" />
              <path
                d="M16,3 L16,29 M5,9.5 L27,22.5 M27,9.5 L5,22.5"
                stroke="#FFFFFF"
                strokeWidth="1.1"
              />
              <circle cx="16" cy="16" r="2.2" fill="#FFFFFF" />
            </svg>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1.5">
              <h3 className="text-[14px] font-extrabold text-[#18213B] leading-tight truncate">
                {model.name}
              </h3>
              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white text-slate-500 border border-slate-200/70 shrink-0">
                {activeArchetype}
              </span>
            </div>
            <div className="text-[11px] font-semibold text-[#7C6AF2] mt-0.5 truncate">
              {selectedVariant.name} &nbsp;·&nbsp;{' '}
              <span className="text-slate-500 font-medium">{model.category}</span>
            </div>
            <p className="text-[10.5px] text-slate-500 leading-relaxed mt-1 line-clamp-2">
              {model.description}
            </p>
          </div>
        </div>

        {/* 4 Equal-Width Segmented Tabs */}
        <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-slate-100/80 border border-slate-200/60 mb-3 shrink-0">
          {(['overview', 'performance', 'compatibility', 'files'] as ModelInspectorTab[]).map(
            (tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`py-1.5 px-1 rounded-lg text-[10.5px] font-bold capitalize text-center truncate transition-all ${activeTab === tab
                    ? 'bg-white text-[#18213B] shadow-2xs ring-1 ring-slate-200/70'
                    : 'text-slate-500 hover:text-[#18213B]'
                  }`}
              >
                {tab}
              </button>
            )
          )}
        </div>

        {/* Scrollable Tab Body */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 pb-1">
          {activeTab === 'overview' && (
            <div className="space-y-3.5 text-xs">
              <div>
                <h4 className="text-[11px] font-extrabold text-[#18213B] mb-1.5">
                  Model Information
                </h4>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Parameters</span>
                    <span className="font-bold text-[#18213B]">{model.parameters}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Architecture</span>
                    <span className="font-bold text-[#18213B]">{model.architecture}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Context Length</span>
                    <span className="font-bold text-[#18213B]">{model.contextLength}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">File Format</span>
                    <span className="font-bold text-[#18213B]">{model.fileFormat}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">File Size</span>
                    <span className="font-bold text-[#18213B]">
                      {selectedVariant.fileSizeGb ? `${selectedVariant.fileSizeGb} GB` : 'Unknown'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 gap-2">
                    <span className="text-slate-500 shrink-0">Local Path</span>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="font-mono text-[10px] text-slate-600 truncate"
                        title={localPath}
                      >
                        {localPath}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyPath}
                        title="Copy Path"
                        className="p-1 rounded-md text-slate-400 hover:text-[#7C6AF2] hover:bg-slate-100 transition-colors shrink-0"
                      >
                        {copied ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/80">
                <h4 className="text-[11px] font-extrabold text-[#18213B] mb-1.5">
                  Status & Profiling
                </h4>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between py-1 border-b border-slate-100 items-center">
                    <span className="text-slate-500">Profiling Status</span>
                    <span
                      className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${selectedVariant.isProfiled
                          ? 'text-[#0D8A58] bg-[#E6F4EA]'
                          : 'text-slate-500 bg-slate-100'
                        }`}
                    >
                      {selectedVariant.isProfiled ? 'Profiled' : 'Not Profiled'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Last Benchmark</span>
                    <span className="font-bold text-[#18213B]">
                      {model.lastBenchmark || 'Oct 16, 2026 10:42 PM'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Evaluation Dataset</span>
                    <span className="font-bold text-[#18213B]">
                      {model.evaluationDataset || 'Lattice Bench v1.0'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Runtime</span>
                    <span className="font-bold text-[#18213B]">
                      {model.runtime || 'llama.cpp (v0.0.1)'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 items-center gap-2">
                    <span className="text-slate-500 shrink-0">Compatibility</span>
                    <span className="flex items-center gap-1 text-[10.5px] truncate">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
                      <span className="font-bold text-[#0D8A58]">Compatible</span>
                      <span className="font-semibold text-[#18213B] truncate">(RTX 3050, 4 GB)</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'performance' && (
            <ModelPerformanceTab model={model} variant={selectedVariant} />
          )}

          {activeTab === 'compatibility' && (
            <ModelCompatibilityTab model={model} variant={selectedVariant} />
          )}

          {activeTab === 'files' && (
            <ModelFilesTab model={model} selectedVariant={selectedVariant} />
          )}
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="pt-3 mt-1 border-t border-slate-200/80 flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onRunBenchmark}
          className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-[#7C6AF2] to-[#6366F1] hover:from-[#6D5AE6] hover:to-[#5457E5] text-white text-[11px] font-bold flex items-center justify-center gap-1.5 whitespace-nowrap shadow-[0_4px_12px_rgba(124,106,242,0.25)] transition-all"
        >
          <Play className="w-3 h-3 fill-current shrink-0" />
          <span>Run Benchmark</span>
        </button>

        <button
          type="button"
          onClick={onViewExperiments}
          className="py-2 px-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/90 text-[#18213B] text-[11px] font-bold flex items-center justify-center gap-1.5 whitespace-nowrap transition-all shadow-2xs"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span>Experiments</span>
        </button>

        <button
          type="button"
          title="More Options"
          className="p-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-500 hover:text-[#18213B] transition-all shadow-2xs shrink-0"
        >
          <MoreHorizontal className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};