import React from 'react';
import { QuantizationVariant, ModelFamily } from '../../types/modelLibrary';
import { Button, StatusBadge } from '../ui/primitives';
import { X, Zap, Gauge, Cpu, BarChart2 } from 'lucide-react';

interface CompareConfigurationsDialogProps {
  model: ModelFamily;
  variants: QuantizationVariant[];
  onClose: () => void;
  onSelectForInspection: (variant: QuantizationVariant) => void;
}

export const CompareConfigurationsDialog: React.FC<CompareConfigurationsDialogProps> = ({
  model,
  variants,
  onClose,
  onSelectForInspection,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#222938]/40 backdrop-blur-xs select-none">
      <div className="relative w-full max-w-4xl p-5 rounded-lg bg-white border border-[#D9DEE7] shadow-glass max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#E6EAF0] mb-4">
          <div>
            <div className="flex items-center gap-2">
              <StatusBadge tone="accent" dot={false}>
                Comparison Mode
              </StatusBadge>
              <h2 className="text-[16px] font-semibold text-[#222938] tracking-tight">
                Compare Quantization Variants — {model.name}
              </h2>
            </div>
            <p className="text-[12px] text-[#647187] mt-1">
              Evaluating trade-offs between precision, inference latency, memory footprint and throughput.
            </p>
          </div>

          <button
            type="button"
            aria-label="Close Comparison Modal"
            onClick={onClose}
            className="h-7 w-7 rounded-sm flex items-center justify-center text-[#647187] hover:text-[#222938] hover:bg-[#F8F9FB] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Side-by-Side Comparison Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {variants.map((v) => (
            <div
              key={v.id}
              className="p-4 rounded-md bg-[#F8F9FB] border border-[#D9DEE7] flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[15px] font-mono font-semibold text-[#222938]">
                    {v.name}
                  </span>
                  <StatusBadge
                    tone={v.isProfiled ? 'success' : 'neutral'}
                    dot={v.isProfiled}
                  >
                    {v.isProfiled ? 'Profiled' : 'Not Profiled'}
                  </StatusBadge>
                </div>

                <div className="text-[11.5px] font-medium text-[#7562E8] mb-3">
                  {v.descriptionTag}
                </div>

                <div className="divide-y divide-[#E6EAF0] text-[12px] border-t border-b border-[#E6EAF0]">
                  <div className="flex items-center justify-between py-2">
                    <span className="flex items-center gap-1.5 text-[#647187]">
                      <Cpu className="w-3.5 h-3.5 text-[#7562E8]" />
                      <span>VRAM Size</span>
                    </span>
                    <span className="font-mono font-semibold text-[#222938] tabular-nums">
                      {v.memoryUsageGb ? `${v.memoryUsageGb} GB` : '—'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <span className="flex items-center gap-1.5 text-[#647187]">
                      <Zap className="w-3.5 h-3.5 text-[#2563EB]" />
                      <span>Latency (TTFT)</span>
                    </span>
                    <span className="font-mono font-semibold text-[#222938] tabular-nums">
                      {v.inferenceLatencyMs ? `${v.inferenceLatencyMs} ms` : '—'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <span className="flex items-center gap-1.5 text-[#647187]">
                      <Gauge className="w-3.5 h-3.5 text-[#7562E8]" />
                      <span>Throughput</span>
                    </span>
                    <span className="font-mono font-semibold text-[#222938] tabular-nums">
                      {v.generationSpeedToks ? `${v.generationSpeedToks} tok/s` : '—'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <span className="flex items-center gap-1.5 text-[#647187]">
                      <BarChart2 className="w-3.5 h-3.5 text-[#0D8A58]" />
                      <span>Quality Score</span>
                    </span>
                    <span className="font-mono font-semibold text-[#222938] tabular-nums">
                      {v.qualityScore ? `${v.qualityScore.toFixed(1)} / 100` : 'Pending'}
                    </span>
                  </div>
                </div>
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  onSelectForInspection(v);
                  onClose();
                }}
                className="mt-3.5 w-full"
              >
                Inspect in 3D Stage
              </Button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t border-[#E6EAF0] mt-4">
          <Button variant="primary" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
};