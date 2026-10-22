import React from 'react';
import { Database, Folder, HardDrive } from 'lucide-react';
import { DataStorageSettings } from '../../types/settings';

interface DataStorageCardProps {
  settings: DataStorageSettings;
  onChangeSettings: (updated: Partial<DataStorageSettings>) => void;
}

export const DataStorageCard: React.FC<DataStorageCardProps> = ({
  settings,
  onChangeSettings,
}) => {
  const usedPct = Math.round((settings.usedStorageGb / settings.totalStorageGb) * 100);

  const handleBrowseFolder = (type: 'models' | 'cache') => {
    // In Tauri or browser without directory picker permissions, direct path editing is supported
    alert(
      `Direct path configuration is active. You can edit the ${
        type === 'models' ? 'Model Storage' : 'Cache'
      } directory path directly in the text field.`
    );
  };

  return (
    <div className="w-full bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-xs p-5 transition-all flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
        <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200/80 flex items-center justify-center text-[#7C6AF2] shadow-2xs shrink-0">
          <Database className="w-5 h-5 stroke-[1.9]" />
        </div>
        <div>
          <h2 className="text-sm font-black text-[#18213B] tracking-tight">
            Data &amp; Storage
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Manage local data, cache and storage settings.
          </p>
        </div>
      </div>

      {/* Model Storage Path */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-[#18213B]">Model Storage Path</label>
        <div className="relative flex items-center">
          <input
            type="text"
            value={settings.modelStoragePath}
            onChange={(e) => onChangeSettings({ modelStoragePath: e.target.value })}
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 pr-9 text-xs font-mono font-bold text-[#18213B] shadow-2xs hover:border-slate-300 focus:outline-none focus:border-[#7C6AF2] transition-colors"
          />
          <button
            type="button"
            onClick={() => handleBrowseFolder('models')}
            title="Browse folder"
            className="absolute right-2.5 text-slate-400 hover:text-[#7C6AF2] transition-colors p-0.5 cursor-pointer"
          >
            <Folder className="w-4 h-4" />
          </button>
        </div>
        <span className="text-[11px] text-slate-500 font-medium">
          Directory for downloaded models
        </span>
      </div>

      {/* Cache Directory */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-[#18213B]">Cache Directory</label>
        <div className="relative flex items-center">
          <input
            type="text"
            value={settings.cacheDirectory}
            onChange={(e) => onChangeSettings({ cacheDirectory: e.target.value })}
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 pr-9 text-xs font-mono font-bold text-[#18213B] shadow-2xs hover:border-slate-300 focus:outline-none focus:border-[#7C6AF2] transition-colors"
          />
          <button
            type="button"
            onClick={() => handleBrowseFolder('cache')}
            title="Browse folder"
            className="absolute right-2.5 text-slate-400 hover:text-[#7C6AF2] transition-colors p-0.5 cursor-pointer"
          >
            <Folder className="w-4 h-4" />
          </button>
        </div>
        <span className="text-[11px] text-slate-500 font-medium">
          Directory for cache and temporary files
        </span>
      </div>

      {/* Storage Usage Bar matching screenshot */}
      <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100 flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-bold text-[#18213B]">
            <HardDrive className="w-3.5 h-3.5 text-[#7C6AF2]" />
            <span>Storage Usage</span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Total: {settings.totalStorageGb} GB
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 rounded-full bg-slate-200/80 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#7C6AF2] to-[#B4A8FF] transition-all duration-500"
            style={{ width: `${usedPct}%` }}
          />
        </div>

        {/* Used and Free labels */}
        <div className="flex items-center justify-between text-[11px] font-bold">
          <span className="text-[#7C6AF2] font-mono">
            {settings.usedStorageGb} GB used
          </span>
          <span className="text-slate-400 font-mono">
            {settings.freeStorageGb} GB free
          </span>
        </div>
      </div>
    </div>
  );
};
