import React from 'react';
import { QuantizationVariant, ModelFamily } from '../../types/modelLibrary';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm select-none">
      <div className="relative w-full max-w-4xl p-6 rounded-3xl bg-white/95 backdrop-blur-xl border border-white/90 shadow-[0_16px_48px_rgba(24,33,59,0.14)] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200/80 mb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#EEEBFF] text-[#8174F5] text-[10.5px] font-bold">
                Comparison Mode
              </span>
              <h2 className="text-[18px] font-extrabold text-[#18213B] tracking-tight">
                Compare Quantization Variants — {model.name}
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Evaluating trade-offs between precision, inference latency, memory pressure and throughput.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-[#18213B] hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Side-by-Side Comparison Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {variants.map((v) => (
            <div
              key={v.id}
              className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[16px] font-extrabold text-[#18213B]">
                    {v.name}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${v.isProfiled
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                        : 'bg-slate-100 text-slate-500'
                      }`}
                  >
                    {v.isProfiled ? 'Profiled' : 'Not Profiled'}
                  </span>
                </div>

                <div className="text-[11px] font-medium text-[#8174F5] mb-3">
                  {v.descriptionTag}
                </div>

                {/* Metrics Table */}
                <div className="space-y-2 text-xs pt-1 border-t border-slate-100">
                  <div className="flex items-center justify-between py-1 border-b border-slate-50">
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <Cpu className="w-3.5 h-3.5 text-[#6366F1]" />
                      <span>VRAM Size</span>
                    </span>
                    <span className="font-bold text-[#18213B]">
                      {v.memoryUsageGb ? `${v.memoryUsageGb} GB` : 'N/A'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-slate-50">
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <Zap className="w-3.5 h-3.5 text-[#3B82F6]" />
                      <span>Latency (TTFT)</span>
                    </span>
                    <span className="font-bold text-[#18213B]">
                      {v.inferenceLatencyMs ? `${v.inferenceLatencyMs} ms` : 'N/A'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-slate-50">
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <Gauge className="w-3.5 h-3.5 text-[#8174F5]" />
                      <span>Throughput</span>
                    </span>
                    <span className="font-bold text-[#18213B]">
                      {v.generationSpeedToks ? `${v.generationSpeedToks} tok/s` : 'N/A'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1">
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <BarChart2 className="w-3.5 h-3.5 text-[#14B8A6]" />
                      <span>Quality Score</span>
                    </span>
                    <span className="font-bold text-[#18213B]">
                      {v.qualityScore ? `${v.qualityScore.toFixed(1)} / 100` : 'Pending'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => {
                  onSelectForInspection(v);
                  onClose();
                }}
                className="mt-4 w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-[#8174F5] hover:text-white text-[#18213B] text-xs font-semibold transition-all text-center"
              >
                Inspect in 3D Stage
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-5 border-t border-slate-200/80 mt-5">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#18213B] text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
