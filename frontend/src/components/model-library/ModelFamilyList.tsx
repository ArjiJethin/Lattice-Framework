import React, { useState, useMemo } from 'react';
import { ModelFamily, ModelFilterMode } from '../../types/modelLibrary';
import { ModelFamilyItem } from './ModelFamilyItem';
import { ModelSearchAndFilters } from './ModelSearchAndFilters';
import { SearchX } from 'lucide-react';

interface ModelFamilyListProps {
  models: ModelFamily[];
  selectedModelId: string;
  onSelectModel: (model: ModelFamily) => void;
}

export const ModelFamilyList: React.FC<ModelFamilyListProps> = ({
  models,
  selectedModelId,
  onSelectModel,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<ModelFilterMode>('all');

  // Filtered models
  const filteredModels = useMemo(() => {
    return models.filter((m) => {
      // Status filter
      if (activeFilter === 'installed' && m.status !== 'Installed') return false;
      if (activeFilter === 'ready' && m.status !== 'Ready') return false;

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = m.name.toLowerCase().includes(q);
        const matchesCategory = m.category.toLowerCase().includes(q);
        const matchesArch = m.architecture.toLowerCase().includes(q);
        const matchesVariant = m.variants.some((v) => v.name.toLowerCase().includes(q));
        return matchesName || matchesCategory || matchesArch || matchesVariant;
      }

      return true;
    });
  }, [models, activeFilter, searchQuery]);

  return (
    <div className="w-full flex flex-col h-full min-h-0 select-none">
      {/* Search and Filters Header */}
      <ModelSearchAndFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        totalCount={28}
        installedCount={12}
        readyCount={6}
      />

      {/* Scrollable Model Families List that flexes smoothly without pushing viewport */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1 select-none">
        {filteredModels.length > 0 ? (
          filteredModels.map((model) => (
            <ModelFamilyItem
              key={model.id}
              model={model}
              isSelected={model.id === selectedModelId}
              onSelect={onSelectModel}
            />
          ))
        ) : (
          <div className="py-8 px-4 text-center flex flex-col items-center justify-center text-slate-400">
            <SearchX className="w-7 h-7 stroke-[1.5] mb-1.5 text-slate-300" />
            <div className="text-[11px] font-semibold text-slate-600">No models match your search</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Try clearing your filters or query</div>
          </div>
        )}
      </div>
    </div>
  );
};
