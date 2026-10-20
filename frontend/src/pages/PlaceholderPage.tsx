import React from 'react';
import { Layers, SlidersHorizontal, FlaskConical, Settings, ArrowLeft } from 'lucide-react';
import { NavItemKey } from '../components/layout/Sidebar';

interface PlaceholderPageProps {
  navKey: NavItemKey;
  onBackToOverview: () => void;
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({
  navKey,
  onBackToOverview,
}) => {
  const getPageInfo = () => {
    switch (navKey) {
      case 'model-lab':
        return {
          title: 'Model Lab',
          icon: Layers,
          description: 'Model quantization profiles, GGUF conversion inspection, and memory footprint management.',
          phase: 'Phase 2',
        };
      case 'optimization-lab':
        return {
          title: 'Optimization Lab',
          icon: SlidersHorizontal,
          description: 'Multi-objective search algorithms, constraint solvers, and batch scheduling.',
          phase: 'Phase 3',
        };
      case 'experiments':
        return {
          title: 'Experiments Registry',
          icon: FlaskConical,
          description: 'Detailed benchmark execution logs, raw token metrics, and run comparisons.',
          phase: 'Phase 4',
        };
      case 'settings':
        return {
          title: 'Settings & Runtime',
          icon: Settings,
          description: 'Hardware acceleration flags, llama.cpp binary paths, and backend API endpoints.',
          phase: 'Phase 1',
        };
      default:
        return {
          title: 'Module Workspace',
          icon: Layers,
          description: 'Under development.',
          phase: 'Upcoming',
        };
    }
  };

  const info = getPageInfo();
  const Icon = info.icon;

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 select-none">
      <div className="max-w-md w-full p-8 rounded-3xl bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-card text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#EEEBFF] text-[#8174F5] flex items-center justify-center mx-auto mb-4 border border-[#8174F5]/10 shadow-sm">
          <Icon className="w-7 h-7 stroke-[1.8]" />
        </div>
        <div className="inline-block px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold tracking-wider uppercase mb-2">
          {info.phase} Scope
        </div>
        <h2 className="text-xl font-bold text-[#18213B] tracking-tight mb-2">
          {info.title}
        </h2>
        <p className="text-xs text-slate-500 leading-relaxed mb-6">
          {info.description}
        </p>
        <button
          onClick={onBackToOverview}
          className="w-full py-2.5 px-4 rounded-xl bg-[#8174F5] hover:bg-[#7162F3] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to System Overview</span>
        </button>
      </div>
    </div>
  );
};
