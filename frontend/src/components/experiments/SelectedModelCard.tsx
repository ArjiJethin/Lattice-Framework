import React from 'react';
import { ArrowLeftRight, Box } from 'lucide-react';
import { ModelFamily, QuantizationVariant } from '../../types/modelLibrary';
import { ComparisonStrategy } from '../../types/experiments';
import { Button, StatusBadge } from '../ui/primitives';

interface SelectedModelCardProps {
  model: ModelFamily;
  selectedVariant?: QuantizationVariant;
  strategy?: ComparisonStrategy;
  onChangeModel: () => void;
}

export const SelectedModelCard: React.FC<SelectedModelCardProps> = ({
  model,
  selectedVariant,
  strategy = 'fixed',
  onChangeModel,
}) => {
  const activeQuantization =
    selectedVariant?.name ||
    model.defaultVariantId.split('-').pop()?.toUpperCase() ||
    'Q4_K_M';
  const isInstalled = model.status === 'Installed';

  return (
    <div className="w-full bg-white rounded-lg border border-[#D9DEE7] shadow-2xs p-4 flex items-center justify-between flex-wrap gap-4">
      {/* Left: Model Identity */}
      <div className="flex items-center gap-3 min-w-[260px]">
        <div className="w-9 h-9 rounded-md bg-[#F8F9FB] border border-[#D9DEE7] text-[#7562E8] flex items-center justify-center shrink-0">
          <Box className="w-5 h-5 stroke-[1.8]" />
        </div>

        <div>
          <span className="text-[11px] font-semibold text-[#647187] uppercase tracking-wider block">
            Selected Model Under Test
          </span>

          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <h2 className="text-[16px] font-semibold text-[#222938] tracking-tight leading-tight">
              {model.name}
            </h2>
            <StatusBadge tone="accent" dot={false}>
              <span className="font-mono">{activeQuantization}</span>
            </StatusBadge>
            <StatusBadge tone={isInstalled ? 'success' : 'neutral'}>
              {model.status || 'Available'}
            </StatusBadge>
          </div>

          <p className="text-[11.5px] text-[#647187] mt-0.5 flex items-center gap-1.5">
            <span className="font-mono">{model.parameters}</span>
            <span>·</span>
            <span className="font-mono">{model.fileFormat}</span>
            <span>·</span>
            <span>{model.architecture || 'Transformer (Qwen3)'}</span>
          </p>
        </div>
      </div>

      {/* Center Details: 4 Columns */}
      <div className="flex items-center gap-6 xl:gap-8 border-y sm:border-y-0 sm:border-x border-[#E6EAF0] sm:px-6 py-1 flex-wrap">
        <div>
          <span className="text-[10.5px] font-semibold text-[#647187] uppercase tracking-wider block">
            Context Length
          </span>
          <span className="text-[12.5px] font-semibold font-mono text-[#222938] mt-0.5 block tabular-nums">
            {model.contextLength || '32K'}
          </span>
        </div>

        <div>
          <span className="text-[10.5px] font-semibold text-[#647187] uppercase tracking-wider block">
            Model Size
          </span>
          <span className="text-[12.5px] font-semibold font-mono text-[#222938] mt-0.5 block tabular-nums">
            {model.parameters} parameters
          </span>
        </div>

        <div>
          <span className="text-[10.5px] font-semibold text-[#647187] uppercase tracking-wider block">
            Baseline Quantization
          </span>
          <span className="text-[12.5px] font-semibold font-mono text-[#222938] mt-0.5 block">
            {activeQuantization}
          </span>
        </div>

        <div>
          <span className="text-[10.5px] font-semibold text-[#647187] uppercase tracking-wider block">
            Evaluation Mode
          </span>
          <span className="text-[12.5px] font-semibold font-mono text-[#7562E8] mt-0.5 block">
            {strategy === 'adaptive' ? 'Adaptive vs Fixed' : 'Fixed Baseline'}
          </span>
        </div>

        <div>
          <span className="text-[10.5px] font-semibold text-[#647187] uppercase tracking-wider block">
            Target Device
          </span>
          <span className="text-[12.5px] font-semibold font-mono text-[#222938] mt-0.5 block">
            GPU / CPU
          </span>
        </div>
      </div>

      {/* Right Action: Change Model Button */}
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