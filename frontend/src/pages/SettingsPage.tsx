import React, { useState, useEffect, useCallback } from 'react';
import { SettingsHeader } from '../components/settings/SettingsHeader';
import { ApiBackendCard } from '../components/settings/ApiBackendCard';
import { InferenceRuntimeCard } from '../components/settings/InferenceRuntimeCard';
import { ExperimentDefaultsCard } from '../components/settings/ExperimentDefaultsCard';
import { AppearancePreferencesCard } from '../components/settings/AppearancePreferencesCard';
import { SystemInformationCard } from '../components/settings/SystemInformationCard';
import { DataStorageCard } from '../components/settings/DataStorageCard';
import { AboutCard } from '../components/settings/AboutCard';
import { ResetSettingsModal } from '../components/settings/ResetSettingsModal';
import { CreditsModal } from '../components/settings/CreditsModal';
import {
  LatticeSettings,
  SystemInfoData,
} from '../types/settings';
import {
  loadLatticeSettings,
  saveLatticeSettings,
  resetLatticeSettings,
  detectSystemHardware,
} from '../lib/settings/settingsService';
import { BackendConnectionState } from '../types';
import { ModelLibrarySummaryStats } from '../types/modelLibrary';
import { NavItemKey } from '../components/layout/Sidebar';
import { CheckCircle2, X } from 'lucide-react';

interface SettingsPageProps {
  summaryStats: ModelLibrarySummaryStats;
  backendState: BackendConnectionState;
  onRefreshConnection: () => Promise<void>;
  onToggleDemoMode: () => void;
  onNavigate: (key: NavItemKey) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  summaryStats,
  backendState,
  onRefreshConnection,
  onToggleDemoMode,
  onNavigate,
}) => {
  // 1. Persistent Settings State
  const [settings, setSettings] = useState<LatticeSettings>(() => loadLatticeSettings());

  // 2. System Hardware Detection
  const [systemInfo, setSystemInfo] = useState<SystemInfoData>(() =>
    detectSystemHardware(backendState.connected)
  );
  const [isRefreshingHardware, setIsRefreshingHardware] = useState(false);

  // 3. Modals and Feedback
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isCreditsModalOpen, setIsCreditsModalOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Refresh hardware detection when backendState changes
  useEffect(() => {
    setSystemInfo(detectSystemHardware(backendState.connected));
  }, [backendState.connected]);

  const handleRefreshHardware = useCallback(() => {
    setIsRefreshingHardware(true);
    setTimeout(() => {
      setSystemInfo(detectSystemHardware(backendState.connected));
      setIsRefreshingHardware(false);
      setNotification('System hardware configuration refreshed.');
    }, 600);
  }, [backendState.connected]);

  // Update specific settings section and persist
  const handleUpdateApiSettings = useCallback(
    (updated: Partial<LatticeSettings['api']>) => {
      setSettings((prev) => {
        const next: LatticeSettings = {
          ...prev,
          api: { ...prev.api, ...updated },
        };
        saveLatticeSettings(next);
        return next;
      });
    },
    []
  );

  const handleUpdateRuntimeSettings = useCallback(
    (updated: Partial<LatticeSettings['runtime']>) => {
      setSettings((prev) => {
        const next: LatticeSettings = {
          ...prev,
          runtime: { ...prev.runtime, ...updated },
        };
        saveLatticeSettings(next);
        return next;
      });
    },
    []
  );

  const handleUpdateExperimentSettings = useCallback(
    (updated: Partial<LatticeSettings['experiments']>) => {
      setSettings((prev) => {
        const next: LatticeSettings = {
          ...prev,
          experiments: { ...prev.experiments, ...updated },
        };
        saveLatticeSettings(next);
        return next;
      });
    },
    []
  );

  const handleUpdateAppearanceSettings = useCallback(
    (updated: Partial<LatticeSettings['appearance']>) => {
      setSettings((prev) => {
        const next: LatticeSettings = {
          ...prev,
          appearance: { ...prev.appearance, ...updated },
        };
        saveLatticeSettings(next);
        return next;
      });
    },
    []
  );

  const handleUpdateStorageSettings = useCallback(
    (updated: Partial<LatticeSettings['storage']>) => {
      setSettings((prev) => {
        const next: LatticeSettings = {
          ...prev,
          storage: { ...prev.storage, ...updated },
        };
        saveLatticeSettings(next);
        return next;
      });
    },
    []
  );

  // Reset all settings to factory defaults
  const handleConfirmReset = useCallback(() => {
    const defaulted = resetLatticeSettings();
    setSettings(defaulted);
    setNotification('All settings have been successfully restored to factory defaults.');
  }, []);

  return (
    <div className="min-h-full flex flex-col p-4 md:p-6 gap-5 max-w-[1720px] mx-auto w-full select-none">
      {/* 1. Header */}
      <SettingsHeader
        stats={summaryStats}
        backendState={backendState}
        onRefreshConnection={onRefreshConnection}
        onBackToOverview={() => onNavigate('overview')}
      />

      {/* Notification Toast Banner */}
      {notification && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between gap-3 shadow-2xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{notification}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-emerald-700 hover:text-emerald-900 p-0.5 rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Main 2-Column Responsive Layout matching reference screenshot */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: API, Runtime, Experiment Defaults, Appearance (Col 8) */}
        <div className="lg:col-span-8 flex flex-col gap-5">
          {/* Section 1: API & Backend */}
          <ApiBackendCard
            settings={settings.api}
            onChangeSettings={handleUpdateApiSettings}
            isBackendConnected={backendState.connected}
            onRefreshBackend={onRefreshConnection}
            onToggleDemoMode={onToggleDemoMode}
          />

          {/* Section 2: Inference & Runtime */}
          <InferenceRuntimeCard
            settings={settings.runtime}
            onChangeSettings={handleUpdateRuntimeSettings}
          />

          {/* Section 3: Experiment Settings */}
          <ExperimentDefaultsCard
            settings={settings.experiments}
            onChangeSettings={handleUpdateExperimentSettings}
          />

          {/* Section 4: Appearance & Preferences */}
          <AppearancePreferencesCard
            settings={settings.appearance}
            onChangeSettings={handleUpdateAppearanceSettings}
          />
        </div>

        {/* Right Column: System Information, Data & Storage, About (Col 4) */}
        <div className="lg:col-span-4 flex flex-col gap-5">
          {/* Section 5: System Information */}
          <SystemInformationCard
            systemInfo={systemInfo}
            onRefresh={handleRefreshHardware}
            isRefreshing={isRefreshingHardware}
          />

          {/* Section 6: Data & Storage */}
          <DataStorageCard
            settings={settings.storage}
            onChangeSettings={handleUpdateStorageSettings}
          />

          {/* Section 7: About & Reset */}
          <AboutCard
            onOpenCredits={() => setIsCreditsModalOpen(true)}
            onOpenResetModal={() => setIsResetModalOpen(true)}
          />
        </div>
      </div>

      {/* 3. Modals */}
      <ResetSettingsModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirmReset={handleConfirmReset}
      />

      <CreditsModal
        isOpen={isCreditsModalOpen}
        onClose={() => setIsCreditsModalOpen(false)}
      />
    </div>
  );
};
