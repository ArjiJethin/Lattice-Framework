import React, { useState } from 'react';
import { ModelFamily, QuantizationVariant } from '../../types/modelLibrary';
import { StatusBadge } from '../ui/primitives';
import { FileText, FolderOpen, Copy, Check } from 'lucide-react';

interface ModelFilesTabProps {
  model: ModelFamily;
  selectedVariant: QuantizationVariant;
}

export const ModelFilesTab: React.FC<ModelFilesTabProps> = ({
  model,
  selectedVariant,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyPath = (path: string, id: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(path);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  return (
    <div className="space-y-2 text-[12px] select-none">
      <div className="flex items-center justify-between text-[#647187] font-semibold text-[11px] px-0.5">
        <span>Model Package Files ({model.variants.length})</span>
        <span className="flex items-center gap-1 text-[#7562E8] font-mono text-[10.5px]">
          <FolderOpen className="w-3.5 h-3.5 shrink-0" />
          <span>D:\models</span>
        </span>
      </div>

      <div className="space-y-1.5">
        {model.variants.map((v) => {
          const isCurrent = v.id === selectedVariant.id;
          const path =
            v.filePath || `D:\\models\\${model.id}-${v.name.toLowerCase()}.gguf`;

          return (
            <div
              key={v.id}
              className={`p-2.5 rounded-md border transition-colors ${isCurrent
                  ? 'bg-[#F2F0FD] border-[#7562E8]'
                  : 'bg-white border-[#D9DEE7] hover:border-[#C3CBD8]'
                }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <FileText
                    className={`w-3.5 h-3.5 shrink-0 ${isCurrent ? 'text-[#7562E8]' : 'text-[#647187]'
                      }`}
                  />
                  <span className="font-mono font-semibold text-[#222938] text-[12px] truncate">
                    {v.name}
                  </span>
                  <span className="text-[11px] font-mono text-[#647187] shrink-0 tabular-nums">
                    ({v.fileSizeGb ? `${v.fileSizeGb} GB` : 'Unknown'})
                  </span>
                </div>

                <StatusBadge
                  tone={v.isInstalled ? 'success' : 'neutral'}
                  dot={v.isInstalled}
                >
                  {v.isInstalled ? 'Ready' : 'Not Cached'}
                </StatusBadge>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-[#E6EAF0]">
                <span
                  className="text-[10.5px] font-mono text-[#647187] truncate"
                  title={path}
                >
                  {path}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyPath(path, v.id)}
                  aria-label="Copy File Path"
                  title="Copy File Path"
                  className="p-1 rounded-sm text-[#647187] hover:text-[#7562E8] hover:bg-white transition-colors shrink-0 cursor-pointer"
                >
                  {copiedId === v.id ? (
                    <Check className="w-3 h-3 text-[#0D8A58]" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};