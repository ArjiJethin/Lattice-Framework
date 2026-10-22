import React from 'react';
import { ModelFamily, QuantizationVariant } from '../../types/modelLibrary';
import { CheckCircle2, AlertTriangle, ShieldCheck, HardDrive } from 'lucide-react';

interface ModelCompatibilityTabProps {
  model: ModelFamily;
  variant: QuantizationVariant;
}

export const ModelCompatibilityTab: React.FC<ModelCompatibilityTabProps> = ({
  model,
  variant,
}) => {
  const isVramTight = (variant.memoryUsageGb || 0) > 4.0;

  return (
    <div className="space-y-3.5 text-xs select-none">
      {/* Compatibility Badge */}
      <div
        className={`p-3 rounded-xl border flex items-start gap-2.5 ${isVramTight
            ? 'bg-amber-50/80 border-amber-200/80 text-amber-900'
            : 'bg-emerald-50/80 border-emerald-200/80 text-emerald-900'
          }`}
      >
        {isVramTight ? (
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        ) : (
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        )}
        <div>
          <div className="font-bold text-[11px]">
            {isVramTight ? 'VRAM Budget Tight (Partial Offload)' : 'Fully Compatible (RTX 3050, 4 GB)'}
          </div>
          <div className="text-[10px] mt-0.5 opacity-90 leading-relaxed">
            {isVramTight
              ? `Requires ${variant.memoryUsageGb} GB which exceeds physical 4.0 GB VRAM. Model will run using hybrid system RAM offloading.`
              : `Model size fits comfortably within available 4.0 GB VRAM with remaining headroom for KV cache.`}
          </div>
        </div>
      </div>

      {/* Hardware Requirements Specs */}
      <div className="p-3.5 rounded-xl bg-white/80 border border-slate-200/80 space-y-2">
        <div className="flex items-center gap-2 font-semibold text-[11px] text-[#18213B]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#8174F5]" />
          <span>Hardware Architecture & Runtimes</span>
        </div>

        <div className="space-y-1.5 pt-1 text-[11px]">
          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="text-slate-400">Target GPU</span>
            <span className="font-medium text-[#18213B]">NVIDIA GeForce RTX 3050 Laptop</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="text-slate-400">CUDA Compute Capability</span>
            <span className="font-medium text-[#18213B]">sm_86 (Ampere Architecture)</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="text-slate-400">Supported Quant Formats</span>
            <span className="font-medium text-[#18213B]">GGUF k-quants (Q2_K - Q8_0)</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-slate-400">Context Window Limit</span>
            <span className="font-medium text-[#18213B]">{model.contextLength} tokens</span>
          </div>
        </div>
      </div>

      {/* Memory Breakdown */}
      <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/70">
        <div className="flex items-center justify-between text-[11px] font-semibold text-[#18213B] mb-1.5">
          <span className="flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-slate-500" />
            <span>Estimated VRAM Footprint</span>
          </span>
          <span className="font-mono text-[#8174F5]">{variant.memoryUsageGb || 0} / 4.0 GB</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
          <div
            className={`h-full rounded-full ${isVramTight ? 'bg-amber-500' : 'bg-[#8174F5]'}`}
            style={{ width: `${Math.min(100, (((variant.memoryUsageGb || 0) / 4.0) * 100))}%` }}
          />
        </div>
      </div>
    </div>
  );
};
