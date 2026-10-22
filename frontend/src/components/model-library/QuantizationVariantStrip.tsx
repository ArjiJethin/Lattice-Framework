import React from 'react';
import {
  QuantizationVariant,
  ModelFamily,
  ModelColorPaletteId,
} from '../../types/modelLibrary';
import { getColorPaletteById } from '../model-entities/SharedModelMaterials';
import { ArrowRight, Check } from 'lucide-react';

interface QuantizationVariantStripProps {
  model: ModelFamily;
  selectedVariantId: string;
  onSelectVariant: (variant: QuantizationVariant) => void;
  selectedComparisonIds: string[];
  onToggleComparison: (variantId: string) => void;
  onOpenComparison: () => void;
  onUseInOptimizationLab?: (variant: QuantizationVariant) => void;
}

/**
 * 3D Faceted Crystal SVG colored by the variant's persistent ModelColorPalette
 */
const VariantCrystalIcon: React.FC<{ paletteId?: ModelColorPaletteId }> = ({
  paletteId,
}) => {
  const pal = getColorPaletteById(paletteId);

  return (
    <div
      className="w-9 h-9 rounded-xl border flex items-center justify-center shrink-0"
      style={{
        backgroundColor: pal.badgeBg,
        borderColor: pal.badgeBorder,
      }}
    >
      <svg className="w-7 h-7" viewBox="0 0 32 32" fill="none">
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
    <div className="w-full pt-0.5 pb-0.5 select-none">
      {/* Strip Header Row */}
      <div className="flex items-center justify-between mb-2 px-0.5">
        <div className="flex items-center gap-1.5">
          <h3 className="text-[13.5px] font-extrabold text-[#18213B] tracking-tight">
            Quantization Variants
          </h3>
          <span className="text-[13px] font-medium text-slate-400">
            ({model.variants.length})
          </span>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenComparison}
            disabled={!canCompare}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-bold transition-all ${canCompare
                ? 'bg-[#7C6AF2] hover:bg-[#6D5AE6] text-white shadow-[0_2px_10px_rgba(124,106,242,0.28)]'
                : 'bg-[#7C6AF2]/80 text-white/95'
              }`}
          >
            <span className="text-[10px] leading-none">✕</span>
            <span>Compare Selected ({compareCount})</span>
          </button>

          <button
            type="button"
            onClick={() => onUseInOptimizationLab?.(selectedVariant)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#F3F0FF] hover:bg-[#E9E4FF] border border-[#8174F5]/20 text-[#6D5AE6] text-[11px] font-bold transition-all"
          >
            <span>Use in Optimization Lab</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Horizontal Cards Row */}
      <div className="grid grid-cols-6 gap-2.5">
        {model.variants.map((v) => {
          const isSelected = v.id === selectedVariantId;
          const isChecked = selectedComparisonIds.includes(v.id);
          const variantArchetype = v.archetype || model.archetype;

          return (
            <div
              key={v.id}
              onClick={() => onSelectVariant(v)}
              className={`p-2.5 rounded-xl cursor-pointer transition-all duration-200 flex flex-col justify-between ${isSelected
                  ? 'bg-gradient-to-b from-[#F5F3FF] via-white to-white border-2 border-[#8174F5] shadow-[0_4px_14px_rgba(129,116,245,0.14)]'
                  : 'bg-white/85 hover:bg-white border border-slate-200/80 hover:border-slate-300 shadow-2xs'
                }`}
            >
              <div>
                {/* Top Row: Checkbox + Palette-Matched 3D Crystal Icon + Variant Name */}
                <div className="flex items-start gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleComparison(v.id);
                    }}
                    className={`mt-0.5 w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${isChecked
                        ? 'bg-[#7C6AF2] border-[#7C6AF2] text-white'
                        : 'border-slate-300 bg-white hover:border-[#7C6AF2]'
                      }`}
                  >
                    {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </button>

                  <VariantCrystalIcon paletteId={v.paletteId || model.paletteId} />

                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] font-extrabold text-[#18213B] leading-tight truncate">
                      {v.name}
                    </div>
                    <div className="text-[10px] font-medium text-slate-500 mt-0.5 truncate">
                      {v.descriptionTag}
                    </div>
                  </div>
                </div>

                {/* Telemetry Rows Aligned Under Title */}
                <div className="mt-1.5 pl-[60px] space-y-0.5 text-[10.5px]">
                  <div className="font-semibold text-slate-700">
                    {v.fileSizeGb ? `${v.fileSizeGb} GB` : 'Unknown'}
                  </div>
                  <div className="text-slate-500">
                    {v.inferenceLatencyMs ? `~${v.inferenceLatencyMs} ms` : 'Not measured'}
                  </div>
                  <div className="text-slate-500">
                    {v.generationSpeedToks ? `~${v.generationSpeedToks} tok/s` : 'Pending'}
                  </div>
                </div>
              </div>

              {/* Bottom Status Pill + Assigned 3D Archetype Tag */}
              <div className="mt-2 pt-0.5 flex items-center justify-between gap-1">
                {v.isProfiled ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9.5px] font-bold bg-[#E6F4EA] text-[#0D8A58]">
                    <span>◇</span>
                    <span>Profiled</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9.5px] font-medium bg-slate-100 text-slate-500">
                    Not Profiled
                  </span>
                )}

                <span className="text-[8.5px] font-bold uppercase tracking-wider text-slate-400 px-1.5 py-0.5 rounded bg-slate-50 border border-slate-100">
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