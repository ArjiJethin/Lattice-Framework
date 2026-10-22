import React from 'react';
import { Cpu, ChevronDown } from 'lucide-react';
import { InferenceRuntimeSettings } from '../../types/settings';

interface InferenceRuntimeCardProps {
  settings: InferenceRuntimeSettings;
  onChangeSettings: (updated: Partial<InferenceRuntimeSettings>) => void;
}

export const InferenceRuntimeCard: React.FC<InferenceRuntimeCardProps> = ({
  settings,
  onChangeSettings,
}) => {
  return (
    <div className="w-full bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-xs p-5 transition-all flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
        <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200/80 flex items-center justify-center text-[#7C6AF2] shadow-2xs shrink-0">
          <Cpu className="w-5 h-5 stroke-[1.9]" />
        </div>
        <div>
          <h2 className="text-sm font-black text-[#18213B] tracking-tight">
            Inference &amp; Runtime
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Configure inference runtime settings and default parameters.
          </p>
        </div>
      </div>

      {/* Row 1: Default Runtime and Default Context Length */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Default Runtime */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-[#18213B]">Default Runtime</label>
          <div className="relative">
            <select
              value={settings.defaultRuntime}
              onChange={(e) => onChangeSettings({ defaultRuntime: e.target.value })}
              className="w-full appearance-none bg-white border border-slate-200 rounded-xl px-3 py-2 pr-8 text-xs font-bold text-[#18213B] shadow-2xs hover:border-slate-300 focus:outline-none focus:border-[#7C6AF2] transition-colors cursor-pointer"
            >
              <option value="auto">Auto (Recommended)</option>
              <option value="llamacpp">llama.cpp (Metal / CPU)</option>
              <option value="onnx">ONNX Runtime</option>
              <option value="pytorch">PyTorch Native</option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            Runtime to use for inference and experiments
          </span>
        </div>

        {/* Default Context Length */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-[#18213B]">
            Default Context Length
          </label>
          <input
            type="number"
            min={512}
            max={131072}
            step={1024}
            value={settings.defaultContextLength}
            onChange={(e) =>
              onChangeSettings({
                defaultContextLength: parseInt(e.target.value, 10) || 4096,
              })
            }
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-extrabold text-[#18213B] shadow-2xs hover:border-slate-300 focus:outline-none focus:border-[#7C6AF2] transition-colors"
          />
          <span className="text-[11px] text-slate-500 font-medium">
            Default context length for new sessions
          </span>
        </div>
      </div>

      {/* Row 2: Device Preference and Default Threads */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Device Preference */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-[#18213B]">Device Preference</label>
          <div className="relative">
            <select
              value={settings.devicePreference}
              onChange={(e) => onChangeSettings({ devicePreference: e.target.value })}
              className="w-full appearance-none bg-white border border-slate-200 rounded-xl px-3 py-2 pr-8 text-xs font-bold text-[#18213B] shadow-2xs hover:border-slate-300 focus:outline-none focus:border-[#7C6AF2] transition-colors cursor-pointer"
            >
              <option value="auto">Auto</option>
              <option value="cpu">CPU Only</option>
              <option value="gpu">GPU / Metal Acceleration</option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            Preferred device for inference
          </span>
        </div>

        {/* Default Threads */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-[#18213B]">Default Threads</label>
          <div className="relative">
            <select
              value={settings.defaultThreads}
              onChange={(e) => onChangeSettings({ defaultThreads: e.target.value })}
              className="w-full appearance-none bg-white border border-slate-200 rounded-xl px-3 py-2 pr-8 text-xs font-bold text-[#18213B] shadow-2xs hover:border-slate-300 focus:outline-none focus:border-[#7C6AF2] transition-colors cursor-pointer"
            >
              <option value="auto">Auto</option>
              <option value="4">4 Threads</option>
              <option value="8">8 Threads</option>
              <option value="12">12 Threads</option>
              <option value="16">16 Threads</option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            Number of CPU threads to use
          </span>
        </div>
      </div>

      {/* Row 3: Checkboxes matching screenshot */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
        {/* Enable GPU Acceleration */}
        <label className="flex items-start gap-2.5 cursor-pointer select-none p-2 rounded-xl hover:bg-slate-50/80 transition-colors">
          <input
            type="checkbox"
            checked={settings.enableGpuAcceleration}
            onChange={(e) =>
              onChangeSettings({ enableGpuAcceleration: e.target.checked })
            }
            className="rounded text-[#7C6AF2] focus:ring-[#7C6AF2] border-slate-300 w-4 h-4 mt-0.5"
          />
          <div>
            <span className="text-xs font-bold text-[#18213B] block leading-tight">
              Enable GPU Acceleration
            </span>
            <span className="text-[10.5px] text-slate-500 font-medium block mt-0.5">
              Use GPU when available
            </span>
          </div>
        </label>

        {/* Enable Memory Optimization */}
        <label className="flex items-start gap-2.5 cursor-pointer select-none p-2 rounded-xl hover:bg-slate-50/80 transition-colors">
          <input
            type="checkbox"
            checked={settings.enableMemoryOptimization}
            onChange={(e) =>
              onChangeSettings({ enableMemoryOptimization: e.target.checked })
            }
            className="rounded text-[#7C6AF2] focus:ring-[#7C6AF2] border-slate-300 w-4 h-4 mt-0.5"
          />
          <div>
            <span className="text-xs font-bold text-[#18213B] block leading-tight">
              Enable Memory Optimization
            </span>
            <span className="text-[10.5px] text-slate-500 font-medium block mt-0.5">
              Use memory efficient settings
            </span>
          </div>
        </label>

        {/* Keep Model in Memory */}
        <label className="flex items-start gap-2.5 cursor-pointer select-none p-2 rounded-xl hover:bg-slate-50/80 transition-colors">
          <input
            type="checkbox"
            checked={settings.keepModelInMemory}
            onChange={(e) =>
              onChangeSettings({ keepModelInMemory: e.target.checked })
            }
            className="rounded text-[#7C6AF2] focus:ring-[#7C6AF2] border-slate-300 w-4 h-4 mt-0.5"
          />
          <div>
            <span className="text-xs font-bold text-[#18213B] block leading-tight">
              Keep Model in Memory
            </span>
            <span className="text-[10.5px] text-slate-500 font-medium block mt-0.5">
              Do not unload model after use
            </span>
          </div>
        </label>
      </div>
    </div>
  );
};
