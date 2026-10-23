import React from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { ModelFilterMode } from '../../types/modelLibrary';
import { Input, SegmentedTabs } from '../ui/primitives';

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
    <div className="space-y-2 pb-2.5 shrink-0 border-b border-[#E6EAF0]">
      <Input
        type="text"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search models, quantizations..."
        leftIcon={<Search className="w-3.5 h-3.5" />}
        rightElement={
          <div className="flex items-center gap-1">
            {searchQuery && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => onSearchChange('')}
                className="p-0.5 rounded-sm text-[#647187] hover:text-[#222938] transition-colors cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
            <button
              type="button"
              aria-label="Filter Options"
              title="Filter Options"
              className="p-0.5 rounded-sm text-[#647187] hover:text-[#222938] transition-colors cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>
        }
      />

      <SegmentedTabs
        fullWidth
        value={activeFilter}
        onChange={onFilterChange}
        options={[
          { id: 'all', label: 'All', count: totalCount },
          { id: 'installed', label: 'Installed', count: installedCount },
          { id: 'ready', label: 'Ready', count: readyCount },
        ]}
      />
    </div>
  );
};