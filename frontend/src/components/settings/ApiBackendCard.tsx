import React, { useState } from 'react';
import {
  Plug,
  RotateCcw,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { ApiBackendSettings } from '../../types/settings';
import { testBackendApiConnection } from '../../lib/settings/settingsService';

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
        message: `Connected successfully (${result.latencyMs} ms)`,
      });
      await onRefreshBackend();
    } else {
      setTestResult({
        ok: false,
        message: result.error || 'Connection failed',
      });
    }

    setIsTesting(false);
  };

  return (
    <div className="w-full bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-xs p-5 transition-all flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
        <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200/80 flex items-center justify-center text-[#7C6AF2] shadow-2xs shrink-0">
          <Plug className="w-5 h-5 stroke-[1.9]" />
        </div>
        <div>
          <h2 className="text-sm font-black text-[#18213B] tracking-tight">
            API &amp; Backend
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Configure the connection to the Lattice backend server.
          </p>
        </div>
      </div>

      {/* Row 1: URL Input and Status + Test Button */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
        {/* Left: API Base URL (Col 7) */}
        <div className="md:col-span-7 flex flex-col gap-1.5">
          <label className="text-xs font-bold text-[#18213B]">API Base URL</label>
          <div className="relative flex items-center">
            <input
              type="text"
              value={settings.apiBaseUrl}
              onChange={handleUrlChange}
              placeholder="http://127.0.0.1:8000/api/v1"
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 pr-9 text-xs font-mono font-bold text-[#18213B] shadow-2xs hover:border-slate-300 focus:outline-none focus:border-[#7C6AF2] transition-colors"
            />
            <button
              type="button"
              onClick={handleResetUrl}
              title="Reset to default URL (http://127.0.0.1:8000/api/v1)"
              className="absolute right-2.5 text-slate-400 hover:text-[#7C6AF2] transition-colors p-0.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            Base URL for the Lattice backend API
          </span>
        </div>

        {/* Right: Connection Status & Test Button (Col 5) */}
        <div className="md:col-span-5 flex flex-col gap-1.5">
          <label className="text-xs font-bold text-[#18213B]">Connection Status</label>
          <div className="flex items-center justify-between gap-2">
            {/* Status Pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span
                className={`w-2 h-2 rounded-full ${
                  isBackendConnected
                    ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)]'
                    : 'bg-rose-500'
                }`}
              />
              <span
                className={`text-xs font-bold ${
                  isBackendConnected ? 'text-emerald-700' : 'text-slate-700'
                }`}
              >
                {isBackendConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>

            {/* Test Connection Button */}
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-[#18213B] bg-white hover:bg-slate-50 hover:border-slate-300 transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isTesting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#7C6AF2]" />
              ) : null}
              <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
            </button>
          </div>

          <span className="text-[10.5px] text-slate-400 font-medium">
            Last checked: {settings.lastCheckedTime || 'Just now'}
          </span>
        </div>
      </div>

      {/* Test feedback banner if available */}
      {testResult && (
        <div
          className={`p-2.5 rounded-xl text-xs flex items-center gap-2 border ${
            testResult.ok
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {testResult.ok ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span className="font-semibold">{testResult.message}</span>
        </div>
      )}

      {/* Row 2: Toggles matching screenshot */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
        {/* Toggle 1: Use Demo Mode */}
        <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-50/60 border border-slate-100">
          <div>
            <div className="text-xs font-bold text-[#18213B]">Use Demo Mode</div>
            <div className="text-[11px] text-slate-500 font-medium">
              Use simulated data when backend is unavailable
            </div>
          </div>
          {/* Toggle Switch */}
          <button
            type="button"
            role="switch"
            aria-checked={settings.useDemoMode}
            onClick={() => {
              const updated = !settings.useDemoMode;
              onChangeSettings({ useDemoMode: updated });
              onToggleDemoMode();
            }}
            className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
              settings.useDemoMode ? 'bg-[#7C6AF2]' : 'bg-slate-300'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                settings.useDemoMode ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Toggle 2: Auto Reconnect */}
        <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-50/60 border border-slate-100">
          <div>
            <div className="text-xs font-bold text-[#18213B]">Auto Reconnect</div>
            <div className="text-[11px] text-slate-500 font-medium">
              Automatically reconnect when connection is lost
            </div>
          </div>
          {/* Toggle Switch */}
          <button
            type="button"
            role="switch"
            aria-checked={settings.autoReconnect}
            onClick={() =>
              onChangeSettings({ autoReconnect: !settings.autoReconnect })
            }
            className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
              settings.autoReconnect ? 'bg-[#7C6AF2]' : 'bg-slate-300'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                settings.autoReconnect ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
};
