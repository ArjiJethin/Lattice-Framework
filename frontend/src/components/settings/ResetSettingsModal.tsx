import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200/80 flex items-center justify-center text-rose-600 shadow-2xs">
            <AlertTriangle className="w-6 h-6 stroke-[1.8]" />
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Title & Warning */}
        <div>
          <h3 className="text-base font-black text-[#18213B] tracking-tight">
            Reset All Preferences to Defaults?
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
            This action will restore all local application settings (API URL, runtime preferences,
            experiment defaults, and UI appearance) to factory defaults.
          </p>
        </div>

        {/* What is and isn't affected */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 space-y-1.5">
          <div className="font-bold text-[#18213B] mb-1">Data Safety Assurance:</div>
          <div className="flex items-center gap-1.5 text-emerald-700">
            <span>✓</span>
            <span>Downloaded model files will NOT be deleted</span>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-700">
            <span>✓</span>
            <span>Recorded benchmark history and experiments are preserved</span>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-700">
            <span>✓</span>
            <span>Database journals and optimization profiles remain intact</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirmReset();
              onClose();
            }}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition-all cursor-pointer"
          >
            Confirm Reset
          </button>
        </div>
      </div>
    </div>
  );
};
