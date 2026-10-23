import React from 'react';
import { ModelFamily, QuantizationVariant } from '../../types/modelLibrary';
import { Zap, Gauge, Cpu, BarChart2, AlertCircle } from 'lucide-react';

interface ModelPerformanceTabProps {
  model: ModelFamily;
  variant: QuantizationVariant;
}

export const ModelPerformanceTab: React.FC<ModelPerformanceTabProps> = ({
  model,
  variant,
}) => {
  return (
    <div className="space-y-3 text-[12px] select-none">
      {variant.isProfiled ? (
        <div className="p-2.5 rounded-md bg-[#ECFDF5] border border-[#A7F3D0] text-[#0D8A58] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0D8A58]" />
            <span className="font-semibold text-[11.5px]">Hardware Verified Profile</span>
          </div>
          <span className="text-[10.5px] font-mono tabular-nums">
            {model.lastBenchmark || 'Recent run'}
          </span>
        </div>
      ) : (
        <div className="p-2.5 rounded-md bg-[#FFFBEB] border border-[#FDE68A] text-[#B45309] flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-[11.5px]">Unprofiled Configuration</div>
            <div className="text-[11px] opacity-90 mt-0.5 leading-snug">
              This quantization has not yet been benchmarked on local hardware.
            </div>
          </div>
        </div>
      )}

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-2.5 rounded-md bg-[#F8F9FB] border border-[#D9DEE7]">
          <div className="flex items-center gap-1.5 text-[#647187] font-medium text-[11px]">
            <Zap className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>Inference Latency</span>
          </div>
          <div className="text-[15px] font-mono font-semibold text-[#222938] mt-1 tabular-nums">
            {variant.inferenceLatencyMs !== null ? `${variant.inferenceLatencyMs} ms` : 'Not measured'}
          </div>
          <div className="text-[10px] text-[#647187] mt-0.5">Time to first token</div>
        </div>

        <div className="p-2.5 rounded-md bg-[#F8F9FB] border border-[#D9DEE7]">
          <div className="flex items-center gap-1.5 text-[#647187] font-medium text-[11px]">
            <Gauge className="w-3.5 h-3.5 text-[#7562E8]" />
            <span>Generation Speed</span>
          </div>
          <div className="text-[15px] font-mono font-semibold text-[#222938] mt-1 tabular-nums">
            {variant.generationSpeedToks !== null ? `${variant.generationSpeedToks} tok/s` : 'Not measured'}
          </div>
          <div className="text-[10px] text-[#647187] mt-0.5">Sustained throughput</div>
        </div>

        <div className="p-2.5 rounded-md bg-[#F8F9FB] border border-[#D9DEE7]">
          <div className="flex items-center gap-1.5 text-[#647187] font-medium text-[11px]">
            <Cpu className="w-3.5 h-3.5 text-[#7562E8]" />
            <span>VRAM Allocation</span>
          </div>
          <div className="text-[15px] font-mono font-semibold text-[#222938] mt-1 tabular-nums">
            {variant.memoryUsageGb !== null ? `${variant.memoryUsageGb} GB` : 'Not measured'}
          </div>
          <div className="text-[10px] text-[#647187] mt-0.5">Weights + KV Cache</div>
        </div>

        <div className="p-2.5 rounded-md bg-[#F8F9FB] border border-[#D9DEE7]">
          <div className="flex items-center gap-1.5 text-[#647187] font-medium text-[11px]">
            <BarChart2 className="w-3.5 h-3.5 text-[#0D8A58]" />
            <span>Quality Score</span>
          </div>
          <div className="text-[15px] font-mono font-semibold text-[#222938] mt-1 tabular-nums">
            {variant.qualityScore !== null ? `${variant.qualityScore.toFixed(1)} / 100` : 'Pending'}
          </div>
          <div className="text-[10px] text-[#647187] mt-0.5">Perplexity &amp; ARC</div>
        </div>
      </div>

      {/* Benchmark Environment */}
      <div className="p-2.5 rounded-md bg-white border border-[#D9DEE7] space-y-1">
        <div className="font-semibold text-[11px] uppercase tracking-wider text-[#647187] mb-1">
          Benchmark Environment
        </div>
        <div className="flex justify-between py-1 border-b border-[#E6EAF0] text-[11.5px]">
          <span className="text-[#647187]">Test Harness</span>
          <span className="font-medium text-[#222938]">{model.evaluationDataset || 'Lattice Bench v1.0'}</span>
        </div>
        <div className="flex justify-between py-1 border-b border-[#E6EAF0] text-[11.5px]">
          <span className="text-[#647187]">Prompt Length</span>
          <span className="font-mono text-[11px] text-[#222938]">512 in / 128 out</span>
        </div>
        <div className="flex justify-between py-1 text-[11.5px]">
          <span className="text-[#647187]">Runtime Engine</span>
          <span className="font-mono text-[11px] text-[#222938]">{model.runtime || 'llama.cpp'}</span>
        </div>
      </div>
    </div>
  );
};