import React, { useState, useRef } from 'react';
import {
  Database,
  Folder,
  HardDrive,
  Copy,
  Check,
  Info,
  X,
} from 'lucide-react';
import { DataStorageSettings } from '../../types/settings';
import { Input } from '../ui/primitives';

interface DataStorageCardProps {
  settings: DataStorageSettings;
  onChangeSettings: (updated: Partial<DataStorageSettings>) => void;
}

export const DataStorageCard: React.FC<DataStorageCardProps> = ({
  settings,
  onChangeSettings,
}) => {
  const [directoryNotice, setDirectoryNotice] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<'models' | 'cache' | null>(null);

  const modelsInputRef = useRef<HTMLInputElement>(null);
  const cacheInputRef = useRef<HTMLInputElement>(null);

  const usedPct = Math.min(
    100,
    Math.max(0, Math.round((settings.usedStorageGb / settings.totalStorageGb) * 100))
  );

  const handleBrowseFolder = (type: 'models' | 'cache') => {
    if (type === 'models') {
      modelsInputRef.current?.focus();
      setDirectoryNotice(
        'Native OS folder dialog requires the Tauri desktop runtime. Edit the Model Storage Path directly in the field above.'
      );
    } else {
      cacheInputRef.current?.focus();
      setDirectoryNotice(
        'Native OS folder dialog requires the Tauri desktop runtime. Edit the Cache Directory path directly in the field above.'
      );
    }
  };

  const handleCopyPath = (path: string, field: 'models' | 'cache') => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(path);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1800);
    }
  };

  return (
    <div className="w-full bg-white rounded-lg border border-[#D9DEE7] shadow-2xs p-4 flex flex-col gap-3.5">
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-[#E6EAF0]">
        <div className="w-9 h-9 rounded-md bg-[#F8F9FB] border border-[#D9DEE7] flex items-center justify-center text-[#7562E8] shrink-0">
          <Database className="w-4 h-4 stroke-[1.9]" />
        </div>
        <div>
          <h2 className="text-[14.5px] font-semibold text-[#222938] tracking-tight">
            Data &amp; Storage
          </h2>
          <p className="text-[12px] text-[#647187]">
            Manage local GGUF model directories and runtime cache paths.
          </p>
        </div>
      </div>

      {/* Model Storage Path */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[12px] font-medium text-[#222938]">
          Model Storage Path
        </label>
        <Input
          ref={modelsInputRef}
          type="text"
          mono
          value={settings.modelStoragePath}
          onChange={(e) => onChangeSettings({ modelStoragePath: e.target.value })}
          rightElement={
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => handleCopyPath(settings.modelStoragePath, 'models')}
                aria-label="Copy Model Storage Path"
                title="Copy path"
                className="p-1 rounded-sm text-[#647187] hover:text-[#222938] transition-colors cursor-pointer"
              >
                {copiedField === 'models' ? (
                  <Check className="w-3.5 h-3.5 text-[#0D8A58]" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
              <button
                type="button"
                onClick={() => handleBrowseFolder('models')}
                aria-label="Edit or Browse Model Directory"
                title="Browse folder (or edit path directly)"
                className="p-1 rounded-sm text-[#647187] hover:text-[#7562E8] transition-colors cursor-pointer"
              >
                <Folder className="w-3.5 h-3.5" />
              </button>
            </div>
          }
        />
        <span className="text-[11px] text-[#647187]">
          Directory scanned for local GGUF model weights
        </span>
      </div>

      {/* Cache Directory */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[12px] font-medium text-[#222938]">
          Cache Directory
        </label>
        <Input
          ref={cacheInputRef}
          type="text"
          mono
          value={settings.cacheDirectory}
          onChange={(e) => onChangeSettings({ cacheDirectory: e.target.value })}
          rightElement={
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => handleCopyPath(settings.cacheDirectory, 'cache')}
                aria-label="Copy Cache Directory Path"
                title="Copy path"
                className="p-1 rounded-sm text-[#647187] hover:text-[#222938] transition-colors cursor-pointer"
              >
                {copiedField === 'cache' ? (
                  <Check className="w-3.5 h-3.5 text-[#0D8A58]" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
              <button
                type="button"
                onClick={() => handleBrowseFolder('cache')}
                aria-label="Edit or Browse Cache Directory"
                title="Browse folder (or edit path directly)"
                className="p-1 rounded-sm text-[#647187] hover:text-[#7562E8] transition-colors cursor-pointer"
              >
                <Folder className="w-3.5 h-3.5" />
              </button>
            </div>
          }
        />
        <span className="text-[11px] text-[#647187]">
          Directory for KV state caches and benchmark artifacts
        </span>
      </div>

      {/* Non-blocking inline directory notice */}
      {directoryNotice && (
        <div className="p-2.5 rounded-md bg-[#F8F9FB] border border-[#D9DEE7] text-[11.5px] text-[#647187] flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-[#7562E8] shrink-0 mt-0.5" />
            <span>{directoryNotice}</span>
          </div>
          <button
            type="button"
            aria-label="Dismiss Notice"
            onClick={() => setDirectoryNotice(null)}
            className="text-[#8A94A6] hover:text-[#222938] cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Storage Usage Bar */}
      <div className="p-3 rounded-md bg-[#F8F9FB] border border-[#E6EAF0] flex flex-col gap-2">
        <div className="flex items-center justify-between text-[12px]">
          <div className="flex items-center gap-1.5 font-semibold text-[#222938]">
            <HardDrive className="w-3.5 h-3.5 text-[#7562E8]" />
            <span>Model &amp; Cache Allocation</span>
          </div>
          <span className="text-[11px] font-mono text-[#647187] tabular-nums">
            Total: {settings.totalStorageGb.toFixed(1)} GB
          </span>
        </div>

        <div className="w-full h-2 rounded-sm bg-[#E2E6EE] overflow-hidden border border-[#D9DEE7]/60">
          <div
            className="h-full bg-[#7562E8] transition-all duration-300"
            style={{ width: `${usedPct}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] font-mono tabular-nums">
          <span className="text-[#222938] font-semibold">
            {settings.usedStorageGb.toFixed(1)} GB used ({usedPct}%)
          </span>
          <span className="text-[#647187]">
            {settings.freeStorageGb.toFixed(1)} GB free
          </span>
        </div>
      </div>
    </div>
  );
};