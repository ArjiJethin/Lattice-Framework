import React from 'react';
import { ChevronRight } from 'lucide-react';
import { ModelFamily, ModelColorPaletteId } from '../../types/modelLibrary';
import { getColorPaletteById } from '../model-entities/SharedModelMaterials';

interface ModelFamilyItemProps {
  model: ModelFamily;
  isSelected: boolean;
  onSelect: (model: ModelFamily) => void;
}

const ArchetypeCrystalGlyph: React.FC<{
  archetype: string;
  paletteId?: ModelColorPaletteId;
  isSelected: boolean;
}> = ({ archetype, paletteId, isSelected }) => {
  const pal = getColorPaletteById(paletteId);

  return (
    <div
      className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 transition-transform ${isSelected ? 'scale-105' : ''
        }`}
      style={{
        backgroundColor: pal.badgeBg,
        borderColor: pal.badgeBorder,
      }}
    >
      {archetype === 'fractal' ? (
        <svg className="w-6 h-6" viewBox="0 0 32 32" fill="none">
          <polygon points="16,2 28,16 16,30 4,16" fill={pal.wireframe} opacity="0.7" />
          <polygon points="7,7 25,7 25,25 7,25" fill={pal.secondaryShell} opacity="0.55" />
          <polygon points="16,5 26,16 16,27 6,16" fill={pal.primaryShell} opacity="0.85" />
          <path
            d="M16,2 L16,30 M4,16 L28,16 M7,7 L25,25 M25,7 L7,25"
            stroke="#FFFFFF"
            strokeWidth="1.1"
          />
          <circle cx="16" cy="16" r="2.4" fill="#FFFFFF" />
        </svg>
      ) : (
        <svg className="w-6 h-6" viewBox="0 0 32 32" fill="none">
          <polygon points="16,3 27,9.5 16,16 5,9.5" fill={pal.wireframe} opacity="0.9" />
          <polygon points="5,9.5 16,16 16,29 5,22.5" fill={pal.secondaryShell} opacity="0.82" />
          <polygon points="16,16 27,9.5 27,22.5 16,29" fill={pal.primaryShell} opacity="0.9" />
          <path
            d="M16,3 L16,29 M5,9.5 L27,22.5 M27,9.5 L5,22.5 M16,3 L27,9.5 L27,22.5 L16,29 L5,22.5 L5,9.5 Z"
            stroke="#FFFFFF"
            strokeWidth="1.1"
          />
          <circle cx="16" cy="16" r="2.2" fill="#FFFFFF" />
        </svg>
      )}
    </div>
  );
};

export const ModelFamilyItem: React.FC<ModelFamilyItemProps> = ({
  model,
  isSelected,
  onSelect,
}) => {
  const defaultVar =
    model.variants.find((v) => v.id === model.defaultVariantId) || model.variants[0];
  const displayPaletteId = defaultVar?.paletteId || model.paletteId;
  const displayArchetype = defaultVar?.archetype || model.archetype;

  const getStatusBadge = () => {
    switch (model.status) {
      case 'Installed':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E6F4EA] text-[#0D8A58]">
            Installed
          </span>
        );
      case 'Ready':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E0F2FE] text-[#0369A1]">
            Ready
          </span>
        );
      case 'Not Installed':
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500">
            Not Installed
          </span>
        );
    }
  };

  return (
    <button
      onClick={() => onSelect(model)}
      className={`relative w-full text-left p-2.5 rounded-xl flex items-center justify-between gap-2.5 transition-all duration-200 ${isSelected
          ? 'bg-gradient-to-r from-[#EDE9FF] via-[#F3F0FF] to-[#F9F8FF] border border-[#8174F5]/40 shadow-[0_4px_14px_rgba(129,116,245,0.12)]'
          : 'bg-white/75 hover:bg-white border border-slate-100 hover:border-slate-200/90'
        }`}
    >
      {isSelected && (
        <span className="absolute left-0 top-2 bottom-2 w-1 bg-[#7C6AF2] rounded-r-full" />
      )}

      <div className="flex items-center gap-2.5 min-w-0 pl-0.5">
        <ArchetypeCrystalGlyph
          archetype={displayArchetype}
          paletteId={displayPaletteId}
          isSelected={isSelected}
        />

        <div className="min-w-0">
          <div className="text-[13px] font-extrabold text-[#18213B] truncate leading-tight">
            {model.name}
          </div>
          <div className="text-[10.5px] text-slate-500 truncate mt-0.5 font-medium">
            {model.parameters} · {model.fileFormat} · {model.category}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {getStatusBadge()}
        <ChevronRight
          className={`w-3.5 h-3.5 transition-transform ${isSelected ? 'text-[#7C6AF2] translate-x-0.5' : 'text-slate-400'
            }`}
        />
      </div>
    </button>
  );
};