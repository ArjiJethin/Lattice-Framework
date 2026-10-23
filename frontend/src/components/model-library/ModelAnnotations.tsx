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
      {/* Subtle Diagonal Leader Lines & Anchor Dots */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 1000 700"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="leaderLeft" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#8A94A6" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#7562E8" stopOpacity="0.75" />
          </linearGradient>
          <linearGradient id="leaderRight" x1="1" y1="0" x2="0" y2="0">
            <stop offset="0%" stopColor="#8A94A6" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#2563EB" stopOpacity="0.75" />
          </linearGradient>
        </defs>

        <polyline points="215,155 255,155 290,195" fill="none" stroke="url(#leaderLeft)" strokeWidth="1.25" />
        <circle cx="290" cy="195" r="3" fill="#7562E8" stroke="#FFFFFF" strokeWidth="1.25" />

        <polyline points="785,155 745,155 710,195" fill="none" stroke="url(#leaderRight)" strokeWidth="1.25" />
        <circle cx="710" cy="195" r="3" fill="#7562E8" stroke="#FFFFFF" strokeWidth="1.25" />

        <polyline points="195,355 245,355 275,345" fill="none" stroke="url(#leaderLeft)" strokeWidth="1.25" />
        <circle cx="275" cy="345" r="3" fill="#7562E8" stroke="#FFFFFF" strokeWidth="1.25" />

        <polyline points="805,355 755,355 725,345" fill="none" stroke="url(#leaderRight)" strokeWidth="1.25" />
        <circle cx="725" cy="345" r="3" fill="#2563EB" stroke="#FFFFFF" strokeWidth="1.25" />

        <polyline points="230,545 275,545 315,495" fill="none" stroke="url(#leaderLeft)" strokeWidth="1.25" />
        <circle cx="315" cy="495" r="3" fill="#7562E8" stroke="#FFFFFF" strokeWidth="1.25" />

        <polyline points="770,545 725,545 685,495" fill="none" stroke="url(#leaderRight)" strokeWidth="1.25" />
        <circle cx="685" cy="495" r="3" fill="#0D8A58" stroke="#FFFFFF" strokeWidth="1.25" />
      </svg>

      {/* 1. Top-Left: Model Size */}
      <div className="absolute top-[16%] left-[3.5%] pointer-events-auto flex items-center gap-2.5 px-3 py-1.5 rounded-md bg-white/95 backdrop-blur-md border border-[#D9DEE7] shadow-2xs">
        <div className="w-7 h-7 rounded-sm bg-[#F8F9FB] border border-[#E6EAF0] flex items-center justify-center text-[#2563EB] shrink-0">
          <Database className="w-3.5 h-3.5" />
        </div>
        <div>
          <div className="text-[10.5px] font-medium text-[#647187] leading-tight">
            Model Size
          </div>
          <div className="text-[12.5px] font-semibold font-mono text-[#222938] leading-tight mt-0.5 tabular-nums">
            {modelSizeVal}
          </div>
        </div>
      </div>

      {/* 2. Top-Right: Quantization */}
      <div className="absolute top-[16%] right-[3.5%] pointer-events-auto flex items-center gap-2.5 px-3 py-1.5 rounded-md bg-white/95 backdrop-blur-md border border-[#D9DEE7] shadow-2xs">
        <div className="w-7 h-7 rounded-sm bg-[#F8F9FB] border border-[#E6EAF0] flex items-center justify-center text-[#7562E8] shrink-0">
          <Box className="w-3.5 h-3.5" />
        </div>
        <div>
          <div className="text-[10.5px] font-medium text-[#647187] leading-tight">
            Quantization
          </div>
          <div className="text-[12.5px] font-semibold font-mono text-[#222938] leading-tight mt-0.5">
            {quantVal}
          </div>
        </div>
      </div>

      {/* 3. Mid-Left: Memory Usage */}
      <div className="absolute top-[46%] left-[2.5%] pointer-events-auto flex items-center gap-2.5 px-3 py-1.5 rounded-md bg-white/95 backdrop-blur-md border border-[#D9DEE7] shadow-2xs">
        <div className="w-7 h-7 rounded-sm bg-[#F8F9FB] border border-[#E6EAF0] flex items-center justify-center text-[#7562E8] shrink-0">
          <Cpu className="w-3.5 h-3.5" />
        </div>
        <div>
          <div className="text-[10.5px] font-medium text-[#647187] leading-tight">
            Memory Usage
          </div>
          <div className="text-[12.5px] font-semibold font-mono text-[#222938] leading-tight mt-0.5 tabular-nums">
            {memoryVal}
          </div>
        </div>
      </div>

      {/* 4. Mid-Right: Inference Latency */}
      <div className="absolute top-[46%] right-[2.5%] pointer-events-auto flex items-center gap-2.5 px-3 py-1.5 rounded-md bg-white/95 backdrop-blur-md border border-[#D9DEE7] shadow-2xs">
        <div className="w-7 h-7 rounded-sm bg-[#F8F9FB] border border-[#E6EAF0] flex items-center justify-center text-[#2563EB] shrink-0">
          <Zap className="w-3.5 h-3.5" />
        </div>
        <div>
          <div className="text-[10.5px] font-medium text-[#647187] leading-tight">
            Inference Latency
          </div>
          <div className="text-[12.5px] font-semibold font-mono text-[#222938] leading-tight mt-0.5 tabular-nums">
            {latencyVal}
          </div>
        </div>
      </div>

      {/* 5. Bottom-Left: Generation Speed */}
      <div className="absolute bottom-[13%] left-[4.5%] pointer-events-auto flex items-center gap-2.5 px-3 py-1.5 rounded-md bg-white/95 backdrop-blur-md border border-[#D9DEE7] shadow-2xs">
        <div className="w-7 h-7 rounded-sm bg-[#F8F9FB] border border-[#E6EAF0] flex items-center justify-center text-[#7562E8] shrink-0">
          <Gauge className="w-3.5 h-3.5" />
        </div>
        <div>
          <div className="text-[10.5px] font-medium text-[#647187] leading-tight">
            Generation Speed
          </div>
          <div className="text-[12.5px] font-semibold font-mono text-[#222938] leading-tight mt-0.5 tabular-nums">
            {speedVal}
          </div>
        </div>
      </div>

      {/* 6. Bottom-Right: Quality Score */}
      <div className="absolute bottom-[13%] right-[4.5%] pointer-events-auto flex items-center gap-2.5 px-3 py-1.5 rounded-md bg-white/95 backdrop-blur-md border border-[#D9DEE7] shadow-2xs">
        <div className="w-7 h-7 rounded-sm bg-[#F8F9FB] border border-[#E6EAF0] flex items-center justify-center text-[#0D8A58] shrink-0">
          <BarChart2 className="w-3.5 h-3.5" />
        </div>
        <div>
          <div className="text-[10.5px] font-medium text-[#647187] leading-tight">
            Quality Score
          </div>
          <div className="text-[12.5px] font-semibold font-mono text-[#222938] leading-tight mt-0.5 tabular-nums">
            {qualityVal}
          </div>
        </div>
      </div>
    </div>
  );
};