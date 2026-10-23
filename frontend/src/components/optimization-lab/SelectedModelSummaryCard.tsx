import React from 'react';
import { ArrowLeftRight, Box, CheckCircle2 } from 'lucide-react';
import { ModelFamily, QuantizationVariant } from '../../types/modelLibrary';
import { OptimizationCandidate } from '../../types/optimizationLab';
import { Button, StatusBadge } from '../ui/primitives';

interface SelectedModelSummaryCardProps {
  model: ModelFamily;
  selectedVariant?: QuantizationVariant;
  recommendedCandidate?: OptimizationCandidate | null;
  onChangeModel: () => void;
}

export const SelectedModelSummaryCard: React.FC<SelectedModelSummaryCardProps> = ({
  model,
  selectedVariant,
  recommendedCandidate,
  onChangeModel,
}) => {
  const activeQuantization =
    selectedVariant?.name ||
    model.defaultVariantId.split('-').pop()?.toUpperCase() ||
    'Q4_K_M';
  const isInstalled = model.status === 'Installed';
  const profiledCount = model.variants.filter((v) => v.isProfiled).length;

  return (
    <div className="w-full bg-white rounded-lg border border-[#D9DEE7] shadow-2xs p-4 flex items-center justify-between flex-wrap gap-4">
      {/* Left: Model Identity & Active Baseline */}
      <div className="flex items-center gap-3 min-w-[260px]">
        <div className="w-9 h-9 rounded-md bg-[#F8F9FB] border border-[#D9DEE7] text-[#7562E8] flex items-center justify-center shrink-0">
          <Box className="w-5 h-5 stroke-[1.8]" />
        </div>

        <div>
          <span className="text-[11px] font-semibold text-[#647187] uppercase tracking-wider block">
            Target Model Family
          </span>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <h2 className="text-[16px] font-semibold text-[#222938] tracking-tight leading-tight">
              {model.name}
            </h2>
            <StatusBadge tone={isInstalled ? 'success' : 'neutral'}>
              {model.status || 'Available'}
            </StatusBadge>
            <span className="text-[11px] font-mono text-[#647187] bg-[#F8F9FB] px-1.5 py-0.5 rounded-sm border border-[#E6EAF0] tabular-nums">
              {profiledCount}/{model.variants.length} Profiled
            </span>
          </div>
        </div>
      </div>

      {/* Center: Technical Metadata & Active vs Recommended Distinction */}
      <div className="flex items-center gap-6 xl:gap-8 flex-wrap py-1 border-y sm:border-y-0 sm:border-x border-[#E6EAF0] sm:px-6">
        <div>
          <span className="text-[10.5px] font-semibold text-[#647187] block uppercase tracking-wider">
            Parameters
          </span>
          <span className="text-[12.5px] font-semibold text-[#222938] mt-0.5 block font-mono tabular-nums">
            {model.parameters ? `${model.parameters}` : '—'}
          </span>
        </div>

        <div>
          <span className="text-[10.5px] font-semibold text-[#647187] block uppercase tracking-wider">
            Architecture
          </span>
          <span className="text-[12.5px] font-semibold text-[#222938] mt-0.5 block">
            {model.architecture || 'Transformer'}
          </span>
        </div>

        <div>
          <span className="text-[10.5px] font-semibold text-[#647187] block uppercase tracking-wider">
            Context Window
          </span>
          <span className="text-[12.5px] font-semibold font-mono text-[#222938] mt-0.5 block tabular-nums">
            {model.contextLength || '32K'}
          </span>
        </div>

        <div>
          <span className="text-[10.5px] font-semibold text-[#647187] block uppercase tracking-wider">
            Active Baseline
          </span>
          <span className="text-[12.5px] font-semibold font-mono text-[#222938] mt-0.5 block">
            {activeQuantization}
          </span>
        </div>

        <div>
          <span className="text-[10.5px] font-semibold text-[#647187] block uppercase tracking-wider">
            Solver Recommendation
          </span>
          {recommendedCandidate ? (
            <span className="text-[12.5px] font-semibold font-mono text-[#0D8A58] mt-0.5 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>{recommendedCandidate.quantization}</span>
            </span>
          ) : (
            <span className="text-[12px] font-mono text-[#B45309] mt-0.5 block">
              None Feasible
            </span>
          )}
        </div>
      </div>

      {/* Right: Change Model Action */}
      <Button
        variant="secondary"
        size="sm"
        onClick={onChangeModel}
        leftIcon={<ArrowLeftRight className="w-3.5 h-3.5 text-[#647187]" />}
      >
        Change Model
      </Button>
    </div>
  );
};