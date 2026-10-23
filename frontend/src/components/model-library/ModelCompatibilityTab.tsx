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
    <div className="space-y-3 text-[12px] select-none">
      <div
        className={`p-2.5 rounded-md border flex items-start gap-2.5 ${isVramTight
            ? 'bg-[#FFFBEB] border-[#FDE68A] text-[#B45309]'
            : 'bg-[#ECFDF5] border-[#A7F3D0] text-[#0D8A58]'
          }`}
      >
        {isVramTight ? (
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        ) : (
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
        )}
        <div>
          <div className="font-semibold text-[11.5px]">
            {isVramTight
              ? 'VRAM Budget Tight (Partial Offload)'
              : 'Fully Compatible (RTX 3050, 4 GB)'}
          </div>
          <div className="text-[11px] mt-0.5 opacity-90 leading-relaxed">
            {isVramTight
              ? `Requires ${variant.memoryUsageGb} GB which exceeds physical 4.0 GB VRAM. Model will run using hybrid system RAM offloading.`
              : 'Model size fits comfortably within available 4.0 GB VRAM with remaining headroom for KV cache.'}
          </div>
        </div>
      </div>

      <div className="p-2.5 rounded-md bg-white border border-[#D9DEE7] space-y-1.5">
        <div className="flex items-center gap-1.5 font-semibold text-[11.5px] text-[#222938]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#7562E8]" />
          <span>Hardware Architecture &amp; Runtimes</span>
        </div>

        <div className="divide-y divide-[#E6EAF0] pt-0.5 text-[11.5px]">
          <div className="flex justify-between py-1.5">
            <span className="text-[#647187]">Target GPU</span>
            <span className="font-medium text-[#222938]">NVIDIA GeForce RTX 3050</span>
          </div>
          <div className="flex justify-between py-1.5">
            <span className="text-[#647187]">Compute Capability</span>
            <span className="font-mono text-[11px] text-[#222938]">sm_86 (Ampere)</span>
          </div>
          <div className="flex justify-between py-1.5">
            <span className="text-[#647187]">Quantization Format</span>
            <span className="font-mono text-[11px] text-[#222938]">GGUF k-quants</span>
          </div>
          <div className="flex justify-between py-1.5">
            <span className="text-[#647187]">Context Window Limit</span>
            <span className="font-mono text-[11px] text-[#222938] tabular-nums">
              {model.contextLength} tokens
            </span>
          </div>
        </div>
      </div>

      <div className="p-2.5 rounded-md bg-[#F8F9FB] border border-[#D9DEE7]">
        <div className="flex items-center justify-between text-[11.5px] font-semibold text-[#222938] mb-1.5">
          <span className="flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-[#647187]" />
            <span>Estimated VRAM Footprint</span>
          </span>
          <span className="font-mono text-[#7562E8] tabular-nums">
            {variant.memoryUsageGb || 0} / 4.0 GB
          </span>
        </div>
        <div className="w-full h-1.5 rounded-sm bg-[#E2E6EE] overflow-hidden">
          <div
            className={`h-full ${isVramTight ? 'bg-[#D97706]' : 'bg-[#7562E8]'}`}
            style={{
              width: `${Math.min(100, ((variant.memoryUsageGb || 0) / 4.0) * 100)}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
};