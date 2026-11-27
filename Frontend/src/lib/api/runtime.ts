/**
 * Runtime helpers shared by the Experiments and Model Chat screens.
 *
 * Everything here talks to the real backend: no fixture IDs, no demo payloads.
 * Endpoints used:
 *   GET  /configurations, POST /configurations
 *   POST /workloads
 *   POST /benchmarks, GET /benchmarks/{id}, POST /benchmarks/{id}/cancel
 *   POST /inference, GET /inference/{id}
 *   GET  /jobs/{id}
 */
import { API_BASE_URL } from './client';

export interface BackendConfiguration {
  id: string;
  name: string;
  modelId: string;
  modelFormat: string;
  quantization: string | null;
  runtimeAdapter: string;
  contextLength: number;
}

export interface JobSnapshot {
  id: string;
  status: string;
  progress: number | null;
  message?: string | null;
  error_message?: string | null;
}

export interface InferenceResult {
  id: string;
  status: string;
  retained_output: string | null;
  output_tokens: number | null;
  latency_ms: number | null;
  ttft_ms: number | null;
  output_throughput_tps: number | null;
  peak_process_rss_mb: number | null;
  error_message: string | null;
  output_retention_policy: string;
  prompt_retained: boolean;
}

export interface MetricSummary {
  metric_name: string;
  status: string;
  mean: number | null;
  unit: string | null;
  sample_count: number | null;
}

export interface BenchmarkRunDetail {
  id: string;
  status: string;
  job_id: string;
  test_only: boolean;
  completed_repetitions: number;
  failed_repetitions: number;
  metric_summaries: MetricSummary[];
  runtime_metadata?: Record<string, unknown>;
  error_message?: string | null;
}

/** Default GGUF used when the backend has no saved configuration yet. */
export const DEFAULT_MODEL_PATH = '../models/qwen2.5-0.5b-instruct-q4_k_m.gguf';

const TERMINAL = new Set(['completed', 'failed', 'cancelled', 'interrupted']);

export class BackendError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'BackendError';
  }
}

export function readApiError(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object') {
    const envelope = payload as { error?: { message?: string; code?: string } };
    if (envelope.error?.message) {
      const code = envelope.error.code;
      if (code === 'runtime_unavailable') {
        return `${envelope.error.message} — start the backend with LATTICE_RUNTIME_ADAPTER=llamacpp.`;
      }
      if (envelope.error.message.toLowerCase().includes('output retention')) {
        return `${envelope.error.message} — remove LATTICE_ALLOW_OUTPUT_RETENTION=false from Backend/.env and restart the backend.`;
      }
      return envelope.error.message;
    }
  }
  return fallback;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new BackendError(
      readApiError(payload, `${path} failed with HTTP ${response.status}`),
      response.status
    );
  }
  return (await response.json()) as T;
}

function toConfiguration(raw: {
  id: string;
  name: string;
  model_id: string;
  model_format: string;
  quantization: string | null;
  runtime_adapter: string;
  context_length: number;
}): BackendConfiguration {
  return {
    id: raw.id,
    name: raw.name,
    modelId: raw.model_id,
    modelFormat: raw.model_format,
    quantization: raw.quantization,
    runtimeAdapter: raw.runtime_adapter,
    contextLength: raw.context_length,
  };
}

export async function listConfigurations(): Promise<BackendConfiguration[]> {
  const payload = await request<{ items: Parameters<typeof toConfiguration>[0][] }>(
    '/configurations?limit=50'
  );
  return (payload.items ?? []).map(toConfiguration);
}

export async function createConfiguration(
  modelPath: string,
  options: { name?: string; maxTokens?: number; temperature?: number } = {}
): Promise<BackendConfiguration> {
  const fileName = modelPath.split(/[\\/]/).pop() || 'model.gguf';
  const created = await request<Parameters<typeof toConfiguration>[0]>('/configurations', {
    method: 'POST',
    body: JSON.stringify({
      name: options.name ?? `chat-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}`,
      model_id: fileName.replace(/\.gguf$/i, ''),
      model_format: 'gguf',
      quantization: 'q4_k_m',
      model_path: modelPath,
      context_length: 2048,
      runtime_adapter: 'auto',
      generation_defaults: {
        max_tokens: options.maxTokens ?? 256,
        temperature: options.temperature ?? 0.7,
      },
    }),
  });
  return toConfiguration(created);
}

/** Use the requested configuration if it is real, otherwise the first one, otherwise create one. */
export async function ensureConfiguration(
  preferredId?: string | null
): Promise<{ configuration: BackendConfiguration; created: boolean }> {
  const configurations = await listConfigurations();
  const preferred = preferredId
    ? configurations.find((item) => item.id === preferredId)
    : undefined;
  if (preferred) return { configuration: preferred, created: false };
  if (configurations.length > 0) return { configuration: configurations[0], created: false };
  const created = await createConfiguration(DEFAULT_MODEL_PATH);
  return { configuration: created, created: true };
}

const workloadCache = new Map<string, string>();

export interface WorkloadSpec {
  name: string;
  prompt: string;
  systemPrompt?: string;
  outputTokens: number;
  contextRequirement?: number;
}

interface WorkloadSummary {
  id: string;
  name: string;
  enabled?: boolean;
  deleted_at?: string | null;
}

/** Workload names are unique in the backend, so reuse the existing row. */
async function findWorkloadIdByName(name: string): Promise<string | null> {
  const payload = await request<{ items?: WorkloadSummary[] }>(
    `/workloads?limit=50&search=${encodeURIComponent(name)}`
  );
  const match = (payload.items ?? []).find(
    (item) => item.name === name && !item.deleted_at
  );
  return match?.id ?? null;
}

function createWorkload(name: string, spec: WorkloadSpec) {
  return request<{ id: string }>('/workloads', {
    method: 'POST',
    body: JSON.stringify({
      name,
      workload_type: 'generation',
      input_spec: {
        prompt: spec.prompt,
        ...(spec.systemPrompt ? { system_prompt: spec.systemPrompt } : {}),
      },
      output_tokens_target: Math.max(1, Math.min(2048, Math.round(spec.outputTokens))),
      context_requirement: spec.contextRequirement ?? 2048,
      dataset_reference: 'lattice-desktop',
    }),
  });
}

/**
 * Resolve a workload for a run. The same workload can be benchmarked any number
 * of times, so an existing workload with the same name is reused instead of
 * failing the submission with a name conflict.
 */
export async function ensureWorkload(spec: WorkloadSpec): Promise<string> {
  const signature = `${spec.name}:${spec.outputTokens}:${spec.prompt}`;
  const cached = workloadCache.get(signature);
  if (cached) return cached;

  const existingId = await findWorkloadIdByName(spec.name).catch(() => null);
  if (existingId) {
    workloadCache.set(signature, existingId);
    return existingId;
  }

  try {
    const created = await createWorkload(spec.name, spec);
    workloadCache.set(signature, created.id);
    return created.id;
  } catch (error) {
    if (error instanceof BackendError && error.status === 409) {
      // Someone created it between the lookup and the insert: reuse that row.
      const raced = await findWorkloadIdByName(spec.name).catch(() => null);
      if (raced) {
        workloadCache.set(signature, raced);
        return raced;
      }
      // Last resort: a unique name keeps the run possible.
      const suffix = Date.now().toString(36);
      const created = await createWorkload(`${spec.name}-${suffix}`, spec);
      workloadCache.set(signature, created.id);
      return created.id;
    }
    throw error;
  }
}

export interface BenchmarkSubmission {
  configuration_id: string;
  workload_id: string;
  repetitions: number;
  warmup_iterations: number;
  generation_parameters: Record<string, number>;
  collect_memory: boolean;
}

export interface BenchmarkAcceptance {
  job_id: string;
  benchmark_run_id: string;
  status: string;
  message: string;
  test_only: boolean;
}

export function submitBenchmark(payload: BenchmarkSubmission): Promise<BenchmarkAcceptance> {
  return request<BenchmarkAcceptance>('/benchmarks', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function cancelBenchmark(runId: string): Promise<{ status: string; message: string }> {
  return request(`/benchmarks/${runId}/cancel`, { method: 'POST' });
}

export function getBenchmarkRun(runId: string): Promise<BenchmarkRunDetail> {
  return request<BenchmarkRunDetail>(`/benchmarks/${runId}`);
}

export function getJob(jobId: string): Promise<JobSnapshot> {
  return request<JobSnapshot>(`/jobs/${jobId}`);
}

export async function waitForJob(
  jobId: string,
  options: { timeoutMs?: number; intervalMs?: number; onTick?: (job: JobSnapshot) => void } = {}
): Promise<JobSnapshot> {
  const timeoutMs = options.timeoutMs ?? 180_000;
  const intervalMs = options.intervalMs ?? 400;
  const deadline = Date.now() + timeoutMs;
  let last: JobSnapshot | null = null;

  while (Date.now() < deadline) {
    try {
      last = await getJob(jobId);
    } catch {
      // Transient polling failure: keep waiting until the deadline.
    }
    if (last) {
      options.onTick?.(last);
      if (TERMINAL.has(last.status)) return last;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  if (last) return last;
  throw new Error(`Job ${jobId} did not report a state within ${Math.round(timeoutMs / 1000)}s.`);
}

export interface ChatTurn {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface InferenceRequest {
  configurationId: string;
  prompt: string;
  systemPrompt?: string;
  messages?: ChatTurn[];
  generationParameters: Record<string, number>;
}

export async function runInference(
  payload: InferenceRequest,
  onJob?: (job: JobSnapshot) => void
): Promise<InferenceResult> {
  const accepted = await request<{ execution_id: string; job_id: string; message: string }>(
    '/inference',
    {
      method: 'POST',
      body: JSON.stringify({
        configuration_id: payload.configurationId,
        prompt: payload.prompt,
        ...(payload.systemPrompt ? { system_prompt: payload.systemPrompt } : {}),
        ...(payload.messages && payload.messages.length > 0
          ? { messages: payload.messages }
          : {}),
        generation_parameters: payload.generationParameters,
        retain_output: true,
      }),
    }
  );

  const job = await waitForJob(accepted.job_id, { onTick: onJob });
  const result = await request<InferenceResult>(`/inference/${accepted.execution_id}`);

  if (job.status !== 'completed' || result.status !== 'completed') {
    throw new BackendError(
      result.error_message || `Generation ended with status "${job.status}".`,
      200
    );
  }
  return result;
}
