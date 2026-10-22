export interface ApiBackendSettings {
  apiBaseUrl: string;
  useDemoMode: boolean;
  autoReconnect: boolean;
  lastCheckedTime: string | null;
}

export interface InferenceRuntimeSettings {
  defaultRuntime: string;
  defaultContextLength: number;
  devicePreference: string;
  defaultThreads: string;
  enableGpuAcceleration: boolean;
  enableMemoryOptimization: boolean;
  keepModelInMemory: boolean;
}

export interface ExperimentDefaultSettings {
  defaultWorkloadType: string;
  defaultNumberOfRuns: number;
  maxNewTokens: number;
  temperature: number;
  defaultMetrics: {
    latency: boolean;
    totalGenerationTime: boolean;
    memoryUsage: boolean;
    throughput: boolean;
    outputQuality: boolean;
  };
}

export interface AppearanceSettings {
  theme: 'light' | 'dark' | 'system';
  resultsPerPage: number;
  defaultView: 'overview' | 'model-lab' | 'optimization-lab' | 'experiments' | 'settings';
  showTooltips: boolean;
  animations: boolean;
  telemetry: boolean;
}

export interface DataStorageSettings {
  modelStoragePath: string;
  cacheDirectory: string;
  usedStorageGb: number;
  freeStorageGb: number;
  totalStorageGb: number;
}

export interface SystemInfoData {
  os: string;
  cpu: string;
  gpu: string;
  totalMemory: string;
  availableMemory: string;
  pythonVersion: string;
  cudaAvailable: string;
  isDetectedLive: boolean;
  lastDetectedAt: string;
}

export interface LatticeSettings {
  api: ApiBackendSettings;
  runtime: InferenceRuntimeSettings;
  experiments: ExperimentDefaultSettings;
  appearance: AppearanceSettings;
  storage: DataStorageSettings;
}
