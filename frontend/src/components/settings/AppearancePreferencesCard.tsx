import React from 'react';
import { Palette, ChevronDown } from 'lucide-react';
import { AppearanceSettings } from '../../types/settings';

interface AppearancePreferencesCardProps {
  settings: AppearanceSettings;
  onChangeSettings: (updated: Partial<AppearanceSettings>) => void;
}

export const AppearancePreferencesCard: React.FC<AppearancePreferencesCardProps> = ({
  settings,
  onChangeSettings,
}) => {
  return (
    <div className="w-full bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-xs p-5 transition-all flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
        <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200/80 flex items-center justify-center text-[#7C6AF2] shadow-2xs shrink-0">
          <Palette className="w-5 h-5 stroke-[1.9]" />
        </div>
        <div>
          <h2 className="text-sm font-black text-[#18213B] tracking-tight">
            Appearance &amp; Preferences
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Customize the look and behavior of Lattice.
          </p>
        </div>
      </div>

      {/* Row 1: Theme, Results per Page, Default View */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Theme */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-[#18213B]">Theme</label>
          <div className="relative">
            <select
              value={settings.theme}
              onChange={(e) =>
                onChangeSettings({ theme: e.target.value as AppearanceSettings['theme'] })
              }
              className="w-full appearance-none bg-white border border-slate-200 rounded-xl px-3 py-2 pr-8 text-xs font-bold text-[#18213B] shadow-2xs hover:border-slate-300 focus:outline-none focus:border-[#7C6AF2] transition-colors cursor-pointer"
            >
              <option value="light">Light (Default)</option>
              <option value="dark" disabled>
                Dark (Coming Soon)
              </option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            Application theme
          </span>
        </div>

        {/* Results per Page */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-[#18213B]">Results per Page</label>
          <div className="relative">
            <select
              value={settings.resultsPerPage}
              onChange={(e) =>
                onChangeSettings({ resultsPerPage: parseInt(e.target.value, 10) || 10 })
              }
              className="w-full appearance-none bg-white border border-slate-200 rounded-xl px-3 py-2 pr-8 text-xs font-bold text-[#18213B] shadow-2xs hover:border-slate-300 focus:outline-none focus:border-[#7C6AF2] transition-colors cursor-pointer"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            Number of items in tables
          </span>
        </div>

        {/* Default View */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-[#18213B]">Default View</label>
          <div className="relative">
            <select
              value={settings.defaultView}
              onChange={(e) =>
                onChangeSettings({
                  defaultView: e.target.value as AppearanceSettings['defaultView'],
                })
              }
              className="w-full appearance-none bg-white border border-slate-200 rounded-xl px-3 py-2 pr-8 text-xs font-bold text-[#18213B] shadow-2xs hover:border-slate-300 focus:outline-none focus:border-[#7C6AF2] transition-colors cursor-pointer"
            >
              <option value="overview">Overview</option>
              <option value="model-lab">Model Lab</option>
              <option value="optimization-lab">Optimization Lab</option>
              <option value="experiments">Experiments</option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            Page to open on startup
          </span>
        </div>
      </div>

      {/* Row 2: 3 Toggles matching screenshot */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
        {/* Toggle: Show Tooltips */}
        <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-50/60 border border-slate-100">
          <div>
            <div className="text-xs font-bold text-[#18213B]">Show Tooltips</div>
            <div className="text-[10.5px] text-slate-500 font-medium">
              Show helpful tooltips throughout the app
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.showTooltips}
            onClick={() =>
              onChangeSettings({ showTooltips: !settings.showTooltips })
            }
            className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
              settings.showTooltips ? 'bg-[#7C6AF2]' : 'bg-slate-300'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                settings.showTooltips ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Toggle: Animations */}
        <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-50/60 border border-slate-100">
          <div>
            <div className="text-xs font-bold text-[#18213B]">Animations</div>
            <div className="text-[10.5px] text-slate-500 font-medium">
              Enable UI animations
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.animations}
            onClick={() =>
              onChangeSettings({ animations: !settings.animations })
            }
            className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
              settings.animations ? 'bg-[#7C6AF2]' : 'bg-slate-300'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                settings.animations ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Toggle: Telemetry */}
        <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-50/60 border border-slate-100">
          <div>
            <div className="text-xs font-bold text-[#18213B]">Telemetry (Optional)</div>
            <div className="text-[10.5px] text-slate-500 font-medium">
              Help improve Lattice by sharing anonymous usage data
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.telemetry}
            onClick={() =>
              onChangeSettings({ telemetry: !settings.telemetry })
            }
            className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
              settings.telemetry ? 'bg-[#7C6AF2]' : 'bg-slate-300'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                settings.telemetry ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
};
