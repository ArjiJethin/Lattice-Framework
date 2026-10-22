import React from 'react';
import {
  Database,
  Box,
  Cpu,
  Zap,
  Gauge,
  BarChart2,
} from 'lucide-react';
import { ModelFamily, QuantizationVariant } from '../../types/modelLibrary';

interface ModelAnnotationsProps {
  model: ModelFamily;
  selectedVariant: QuantizationVariant;
}

export const ModelAnnotations: React.FC<ModelAnnotationsProps> = ({
  model,
  selectedVariant,
}) => {
  const modelSizeVal = `${model.parameters} parameters`;
  const quantVal = selectedVariant.name;

  const memoryVal =
    selectedVariant.memoryUsageGb !== null
      ? `~${selectedVariant.memoryUsageGb} GB`
      : 'Not measured';

  const latencyVal =
    selectedVariant.inferenceLatencyMs !== null
      ? `~${selectedVariant.inferenceLatencyMs} ms`
      : 'Pending';

  const speedVal =
    selectedVariant.generationSpeedToks !== null
      ? `~${selectedVariant.generationSpeedToks} tok/s`
      : 'Not measured';

  const qualityVal =
    selectedVariant.qualityScore !== null
      ? `${selectedVariant.qualityScore.toFixed(1)} / 100`
      : 'Pending';

  return (
    <div className="absolute inset-0 pointer-events-none z-10 select-none overflow-hidden">
      {/* Subtle Diagonal Leader Lines & Anchor Dots Connecting Cards to the 3D Entity */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 1000 700"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="leaderLeft" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#94A3B8" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#8174F5" stopOpacity="0.85" />
          </linearGradient>
          <linearGradient id="leaderRight" x1="1" y1="0" x2="0" y2="0">
            <stop offset="0%" stopColor="#94A3B8" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.85" />
          </linearGradient>
        </defs>

        {/* Top-Left Leader */}
        <polyline
          points="215,155 255,155 290,195"
          fill="none"
          stroke="url(#leaderLeft)"
          strokeWidth="1.5"
        />
        <circle cx="290" cy="195" r="3.5" fill="#6366F1" stroke="#FFFFFF" strokeWidth="1.5" />

        {/* Top-Right Leader */}
        <polyline
          points="785,155 745,155 710,195"
          fill="none"
          stroke="url(#leaderRight)"
          strokeWidth="1.5"
        />
        <circle cx="710" cy="195" r="3.5" fill="#8174F5" stroke="#FFFFFF" strokeWidth="1.5" />

        {/* Mid-Left Leader */}
        <polyline
          points="195,355 245,355 275,345"
          fill="none"
          stroke="url(#leaderLeft)"
          strokeWidth="1.5"
        />
        <circle cx="275" cy="345" r="3.5" fill="#8174F5" stroke="#FFFFFF" strokeWidth="1.5" />

        {/* Mid-Right Leader */}
        <polyline
          points="805,355 755,355 725,345"
          fill="none"
          stroke="url(#leaderRight)"
          strokeWidth="1.5"
        />
        <circle cx="725" cy="345" r="3.5" fill="#3B82F6" stroke="#FFFFFF" strokeWidth="1.5" />

        {/* Bottom-Left Leader */}
        <polyline
          points="230,545 275,545 315,495"
          fill="none"
          stroke="url(#leaderLeft)"
          strokeWidth="1.5"
        />
        <circle cx="315" cy="495" r="3.5" fill="#8174F5" stroke="#FFFFFF" strokeWidth="1.5" />

        {/* Bottom-Right Leader */}
        <polyline
          points="770,545 725,545 685,495"
          fill="none"
          stroke="url(#leaderRight)"
          strokeWidth="1.5"
        />
        <circle cx="685" cy="495" r="3.5" fill="#3B82F6" stroke="#FFFFFF" strokeWidth="1.5" />
      </svg>

      {/* 1. Top-Left: Model Size */}
      <div className="absolute top-[16%] left-[3.5%] pointer-events-auto transform transition-all duration-300 hover:scale-[1.03] flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-white/92 backdrop-blur-xl border border-white shadow-[0_8px_24px_rgba(24,33,59,0.06)]">
        <div className="w-8 h-8 rounded-xl bg-blue-50/90 border border-blue-100/80 flex items-center justify-center text-[#3B82F6] shrink-0">
          <Database className="w-4 h-4 stroke-[2]" />
        </div>
        <div>
          <div className="text-[10px] font-medium text-slate-400 leading-tight">
            Model Size
          </div>
          <div className="text-[13px] font-extrabold text-[#18213B] leading-tight mt-0.5">
            {modelSizeVal}
          </div>
        </div>
      </div>

      {/* 2. Top-Right: Quantization */}
      <div className="absolute top-[16%] right-[3.5%] pointer-events-auto transform transition-all duration-300 hover:scale-[1.03] flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-white/92 backdrop-blur-xl border border-white shadow-[0_8px_24px_rgba(24,33,59,0.06)]">
        <div className="w-8 h-8 rounded-xl bg-purple-50/90 border border-purple-100/80 flex items-center justify-center text-[#8174F5] shrink-0">
          <Box className="w-4 h-4 stroke-[2]" />
        </div>
        <div>
          <div className="text-[10px] font-medium text-slate-400 leading-tight">
            Quantization
          </div>
          <div className="text-[13px] font-extrabold text-[#18213B] leading-tight mt-0.5">
            {quantVal}
          </div>
        </div>
      </div>

      {/* 3. Mid-Left: Memory Usage */}
      <div className="absolute top-[46%] left-[2.5%] pointer-events-auto transform transition-all duration-300 hover:scale-[1.03] flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-white/92 backdrop-blur-xl border border-white shadow-[0_8px_24px_rgba(24,33,59,0.06)]">
        <div className="w-8 h-8 rounded-xl bg-purple-50/90 border border-purple-100/80 flex items-center justify-center text-[#7C6AF2] shrink-0">
          <Cpu className="w-4 h-4 stroke-[2]" />
        </div>
        <div>
          <div className="text-[10px] font-medium text-slate-400 leading-tight">
            Memory Usage
          </div>
          <div className="text-[13px] font-extrabold text-[#18213B] leading-tight mt-0.5">
            {memoryVal}
          </div>
        </div>
      </div>

      {/* 4. Mid-Right: Inference Latency */}
      <div className="absolute top-[46%] right-[2.5%] pointer-events-auto transform transition-all duration-300 hover:scale-[1.03] flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-white/92 backdrop-blur-xl border border-white shadow-[0_8px_24px_rgba(24,33,59,0.06)]">
        <div className="w-8 h-8 rounded-xl bg-indigo-50/90 border border-indigo-100/80 flex items-center justify-center text-[#6366F1] shrink-0">
          <Zap className="w-4 h-4 stroke-[2]" />
        </div>
        <div>
          <div className="text-[10px] font-medium text-slate-400 leading-tight">
            Inference Latency
          </div>
          <div className="text-[13px] font-extrabold text-[#18213B] leading-tight mt-0.5">
            {latencyVal}
          </div>
        </div>
      </div>

      {/* 5. Bottom-Left: Generation Speed */}
      <div className="absolute bottom-[13%] left-[4.5%] pointer-events-auto transform transition-all duration-300 hover:scale-[1.03] flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-white/92 backdrop-blur-xl border border-white shadow-[0_8px_24px_rgba(24,33,59,0.06)]">
        <div className="w-8 h-8 rounded-xl bg-purple-50/90 border border-purple-100/80 flex items-center justify-center text-[#7C6AF2] shrink-0">
          <Gauge className="w-4 h-4 stroke-[2]" />
        </div>
        <div>
          <div className="text-[10px] font-medium text-slate-400 leading-tight">
            Generation Speed
          </div>
          <div className="text-[13px] font-extrabold text-[#18213B] leading-tight mt-0.5">
            {speedVal}
          </div>
        </div>
      </div>

      {/* 6. Bottom-Right: Quality Score */}
      <div className="absolute bottom-[13%] right-[4.5%] pointer-events-auto transform transition-all duration-300 hover:scale-[1.03] flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-white/92 backdrop-blur-xl border border-white shadow-[0_8px_24px_rgba(24,33,59,0.06)]">
        <div className="w-8 h-8 rounded-xl bg-blue-50/90 border border-blue-100/80 flex items-center justify-center text-[#3B82F6] shrink-0">
          <BarChart2 className="w-4 h-4 stroke-[2]" />
        </div>
        <div>
          <div className="text-[10px] font-medium text-slate-400 leading-tight">
            Quality Score
          </div>
          <div className="text-[13px] font-extrabold text-[#18213B] leading-tight mt-0.5">
            {qualityVal}
          </div>
        </div>
      </div>
    </div>
  );
};