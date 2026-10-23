import React from 'react';
import { ModelLibraryHeader } from '../components/model-library/ModelLibraryHeader';
import { ModelFamilyList } from '../components/model-library/ModelFamilyList';
import { ModelEntityScene } from '../components/model-library/ModelEntityScene';
import { ModelDetailsInspector } from '../components/model-library/ModelDetailsInspector';
import { QuantizationVariantStrip } from '../components/model-library/QuantizationVariantStrip';
import { CompareConfigurationsDialog } from '../components/model-library/CompareConfigurationsDialog';
import { useModelLibrary } from '../hooks/useModelLibrary';
import { BackendConnectionState } from '../types';
import { NavItemKey } from '../components/layout/Sidebar';

interface ModelLabPageProps {
  backendState: BackendConnectionState;
  onRefreshConnection: () => void;
  onNavigate?: (key: NavItemKey) => void;
  modelLibrary?: ReturnType<typeof useModelLibrary>;
}

export const ModelLabPage: React.FC<ModelLabPageProps> = ({
  backendState,
  onRefreshConnection,
  onNavigate,
  modelLibrary: externalModelLibrary,
}) => {
  const localModelLibrary = useModelLibrary();
  const {
    models,
    selectedModel,
    selectedVariant,
    summaryStats,
    selectModel,
    selectVariant,
    selectedComparisonIds,
    toggleComparison,
    comparisonVariants,
    isCompareOpen,
    setIsCompareOpen,
    animationState,
    runBenchmark,
  } = externalModelLibrary || localModelLibrary;

  const handleUseInOptimizationLab = () => {
    if (onNavigate) {
      onNavigate('optimization-lab');
    }
  };

  const handleViewExperiments = () => {
    if (onNavigate) {
      onNavigate('experiments');
    }
  };

  return (
    <div className="h-full flex flex-col justify-between p-3 select-none overflow-hidden gap-2.5">
      {/* Top Header */}
      <ModelLibraryHeader
        stats={summaryStats}
        backendState={backendState}
        onRefreshConnection={onRefreshConnection}
        onBackToOverview={() => onNavigate?.('overview')}
      />

      {/* Main 3-Column Content Workspace */}
      <div className="px-5 flex-1 min-h-0 flex flex-col gap-2.5">
        <div className="flex-1 min-h-0 grid grid-cols-12 gap-3 items-stretch">
          {/* Left Column: Model Catalog List (col-span-3) */}
          <div className="col-span-3 h-full min-h-0 flex flex-col rounded-lg bg-white border border-[#D9DEE7] p-3 shadow-2xs">
            <ModelFamilyList
              models={models}
              selectedModelId={selectedModel.id}
              onSelectModel={selectModel}
            />
          </div>

          {/* Center Column: 3D Model Entity Stage (col-span-6) */}
          <div className="col-span-6 h-full min-h-0 flex flex-col">
            <ModelEntityScene
              model={selectedModel}
              selectedVariant={selectedVariant}
              animationState={animationState}
            />
          </div>

          {/* Right Column: Model Details Inspector (col-span-3) */}
          <div className="col-span-3 h-full min-h-0 flex flex-col">
            <ModelDetailsInspector
              model={selectedModel}
              selectedVariant={selectedVariant}
              onRunBenchmark={runBenchmark}
              onViewExperiments={handleViewExperiments}
            />
          </div>
        </div>

        {/* Bottom Section: Quantization Variants Strip */}
        <div className="w-full shrink-0 rounded-lg bg-white border border-[#D9DEE7] px-4 py-2.5 shadow-2xs">
          <QuantizationVariantStrip
            model={selectedModel}
            selectedVariantId={selectedVariant.id}
            onSelectVariant={selectVariant}
            selectedComparisonIds={selectedComparisonIds}
            onToggleComparison={toggleComparison}
            onOpenComparison={() => setIsCompareOpen(true)}
            onUseInOptimizationLab={handleUseInOptimizationLab}
          />
        </div>
      </div>

      {/* Compare Configurations Modal */}
      {isCompareOpen && (
        <CompareConfigurationsDialog
          model={selectedModel}
          variants={comparisonVariants}
          onClose={() => setIsCompareOpen(false)}
          onSelectForInspection={selectVariant}
        />
      )}
    </div>
  );
};