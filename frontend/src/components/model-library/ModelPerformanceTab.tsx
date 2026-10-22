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
    <div className="space-y-4 text-xs select-none">
      {/* Profiling status alert */}
      {variant.isProfiled ? (
        <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200/80 text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-[11px]">Hardware Verified Profile</span>
          </div>
          <span className="text-[10px] text-emerald-700 font-mono">
            {model.lastBenchmark || 'Recent run'}
          </span>
        </div>
      ) : (
        <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 text-amber-800 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-[11px]">Unprofiled Configuration</div>
            <div className="text-[10px] text-amber-700 mt-0.5">
              This quantization has not yet been benchmarked on local hardware. Measured latency and throughput will appear once benchmarked.
            </div>
          </div>
        </div>
      )}

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="p-3 rounded-xl bg-white/80 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-1.5 text-slate-400 font-medium text-[10px]">
            <Zap className="w-3 h-3 text-[#3B82F6]" />
            <span>Inference Latency</span>
          </div>
          <div className="text-base font-bold text-[#18213B] mt-1">
            {variant.inferenceLatencyMs !== null ? `${variant.inferenceLatencyMs} ms` : 'Not measured'}
          </div>
          <div className="text-[9.5px] text-slate-400 mt-0.5">Time to first token (TTFT)</div>
        </div>

        <div className="p-3 rounded-xl bg-white/80 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-1.5 text-slate-400 font-medium text-[10px]">
            <Gauge className="w-3 h-3 text-[#8174F5]" />
            <span>Generation Speed</span>
          </div>
          <div className="text-base font-bold text-[#18213B] mt-1">
            {variant.generationSpeedToks !== null ? `${variant.generationSpeedToks} tok/s` : 'Not measured'}
          </div>
          <div className="text-[9.5px] text-slate-400 mt-0.5">Sustained token throughput</div>
        </div>

        <div className="p-3 rounded-xl bg-white/80 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-1.5 text-slate-400 font-medium text-[10px]">
            <Cpu className="w-3 h-3 text-[#6366F1]" />
            <span>VRAM Allocation</span>
          </div>
          <div className="text-base font-bold text-[#18213B] mt-1">
            {variant.memoryUsageGb !== null ? `${variant.memoryUsageGb} GB` : 'Not measured'}
          </div>
          <div className="text-[9.5px] text-slate-400 mt-0.5">Active weights + KV Cache</div>
        </div>

        <div className="p-3 rounded-xl bg-white/80 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-1.5 text-slate-400 font-medium text-[10px]">
            <BarChart2 className="w-3 h-3 text-[#14B8A6]" />
            <span>Quality Score</span>
          </div>
          <div className="text-base font-bold text-[#18213B] mt-1">
            {variant.qualityScore !== null ? `${variant.qualityScore.toFixed(1)} / 100` : 'Pending'}
          </div>
          <div className="text-[9.5px] text-slate-400 mt-0.5">Perplexity & ARC score</div>
        </div>
      </div>

      {/* Benchmark Metadata Table */}
      <div className="p-3 rounded-xl bg-white/80 border border-slate-200/80 space-y-1.5">
        <div className="font-semibold text-[11px] text-[#18213B] mb-2">Benchmark Environment</div>
        <div className="flex justify-between py-1 border-b border-slate-100 text-[11px]">
          <span className="text-slate-400">Test Harness</span>
          <span className="font-medium text-[#18213B]">{model.evaluationDataset || 'Lattice Bench v1.0'}</span>
        </div>
        <div className="flex justify-between py-1 border-b border-slate-100 text-[11px]">
          <span className="text-slate-400">Prompt Length</span>
          <span className="font-medium text-[#18213B]">512 input / 128 output tokens</span>
        </div>
        <div className="flex justify-between py-1 text-[11px]">
          <span className="text-slate-400">Runtime Engine</span>
          <span className="font-medium text-[#18213B]">{model.runtime || 'llama.cpp'}</span>
        </div>
      </div>
    </div>
  );
};
