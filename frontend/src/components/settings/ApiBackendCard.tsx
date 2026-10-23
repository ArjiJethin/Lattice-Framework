import React, { useState } from 'react';
import {
  Plug,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Activity,
} from 'lucide-react';
import { ApiBackendSettings } from '../../types/settings';
import { testBackendApiConnection } from '../../lib/settings/settingsService';
import {
  Button,
  Input,
  Switch,
  StatusBadge,
} from '../ui/primitives';

interface ApiBackendCardProps {
  settings: ApiBackendSettings;
  onChangeSettings: (updated: Partial<ApiBackendSettings>) => void;
  isBackendConnected: boolean;
  onRefreshBackend: () => Promise<void>;
  onToggleDemoMode: () => void;
}

export const ApiBackendCard: React.FC<ApiBackendCardProps> = ({
  settings,
  onChangeSettings,
  isBackendConnected,
  onRefreshBackend,
  onToggleDemoMode,
}) => {
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChangeSettings({ apiBaseUrl: e.target.value });
    setTestResult(null);
  };

  const handleResetUrl = () => {
    onChangeSettings({ apiBaseUrl: 'http://127.0.0.1:8000/api/v1' });
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    const result = await testBackendApiConnection(settings.apiBaseUrl);

    onChangeSettings({ lastCheckedTime: result.timestamp });

    if (result.ok) {
      setTestResult({
        ok: true,
        message: `Health probe succeeded (HTTP ${result.status} · ${result.latencyMs} ms)`,
      });
      await onRefreshBackend();
    } else {
      setTestResult({
        ok: false,
        message: result.error || 'Backend health probe failed',
      });
    }

    setIsTesting(false);
  };

  return (
    <div className="w-full bg-white rounded-lg border border-[#D9DEE7] shadow-2xs p-4 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E6EAF0] flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-[#F8F9FB] border border-[#D9DEE7] flex items-center justify-center text-[#7562E8] shrink-0">
            <Plug className="w-4 h-4 stroke-[1.9]" />
          </div>
          <div>
            <h2 className="text-[14.5px] font-semibold text-[#222938] tracking-tight">
              API &amp; Backend Connection
            </h2>
            <p className="text-[12px] text-[#647187]">
              Configure the FastAPI server endpoint and fallback behavior.
            </p>
          </div>
        </div>

        <StatusBadge tone={isBackendConnected ? 'success' : 'warning'}>
          {isBackendConnected ? 'Live Server Online' : 'Offline · Demo Fixture Active'}
        </StatusBadge>
      </div>

      {/* Row 1: URL Input and Status + Test Button */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
        {/* Left: API Base URL (Col 7) */}
        <div className="md:col-span-7 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[12px] font-medium text-[#222938]">
              API Base URL
            </label>
            <span className="text-[10.5px] font-mono text-[#647187]">
              REST v1 Endpoint
            </span>
          </div>

          <Input
            type="text"
            mono
            value={settings.apiBaseUrl}
            onChange={handleUrlChange}
            placeholder="http://127.0.0.1:8000/api/v1"
            rightElement={
              <button
                type="button"
                onClick={handleResetUrl}
                aria-label="Reset to default URL"
                title="Reset to default URL (http://127.0.0.1:8000/api/v1)"
                className="p-1 rounded-sm text-[#647187] hover:text-[#7562E8] hover:bg-[#F8F9FB] transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            }
          />
          <span className="text-[11px] text-[#647187]">
            Base endpoint probed via <span className="font-mono">/health</span> and{' '}
            <span className="font-mono">/system/status</span>
          </span>
        </div>

        {/* Right: Connection Status & Test Button (Col 5) */}
        <div className="md:col-span-5 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[12px] font-medium text-[#222938]">
              Connection Probe
            </label>
            <span className="text-[10.5px] font-mono text-[#647187] tabular-nums">
              {settings.lastCheckedTime || 'Not tested'}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 h-8">
            <div className="flex items-center gap-2 px-2.5 h-full rounded-md bg-[#F8F9FB] border border-[#D9DEE7] flex-1 min-w-0">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${isBackendConnected ? 'bg-[#0D8A58]' : 'bg-[#DC2626]'
                  }`}
              />
              <span className="text-[12px] font-semibold text-[#222938] truncate">
                {isBackendConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleTestConnection}
              isLoading={isTesting}
              leftIcon={<Activity className="w-3.5 h-3.5 text-[#7562E8]" />}
            >
              {isTesting ? 'Probing...' : 'Test Connection'}
            </Button>
          </div>

          <span className="text-[11px] text-[#647187] truncate">
            Timeout threshold: <span className="font-mono">3000 ms</span>
          </span>
        </div>
      </div>

      {/* Test feedback banner */}
      {testResult && (
        <div
          className={`p-2.5 rounded-md text-[12px] flex items-center justify-between gap-2 border ${testResult.ok
              ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#0D8A58]'
              : 'bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]'
            }`}
        >
          <div className="flex items-center gap-2">
            {testResult.ok ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span className="font-medium font-mono text-[11.5px]">
              {testResult.message}
            </span>
          </div>
          <span className="text-[10.5px] font-mono opacity-80 shrink-0">
            {settings.apiBaseUrl}
          </span>
        </div>
      )}

      {/* Row 2: Toggles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-[#E6EAF0]">
        <div className="p-3 rounded-md bg-[#F8F9FB] border border-[#E6EAF0]">
          <Switch
            id="switch-demo-mode"
            checked={settings.useDemoMode}
            onCheckedChange={(checked) => {
              onChangeSettings({ useDemoMode: checked });
              onToggleDemoMode();
            }}
            label="Use Demo Mode"
            description="Force deterministic fixture profiles when backend is offline"
          />
        </div>

        <div className="p-3 rounded-md bg-[#F8F9FB] border border-[#E6EAF0]">
          <Switch
            id="switch-auto-reconnect"
            checked={settings.autoReconnect}
            onCheckedChange={(checked) =>
              onChangeSettings({ autoReconnect: checked })
            }
            label="Auto Reconnect"
            description="Poll backend health every 20s and restore live telemetry"
          />
        </div>
      </div>
    </div>
  );
};