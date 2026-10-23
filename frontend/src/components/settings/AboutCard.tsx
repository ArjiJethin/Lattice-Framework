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
import { Button, StatusBadge } from '../ui/primitives';

interface AboutCardProps {
  onOpenCredits: () => void;
  onOpenResetModal: () => void;
}

export const AboutCard: React.FC<AboutCardProps> = ({
  onOpenCredits,
  onOpenResetModal,
}) => {
  return (
    <div className="w-full bg-white rounded-lg border border-[#D9DEE7] shadow-2xs p-4 flex flex-col gap-3.5">
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-[#E6EAF0]">
        <div className="w-9 h-9 rounded-md bg-[#F8F9FB] border border-[#D9DEE7] flex items-center justify-center text-[#7562E8] shrink-0">
          <Info className="w-4 h-4 stroke-[1.9]" />
        </div>
        <div>
          <h2 className="text-[14.5px] font-semibold text-[#222938] tracking-tight">
            About Lattice
          </h2>
          <p className="text-[12px] text-[#647187]">
            Version metadata, documentation links, and preference reset.
          </p>
        </div>
      </div>

      {/* App Branding Box */}
      <div className="p-3.5 rounded-md bg-[#F8F9FB] border border-[#D9DEE7] flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-white border border-[#D9DEE7] flex items-center justify-center text-[#7562E8] shrink-0">
              <Box className="w-4 h-4 stroke-[1.8]" />
            </div>
            <div>
              <h3 className="text-[13.5px] font-semibold text-[#222938] leading-tight">
                Lattice Framework
              </h3>
              <span className="text-[11px] font-mono text-[#7562E8] block mt-0.5">
                v0.1.0 · Research Preview
              </span>
            </div>
          </div>

          <StatusBadge tone="neutral" dot={false}>
            Desktop / Web
          </StatusBadge>
        </div>

        <p className="text-[12px] text-[#647187] leading-relaxed">
          Hardware-aware LLM quantization and multi-objective Pareto optimization workspace for resource-constrained environments.
        </p>

        {/* Quick External Links */}
        <div className="flex items-center gap-4 text-[11.5px] font-semibold text-[#222938] pt-2 border-t border-[#E6EAF0]">
          <a
            href="https://github.com/ArjiJethin/Lattice-Framework"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 hover:text-[#7562E8] transition-colors"
          >
            <Github className="w-3.5 h-3.5 text-[#647187]" />
            <span>GitHub</span>
          </a>

          <a
            href="https://github.com/ArjiJethin/Lattice-Framework#readme"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 hover:text-[#7562E8] transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5 text-[#647187]" />
            <span>Documentation</span>
          </a>

          <a
            href="https://github.com/ArjiJethin/Lattice-Framework/issues"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 hover:text-[#7562E8] transition-colors"
          >
            <Bug className="w-3.5 h-3.5 text-[#647187]" />
            <span>Report Issue</span>
          </a>
        </div>
      </div>

      {/* Metadata Rows */}
      <div className="flex flex-col divide-y divide-[#E6EAF0] text-[12px]">
        <div className="py-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#647187]">
            <Award className="w-3.5 h-3.5" />
            <span>License</span>
          </div>
          <span className="font-semibold text-[#222938]">Research Use Only</span>
        </div>

        <div className="py-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#647187]">
            <Award className="w-3.5 h-3.5 text-[#7562E8]" />
            <span>Acknowledgements</span>
          </div>
          <button
            type="button"
            onClick={onOpenCredits}
            className="text-[12px] font-semibold text-[#7562E8] hover:text-[#634FDB] transition-colors cursor-pointer"
          >
            View Credits
          </button>
        </div>

        <div className="py-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#647187]">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Update Channel</span>
          </div>
          <span className="font-mono text-[11px] text-[#8A94A6]">
            Manual Build (v0.1.0)
          </span>
        </div>
      </div>

      {/* Destructive Reset Settings Action */}
      <div className="p-3 rounded-md bg-[#FEF2F2]/60 border border-[#FECACA] flex items-center justify-between gap-3">
        <div>
          <div className="text-[12.5px] font-semibold text-[#991B1B] flex items-center gap-1.5">
            <RotateCcw className="w-3.5 h-3.5 text-[#DC2626]" />
            <span>Reset All Settings</span>
          </div>
          <div className="text-[11px] text-[#DC2626] mt-0.5">
            Restore factory defaults and clear local preferences
          </div>
        </div>

        <Button
          variant="destructive"
          size="sm"
          onClick={onOpenResetModal}
        >
          Reset
        </Button>
      </div>
    </div>
  );
};