import React from 'react';
import { Palette } from 'lucide-react';
import { AppearanceSettings } from '../../types/settings';
import { Select, Switch } from '../ui/primitives';

interface AppearancePreferencesCardProps {
  settings: AppearanceSettings;
  onChangeSettings: (updated: Partial<AppearanceSettings>) => void;
}

export const AppearancePreferencesCard: React.FC<AppearancePreferencesCardProps> = ({
  settings,
  onChangeSettings,
}) => {
  return (
    <div className="w-full bg-white rounded-lg border border-[#D9DEE7] shadow-2xs p-4 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-[#E6EAF0]">
        <div className="w-9 h-9 rounded-md bg-[#F8F9FB] border border-[#D9DEE7] flex items-center justify-center text-[#7562E8] shrink-0">
          <Palette className="w-4 h-4 stroke-[1.9]" />
        </div>
        <div>
          <h2 className="text-[14.5px] font-semibold text-[#222938] tracking-tight">
            Appearance &amp; Preferences
          </h2>
          <p className="text-[12px] text-[#647187]">
            Customize workspace presentation, pagination density, and UI behavior.
          </p>
        </div>
      </div>

      {/* Row 1: Theme, Results per Page, Default View */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-medium text-[#222938]">Theme</label>
          <Select
            value={settings.theme}
            onChange={(e) =>
              onChangeSettings({
                theme: e.target.value as AppearanceSettings['theme'],
              })
            }
          >
            <option value="light">Light Engineering (Default)</option>
            <option value="dark" disabled>
              Dark Theme (Unavailable in v0.1)
            </option>
          </Select>
          <span className="text-[11px] text-[#647187]">
            High-contrast light palette active
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-medium text-[#222938]">
            Results per Page
          </label>
          <Select
            value={settings.resultsPerPage}
            onChange={(e) =>
              onChangeSettings({
                resultsPerPage: parseInt(e.target.value, 10) || 10,
              })
            }
          >
            <option value="10">10 rows</option>
            <option value="25">25 rows</option>
            <option value="50">50 rows</option>
            <option value="100">100 rows</option>
          </Select>
          <span className="text-[11px] text-[#647187]">
            Default pagination limit in tables
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-medium text-[#222938]">
            Default Startup View
          </label>
          <Select
            value={settings.defaultView}
            onChange={(e) =>
              onChangeSettings({
                defaultView: e.target.value as AppearanceSettings['defaultView'],
              })
            }
          >
            <option value="overview">Overview</option>
            <option value="model-lab">Model Lab</option>
            <option value="optimization-lab">Optimization Lab</option>
            <option value="experiments">Experiments</option>
          </Select>
          <span className="text-[11px] text-[#647187]">
            Initial workspace opened on launch
          </span>
        </div>
      </div>

      {/* Row 2: 3 Toggles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-[#E6EAF0]">
        <div className="p-3 rounded-md bg-[#F8F9FB] border border-[#E6EAF0]">
          <Switch
            id="pref-tooltips"
            checked={settings.showTooltips}
            onCheckedChange={(checked) =>
              onChangeSettings({ showTooltips: checked })
            }
            label="Show Tooltips"
            description="Display technical metric explanations"
          />
        </div>

        <div className="p-3 rounded-md bg-[#F8F9FB] border border-[#E6EAF0]">
          <Switch
            id="pref-animations"
            checked={settings.animations}
            onCheckedChange={(checked) =>
              onChangeSettings({ animations: checked })
            }
            label="Animations"
            description="Enable 3D crystal & chart transitions"
          />
        </div>

        <div className="p-3 rounded-md bg-[#F8F9FB] border border-[#E6EAF0]">
          <Switch
            id="pref-telemetry"
            checked={settings.telemetry}
            onCheckedChange={(checked) =>
              onChangeSettings({ telemetry: checked })
            }
            label="Anonymous Telemetry"
            description="Share opt-in crash & performance stats"
          />
        </div>
      </div>
    </div>
  );
};