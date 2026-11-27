import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Bot,
  Clock,
  Cpu,
  FlaskConical,
  Gauge,
  Loader2,
  MessageSquare,
  Plus,
  RefreshCw,
  RotateCcw,
  Send,
  Trash2,
  User,
  Zap,
} from 'lucide-react';
import {
  BackendConfiguration,
  ChatTurn,
  DEFAULT_MODEL_PATH,
  createConfiguration,
  listConfigurations,
  runInference,
} from '../lib/api/runtime';
import { BackendConnectionState } from '../types';
import { NavItemKey } from '../components/layout/Sidebar';
import { Button, Input, Select, StatusBadge } from '../components/ui/primitives';

interface ChatPageProps {
  backendState: BackendConnectionState;
  onRefreshConnection: () => void;
  onNavigate: (key: NavItemKey) => void;
}

interface ChatMetrics {
  latencyMs: number | null;
  ttftMs: number | null;
  outputTokens: number | null;
  throughput: number | null;
  memoryMb: number | null;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  at: string;
  pending?: boolean;
  error?: string;
  metrics?: ChatMetrics;
}

interface GenerationSettings {
  maxTokens: number;
  temperature: number;
  topP: number;
  topK: number;
  repeatPenalty: number;
  seed: number | '';
}

const DEFAULT_SETTINGS: GenerationSettings = {
  maxTokens: 256,
  temperature: 0.7,
  topP: 0.95,
  topK: 40,
  repeatPenalty: 1.1,
  seed: '',
};

const now = () => new Date().toLocaleTimeString([], { hour12: false });

/**
 * Prior turns travel as real chat messages so the runtime can apply the model's
 * own chat template instead of continuing the text like a raw completion.
 */
function buildMessages(history: ChatMessage[], question: string, maxTurns = 6): ChatTurn[] {
  const usable = history
    .filter((message) => !message.error && !message.pending && message.text.trim().length > 0)
    .slice(-maxTurns * 2);
  return [
    ...usable.map((message) => ({ role: message.role, content: message.text.trim() })),
    { role: 'user' as const, content: question },
  ];
}

function toGenerationParameters(settings: GenerationSettings): Record<string, number> {
  const parameters: Record<string, number> = {
    max_tokens: Math.max(1, Math.min(2048, Math.round(settings.maxTokens))),
    temperature: settings.temperature,
    top_p: settings.topP,
    top_k: Math.round(settings.topK),
    repeat_penalty: settings.repeatPenalty,
  };
  if (settings.seed !== '' && Number.isFinite(Number(settings.seed))) {
    parameters.seed = Math.round(Number(settings.seed));
  }
  return parameters;
}

const MetricChip: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({
  icon,
  label,
  value,
}) => (
  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-sm bg-[#F8F9FB] border border-[#E6EAF0] text-[10.5px] text-[#647187]">
    <span className="text-[#8A94A6]">{icon}</span>
    <span className="uppercase tracking-wider font-semibold text-[9.5px]">{label}</span>
    <span className="font-mono font-semibold text-[#222938] tabular-nums">{value}</span>
  </span>
);

export const ChatPage: React.FC<ChatPageProps> = ({
  backendState,
  onRefreshConnection,
  onNavigate,
}) => {
  const [configurations, setConfigurations] = useState<BackendConfiguration[]>([]);
  const [configurationId, setConfigurationId] = useState<string>('');
  const [isLoadingConfigs, setIsLoadingConfigs] = useState<boolean>(false);
  const [configError, setConfigError] = useState<string | null>(null);

  const [settings, setSettings] = useState<GenerationSettings>(DEFAULT_SETTINGS);
  const [systemPrompt, setSystemPrompt] = useState<string>('');

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [chatError, setChatError] = useState<string | null>(null);

  const [quickPath, setQuickPath] = useState<string>(DEFAULT_MODEL_PATH);
  const [isCreating, setIsCreating] = useState<boolean>(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const isConnected = backendState.connected;

  const loadConfigurations = useCallback(async () => {
    if (!isConnected) {
      setConfigurations([]);
      setConfigurationId('');
      return;
    }
    setIsLoadingConfigs(true);
    setConfigError(null);
    try {
      const items = await listConfigurations();
      setConfigurations(items);
      setConfigurationId((current) =>
        current && items.some((item) => item.id === current) ? current : items[0]?.id ?? ''
      );
    } catch (error) {
      setConfigError(error instanceof Error ? error.message : 'Unable to load configurations');
    } finally {
      setIsLoadingConfigs(false);
    }
  }, [isConnected]);

  useEffect(() => {
    loadConfigurations();
  }, [loadConfigurations]);

  useEffect(() => {
    if (!isSending) return;
    const started = Date.now();
    setElapsedMs(0);
    const timer = setInterval(() => setElapsedMs(Date.now() - started), 200);
    return () => clearInterval(timer);
  }, [isSending]);

  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages]);

  const activeConfiguration = useMemo(
    () => configurations.find((item) => item.id === configurationId) ?? null,
    [configurations, configurationId]
  );

  const patchMessage = useCallback((id: string, patch: Partial<ChatMessage>) => {
    setMessages((prev) =>
      prev.map((message) => (message.id === id ? { ...message, ...patch } : message))
    );
  }, []);

  const handleCreateConfiguration = useCallback(async () => {
    if (!quickPath.trim()) return;
    setIsCreating(true);
    setConfigError(null);
    try {
      const created = await createConfiguration(quickPath.trim(), {
        maxTokens: settings.maxTokens,
        temperature: settings.temperature,
      });
      await loadConfigurations();
      setConfigurationId(created.id);
    } catch (error) {
      setConfigError(error instanceof Error ? error.message : 'Unable to create a configuration');
    } finally {
      setIsCreating(false);
    }
  }, [quickPath, settings.maxTokens, settings.temperature, loadConfigurations]);

  const handleSend = useCallback(async () => {
    const question = input.trim();
    if (!question || isSending) return;
    if (!isConnected) {
      setChatError('The backend is offline. Start it, then press Refresh.');
      return;
    }
    if (!configurationId) {
      setChatError('Select a model configuration before sending a prompt.');
      return;
    }

    const history = messages;
    const assistantId = `assistant-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: 'user', text: question, at: now() },
      { id: assistantId, role: 'assistant', text: '', at: now(), pending: true },
    ]);
    setInput('');
    setChatError(null);
    setIsSending(true);

    try {
      const result = await runInference({
        configurationId,
        prompt: question,
        messages: buildMessages(history, question),
        systemPrompt: systemPrompt.trim() || undefined,
        generationParameters: toGenerationParameters(settings),
      });

      if (!result.retained_output) {
        throw new Error('The model finished but returned no text for this execution.');
      }

      patchMessage(assistantId, {
        text: result.retained_output,
        pending: false,
        at: now(),
        metrics: {
          latencyMs: result.latency_ms,
          ttftMs: result.ttft_ms,
          outputTokens: result.output_tokens,
          throughput: result.output_throughput_tps,
          memoryMb: result.peak_process_rss_mb,
        },
      });
    } catch (error) {
      patchMessage(assistantId, {
        pending: false,
        error: error instanceof Error ? error.message : 'Generation failed.',
      });
    } finally {
      setIsSending(false);
    }
  }, [
    input,
    isSending,
    isConnected,
    configurationId,
    messages,
    systemPrompt,
    settings,
    patchMessage,
  ]);

  const numberField = (key: keyof GenerationSettings, value: string, min: number, max: number) => {
    const parsed = Number(value);
    const safe = Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : min;
    setSettings((prev) => ({ ...prev, [key]: safe }));
  };

  const canSend = isConnected && !!configurationId && !isSending;

  return (
    <div className="flex-1 w-full p-4 lg:p-6 flex flex-col gap-4 max-w-[1600px] mx-auto pb-16">
      {/* Page header */}
      <div className="w-full bg-white rounded-lg border border-[#D9DEE7] shadow-2xs p-4 flex items-center justify-between flex-wrap gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[#7562E8]" />
            <h1 className="text-[16px] font-semibold text-[#222938] tracking-tight">Model Chat</h1>
          </div>
          <p className="text-[12px] text-[#647187] mt-0.5">
            Send real prompts to a saved configuration and inspect the model's actual response and
            token telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge tone={isConnected ? 'success' : 'warning'} pulse={isSending}>
            {isSending ? 'Generating' : isConnected ? 'Backend Live' : 'Backend Offline'}
          </StatusBadge>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              loadConfigurations();
              onRefreshConnection();
            }}
            isLoading={isLoadingConfigs}
            leftIcon={<RefreshCw className="w-3.5 h-3.5 text-[#7562E8]" />}
          >
            Refresh
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setMessages([]);
              setChatError(null);
            }}
            disabled={messages.length === 0}
            leftIcon={<Plus className="w-3.5 h-3.5 text-[#647187]" />}
          >
            New Session
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onNavigate('experiments')}
            leftIcon={<FlaskConical className="w-3.5 h-3.5 text-[#647187]" />}
          >
            Experiments
          </Button>
        </div>
      </div>

      {!isConnected && (
        <div className="p-3 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] text-[#B45309] text-[12px] flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="leading-relaxed">
            Chat needs the backend at <span className="font-mono">{backendState.endpoint}</span>. Start it
            with the llama.cpp runtime, then press Refresh.
          </span>
        </div>
      )}

      {configError && (
        <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] text-[12px] flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{configError}</span>
          </div>
          <button
            type="button"
            onClick={() => setConfigError(null)}
            className="text-[11px] font-medium hover:underline shrink-0 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Options panel */}
        <div className="lg:col-span-4 xl:col-span-3 w-full bg-white rounded-lg border border-[#D9DEE7] shadow-2xs p-4 flex flex-col gap-4">
          <div>
            <h2 className="text-[13px] font-semibold text-[#222938] tracking-tight flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-[#7562E8]" />
              Model Runtime
            </h2>
            <p className="text-[11px] text-[#647187] mt-0.5">
              Configurations are read from the backend, not the model library.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="chat-model"
              className="text-[10.5px] font-semibold text-[#647187] uppercase tracking-wider"
            >
              Configuration
            </label>
            <Select
              id="chat-model"
              value={configurationId}
              onChange={(event) => setConfigurationId(event.target.value)}
              disabled={!isConnected || configurations.length === 0}
            >
              {configurations.length === 0 ? (
                <option value="">No configurations</option>
              ) : (
                configurations.map((configuration) => (
                  <option key={configuration.id} value={configuration.id}>
                    {configuration.name}
                  </option>
                ))
              )}
            </Select>
          </div>

          <div className="rounded-md bg-[#F8F9FB] border border-[#E6EAF0] p-2.5 flex flex-col gap-1.5 text-[11px]">
            {[
              ['Model', activeConfiguration?.modelId ?? '—'],
              ['Format', activeConfiguration?.modelFormat?.toUpperCase() ?? '—'],
              ['Quantization', activeConfiguration?.quantization?.toUpperCase() ?? '—'],
              ['Adapter', activeConfiguration?.runtimeAdapter ?? '—'],
              ['Context', activeConfiguration ? `${activeConfiguration.contextLength} tok` : '—'],
              ['Config ID', activeConfiguration?.id.slice(0, 8) ?? '—'],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-2">
                <span className="text-[#647187]">{label}</span>
                <span className="font-mono text-[#222938] truncate">{value}</span>
              </div>
            ))}
          </div>

          {isConnected && !isLoadingConfigs && configurations.length === 0 && (
            <div className="p-2.5 rounded-md border border-dashed border-[#C3CBD8] bg-[#F8F9FB] flex flex-col gap-2">
              <p className="text-[11.5px] text-[#647187] leading-relaxed">
                No saved configurations. Create one from a GGUF inside the server's model roots:
              </p>
              <Input
                value={quickPath}
                onChange={(event) => setQuickPath(event.target.value)}
                placeholder={DEFAULT_MODEL_PATH}
                mono
                aria-label="GGUF model path"
              />
              <Button
                variant="primary"
                size="sm"
                onClick={handleCreateConfiguration}
                isLoading={isCreating}
                disabled={!quickPath.trim()}
              >
                Create Configuration
              </Button>
            </div>
          )}

          <div className="pt-1 border-t border-[#E6EAF0]">
            <h2 className="text-[13px] font-semibold text-[#222938] tracking-tight flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-[#7562E8]" />
              Generation Parameters
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="flex flex-col gap-1">
              <label htmlFor="chat-max-tokens" className="text-[10.5px] font-semibold text-[#647187] uppercase tracking-wider">
                Max Tokens
              </label>
              <Input
                id="chat-max-tokens"
                type="number"
                min={1}
                max={2048}
                mono
                value={settings.maxTokens}
                onChange={(event) => numberField('maxTokens', event.target.value, 1, 2048)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="chat-temperature" className="text-[10.5px] font-semibold text-[#647187] uppercase tracking-wider">
                Temperature
              </label>
              <Input
                id="chat-temperature"
                type="number"
                step={0.05}
                min={0}
                max={2}
                mono
                value={settings.temperature}
                onChange={(event) => numberField('temperature', event.target.value, 0, 2)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="chat-top-p" className="text-[10.5px] font-semibold text-[#647187] uppercase tracking-wider">
                Top P
              </label>
              <Input
                id="chat-top-p"
                type="number"
                step={0.05}
                min={0}
                max={1}
                mono
                value={settings.topP}
                onChange={(event) => numberField('topP', event.target.value, 0, 1)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="chat-top-k" className="text-[10.5px] font-semibold text-[#647187] uppercase tracking-wider">
                Top K
              </label>
              <Input
                id="chat-top-k"
                type="number"
                min={0}
                max={10000}
                mono
                value={settings.topK}
                onChange={(event) => numberField('topK', event.target.value, 0, 10000)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="chat-repeat" className="text-[10.5px] font-semibold text-[#647187] uppercase tracking-wider">
                Repeat Penalty
              </label>
              <Input
                id="chat-repeat"
                type="number"
                step={0.05}
                min={0}
                max={4}
                mono
                value={settings.repeatPenalty}
                onChange={(event) => numberField('repeatPenalty', event.target.value, 0, 4)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="chat-seed" className="text-[10.5px] font-semibold text-[#647187] uppercase tracking-wider">
                Seed
              </label>
              <Input
                id="chat-seed"
                type="number"
                min={0}
                mono
                placeholder="random"
                value={settings.seed}
                onChange={(event) => {
                  const raw = event.target.value;
                  setSettings((prev) => ({
                    ...prev,
                    seed: raw === '' ? '' : Math.max(0, Math.round(Number(raw) || 0)),
                  }));
                }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="chat-system" className="text-[10.5px] font-semibold text-[#647187] uppercase tracking-wider">
              System Prompt
            </label>
            <textarea
              id="chat-system"
              rows={3}
              value={systemPrompt}
              onChange={(event) => setSystemPrompt(event.target.value)}
              placeholder="Optional instructions applied to every turn."
              className="w-full resize-none px-2.5 py-2 rounded-md bg-white border border-[#D9DEE7] text-[12px] text-[#222938] placeholder-[#8A94A6] hover:border-[#C3CBD8] focus:outline-none focus:border-[#7562E8] focus:ring-1 focus:ring-[#7562E8] transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSettings(DEFAULT_SETTINGS);
                setSystemPrompt('');
              }}
              leftIcon={<RotateCcw className="w-3.5 h-3.5 text-[#647187]" />}
            >
              Reset Defaults
            </Button>
          </div>

          <p className="text-[10.5px] text-[#8A94A6] leading-relaxed border-t border-[#E6EAF0] pt-2">
            Parameters are validated by the backend allowlist. Prompts are never stored; only the reply is
            retained, on the execution record.
          </p>
        </div>

        {/* Chat column */}
        <div className="lg:col-span-8 xl:col-span-9 w-full bg-white rounded-lg border border-[#D9DEE7] shadow-2xs p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between pb-2.5 border-b border-[#E6EAF0] flex-wrap gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[12.5px] font-semibold text-[#222938]">Session Transcript</span>
              <span className="text-[11px] font-mono text-[#647187] tabular-nums">
                ({messages.length} messages)
              </span>
            </div>
            <div className="flex items-center gap-2">
              {isSending && (
                <span className="text-[11px] font-mono text-[#634FDB] tabular-nums flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {(elapsedMs / 1000).toFixed(1)}s
                </span>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setMessages([]);
                  setChatError(null);
                }}
                disabled={messages.length === 0}
                leftIcon={<Trash2 className="w-3.5 h-3.5 text-[#647187]" />}
              >
                Clear
              </Button>
            </div>
          </div>

          <div
            ref={scrollRef}
            role="log"
            aria-live="polite"
            className="rounded-md border border-[#D9DEE7] bg-[#F8F9FB] p-3 min-h-[560px] max-h-[840px] overflow-y-auto flex flex-col gap-3"
          >
            {messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 py-16">
                <div className="w-10 h-10 rounded-md bg-white border border-[#D9DEE7] flex items-center justify-center">
                  <Bot className="w-5 h-5 text-[#7562E8]" />
                </div>
                <p className="text-[13px] font-semibold text-[#222938]">No messages in this session</p>
                <p className="text-[11.5px] text-[#647187] max-w-sm leading-relaxed">
                  Pick a configuration on the left, adjust generation parameters, then send a prompt. The
                  reply is the model's actual output, with measured latency and throughput.
                </p>
              </div>
            ) : (
              messages.map((message) => {
                const isUser = message.role === 'user';
                return (
                  <div
                    key={message.id}
                    className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}
                  >
                    <div
                      className={`w-7 h-7 rounded-sm border flex items-center justify-center shrink-0 ${
                        isUser
                          ? 'bg-[#F2F0FD] border-[#D8D1FA] text-[#7562E8]'
                          : 'bg-white border-[#E6EAF0] text-[#0D8A58]'
                      }`}
                    >
                      {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                    </div>

                    <div
                      className={`min-w-0 max-w-[86%] flex flex-col gap-1.5 ${
                        isUser ? 'items-end' : 'items-start'
                      }`}
                    >
                      <div className="flex items-center gap-2 text-[10px] text-[#8A94A6] uppercase tracking-wider font-semibold">
                        <span>{isUser ? 'You' : 'Model'}</span>
                        <span className="font-mono normal-case tracking-normal">{message.at}</span>
                      </div>

                      <div
                        className={`px-3 py-2 rounded-md border text-[12.5px] leading-relaxed whitespace-pre-wrap break-words w-full ${
                          isUser
                            ? 'bg-[#F2F0FD] border-[#D8D1FA] text-[#222938]'
                            : message.error
                              ? 'bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]'
                              : 'bg-white border-[#D9DEE7] text-[#222938]'
                        }`}
                      >
                        {message.pending ? (
                          <span className="flex items-center gap-2 text-[#647187]">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Generating — polling job status…
                          </span>
                        ) : message.error ? (
                          <span className="flex items-start gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>{message.error}</span>
                          </span>
                        ) : (
                          message.text
                        )}
                      </div>

                      {message.metrics && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {message.metrics.latencyMs !== null && (
                            <MetricChip
                              icon={<Clock className="w-3 h-3" />}
                              label="Latency"
                              value={`${Math.round(message.metrics.latencyMs)} ms`}
                            />
                          )}
                          {message.metrics.ttftMs !== null && (
                            <MetricChip
                              icon={<Gauge className="w-3 h-3" />}
                              label="TTFT"
                              value={`${Math.round(message.metrics.ttftMs)} ms`}
                            />
                          )}
                          {message.metrics.outputTokens !== null && (
                            <MetricChip
                              icon={<Cpu className="w-3 h-3" />}
                              label="Tokens"
                              value={String(message.metrics.outputTokens)}
                            />
                          )}
                          {message.metrics.throughput !== null && (
                            <MetricChip
                              icon={<Zap className="w-3 h-3" />}
                              label="Throughput"
                              value={`${message.metrics.throughput.toFixed(1)} tok/s`}
                            />
                          )}
                          {message.metrics.memoryMb !== null && (
                            <MetricChip
                              icon={<Cpu className="w-3 h-3" />}
                              label="RSS"
                              value={`${Math.round(message.metrics.memoryMb)} MB`}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {chatError && (
            <div className="p-2.5 rounded-md bg-[#FEF2F2] border border-[#FECACA] text-[11.5px] text-[#DC2626] flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{chatError}</span>
            </div>
          )}

          <div className="flex items-end gap-2">
            <div className="flex-1 min-w-0">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    handleSend();
                  }
                }}
                rows={3}
                disabled={!canSend}
                placeholder={
                  isConnected
                    ? configurationId
                      ? 'Ask the model a question…  (Enter to send, Shift+Enter for a new line)'
                      : 'Create or select a configuration first'
                    : 'Backend offline — start the Lattice backend to chat'
                }
                aria-label="Chat prompt"
                className="w-full resize-none px-2.5 py-2 rounded-md bg-white border border-[#D9DEE7] text-[12.5px] text-[#222938] placeholder-[#8A94A6] hover:border-[#C3CBD8] focus:outline-none focus:border-[#7562E8] focus:ring-1 focus:ring-[#7562E8] disabled:bg-[#F8F9FB] disabled:text-[#8A94A6] transition-colors"
              />
            </div>
            <Button
              variant="primary"
              size="md"
              onClick={handleSend}
              disabled={!canSend || input.trim().length === 0}
              isLoading={isSending}
              leftIcon={!isSending ? <Send className="w-3.5 h-3.5" /> : undefined}
            >
              {isSending ? 'Generating' : 'Send'}
            </Button>
          </div>

          <p className="text-[10.5px] text-[#8A94A6] leading-relaxed">
            <span className="font-mono">POST /inference</span> →{' '}
            <span className="font-mono">GET /jobs/&#123;id&#125;</span> →{' '}
            <span className="font-mono">GET /inference/&#123;id&#125;</span>. Prior turns are sent as chat
            messages and rendered with the model's chat template; the reply text is returned through{' '}
            <span className="font-mono">retain_output</span>.
          </p>
        </div>
      </div>
    </div>
  );
};
