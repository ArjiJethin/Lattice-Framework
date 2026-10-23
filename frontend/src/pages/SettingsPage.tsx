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
  const [settings, setSettings] = useState<LatticeSettings>(() => loadLatticeSettings());

  const [systemInfo, setSystemInfo] = useState<SystemInfoData>(() =>
    detectSystemHardware(backendState.connected)
  );
  const [isRefreshingHardware, setIsRefreshingHardware] = useState(false);

  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isCreditsModalOpen, setIsCreditsModalOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    setSystemInfo(detectSystemHardware(backendState.connected));
  }, [backendState.connected]);

  const handleRefreshHardware = useCallback(() => {
    setIsRefreshingHardware(true);
    setTimeout(() => {
      setSystemInfo(detectSystemHardware(backendState.connected));
      setIsRefreshingHardware(false);
      setNotification('System hardware and client environment telemetry refreshed.');
    }, 350);
  }, [backendState.connected]);

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

  const handleConfirmReset = useCallback(() => {
    const defaulted = resetLatticeSettings();
    setSettings(defaulted);
    setNotification('All preferences have been restored to factory defaults.');
  }, []);

  return (
    <div className="flex-1 w-full p-4 lg:p-6 flex flex-col gap-4 max-w-[1600px] mx-auto select-none pb-16">
      {/* 1. Header */}
      <SettingsHeader
        stats={summaryStats}
        backendState={backendState}
        onRefreshConnection={onRefreshConnection}
        onBackToOverview={() => onNavigate('overview')}
      />

      {/* Notification Banner */}
      {notification && (
        <div className="p-3 rounded-lg bg-[#ECFDF5] border border-[#A7F3D0] text-[#0D8A58] text-[12px] font-medium flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#0D8A58] shrink-0" />
            <span>{notification}</span>
          </div>
          <button
            type="button"
            aria-label="Dismiss Notification"
            onClick={() => setNotification(null)}
            className="text-[#0D8A58] hover:text-[#065F46] p-0.5 rounded-sm cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Main 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column: API, Runtime, Experiment Defaults, Appearance (Col 8) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <ApiBackendCard
            settings={settings.api}
            onChangeSettings={handleUpdateApiSettings}
            isBackendConnected={backendState.connected}
            onRefreshBackend={onRefreshConnection}
            onToggleDemoMode={onToggleDemoMode}
          />

          <InferenceRuntimeCard
            settings={settings.runtime}
            onChangeSettings={handleUpdateRuntimeSettings}
          />

          <ExperimentDefaultsCard
            settings={settings.experiments}
            onChangeSettings={handleUpdateExperimentSettings}
          />

          <AppearancePreferencesCard
            settings={settings.appearance}
            onChangeSettings={handleUpdateAppearanceSettings}
          />
        </div>

        {/* Right Column: System Information, Data & Storage, About (Col 4) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <SystemInformationCard
            systemInfo={systemInfo}
            onRefresh={handleRefreshHardware}
            isRefreshing={isRefreshingHardware}
          />

          <DataStorageCard
            settings={settings.storage}
            onChangeSettings={handleUpdateStorageSettings}
          />

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