import { useState, useCallback, useMemo } from 'react';
import {
  ModelFamily,
  QuantizationVariant,
  ModelAnimationState,
} from '../types/modelLibrary';
import {
  getModelFamilies,
  computeModelLibrarySummary,
} from '../lib/model-library/modelLibraryData';

export function useModelLibrary() {
  const [models] = useState<ModelFamily[]>(() => getModelFamilies());
  const [selectedModelId, setSelectedModelId] = useState<string>('qwen3-1.7b');
  const [selectedVariantId, setSelectedVariantId] = useState<string>('qwen3-1.7b-q4_k_m');
  const [selectedComparisonIds, setSelectedComparisonIds] = useState<string[]>(['qwen3-1.7b-q4_k_m']);
  const [animationState, setAnimationState] = useState<ModelAnimationState>('idle');
  const [isCompareOpen, setIsCompareOpen] = useState(false);

  // Active selected model
  const selectedModel = useMemo(() => {
    return models.find((m) => m.id === selectedModelId) || models[0];
  }, [models, selectedModelId]);

  // Active selected variant
  const selectedVariant = useMemo(() => {
    return (
      selectedModel.variants.find((v) => v.id === selectedVariantId) ||
      selectedModel.variants[0]
    );
  }, [selectedModel, selectedVariantId]);

  // Summary counts
  const summaryStats = useMemo(() => {
    return computeModelLibrarySummary(models);
  }, [models]);

  // Select model family
  const selectModel = useCallback((model: ModelFamily) => {
    setSelectedModelId(model.id);
    const defaultVar = model.variants.find((v) => v.id === model.defaultVariantId) || model.variants[0];
    setSelectedVariantId(defaultVar.id);
    setSelectedComparisonIds([defaultVar.id]);
    setAnimationState('selected');
    setTimeout(() => setAnimationState('idle'), 1500);
  }, []);

  // Select variant within model family
  const selectVariant = useCallback((variant: QuantizationVariant) => {
    setSelectedVariantId(variant.id);
    setAnimationState('selected');
    setTimeout(() => setAnimationState('idle'), 1200);
  }, []);

  // Toggle variant in comparison set
  const toggleComparison = useCallback((variantId: string) => {
    setSelectedComparisonIds((prev) => {
      if (prev.includes(variantId)) {
        return prev.filter((id) => id !== variantId);
      } else {
        return [...prev, variantId];
      }
    });
  }, []);

  // Variants currently selected for comparison
  const comparisonVariants = useMemo(() => {
    return selectedModel.variants.filter((v) => selectedComparisonIds.includes(v.id));
  }, [selectedModel, selectedComparisonIds]);

  // Run benchmark action
  const runBenchmark = useCallback(() => {
    setAnimationState('evaluating');
    setTimeout(() => {
      setAnimationState('completed');
      setTimeout(() => setAnimationState('idle'), 3000);
    }, 2800);
  }, []);

  return {
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
  };
}
