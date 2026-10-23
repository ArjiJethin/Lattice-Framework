import React, { useEffect } from 'react';
import { AlertTriangle, RotateCcw, X } from 'lucide-react';
import { Button } from '../ui/primitives';

interface ResetSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmReset: () => void;
}

export const ResetSettingsModal: React.FC<ResetSettingsModalProps> = ({
  isOpen,
  onClose,
  onConfirmReset,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#222938]/40 backdrop-blur-xs select-none"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reset-settings-modal-title"
        aria-describedby="reset-settings-modal-description"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-lg border border-[#D9DEE7] shadow-glass p-5 flex flex-col gap-4"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="w-9 h-9 rounded-md bg-[#FEF2F2] border border-[#FECACA] flex items-center justify-center text-[#DC2626] shrink-0">
            <AlertTriangle className="w-4 h-4 stroke-[1.9]" />
          </div>
          <button
            type="button"
            aria-label="Close Reset Settings Modal"
            onClick={onClose}
            className="h-7 w-7 rounded-sm flex items-center justify-center text-[#647187] hover:text-[#222938] hover:bg-[#F8F9FB] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Title & Warning */}
        <div>
          <h3
            id="reset-settings-modal-title"
            className="text-[15px] font-semibold text-[#222938] tracking-tight"
          >
            Reset All Preferences to Defaults?
          </h3>
          <p
            id="reset-settings-modal-description"
            className="text-[12px] text-[#647187] mt-1 leading-relaxed"
          >
            This action clears your saved preferences in local storage and restores
            factory defaults across all Settings sections.
          </p>
        </div>

        {/* Scope of Reset */}
        <div className="p-3 rounded-md bg-[#F8F9FB] border border-[#D9DEE7] text-[11.5px] space-y-2">
          <div>
            <div className="font-semibold text-[#222938] mb-1">
              Restored to factory defaults:
            </div>
            <ul className="space-y-1 text-[#647187] list-disc list-inside">
              <li>API Base URL (<span className="font-mono text-[11px] text-[#222938]">http://127.0.0.1:8000/api/v1</span>) &amp; connection toggles</li>
              <li>Inference runtime adapter, context length, device &amp; thread settings</li>
              <li>Experiment workload defaults, token budgets &amp; metric selections</li>
              <li>Appearance preferences &amp; configured storage directory paths</li>
            </ul>
          </div>

          <div className="pt-2 border-t border-[#E6EAF0] text-[#647187]">
            <span className="font-semibold text-[#222938]">Not affected: </span>
            Model catalog entries, 3D archetype/palette registrations, and active session
            state in other workspaces remain unchanged.
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E6EAF0]">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="dangerSolid"
            size="sm"
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            onClick={() => {
              onConfirmReset();
              onClose();
            }}
          >
            Confirm Reset
          </Button>
        </div>
      </div>
    </div>
  );
};