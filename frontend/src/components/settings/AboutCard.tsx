import React from 'react';
import {
  Info,
  Box,
  Github,
  BookOpen,
  Bug,
  Award,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';

interface AboutCardProps {
  onOpenCredits: () => void;
  onOpenResetModal: () => void;
}

export const AboutCard: React.FC<AboutCardProps> = ({
  onOpenCredits,
  onOpenResetModal,
}) => {
  return (
    <div className="w-full bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-xs p-5 transition-all flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
        <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200/80 flex items-center justify-center text-[#7C6AF2] shadow-2xs shrink-0">
          <Info className="w-5 h-5 stroke-[1.9]" />
        </div>
        <div>
          <h2 className="text-sm font-black text-[#18213B] tracking-tight">
            About
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Version and licensing information.
          </p>
        </div>
      </div>

      {/* App Branding Box */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-br from-purple-50/50 via-white to-indigo-50/40 border border-purple-100/90 flex flex-col gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white border border-slate-200/90 shadow-sm flex items-center justify-center text-[#7C6AF2] shrink-0">
            <Box className="w-5 h-5 stroke-[1.8]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-[#18213B] tracking-tight">
                Lattice Framework
              </h3>
            </div>
            <span className="text-[11px] font-bold text-[#7C6AF2] block mt-0.5">
              v0.1.0 (Research Preview)
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-500 font-medium leading-relaxed">
          An optimization framework for LLM inference in resource-constrained environments.
        </p>

        {/* Quick External Links */}
        <div className="flex items-center gap-4 text-xs font-bold text-slate-600 pt-1 border-t border-purple-100/60">
          <a
            href="https://github.com/ArjiJethin/Lattice-Framework"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 hover:text-[#7C6AF2] transition-colors"
          >
            <Github className="w-3.5 h-3.5" />
            <span>GitHub</span>
          </a>

          <a
            href="https://github.com/ArjiJethin/Lattice-Framework#readme"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 hover:text-[#7C6AF2] transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Documentation</span>
          </a>

          <a
            href="https://github.com/ArjiJethin/Lattice-Framework/issues"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 hover:text-[#7C6AF2] transition-colors"
          >
            <Bug className="w-3.5 h-3.5" />
            <span>Report Issue</span>
          </a>
        </div>
      </div>

      {/* Metadata Rows */}
      <div className="flex flex-col divide-y divide-slate-100 text-xs">
        {/* License */}
        <div className="py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-500 font-medium">
            <Award className="w-3.5 h-3.5 text-slate-400" />
            <span>License</span>
          </div>
          <span className="font-bold text-[#18213B]">Research Use Only</span>
        </div>

        {/* Acknowledgements */}
        <div className="py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-500 font-medium">
            <Award className="w-3.5 h-3.5 text-purple-500" />
            <span>Acknowledgements</span>
          </div>
          <button
            type="button"
            onClick={onOpenCredits}
            className="text-xs font-bold text-[#7C6AF2] hover:text-[#6853EA] transition-colors cursor-pointer"
          >
            View Credits
          </button>
        </div>

        {/* Check for Updates */}
        <div className="py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-500 font-medium">
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
            <span>Check for Updates</span>
          </div>
          <span className="font-bold text-slate-400">Not Available</span>
        </div>
      </div>

      {/* Reset Settings Action matching screenshot */}
      <div className="p-3.5 rounded-2xl bg-rose-50/50 border border-rose-200/70 flex items-center justify-between gap-3 mt-1">
        <div>
          <div className="text-xs font-black text-rose-900 flex items-center gap-1.5">
            <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
            <span>Reset All Settings</span>
          </div>
          <div className="text-[10.5px] text-rose-700 font-medium mt-0.5">
            Restore default settings and clear local preferences
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenResetModal}
          className="px-3.5 py-1.5 rounded-xl border border-rose-300 bg-white hover:bg-rose-50 text-rose-700 text-xs font-bold transition-all shadow-2xs hover:shadow-xs cursor-pointer shrink-0"
        >
          Reset
        </button>
      </div>
    </div>
  );
};
