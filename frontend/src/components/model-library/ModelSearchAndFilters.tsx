import React from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { ModelFilterMode } from '../../types/modelLibrary';

interface ModelSearchAndFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeFilter: ModelFilterMode;
  onFilterChange: (filter: ModelFilterMode) => void;
  totalCount: number;
  installedCount: number;
  readyCount: number;
}

export const ModelSearchAndFilters: React.FC<ModelSearchAndFiltersProps> = ({
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
  totalCount,
  installedCount,
  readyCount,
}) => {
  return (
    <div className="space-y-2.5 pb-2.5 shrink-0">
      {/* Flex Search Container — Icon and placeholder text never overlap */}
      <div className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/95 border border-slate-200/90 focus-within:border-[#8174F5] focus-within:ring-2 focus-within:ring-[#8174F5]/15 transition-all shadow-2xs">
        <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search models, quantizations..."
          className="w-full min-w-0 bg-transparent text-[11.5px] text-[#18213B] placeholder-slate-400 font-medium focus:outline-none"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="text-[10px] text-slate-400 hover:text-slate-600 px-1 shrink-0"
          >
            ✕
          </button>
        )}
        <button
          type="button"
          title="Filter Options"
          className="p-0.5 rounded-md text-slate-400 hover:text-[#18213B] transition-colors shrink-0"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Filter Pills — Sized to fit cleanly across the column width */}
      <div className="grid grid-cols-3 gap-1.5">
        <button
          type="button"
          onClick={() => onFilterChange('all')}
          className={`px-2 py-1.5 rounded-xl text-[10.5px] font-bold truncate text-center transition-all ${activeFilter === 'all'
              ? 'bg-[#18213B] text-white shadow-2xs'
              : 'bg-white/80 hover:bg-white text-slate-600 border border-slate-200/80'
            }`}
        >
          All Models ({totalCount})
        </button>

        <button
          type="button"
          onClick={() => onFilterChange('installed')}
          className={`px-2 py-1.5 rounded-xl text-[10.5px] font-bold truncate text-center transition-all ${activeFilter === 'installed'
              ? 'bg-[#18213B] text-white shadow-2xs'
              : 'bg-white/80 hover:bg-white text-slate-600 border border-slate-200/80'
            }`}
        >
          Installed ({installedCount})
        </button>

        <button
          type="button"
          onClick={() => onFilterChange('ready')}
          className={`px-2 py-1.5 rounded-xl text-[10.5px] font-bold truncate text-center transition-all ${activeFilter === 'ready'
              ? 'bg-[#18213B] text-white shadow-2xs'
              : 'bg-white/80 hover:bg-white text-slate-600 border border-slate-200/80'
            }`}
        >
          Ready ({readyCount})
        </button>
      </div>
    </div>
  );
};