import React, { useState } from 'react';
import { Play, AlertCircle, RotateCcw } from 'lucide-react';
import {
  OptimizationConstraints,
  WorkloadType,
  OptimizationObjectiveType,
} from '../../types/optimizationLab';
import {
  WORKLOAD_OPTIONS,
  OBJECTIVE_OPTIONS,
} from '../../lib/optimization-lab/optimizationLabService';
import {
  Button,
  Select,
  SliderField,
  Switch,
  Checkbox,
  Input,
  StatusBadge,
} from '../ui/primitives';

interface ConstraintStudioProps {
  constraints: OptimizationConstraints;
  onChangeConstraints: (updated: Partial<OptimizationConstraints>) => void;
  onResetConstraints: () => void;
  onRunOptimization: () => void;
  isLoading: boolean;
  hasUnsolvedChanges?: boolean;
  error?: string | null;
}

export const ConstraintStudio: React.FC<ConstraintStudioProps> = ({
  constraints,
  onChangeConstraints,
  onResetConstraints,
  onRunOptimization,
  isLoading,
  hasUnsolvedChanges = false,
  error,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const selectedWorkload =
    WORKLOAD_OPTIONS.find((w) => w.id === constraints.workloadType) || WORKLOAD_OPTIONS[0];

  const selectedObjective =
    OBJECTIVE_OPTIONS.find((o) => o.id === constraints.objective) || OBJECTIVE_OPTIONS[0];

  return (
    <div className="w-full bg-white rounded-lg border border-[#D9DEE7] shadow-2xs p-4">
      {/* Section Header */}
      <div className="flex items-center justify-between pb-3 mb-3.5 border-b border-[#E6EAF0] flex-wrap gap-2">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-semibold text-[#222938] tracking-tight">
                1. Optimization Requirements &amp; Constraints
              </h2>
              {hasUnsolvedChanges && (
                <StatusBadge tone="warning">Modified — Click Run Optimization</StatusBadge>
              )}
            </div>
            <p className="text-[12px] text-[#647187] mt-0.5">
              Define hardware memory limits, target latency, and minimum acceptable quality score.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="tertiary"
            size="xs"
            onClick={onResetConstraints}
            leftIcon={<RotateCcw className="w-3 h-3" />}
          >
            Reset Defaults
          </Button>
          <div className="h-4 w-[1px] bg-[#E6EAF0]" />
          <Switch
            id="adv-options-toggle"
            checked={showAdvanced}
            onCheckedChange={setShowAdvanced}
            label="Advanced Options"
          />
        </div>
      </div>

      {/* 6-Column Aligned Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-stretch">
        {/* 1. Workload Type */}
        <div className="flex flex-col justify-between gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <label className="text-[12px] font-medium text-[#222938]">Workload Type</label>
            <span className="text-[10.5px] font-mono text-[#647187]">
              Ctx: {selectedWorkload.recommendedContext}
            </span>
          </div>
          <Select
            value={constraints.workloadType}
            onChange={(e) =>
              onChangeConstraints({ workloadType: e.target.value as WorkloadType })
            }
          >
            {WORKLOAD_OPTIONS.map((w) => (
              <option key={w.id} value={w.id}>
                {w.label}
              </option>
            ))}
          </Select>
          <span
            className="text-[10.5px] text-[#647187] truncate leading-tight"
            title={selectedWorkload.description}
          >
            {selectedWorkload.description}
          </span>
        </div>

        {/* 2. Objective */}
        <div className="flex flex-col justify-between gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <label className="text-[12px] font-medium text-[#222938]">Primary Objective</label>
            <span className="text-[10.5px] font-mono text-[#7562E8] uppercase">
              {constraints.objective}
            </span>
          </div>
          <Select
            value={constraints.objective}
            onChange={(e) =>
              onChangeConstraints({
                objective: e.target.value as OptimizationObjectiveType,
              })
            }
          >
            {OBJECTIVE_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </Select>
          <span
            className="text-[10.5px] text-[#647187] truncate leading-tight"
            title={selectedObjective.description}
          >
            {selectedObjective.description}
          </span>
        </div>

        {/* 3. Max Memory Usage */}
        <SliderField
          label="Max Memory"
          value={constraints.maxMemoryGb}
          min={1.0}
          max={16.0}
          step={0.1}
          unit="GB"
          formatValue={(val) => `≤ ${val.toFixed(1)} GB`}
          onChange={(val) => onChangeConstraints({ maxMemoryGb: val })}
        />

        {/* 4. Max Latency */}
        <SliderField
          label="Max Latency"
          value={constraints.maxLatencyMs}
          min={50}
          max={1000}
          step={10}
          unit="ms"
          formatValue={(val) => `≤ ${val} ms`}
          onChange={(val) => onChangeConstraints({ maxLatencyMs: val })}
        />

        {/* 5. Min Quality Score */}
        <SliderField
          label="Min Quality"
          value={constraints.minQualityScore}
          min={50}
          max={98}
          step={1}
          formatValue={(val) => `≥ ${val} / 100`}
          onChange={(val) => onChangeConstraints({ minQualityScore: val })}
        />

        {/* 6. Run Optimization Action Button */}
        <div className="flex flex-col justify-between gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-[#647187]">Solver Execution</span>
            <span className="text-[10.5px] font-mono text-[#0D8A58]">Pareto v1.0</span>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={onRunOptimization}
            isLoading={isLoading}
            leftIcon={<Play className="w-3.5 h-3.5 fill-current" />}
            className="w-full h-8"
          >
            {isLoading ? 'Solving...' : 'Run Optimization'}
          </Button>
          <span className="text-[10.5px] text-[#647187] truncate text-center leading-tight">
            {hasUnsolvedChanges ? 'Unsaved constraint changes' : 'Constraints synchronized'}
          </span>
        </div>
      </div>

      {/* Collapsible Advanced Options */}
      {showAdvanced && (
        <div className="mt-3.5 pt-3.5 border-t border-[#E6EAF0] grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#F8F9FB] p-3 rounded-md border border-[#E6EAF0]">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-[#647187] uppercase tracking-wider">
              Target Hardware Profile
            </label>
            <Input
              type="text"
              value={constraints.targetHardware || ''}
              onChange={(e) => onChangeConstraints({ targetHardware: e.target.value })}
              placeholder="e.g. RTX 3050 (4 GB)"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-[#647187] uppercase tracking-wider">
              Switching Overhead (ms)
            </label>
            <Input
              type="number"
              mono
              min={0}
              max={5000}
              value={constraints.switchingOverheadMs ?? 120}
              onChange={(e) =>
                onChangeConstraints({
                  switchingOverheadMs: Math.max(0, parseInt(e.target.value, 10) || 0),
                })
              }
            />
          </div>

          <div className="flex items-center pt-3">
            <Checkbox
              id="allow-unprofiled-checkbox"
              checked={constraints.allowUnprofiled || false}
              onCheckedChange={(checked) =>
                onChangeConstraints({ allowUnprofiled: checked })
              }
              label="Include unbenchmarked profiles"
              description="Evaluate estimated quantization variants in solver pool"
            />
          </div>
        </div>
      )}

      {error && (
        <div className="mt-3 p-2.5 rounded-md bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] text-[12px] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};