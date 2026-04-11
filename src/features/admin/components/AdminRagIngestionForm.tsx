"use client";

import { useEffect, useState } from "react";

import type { RagIngestionState } from "@/actions/admin/states";
import { Badge } from "@/components/Badge";
import { buttonClassName } from "@/components/Button";
import { StatusNotice } from "@/components/StatusNotice";
import { SurfacePanel } from "@/components/SurfacePanel";

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatLogTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleTimeString();
}

function getEmbeddingProviderLabel(
  provider: "gemini" | "hf" | "openrouter" | undefined,
) {
  if (provider === "gemini") {
    return "Gemini";
  }

  if (provider === "openrouter") {
    return "OpenRouter";
  }

  if (provider === "hf") {
    return "Hugging Face";
  }

  return null;
}

type RagStatusItem = {
  healthy: boolean;
  label: string;
  note?: string;
};

type BulkJsonIngestionResponse = {
  chunksInserted: number;
  embeddingProvider: "gemini" | "hf" | "openrouter";
  error?: string;
  filesDiscovered: number;
  filesFailed: number;
  filesSucceeded: number;
  ingestId: string;
  message: string;
  results?: Array<{
    chunksInserted?: number;
    error?: string;
    logs?: Array<{
      line?: string;
      message: string;
      timestamp: string;
    }>;
    sourcePath: string;
    success: boolean;
  }>;
  success: boolean;
};

type DashboardLogEntry = {
  line?: string;
  message: string;
  sourcePath?: string;
  timestamp: string;
};

type LiveRagLogsResponse = {
  error?: string;
  logs?: Array<{
    line?: string;
    message: string;
    timestamp: string;
  }>;
  success: boolean;
};

function collectBulkLogs(state: BulkJsonIngestionResponse | null) {
  if (!state?.results) {
    return [] as DashboardLogEntry[];
  }

  return state.results.flatMap((result) =>
    (result.logs ?? []).map((log) => ({
      line: log.line,
      message: log.message,
      sourcePath: result.sourcePath,
      timestamp: log.timestamp,
    })),
  );
}

function collectDashboardLogs(
  singleLogs: RagIngestionState["logs"] | undefined,
  bulkLogs: ReturnType<typeof collectBulkLogs>,
  liveLogs: DashboardLogEntry[],
) {
  const single: DashboardLogEntry[] = (singleLogs ?? []).map((log) => ({
    line: log.line,
    message: log.message,
    timestamp: log.timestamp,
  }));

  const unique = new Map<string, DashboardLogEntry>();

  for (const log of [...single, ...bulkLogs, ...liveLogs]) {
    const key = `${log.timestamp}|${log.line ?? log.message}|${log.sourcePath ?? ""}`;
    if (!unique.has(key)) {
      unique.set(key, log);
    }
  }

  return Array.from(unique.values()).sort((left, right) => {
    const leftTs = new Date(left.timestamp).getTime();
    const rightTs = new Date(right.timestamp).getTime();
    if (Number.isNaN(leftTs) || Number.isNaN(rightTs)) {
      return 0;
    }

    return leftTs - rightTs;
  });
}

type RagStatusResponse = {
  chunkCount: number;
  statuses: {
    embeddingModel: RagStatusItem;
    grammarJsonRag: RagStatusItem;
    dictionaryJsonRag: RagStatusItem;
    knowledgeBase: RagStatusItem;
    llm: RagStatusItem;
    vectorDb: RagStatusItem;
  };
  success: boolean;
};

function StatusDot({ healthy }: { healthy: boolean }) {
  return (
    <span
      aria-hidden
      className={`mt-2 inline-block h-2.5 w-2.5 rounded-full ${
        healthy ? "bg-emerald-400" : "bg-red-500"
      }`}
    />
  );
}

export function AdminRagIngestionForm() {
  const [activeIngestId, setActiveIngestId] = useState<string | null>(null);
  const [activeBulkIngestId, setActiveBulkIngestId] = useState<string | null>(
    null,
  );
  const [bulkJsonState, setBulkJsonState] =
    useState<BulkJsonIngestionResponse | null>(null);
  const [bulkJsonPending, setBulkJsonPending] = useState(false);
  const [embeddingProvider, setEmbeddingProvider] = useState<
    "gemini" | "hf" | "openrouter"
  >("hf");
  const [ragStatus, setRagStatus] = useState<RagStatusResponse | null>(null);
  const [ragStatusError, setRagStatusError] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [state, setState] = useState<RagIngestionState | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [liveLogs, setLiveLogs] = useState<DashboardLogEntry[]>([]);
  const bulkLogs = collectBulkLogs(bulkJsonState);
  const dashboardLogs = collectDashboardLogs(state?.logs, bulkLogs, liveLogs);

  async function loadRagStatus() {
    setStatusLoading(true);
    setRagStatusError(null);

    try {
      const response = await fetch("/api/admin/rag/status", {
        method: "GET",
        cache: "no-store",
      });
      const payload = (await response.json()) as RagStatusResponse & {
        error?: string;
      };

      if (!response.ok || !payload.success) {
        setRagStatus(null);
        setRagStatusError(payload.error ?? "Could not load RAG status.");
        return;
      }

      setRagStatus(payload);
    } catch (error) {
      setRagStatus(null);
      setRagStatusError(
        error instanceof Error ? error.message : "Could not load RAG status.",
      );
    } finally {
      setStatusLoading(false);
    }
  }

  useEffect(() => {
    void loadRagStatus();
  }, []);

  useEffect(() => {
    const targets: Array<{ ingestId: string; prefix: boolean }> = [];

    if (isPending && activeIngestId) {
      targets.push({ ingestId: activeIngestId, prefix: false });
    }

    if (bulkJsonPending && activeBulkIngestId) {
      targets.push({ ingestId: activeBulkIngestId, prefix: true });
    }

    if (targets.length === 0) {
      setLiveLogs([]);
      return;
    }

    let cancelled = false;

    async function pollLiveLogs() {
      try {
        const responses = await Promise.all(
          targets.map(async (target) => {
            const query = new URLSearchParams({
              ingestId: target.ingestId,
              prefix: target.prefix ? "1" : "0",
            });
            const response = await fetch(
              `/api/admin/rag/logs?${query.toString()}`,
              {
                method: "GET",
                cache: "no-store",
              },
            );

            if (!response.ok) {
              return [] as DashboardLogEntry[];
            }

            const payload = (await response.json()) as LiveRagLogsResponse;
            if (!payload.success || !payload.logs) {
              return [] as DashboardLogEntry[];
            }

            return payload.logs;
          }),
        );

        if (!cancelled) {
          setLiveLogs(responses.flat());
        }
      } catch {
        if (!cancelled) {
          setLiveLogs([]);
        }
      }
    }

    void pollLiveLogs();
    const intervalId = setInterval(() => {
      void pollLiveLogs();
    }, 1400);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [activeBulkIngestId, activeIngestId, bulkJsonPending, isPending]);

  async function handleIngestJsonSources() {
    const ingestId = crypto.randomUUID();
    setBulkJsonPending(true);
    setBulkJsonState(null);
    setActiveBulkIngestId(ingestId);
    setLiveLogs([]);

    try {
      const response = await fetch("/api/admin/rag/ingest-json-sources", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ embeddingProvider, ingestId }),
      });

      const payload = (await response.json()) as BulkJsonIngestionResponse;
      setBulkJsonState(payload);

      if (response.ok && payload.success) {
        void loadRagStatus();
      }
    } catch (error) {
      setBulkJsonState({
        success: false,
        chunksInserted: 0,
        embeddingProvider,
        filesDiscovered: 0,
        filesFailed: 0,
        filesSucceeded: 0,
        ingestId: crypto.randomUUID(),
        message: "Could not ingest dictionary and grammar JSON files.",
        error:
          error instanceof Error
            ? error.message
            : "Unknown ingestion request error.",
      });
    } finally {
      setBulkJsonPending(false);
      setActiveBulkIngestId(null);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setState(null);
    setLiveLogs([]);

    try {
      const startedAt = performance.now();
      const formData = new FormData(event.currentTarget);
      const ingestId = crypto.randomUUID();
      setActiveIngestId(ingestId);
      formData.set("ingest_id", ingestId);

      let selectedProvider: "gemini" | "openrouter" | "hf" = "hf";
      if (formData.get("embedding_provider") === "gemini") {
        selectedProvider = "gemini";
      } else if (formData.get("embedding_provider") === "openrouter") {
        selectedProvider = "openrouter";
      }
      setEmbeddingProvider(selectedProvider);
      console.warn(
        `[RAG] Starting ingestion ${ingestId} with provider=${selectedProvider}. Watch server logs for stage timings.`,
      );

      const response = await fetch("/api/admin/rag/ingest", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as RagIngestionState;

      if (!response.ok) {
        setState({
          success: false,
          embeddingProvider: payload.embeddingProvider,
          error: payload.error ?? "Could not ingest this file.",
          ingestId: payload.ingestId,
          logs: payload.logs,
        });
        return;
      }

      setState({
        success: true,
        chunkStats: payload.chunkStats,
        chunksInserted: payload.chunksInserted,
        embeddingProvider: payload.embeddingProvider,
        ingestId: payload.ingestId,
        logs: payload.logs,
        message: payload.message,
        ocrUsed: payload.ocrUsed,
        sourceName: payload.sourceName,
      });

      console.warn(
        `[RAG] Completed ingestion request ${payload.ingestId ?? "(no id)"} in ${Math.round(performance.now() - startedAt)} ms.`,
      );
      void loadRagStatus();
    } catch (error) {
      setState({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not ingest this file.",
      });
    } finally {
      setIsPending(false);
      setActiveIngestId(null);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <SurfacePanel rounded="4xl" variant="elevated" className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <Badge tone="accent" size="xs" caps>
            System Status
          </Badge>
          <button
            type="button"
            onClick={() => {
              void loadRagStatus();
            }}
            className={buttonClassName({ size: "sm", variant: "secondary" })}
          >
            Refresh
          </button>
        </div>

        {statusLoading && (
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Checking RAG services...
          </p>
        )}
        {!statusLoading && ragStatusError && (
          <p className="text-xs text-red-500 dark:text-red-300">
            {ragStatusError}
          </p>
        )}
        {!statusLoading && !ragStatusError && ragStatus && (
          <ul className="space-y-2 text-base">
            <li className="flex items-start gap-3">
              <StatusDot healthy={ragStatus.statuses.llm.healthy} />
              <span className="text-stone-700 dark:text-stone-200">
                {ragStatus.statuses.llm.label}
                {ragStatus.statuses.llm.note ? (
                  <span className="ml-1 text-xs text-stone-500 dark:text-stone-400">
                    {ragStatus.statuses.llm.note}
                  </span>
                ) : null}
              </span>
            </li>
            <li className="flex items-start gap-3">
              <StatusDot healthy={ragStatus.statuses.embeddingModel.healthy} />
              <span className="text-stone-700 dark:text-stone-200">
                {ragStatus.statuses.embeddingModel.label}
                {ragStatus.statuses.embeddingModel.note ? (
                  <span className="ml-1 text-xs text-stone-500 dark:text-stone-400">
                    {ragStatus.statuses.embeddingModel.note}
                  </span>
                ) : null}
              </span>
            </li>
            <li className="flex items-start gap-3">
              <StatusDot
                healthy={ragStatus.statuses.dictionaryJsonRag.healthy}
              />
              <span className="text-stone-700 dark:text-stone-200">
                {ragStatus.statuses.dictionaryJsonRag.label}
                {ragStatus.statuses.dictionaryJsonRag.note ? (
                  <span className="ml-1 text-xs text-stone-500 dark:text-stone-400">
                    {ragStatus.statuses.dictionaryJsonRag.note}
                  </span>
                ) : null}
              </span>
            </li>
            <li className="flex items-start gap-3">
              <StatusDot healthy={ragStatus.statuses.grammarJsonRag.healthy} />
              <span className="text-stone-700 dark:text-stone-200">
                {ragStatus.statuses.grammarJsonRag.label}
                {ragStatus.statuses.grammarJsonRag.note ? (
                  <span className="ml-1 text-xs text-stone-500 dark:text-stone-400">
                    {ragStatus.statuses.grammarJsonRag.note}
                  </span>
                ) : null}
              </span>
            </li>
            <li className="flex items-start gap-3">
              <StatusDot healthy={ragStatus.statuses.vectorDb.healthy} />
              <span className="text-stone-700 dark:text-stone-200">
                {ragStatus.statuses.vectorDb.label}
                {ragStatus.statuses.vectorDb.note ? (
                  <span className="ml-1 text-xs text-stone-500 dark:text-stone-400">
                    {ragStatus.statuses.vectorDb.note}
                  </span>
                ) : null}
              </span>
            </li>
            <li className="flex items-start gap-3">
              <StatusDot healthy={ragStatus.statuses.knowledgeBase.healthy} />
              <span className="text-stone-700 dark:text-stone-200">
                {ragStatus.statuses.knowledgeBase.label}
                <span className="ml-1 text-sky-600 dark:text-sky-300">
                  ({formatNumber(ragStatus.chunkCount)} chunks)
                </span>
              </span>
            </li>
          </ul>
        )}
      </SurfacePanel>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-semibold text-stone-700 dark:text-stone-200">
            Source label
          </span>
          <input
            name="source_title"
            type="text"
            placeholder="Comprehensive Lexicon Volume 2"
            className="w-full rounded-xl border border-stone-200 bg-white/80 px-3 py-2 text-sm text-stone-900 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-300/35 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-stone-700 dark:text-stone-200">
            Knowledge file
          </span>
          <input
            name="file"
            type="file"
            accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown,text/csv,application/json,text/xml,text/html,image/*,.pdf,.docx,.txt,.md,.markdown,.csv,.tsv,.json,.xml,.html,.htm,.yaml,.yml"
            required
            className="block w-full rounded-xl border border-stone-200 bg-white/80 px-3 py-2 text-sm text-stone-900 shadow-sm file:mr-4 file:rounded-lg file:border-0 file:bg-sky-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-sky-800 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-300/35 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:file:bg-sky-900/40 dark:file:text-sky-200"
          />
        </label>
      </div>

      <label className="inline-flex items-center gap-2 text-sm text-stone-700 dark:text-stone-300">
        <input
          name="enable_ocr"
          type="checkbox"
          defaultChecked
          className="h-4 w-4 rounded border-stone-300 text-sky-600 focus:ring-sky-400"
        />
        Run OCR when PDF text extraction is weak
      </label>

      <label className="flex flex-col gap-2 text-sm text-stone-700 dark:text-stone-300 md:max-w-xs">
        <span className="font-semibold text-stone-700 dark:text-stone-200">
          Embedding provider
        </span>
        <select
          name="embedding_provider"
          value={embeddingProvider}
          onChange={(event) => {
            const value = event.target.value;
            let newProvider: "gemini" | "hf" | "openrouter" = "hf";
            if (value === "gemini") {
              newProvider = "gemini";
            } else if (value === "openrouter") {
              newProvider = "openrouter";
            }
            setEmbeddingProvider(newProvider);
          }}
          className="select-base h-11 rounded-xl bg-white/80 text-sm dark:bg-stone-900"
        >
          <option value="hf">Hugging Face</option>
          <option value="gemini">Gemini</option>
          <option value="openrouter">OpenRouter</option>
        </select>
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className={buttonClassName({ className: "px-6" })}
        >
          {isPending ? "Indexing file into RAG..." : "Ingest file into RAG"}
        </button>
        <button
          type="button"
          disabled={bulkJsonPending}
          onClick={() => {
            void handleIngestJsonSources();
          }}
          className={buttonClassName({
            className: "px-6",
            variant: "secondary",
          })}
        >
          {bulkJsonPending
            ? "Ingesting dictionary + grammar JSON..."
            : "Ingest dictionary + grammar JSON"}
        </button>
        <p className="text-xs text-stone-500 dark:text-stone-400">
          Supports PDF, DOCX, images (OCR), and text-like files.
        </p>
        <p className="text-xs text-stone-500 dark:text-stone-400">
          Default chunk profile: 1600 chars target with 200 chars overlap.
        </p>
      </div>

      {isPending && activeIngestId ? (
        <StatusNotice tone="info" align="left">
          Live logs are streaming for request <code>RAG:{activeIngestId}</code>.
        </StatusNotice>
      ) : null}

      {state?.error ? (
        <StatusNotice tone="error" align="left">
          {state.error}
        </StatusNotice>
      ) : null}

      {bulkJsonState?.error ? (
        <StatusNotice tone="error" align="left">
          {bulkJsonState.error}
        </StatusNotice>
      ) : null}

      {bulkJsonState?.message ? (
        <StatusNotice
          tone={bulkJsonState.success ? "success" : "error"}
          align="left"
        >
          {bulkJsonState.message}
          {bulkJsonState.ingestId
            ? ` Request ID: ${bulkJsonState.ingestId}.`
            : ""}
          {` Sources: ${formatNumber(bulkJsonState.filesSucceeded)}/${formatNumber(bulkJsonState.filesDiscovered)} succeeded.`}
        </StatusNotice>
      ) : null}

      {bulkJsonState?.results &&
      bulkJsonState.results.some((result) => !result.success) ? (
        <SurfacePanel
          rounded="3xl"
          variant="subtle"
          shadow="soft"
          className="border-amber-300/80 bg-amber-50/80 p-4 text-xs text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
        >
          <div className="mb-2 flex items-center gap-2">
            <Badge
              tone="surface"
              size="xs"
              caps
              className="border-amber-300/80"
            >
              Partial Failures
            </Badge>
            <p className="font-semibold">Failed JSON sources</p>
          </div>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {bulkJsonState.results
              .filter((result) => !result.success)
              .slice(0, 5)
              .map((result) => (
                <li key={result.sourcePath}>
                  {result.sourcePath}: {result.error ?? "Unknown error"}
                </li>
              ))}
          </ul>
        </SurfacePanel>
      ) : null}

      <SurfacePanel rounded="4xl" variant="elevated" className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <Badge tone="surface" size="xs" caps>
            Logs
          </Badge>
          <p className="text-[11px] text-stone-500 dark:text-stone-400">
            {formatNumber(dashboardLogs.length)} entries
          </p>
        </div>

        {dashboardLogs.length === 0 ? (
          <p className="rounded-2xl border border-stone-200 bg-stone-50/80 px-3 py-2 text-xs text-stone-500 dark:border-stone-700 dark:bg-stone-950/40 dark:text-stone-400">
            {isPending || bulkJsonPending
              ? "Ingestion is running. Logs will appear here as batches complete."
              : "No ingestion logs yet. Run file or JSON ingestion to populate this stream."}
          </p>
        ) : (
          <div
            className="max-h-64 space-y-1 overflow-y-auto rounded-2xl border border-stone-200 bg-stone-50/80 p-3 font-mono text-[11px] dark:border-stone-700 dark:bg-stone-950/40"
            aria-live="polite"
          >
            {dashboardLogs.map((log, index) => (
              <p
                key={`${log.timestamp}-${index}`}
                className="leading-relaxed text-stone-600 dark:text-stone-300"
              >
                {log.line ? (
                  <span>{log.line}</span>
                ) : (
                  <>
                    <span className="text-sky-600 dark:text-sky-300">
                      [{formatLogTimestamp(log.timestamp)}]
                    </span>{" "}
                    {"sourcePath" in log && log.sourcePath ? (
                      <span className="text-emerald-700 dark:text-emerald-300">
                        {log.sourcePath}{" "}
                      </span>
                    ) : null}
                    <span>{log.message}</span>
                  </>
                )}
              </p>
            ))}
          </div>
        )}
      </SurfacePanel>

      {state?.success ? (
        <StatusNotice tone="success" align="left">
          {state.message}
          {getEmbeddingProviderLabel(state.embeddingProvider)
            ? ` Provider: ${getEmbeddingProviderLabel(state.embeddingProvider)}.`
            : ""}
          {typeof state.chunksInserted === "number"
            ? ` Chunks: ${state.chunksInserted}.`
            : ""}
          {typeof state.ocrUsed === "boolean"
            ? ` OCR used: ${state.ocrUsed ? "yes" : "no"}.`
            : ""}
          {state.ingestId ? ` Request ID: ${state.ingestId}.` : ""}
        </StatusNotice>
      ) : null}

      {state?.success && state.chunkStats ? (
        <SurfacePanel
          rounded="3xl"
          variant="subtle"
          shadow="soft"
          className="p-4 text-sm text-stone-700 dark:text-stone-200"
        >
          <div className="mb-3 flex items-center gap-2">
            <Badge tone="surface" size="xs" caps>
              Chunk Profile
            </Badge>
            <p className="font-semibold">Chunk details</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <p>
              Source text chars (normalized):{" "}
              {formatNumber(state.chunkStats.sourceTextChars)}
            </p>
            <p>
              Total chunk chars stored:{" "}
              {formatNumber(state.chunkStats.totalChunkChars)}
            </p>
            <p>Total chunks: {formatNumber(state.chunkStats.totalChunks)}</p>
            <p>
              Target size / overlap:{" "}
              {formatNumber(state.chunkStats.chunkSizeTarget)} /{" "}
              {formatNumber(state.chunkStats.chunkOverlap)}
            </p>
            <p>
              Min / Avg / Max chunk chars:{" "}
              {formatNumber(state.chunkStats.minChunkChars)} /{" "}
              {formatNumber(state.chunkStats.avgChunkChars)} /{" "}
              {formatNumber(state.chunkStats.maxChunkChars)}
            </p>
            <p>
              Min / Avg / Max chunk words:{" "}
              {formatNumber(state.chunkStats.minChunkWords)} /{" "}
              {formatNumber(state.chunkStats.avgChunkWords)} /{" "}
              {formatNumber(state.chunkStats.maxChunkWords)}
            </p>
            <p>
              Est. tokens total:{" "}
              {formatNumber(state.chunkStats.totalEstimatedTokens)}
            </p>
            <p>
              Est. tokens per chunk (min / avg / max):{" "}
              {formatNumber(state.chunkStats.minChunkEstimatedTokens)} /{" "}
              {formatNumber(state.chunkStats.avgChunkEstimatedTokens)} /{" "}
              {formatNumber(state.chunkStats.maxChunkEstimatedTokens)}
            </p>
            <p>
              Overlap overhead:{" "}
              {state.chunkStats.overlapOverheadPct > 0 ? "+" : ""}
              {state.chunkStats.overlapOverheadPct}%
            </p>
            <p>
              Embedding batches:{" "}
              {formatNumber(state.chunkStats.embeddingBatchesPlanned)} (size{" "}
              {formatNumber(state.chunkStats.embeddingBatchSize)})
            </p>
            <p>
              Insert batches:{" "}
              {formatNumber(state.chunkStats.insertBatchesPlanned)} (size{" "}
              {formatNumber(state.chunkStats.insertBatchSize)})
            </p>
          </div>
        </SurfacePanel>
      ) : null}
    </form>
  );
}
