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
    { label: 'Selected', count: stats.selected, dotColor: 'bg-[#8174F5]' },
    { label: 'Feasible', count: stats.feasible, dotColor: 'bg-[#5598F7]' },
    { label: 'Evaluating', count: stats.evaluating, dotColor: 'bg-[#A78BFA]' },
    { label: 'Unprofiled', count: stats.unprofiled, dotColor: 'bg-[#CBD5E1]' },
    { label: 'Rejected', count: stats.rejected, dotColor: 'bg-[#F87171]' },
  ];

  return (
    <div className="w-48 p-3.5 rounded-2xl glass-floating select-none">
      <div className="flex items-center justify-between mb-2.5">
        <h4 className="text-[12px] font-semibold text-[#18213B] tracking-tight">
          Configuration Space
        </h4>
        {isDemoMode && (
          <span className="text-[9px] font-mono font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
            DEMO
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between text-xs text-slate-600 hover:text-[#18213B] transition-colors py-0.5"
          >
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${item.dotColor}`} />
              <span className="text-[12px]">{item.label}</span>
            </div>
            <span className="text-[12px] font-semibold text-[#18213B] font-mono">
              {item.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
