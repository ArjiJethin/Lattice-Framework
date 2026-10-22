import { ArrowLeftRight, Box, CheckCircle2 } from 'lucide-react';
import { ModelFamily, QuantizationVariant } from '../../types/modelLibrary';

interface SelectedModelSummaryCardProps {
  model: ModelFamily;
  selectedVariant?: QuantizationVariant;
  onChangeModel: () => void;
}

export const SelectedModelSummaryCard: React.FC<SelectedModelSummaryCardProps> = ({
  model,
  selectedVariant,
  onChangeModel,
}) => {
  const activeQuantization = selectedVariant?.name || model.defaultVariantId.split('-').pop()?.toUpperCase() || 'Q4_K_M';
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
            <span>Current Model</span>
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
            <span>{model.category || 'General Purpose'}</span>
          </p>
        </div>
      </div>

      {/* Center: Metadata Grid */}
      <div className="flex items-center gap-8 flex-wrap py-1 px-2 border-y sm:border-y-0 sm:border-x border-slate-100 sm:px-6">
        {/* Model Size */}
        <div>
          <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">
            Model Size
          </span>
          <span className="text-xs font-extrabold text-[#18213B] mt-0.5 block">
            {model.parameters ? `${model.parameters} parameters` : '—'}
          </span>
        </div>

        {/* Architecture */}
        <div>
          <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">
            Architecture
          </span>
          <span className="text-xs font-extrabold text-[#18213B] mt-0.5 block">
            {model.architecture || 'Transformer'}
          </span>
        </div>

        {/* Quantization */}
        <div>
          <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">
            Quantization
          </span>
          <span className="text-xs font-extrabold text-[#18213B] mt-0.5 block">
            {activeQuantization}
          </span>
        </div>

        {/* Context Length */}
        <div>
          <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">
            Context Length
          </span>
          <span className="text-xs font-extrabold text-[#18213B] mt-0.5 block">
            {model.contextLength || '32K'}
          </span>
        </div>
      </div>

      {/* Right: Change Model Button */}
      <div className="shrink-0">
        <button
          onClick={onChangeModel}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 active:bg-slate-100 text-[#18213B] text-xs font-bold border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all cursor-pointer group"
        >
          <ArrowLeftRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-[#7C6AF2] transition-colors" />
          <span>Change Model</span>
        </button>
      </div>
    </div>
  );
};
