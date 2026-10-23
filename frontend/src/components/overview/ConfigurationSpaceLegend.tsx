import React from 'react';
import { ConfigurationSpaceStats } from '../../types';

interface ConfigurationSpaceLegendProps {
  stats: ConfigurationSpaceStats;
  isDemoMode?: boolean;
}

export const ConfigurationSpaceLegend: React.FC<ConfigurationSpaceLegendProps> = ({
  stats,
  isDemoMode = false,
}) => {
  const items = [
    { label: 'Selected', count: stats.selected, dotColor: 'bg-[#7562E8]' },
    { label: 'Feasible', count: stats.feasible, dotColor: 'bg-[#2563EB]' },
    { label: 'Evaluating', count: stats.evaluating, dotColor: 'bg-[#D97706]' },
    { label: 'Unprofiled', count: stats.unprofiled, dotColor: 'bg-[#8A94A6]' },
    { label: 'Rejected', count: stats.rejected, dotColor: 'bg-[#DC2626]' },
  ];

  return (
    <div className="w-[200px] p-3.5 rounded-lg glass-floating select-none">
      <div className="flex items-center justify-between mb-2.5 pb-1.5 border-b border-[#E6EAF0]">
        <h4 className="text-[12.5px] font-semibold text-[#222938] tracking-tight">
          Configuration Space
        </h4>
        {isDemoMode && (
          <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded-sm bg-[#F8F9FB] text-[#647187] border border-[#D9DEE7]">
            DEMO
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between text-[12px] text-[#647187]"
          >
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${item.dotColor}`} />
              <span className="font-medium text-[#222938]">{item.label}</span>
            </div>
            <span className="font-mono font-semibold text-[#222938] tabular-nums">
              {item.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};