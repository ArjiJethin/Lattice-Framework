import React from 'react';
import { Cpu } from 'lucide-react';
import { InferenceRuntimeSettings } from '../../types/settings';
import { Select, Input, Checkbox } from '../ui/primitives';

interface InferenceRuntimeCardProps {
  settings: InferenceRuntimeSettings;
  onChangeSettings: (updated: Partial<InferenceRuntimeSettings>) => void;
}

export const InferenceRuntimeCard: React.FC<InferenceRuntimeCardProps> = ({
  settings,
  onChangeSettings,
}) => {
  const handleContextLengthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '') return;
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed)) {
      onChangeSettings({
        defaultContextLength: Math.max(512, Math.min(131072, parsed)),
      });
    }
  };

  return (
    <div className="w-full bg-white rounded-lg border border-[#D9DEE7] shadow-2xs p-4 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E6EAF0] flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-[#F8F9FB] border border-[#D9DEE7] flex items-center justify-center text-[#7562E8] shrink-0">
            <Cpu className="w-4 h-4 stroke-[1.9]" />
          </div>
          <div>
            <h2 className="text-[14.5px] font-semibold text-[#222938] tracking-tight">
              Inference &amp; Runtime
            </h2>
            <p className="text-[12px] text-[#647187]">
              Configure execution engine defaults, context allocation, and hardware threads.
            </p>
          </div>
        </div>
        <span className="text-[11px] font-mono text-[#647187] bg-[#F8F9FB] px-2 py-0.5 rounded-sm border border-[#E6EAF0]">
          Engine: {settings.defaultRuntime.toUpperCase()}
        </span>
      </div>

      {/* Row 1: Default Runtime and Default Context Length */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[12px] font-medium text-[#222938]">
              Default Runtime Adapter
            </label>
          </div>
          <Select
            value={settings.defaultRuntime}
            onChange={(e) => onChangeSettings({ defaultRuntime: e.target.value })}
          >
            <option value="auto">Auto (Recommended)</option>
            <option value="llamacpp">llama.cpp (GGUF / Metal / CUDA)</option>
            <option value="onnx">ONNX Runtime</option>
            <option value="pytorch">PyTorch Native</option>
          </Select>
          <span className="text-[11px] text-[#647187]">
            Primary backend adapter used for local model execution
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[12px] font-medium text-[#222938]">
              Default Context Length
            </label>
            <span className="text-[10.5px] font-mono text-[#647187] tabular-nums">
              Tokens (n_ctx)
            </span>
          </div>
          <Input
            type="number"
            mono
            min={512}
            max={131072}
            step={1024}
            value={settings.defaultContextLength}
            onChange={handleContextLengthChange}
          />
          <span className="text-[11px] text-[#647187]">
            KV cache token window allocated for new sessions
          </span>
        </div>
      </div>

      {/* Row 2: Device Preference and Default Threads */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-medium text-[#222938]">
            Device Preference
          </label>
          <Select
            value={settings.devicePreference}
            onChange={(e) => onChangeSettings({ devicePreference: e.target.value })}
          >
            <option value="auto">Auto (GPU with CPU fallback)</option>
            <option value="gpu">GPU / Metal Acceleration</option>
            <option value="cpu">CPU Execution Only</option>
          </Select>
          <span className="text-[11px] text-[#647187]">
            Target compute device for tensor operations
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-medium text-[#222938]">
            Default CPU Threads
          </label>
          <Select
            value={settings.defaultThreads}
            onChange={(e) => onChangeSettings({ defaultThreads: e.target.value })}
          >
            <option value="auto">Auto (Optimal Physical Cores)</option>
            <option value="4">4 Threads</option>
            <option value="8">8 Threads</option>
            <option value="12">12 Threads</option>
            <option value="16">16 Threads</option>
          </Select>
          <span className="text-[11px] text-[#647187]">
            Worker thread pool size for CPU-bound layers
          </span>
        </div>
      </div>

      {/* Row 3: Runtime Flags */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-[#E6EAF0]">
        <div className="p-2.5 rounded-md bg-[#F8F9FB] border border-[#E6EAF0]">
          <Checkbox
            id="chk-gpu-accel"
            checked={settings.enableGpuAcceleration}
            onCheckedChange={(checked) =>
              onChangeSettings({ enableGpuAcceleration: checked })
            }
            label="Enable GPU Acceleration"
            description="Offload attention & MLP layers to VRAM"
          />
        </div>

        <div className="p-2.5 rounded-md bg-[#F8F9FB] border border-[#E6EAF0]">
          <Checkbox
            id="chk-mem-opt"
            checked={settings.enableMemoryOptimization}
            onCheckedChange={(checked) =>
              onChangeSettings({ enableMemoryOptimization: checked })
            }
            label="Memory Optimization"
            description="Use quantized KV cache & mmap loading"
          />
        </div>

        <div className="p-2.5 rounded-md bg-[#F8F9FB] border border-[#E6EAF0]">
          <Checkbox
            id="chk-keep-in-mem"
            checked={settings.keepModelInMemory}
            onCheckedChange={(checked) =>
              onChangeSettings({ keepModelInMemory: checked })
            }
            label="Keep Model in Memory"
            description="Pin weights in resident memory between runs"
          />
        </div>
      </div>
    </div>
  );
};