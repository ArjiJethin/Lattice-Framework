import React from 'react';
import { ModelFamily, QuantizationVariant } from '../../types/modelLibrary';
import { FileText, Download, CheckCircle, FolderOpen, Copy, Check } from 'lucide-react';

interface ModelFilesTabProps {
  model: ModelFamily;
  selectedVariant: QuantizationVariant;
}

export const ModelFilesTab: React.FC<ModelFilesTabProps> = ({
  model,
  selectedVariant,
}) => {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const handleCopyPath = (path: string, id: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(path);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  return (
    <div className="space-y-2.5 text-xs select-none">
      {/* Header Row */}
      <div className="flex items-center justify-between text-slate-500 font-semibold text-[11px] px-0.5">
        <span>Model Package Files ({model.variants.length})</span>
        <span className="flex items-center gap-1 text-[#7C6AF2] font-mono text-[10.5px]">
          <FolderOpen className="w-3.5 h-3.5 shrink-0" />
          <span>D:\models</span>
        </span>
      </div>

      {/* File Cards List — Scrolls smoothly via parent container without double scrollbars */}
      <div className="space-y-2">
        {model.variants.map((v) => {
          const isCurrent = v.id === selectedVariant.id;
          const path =
            v.filePath || `D:\\models\\${model.id}-${v.name.toLowerCase()}.gguf`;

          return (
            <div
              key={v.id}
              className={`p-3 rounded-xl border transition-all ${isCurrent
                  ? 'bg-[#F5F3FF]/90 border-[#8174F5] shadow-2xs'
                  : 'bg-white/90 border-slate-200/80 hover:border-slate-300'
                }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText
                    className={`w-3.5 h-3.5 shrink-0 ${isCurrent ? 'text-[#7C6AF2]' : 'text-slate-400'
                      }`}
                  />
                  <span className="font-extrabold text-[#18213B] text-[12px] truncate">
                    {v.name}
                  </span>
                  <span className="text-[10.5px] text-slate-400 font-medium shrink-0">
                    ({v.fileSizeGb ? `${v.fileSizeGb} GB` : 'Unknown'})
                  </span>
                </div>

                <div className="shrink-0">
                  {v.isInstalled ? (
                    <span className="inline-flex items-center gap-1 text-[10px] text-[#0D8A58] font-bold bg-[#E6F4EA] px-2 py-0.5 rounded-full">
                      <CheckCircle className="w-3 h-3" />
                      <span>Ready</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-full">
                      <Download className="w-3 h-3" />
                      <span>Not Cached</span>
                    </span>
                  )}
                </div>
              </div>

              {/* File Path Row */}
              <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-100">
                <span
                  className="text-[10px] font-mono text-slate-500 truncate"
                  title={path}
                >
                  {path}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyPath(path, v.id)}
                  title="Copy File Path"
                  className="p-1 rounded-md text-slate-400 hover:text-[#7C6AF2] hover:bg-purple-50 transition-colors shrink-0"
                >
                  {copiedId === v.id ? (
                    <Check className="w-3 h-3 text-emerald-600" />
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