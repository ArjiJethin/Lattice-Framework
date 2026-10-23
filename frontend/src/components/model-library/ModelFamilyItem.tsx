import React from 'react';
import { ChevronRight } from 'lucide-react';
import { ModelFamily, ModelColorPaletteId } from '../../types/modelLibrary';
import { getColorPaletteById } from '../model-entities/SharedModelMaterials';
import { StatusBadge } from '../ui/primitives';

interface ModelFamilyItemProps {
  model: ModelFamily;
  isSelected: boolean;
  onSelect: (model: ModelFamily) => void;
}

const ArchetypeCrystalGlyph: React.FC<{
  archetype: string;
  paletteId?: ModelColorPaletteId;
}> = ({ archetype, paletteId }) => {
  const pal = getColorPaletteById(paletteId);

  return (
    <div
      className="w-8 h-8 rounded-md border flex items-center justify-center shrink-0"
      style={{
        backgroundColor: pal.badgeBg,
        borderColor: pal.badgeBorder,
      }}
    >
      {archetype === 'fractal' ? (
        <svg className="w-5 h-5" viewBox="0 0 32 32" fill="none">
          <polygon points="16,2 28,16 16,30 4,16" fill={pal.wireframe} opacity="0.7" />
          <polygon points="7,7 25,7 25,25 7,25" fill={pal.secondaryShell} opacity="0.55" />
          <polygon points="16,5 26,16 16,27 6,16" fill={pal.primaryShell} opacity="0.85" />
          <path
            d="M16,2 L16,30 M4,16 L28,16 M7,7 L25,25 M25,7 L7,25"
            stroke="#FFFFFF"
            strokeWidth="1.1"
          />
          <circle cx="16" cy="16" r="2.2" fill="#FFFFFF" />
        </svg>
      ) : (
        <svg className="w-5 h-5" viewBox="0 0 32 32" fill="none">
          <polygon points="16,3 27,9.5 16,16 5,9.5" fill={pal.wireframe} opacity="0.9" />
          <polygon points="5,9.5 16,16 16,29 5,22.5" fill={pal.secondaryShell} opacity="0.82" />
          <polygon points="16,16 27,9.5 27,22.5 16,29" fill={pal.primaryShell} opacity="0.9" />
          <path
            d="M16,3 L16,29 M5,9.5 L27,22.5 M27,9.5 L5,22.5 M16,3 L27,9.5 L27,22.5 L16,29 L5,22.5 L5,9.5 Z"
            stroke="#FFFFFF"
            strokeWidth="1.1"
          />
          <circle cx="16" cy="16" r="2" fill="#FFFFFF" />
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

  const statusTone =
    model.status === 'Installed'
      ? 'success'
      : model.status === 'Ready'
        ? 'info'
        : 'neutral';

  return (
    <button
      type="button"
      onClick={() => onSelect(model)}
      className={`relative w-full text-left p-2.5 rounded-md flex items-center justify-between gap-2 border transition-colors cursor-pointer ${isSelected
          ? 'bg-[#F2F0FD] border-[#7562E8]'
          : 'bg-white hover:bg-[#F8F9FB] border-[#D9DEE7]'
        }`}
    >
      {isSelected && (
        <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-[#7562E8] rounded-r-sm" />
      )}

      <div className="flex items-center gap-2.5 min-w-0 pl-0.5">
        <ArchetypeCrystalGlyph
          archetype={displayArchetype}
          paletteId={displayPaletteId}
        />

        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-[#222938] truncate leading-tight">
            {model.name}
          </div>
          <div className="text-[11px] text-[#647187] truncate mt-0.5 font-medium">
            <span className="font-mono">{model.parameters}</span> · {model.fileFormat} · {model.category}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <StatusBadge tone={statusTone} dot={false}>
          {model.status}
        </StatusBadge>
        <ChevronRight
          className={`w-3.5 h-3.5 transition-transform ${isSelected ? 'text-[#7562E8] translate-x-0.5' : 'text-[#8A94A6]'
            }`}
        />
      </div>
    </button>
  );
};