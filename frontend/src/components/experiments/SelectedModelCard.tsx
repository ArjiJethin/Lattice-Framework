import React from 'react';
import { ArrowLeftRight, Box, CheckCircle2 } from 'lucide-react';
import { ModelFamily, QuantizationVariant } from '../../types/modelLibrary';

interface SelectedModelCardProps {
  model: ModelFamily;
  selectedVariant?: QuantizationVariant;
  onChangeModel: () => void;
}

export const SelectedModelCard: React.FC<SelectedModelCardProps> = ({
  model,
  selectedVariant,
  onChangeModel,
}) => {
  const activeQuantization =
    selectedVariant?.name || model.defaultVariantId.split('-').pop()?.toUpperCase() || 'Q4_K_M';
  const isInstalled = model.status === 'Installed';

  return (
    <div className="w-full bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-xs p-4 flex items-center justify-between flex-wrap gap-4 transition-all">
      {/* Left: Model Identity */}
      <div className="flex items-center gap-3.5 min-w-[280px]">
        {/* Model Archetype Icon Box */}
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-100 to-indigo-50 border border-purple-200/80 flex items-center justify-center text-[#7C6AF2] shadow-2xs shrink-0">
          <Box className="w-6 h-6 stroke-[1.8]" />
        </div>

        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            <span>Selected Model</span>
          </div>

          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <h2 className="text-lg font-black text-[#18213B] tracking-tight leading-tight">
              {model.name}
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#8B5CF6]/10 text-[#7C6AF2] border border-[#8B5CF6]/20">
              {activeQuantization}
            </span>
            {isInstalled ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                <span>Installed</span>
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                {model.status || 'Available'}
              </span>
            )}
          </div>

          <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1.5">
            <span>{model.parameters}</span>
            <span>·</span>
            <span>{model.fileFormat}</span>
            <span>·</span>
            <span>{model.architecture || 'Transformer (Qwen3)'}</span>
          </p>
        </div>
      </div>

      {/* Center Details: 4 Columns matching screenshot */}
      <div className="flex items-center gap-6 xl:gap-10 border-y lg:border-y-0 lg:border-x border-slate-200/80 px-4 lg:px-8 py-2 lg:py-0 flex-wrap">
        {/* Context Length */}
        <div>
          <span className="text-[11px] font-semibold text-slate-400 block">
            Context Length
          </span>
          <span className="text-sm font-extrabold text-[#18213B] mt-0.5 block">
            {model.contextLength || '32K'}
          </span>
        </div>

        {/* Model Size */}
        <div>
          <span className="text-[11px] font-semibold text-slate-400 block">
            Model Size
          </span>
          <span className="text-sm font-extrabold text-[#18213B] mt-0.5 block">
            {model.parameters} parameters
          </span>
        </div>

        {/* Quantization */}
        <div>
          <span className="text-[11px] font-semibold text-slate-400 block">
            Quantization
          </span>
          <span className="text-sm font-extrabold text-[#18213B] mt-0.5 block">
            {activeQuantization}
          </span>
        </div>

        {/* Device */}
        <div>
          <span className="text-[11px] font-semibold text-slate-400 block">
            Device
          </span>
          <span className="text-sm font-extrabold text-[#18213B] mt-0.5 block">
            GPU / CPU
          </span>
        </div>
      </div>

      {/* Right Action: Change Model Button */}
      <div className="flex items-center">
        <button
          onClick={onChangeModel}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-[#18213B] text-xs font-bold hover:bg-slate-50 hover:border-slate-300 transition-all shadow-2xs hover:shadow-xs group cursor-pointer"
        >
          <ArrowLeftRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#7C6AF2] transition-colors" />
          <span>Change Model</span>
        </button>
      </div>
    </div>
  );
};
