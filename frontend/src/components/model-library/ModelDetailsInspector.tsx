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
import { Button, StatusBadge, SegmentedTabs } from '../ui/primitives';
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

  const statusTone =
    model.status === 'Installed'
      ? 'success'
      : model.status === 'Ready'
        ? 'info'
        : 'neutral';

  return (
    <div className="w-full h-full flex flex-col justify-between p-4 rounded-lg bg-white border border-[#D9DEE7] shadow-2xs select-none overflow-hidden">
      <div className="flex-1 min-h-0 flex flex-col">
        {/* Top Header Row */}
        <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-[#E6EAF0] shrink-0">
          <span className="text-[14px] font-semibold text-[#222938] tracking-tight">
            Model Details
          </span>
          <StatusBadge tone={statusTone}>{model.status}</StatusBadge>
        </div>

        {/* Model Summary Card */}
        <div className="flex items-start gap-3 p-2.5 rounded-md bg-[#F8F9FB] border border-[#D9DEE7] mb-3 shrink-0">
          <div
            className="w-9 h-9 rounded-md border flex items-center justify-center shrink-0 mt-0.5"
            style={{
              backgroundColor: activePalette.badgeBg,
              borderColor: activePalette.badgeBorder,
            }}
          >
            <svg className="w-5 h-5" viewBox="0 0 32 32" fill="none">
              <polygon points="16,3 27,9.5 16,16 5,9.5" fill={activePalette.wireframe} opacity="0.9" />
              <polygon points="5,9.5 16,16 16,29 5,22.5" fill={activePalette.secondaryShell} opacity="0.85" />
              <polygon points="16,16 27,9.5 27,22.5 16,29" fill={activePalette.primaryShell} opacity="0.9" />
              <path
                d="M16,3 L16,29 M5,9.5 L27,22.5 M27,9.5 L5,22.5"
                stroke="#FFFFFF"
                strokeWidth="1.1"
              />
              <circle cx="16" cy="16" r="2" fill="#FFFFFF" />
            </svg>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1.5">
              <h3 className="text-[14px] font-semibold text-[#222938] leading-tight truncate">
                {model.name}
              </h3>
              <span className="text-[9.5px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-sm bg-white text-[#647187] border border-[#D9DEE7] shrink-0">
                {activeArchetype}
              </span>
            </div>
            <div className="text-[11.5px] font-mono font-medium text-[#7562E8] mt-0.5 truncate">
              {selectedVariant.name} &nbsp;·&nbsp;{' '}
              <span className="font-sans text-[#647187]">{model.category}</span>
            </div>
            <p className="text-[11px] text-[#647187] leading-relaxed mt-1 line-clamp-2">
              {model.description}
            </p>
          </div>
        </div>

        {/* 4 Segmented Inspector Tabs */}
        <SegmentedTabs
          fullWidth
          value={activeTab}
          onChange={setActiveTab}
          className="mb-3 shrink-0"
          options={[
            { id: 'overview', label: 'Overview' },
            { id: 'performance', label: 'Performance' },
            { id: 'compatibility', label: 'Compat' },
            { id: 'files', label: 'Files' },
          ]}
        />

        {/* Scrollable Tab Body */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 pb-1">
          {activeTab === 'overview' && (
            <div className="space-y-3.5 text-[12px]">
              <div>
                <h4 className="text-[11px] font-semibold text-[#647187] uppercase tracking-wider mb-1.5">
                  Model Information
                </h4>
                <div className="divide-y divide-[#E6EAF0] border-t border-b border-[#E6EAF0]">
                  <div className="flex justify-between py-1.5">
                    <span className="text-[#647187]">Parameters</span>
                    <span className="font-mono font-semibold text-[#222938] tabular-nums">
                      {model.parameters}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-[#647187]">Architecture</span>
                    <span className="font-semibold text-[#222938]">{model.architecture}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-[#647187]">Context Length</span>
                    <span className="font-mono font-semibold text-[#222938] tabular-nums">
                      {model.contextLength}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-[#647187]">File Format</span>
                    <span className="font-mono font-semibold text-[#222938]">{model.fileFormat}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-[#647187]">File Size</span>
                    <span className="font-mono font-semibold text-[#222938] tabular-nums">
                      {selectedVariant.fileSizeGb ? `${selectedVariant.fileSizeGb} GB` : 'Unknown'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 gap-2">
                    <span className="text-[#647187] shrink-0">Local Path</span>
                    <div className="flex items-center gap-1 min-w-0">
                      <span
                        className="font-mono text-[10.5px] text-[#647187] truncate"
                        title={localPath}
                      >
                        {localPath}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyPath}
                        aria-label="Copy Path"
                        title="Copy Path"
                        className="p-1 rounded-sm text-[#647187] hover:text-[#7562E8] hover:bg-[#F8F9FB] transition-colors shrink-0 cursor-pointer"
                      >
                        {copied ? (
                          <Check className="w-3 h-3 text-[#0D8A58]" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-[11px] font-semibold text-[#647187] uppercase tracking-wider mb-1.5">
                  Status &amp; Profiling
                </h4>
                <div className="divide-y divide-[#E6EAF0] border-t border-b border-[#E6EAF0]">
                  <div className="flex justify-between py-1.5 items-center">
                    <span className="text-[#647187]">Profiling Status</span>
                    <StatusBadge
                      tone={selectedVariant.isProfiled ? 'success' : 'neutral'}
                      dot={selectedVariant.isProfiled}
                    >
                      {selectedVariant.isProfiled ? 'Profiled' : 'Not Profiled'}
                    </StatusBadge>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-[#647187]">Last Benchmark</span>
                    <span className="font-mono text-[11px] text-[#222938] tabular-nums">
                      {model.lastBenchmark || 'Oct 16, 2026 10:42 PM'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-[#647187]">Evaluation Dataset</span>
                    <span className="font-medium text-[#222938]">
                      {model.evaluationDataset || 'Lattice Bench v1.0'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-[#647187]">Runtime</span>
                    <span className="font-mono text-[11px] text-[#222938]">
                      {model.runtime || 'llama.cpp (v0.0.1)'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 items-center gap-2">
                    <span className="text-[#647187] shrink-0">Compatibility</span>
                    <span className="flex items-center gap-1 text-[11px] truncate">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#0D8A58] shrink-0" />
                      <span className="font-semibold text-[#0D8A58]">Compatible</span>
                      <span className="font-mono text-[#647187] truncate">(RTX 3050)</span>
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
      <div className="pt-3 mt-1 border-t border-[#E6EAF0] flex items-center gap-1.5 shrink-0">
        <Button
          variant="primary"
          size="sm"
          onClick={onRunBenchmark}
          leftIcon={<Play className="w-3 h-3 fill-current" />}
          className="flex-1"
        >
          Run Benchmark
        </Button>

        <Button
          variant="secondary"
          size="sm"
          onClick={onViewExperiments}
          leftIcon={<FileSpreadsheet className="w-3.5 h-3.5 text-[#647187]" />}
        >
          Experiments
        </Button>

        <Button
          variant="icon"
          size="iconMd"
          aria-label="More Options"
          title="More Options"
        >
          <MoreHorizontal className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
};