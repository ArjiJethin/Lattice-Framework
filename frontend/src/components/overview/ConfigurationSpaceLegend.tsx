import React from 'react';
import { ConfigurationSpaceStats } from '../../types';

interface ConfigurationSpaceLegendProps {
  stats: ConfigurationSpaceStats;
  isDemoMode?: boolean;
}

export const ConfigurationSpaceLegend: React.FC<ConfigurationSpaceLegendProps> = ({
  stats,
}) => {
  const items = [
    { label: 'Selected', count: stats.selected, dotColor: 'bg-[#7C6AF2]' },
    { label: 'Feasible', count: stats.feasible, dotColor: 'bg-[#3B82F6]' },
    { label: 'Evaluating', count: stats.evaluating, dotColor: 'bg-[#CBD5E1]' },
    { label: 'Unprofiled', count: stats.unprofiled, dotColor: 'bg-[#CBD5E1]' },
    { label: 'Rejected', count: stats.rejected, dotColor: 'bg-[#F87171]' },
  ];

  return (
    <div className="w-[195px] p-3.5 rounded-[20px] bg-white/80 backdrop-blur-xl border border-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] select-none">
      <h4 className="text-[13px] font-bold text-[#18213B] tracking-tight mb-2.5">
        Configuration Space
      </h4>

      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between text-[12px] text-slate-600"
          >
            <div className="flex items-center gap-2.5">
              <span className={`w-2.5 h-2.5 rounded-full ${item.dotColor}`} />
              <span className="font-medium">{item.label}</span>
            </div>
            <span className="font-semibold text-slate-700">
              {item.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};