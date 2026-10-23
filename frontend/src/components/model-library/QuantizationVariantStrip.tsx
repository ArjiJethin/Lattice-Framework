import React from 'react';
import {
  QuantizationVariant,
  ModelFamily,
  ModelColorPaletteId,
} from '../../types/modelLibrary';
import { getColorPaletteById } from '../model-entities/SharedModelMaterials';
import { Button, Checkbox, StatusBadge } from '../ui/primitives';
import { ArrowRight } from 'lucide-react';

interface QuantizationVariantStripProps {
  model: ModelFamily;
  selectedVariantId: string;
  onSelectVariant: (variant: QuantizationVariant) => void;
  selectedComparisonIds: string[];
  onToggleComparison: (variantId: string) => void;
  onOpenComparison: () => void;
  onUseInOptimizationLab?: (variant: QuantizationVariant) => void;
}

const VariantCrystalIcon: React.FC<{ paletteId?: ModelColorPaletteId }> = ({
  paletteId,
}) => {
  const pal = getColorPaletteById(paletteId);

  return (
    <div
      className="w-8 h-8 rounded-md border flex items-center justify-center shrink-0"
      style={{
        backgroundColor: pal.badgeBg,
        borderColor: pal.badgeBorder,
      }}
    >
      <svg className="w-5 h-5" viewBox="0 0 32 32" fill="none">
        <polygon points="16,3 27,9.5 16,16 5,9.5" fill={pal.wireframe} opacity="0.92" />
        <polygon points="5,9.5 16,16 16,29 5,22.5" fill={pal.secondaryShell} opacity="0.85" />
        <polygon points="16,16 27,9.5 27,22.5 16,29" fill={pal.primaryShell} opacity="0.9" />
        <path
          d="M16,3 L16,29 M5,9.5 L27,22.5 M27,9.5 L5,22.5 M16,3 L27,9.5 L27,22.5 L16,29 L5,22.5 L5,9.5 Z"
          stroke="#FFFFFF"
          strokeWidth="1.05"
        />
        <circle cx="16" cy="16" r="2" fill="#FFFFFF" />
      </svg>
    </div>
  );
};

export const QuantizationVariantStrip: React.FC<QuantizationVariantStripProps> = ({
  model,
  selectedVariantId,
  onSelectVariant,
  selectedComparisonIds,
  onToggleComparison,
  onOpenComparison,
  onUseInOptimizationLab,
}) => {
  const selectedVariant =
    model.variants.find((v) => v.id === selectedVariantId) || model.variants[0];

  const compareCount = selectedComparisonIds.length;
  const canCompare = compareCount >= 2;

  return (
    <div className="w-full select-none">
      {/* Strip Header Row */}
      <div className="flex items-center justify-between mb-2 px-0.5">
        <div className="flex items-center gap-1.5">
          <h3 className="text-[13.5px] font-semibold text-[#222938] tracking-tight">
            Quantization Variants
          </h3>
          <span className="text-[12px] font-mono text-[#647187] tabular-nums">
            ({model.variants.length})
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={canCompare ? 'primary' : 'secondary'}
            size="xs"
            onClick={onOpenComparison}
            disabled={!canCompare}
          >
            Compare Selected ({compareCount})
          </Button>

          <Button
            variant="subtle"
            size="xs"
            onClick={() => onUseInOptimizationLab?.(selectedVariant)}
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            Use in Optimization Lab
          </Button>
        </div>
      </div>

      {/* Horizontal Cards Grid */}
      <div className="grid grid-cols-6 gap-2">
        {model.variants.map((v) => {
          const isSelected = v.id === selectedVariantId;
          const isChecked = selectedComparisonIds.includes(v.id);
          const variantArchetype = v.archetype || model.archetype;

          return (
            <div
              key={v.id}
              onClick={() => onSelectVariant(v)}
              className={`p-2.5 rounded-md cursor-pointer transition-colors border flex flex-col justify-between ${isSelected
                  ? 'bg-[#F2F0FD] border-[#7562E8]'
                  : 'bg-white hover:bg-[#F8F9FB] border-[#D9DEE7]'
                }`}
            >
              <div>
                <div className="flex items-start gap-2">
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={() => onToggleComparison(v.id)}
                  />

                  <VariantCrystalIcon paletteId={v.paletteId || model.paletteId} />

                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] font-mono font-semibold text-[#222938] leading-tight truncate">
                      {v.name}
                    </div>
                    <div className="text-[10.5px] text-[#647187] mt-0.5 truncate">
                      {v.descriptionTag}
                    </div>
                  </div>
                </div>

                {/* Aligned Tabular Telemetry */}
                <div className="mt-2 pt-1.5 border-t border-[#E6EAF0] grid grid-cols-2 gap-x-1 gap-y-0.5 text-[11px] font-mono tabular-nums">
                  <span className="text-[#647187] font-sans">Size</span>
                  <span className="text-right font-semibold text-[#222938]">
                    {v.fileSizeGb ? `${v.fileSizeGb} GB` : '—'}
                  </span>

                  <span className="text-[#647187] font-sans">Latency</span>
                  <span className="text-right text-[#222938]">
                    {v.inferenceLatencyMs ? `~${v.inferenceLatencyMs} ms` : '—'}
                  </span>

                  <span className="text-[#647187] font-sans">Speed</span>
                  <span className="text-right text-[#222938]">
                    {v.generationSpeedToks ? `~${v.generationSpeedToks} t/s` : '—'}
                  </span>
                </div>
              </div>

              <div className="mt-2 pt-1 flex items-center justify-between gap-1">
                <StatusBadge
                  tone={v.isProfiled ? 'success' : 'neutral'}
                  dot={v.isProfiled}
                >
                  {v.isProfiled ? 'Profiled' : 'Unprofiled'}
                </StatusBadge>

                <span className="text-[9.5px] font-mono uppercase tracking-wider text-[#647187] px-1.5 py-0.5 rounded-sm bg-[#F8F9FB] border border-[#E6EAF0]">
                  {variantArchetype}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};