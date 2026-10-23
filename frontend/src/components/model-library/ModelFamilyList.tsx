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

  const counts = useMemo(() => {
    return {
      total: models.length,
      installed: models.filter((m) => m.status === 'Installed').length,
      ready: models.filter((m) => m.status === 'Ready').length,
    };
  }, [models]);

  const filteredModels = useMemo(() => {
    return models.filter((m) => {
      if (activeFilter === 'installed' && m.status !== 'Installed') return false;
      if (activeFilter === 'ready' && m.status !== 'Ready') return false;

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
      <ModelSearchAndFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        totalCount={counts.total}
        installedCount={counts.installed}
        readyCount={counts.ready}
      />

      <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pt-2 pr-1 select-none">
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
          <div className="py-8 px-4 text-center flex flex-col items-center justify-center text-[#647187]">
            <SearchX className="w-6 h-6 stroke-[1.5] mb-1.5 text-[#8A94A6]" />
            <div className="text-[12px] font-semibold text-[#222938]">No models match your search</div>
            <div className="text-[11px] text-[#647187] mt-0.5">Try clearing your filters or query</div>
          </div>
        )}
      </div>
    </div>
  );
};