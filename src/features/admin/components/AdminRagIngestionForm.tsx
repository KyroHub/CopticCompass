"use client";

import { useCallback, useEffect, useState } from "react";

import type { RagIngestionState } from "@/actions/admin/states";
import { buttonClassName } from "@/components/Button";
import { useLanguage } from "@/components/LanguageProvider";
import { StatusNotice } from "@/components/StatusNotice";
import { SurfacePanel } from "@/components/SurfacePanel";
import { AdminErrorDisclosure } from "@/features/admin/components/AdminErrorDisclosure";
import { readJsonResponse, summarizeResponseText } from "@/lib/response";
import type { Language } from "@/types/i18n";

import type { ReactNode } from "react";

const adminRagIngestionFormCopy = {
  en: {
    bulkIngest: "Ingest dictionary + grammar JSON",
    bulkIngesting: "Ingesting dictionary + grammar JSON...",
    checking: "Checking RAG services...",
    chunkDetails: "Chunk details",
    chunkProfile: "Chunk Profile",
    chunks: "chunks",
    chunksLabel: "Chunks",
    defaultChunkProfile:
      "Default chunk profile: 1600 chars target with 200 chars overlap.",
    embeddingBatches: "Embedding batches",
    embeddingProvider: "Embedding provider",
    entries: "entries",
    estimatedTokensPerChunk: "Est. tokens per chunk (min / avg / max)",
    estimatedTokensTotal: "Est. tokens total",
    failedJsonSources: "Failed JSON sources",
    fileIngest: "Ingest file into RAG",
    fileIngesting: "Indexing file into RAG...",
    forceOcr: "Force OCR for PDF extraction (bypass native PDF text)",
    insertBatches: "Insert batches",
    liveLogs: "Live logs are streaming for request",
    logs: "Logs",
    logsEmpty:
      "No ingestion logs yet. Run file or JSON ingestion to populate this stream.",
    logsRunning:
      "Ingestion is running. Logs will appear here as batches complete.",
    loadError: "Could not load RAG status.",
    ocrNo: "no",
    ocrUsed: "OCR used",
    ocrYes: "yes",
    overlapOverhead: "Overlap overhead",
    partialFailures: "Partial Failures",
    provider: "Provider",
    refresh: "Refresh",
    requestId: "Request ID",
    sourceLabel: "Source label",
    sources: "Sources",
    sourceTextChars: "Source text chars (normalized)",
    succeeded: "succeeded",
    supports: "Supports PDF, DOCX, images (OCR), and text-like files.",
    systemStatus: "System Status",
    targetOverlap: "Target size / overlap",
    totalChunkChars: "Total chunk chars stored",
    totalChunks: "Total chunks",
    unknownError: "Unknown error",
    unknownRequestError: "Unknown ingestion request error.",
    uploadError: "Could not ingest this file.",
    jsonError: "Could not ingest dictionary and grammar JSON files.",
    knowledgeFile: "Knowledge file",
    minAvgMaxChunkChars: "Min / Avg / Max chunk chars",
    minAvgMaxChunkWords: "Min / Avg / Max chunk words",
    runOcr: "Run OCR when PDF text extraction is weak",
    size: "size",
  },
  nl: {
    bulkIngest: "Woordenboek- en grammatica-JSON invoeren",
    bulkIngesting: "Woordenboek- en grammatica-JSON wordt ingevoerd...",
    checking: "RAG-services worden gecontroleerd...",
    chunkDetails: "Chunkdetails",
    chunkProfile: "Chunkprofiel",
    chunks: "chunks",
    chunksLabel: "Chunks",
    defaultChunkProfile:
      "Standaard chunkprofiel: doel van 1600 tekens met 200 tekens overlap.",
    embeddingBatches: "Embeddingbatches",
    embeddingProvider: "Embeddingprovider",
    entries: "items",
    estimatedTokensPerChunk: "Geschatte tokens per chunk (min / gem. / max)",
    estimatedTokensTotal: "Geschatte tokens totaal",
    failedJsonSources: "Mislukte JSON-bronnen",
    fileIngest: "Bestand in RAG invoeren",
    fileIngesting: "Bestand wordt in RAG geindexeerd...",
    forceOcr: "OCR forceren voor PDF-extractie (native PDF-tekst overslaan)",
    insertBatches: "Invoegbatches",
    liveLogs: "Live logs streamen voor request",
    logs: "Logs",
    logsEmpty:
      "Nog geen invoerlogs. Start bestands- of JSON-invoer om deze stream te vullen.",
    logsRunning:
      "Invoer loopt. Logs verschijnen hier zodra batches klaar zijn.",
    loadError: "RAG-status kon niet worden geladen.",
    ocrNo: "nee",
    ocrUsed: "OCR gebruikt",
    ocrYes: "ja",
    overlapOverhead: "Overlapoverhead",
    partialFailures: "Gedeeltelijke fouten",
    provider: "Provider",
    refresh: "Vernieuwen",
    requestId: "Request-ID",
    sourceLabel: "Bronlabel",
    sources: "Bronnen",
    sourceTextChars: "Bronteksttekens (genormaliseerd)",
    succeeded: "geslaagd",
    supports:
      "Ondersteunt PDF, DOCX, afbeeldingen (OCR) en tekstachtige bestanden.",
    systemStatus: "Systeemstatus",
    targetOverlap: "Doelgrootte / overlap",
    totalChunkChars: "Totaal opgeslagen chunktekens",
    totalChunks: "Totaal aantal chunks",
    unknownError: "Onbekende fout",
    unknownRequestError: "Onbekende invoerrequestfout.",
    uploadError: "Dit bestand kon niet worden ingevoerd.",
    jsonError:
      "Woordenboek- en grammatica-JSON-bestanden konden niet worden ingevoerd.",
    knowledgeFile: "Kennisbestand",
    minAvgMaxChunkChars: "Min / Gem. / Max chunktekens",
    minAvgMaxChunkWords: "Min / Gem. / Max chunkwoorden",
    runOcr: "OCR uitvoeren wanneer PDF-tekstextractie zwak is",
    size: "grootte",
  },
} as const;

function formatNumber(value: number, language: Language) {
  return new Intl.NumberFormat(language === "nl" ? "nl-BE" : "en-US").format(
    value,
  );
}

function formatLogTimestamp(value: string, language: Language) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleTimeString(language === "nl" ? "nl-BE" : "en-US");
}

function toEmbeddingProvider(
  value: FormDataEntryValue | string | null,
): "gemini" | "hf" | "openrouter" {
  if (value === "gemini") {
    return "gemini";
  }

  if (value === "openrouter") {
    return "openrouter";
  }

  return "hf";
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

  return "Hugging Face";
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
        healthy ? "bg-coptic" : "bg-danger"
      }`}
    />
  );
}

function RagStatusCard({
  detail,
  status,
}: {
  detail?: ReactNode;
  status: RagStatusItem;
}) {
  return (
    <li className="flex min-h-20 items-start gap-3 rounded-lg border border-line bg-surface/80 p-4 shadow-sm">
      <StatusDot healthy={status.healthy} />
      <span className="min-w-0 text-sm leading-6 text-ink">
        <span className="block font-semibold">{status.label}</span>
        {status.note ? (
          <span className="block text-xs leading-5 text-muted">
            {status.note}
          </span>
        ) : null}
        {detail}
      </span>
    </li>
  );
}

function RagMetricCard({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <div className="rounded-lg border border-line bg-surface/80 p-4 text-sm shadow-sm">
      <dt className="text-xs font-semibold uppercase tracking-widest text-muted">
        {label}
      </dt>
      <dd className="mt-2 font-semibold text-ink">{children}</dd>
    </div>
  );
}

export function AdminRagIngestionForm() {
  const { language } = useLanguage();
  const copy = adminRagIngestionFormCopy[language];
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
  const failedBulkJsonResults =
    bulkJsonState?.results?.filter((result) => !result.success) ?? [];

  const loadRagStatus = useCallback(async () => {
    setStatusLoading(true);
    setRagStatusError(null);

    try {
      const response = await fetch("/api/admin/rag/status", {
        method: "GET",
        cache: "no-store",
      });
      const { data: payload, text } = await readJsonResponse<
        RagStatusResponse & {
          error?: string;
        }
      >(response);

      if (!payload) {
        setRagStatus(null);
        setRagStatusError(summarizeResponseText(text, copy.loadError));
        return;
      }

      const payloadWithError = payload as RagStatusResponse & {
        error?: string;
      };

      if (!response.ok || !payloadWithError.success) {
        setRagStatus(null);
        setRagStatusError(payloadWithError.error ?? copy.loadError);
        return;
      }

      setRagStatus(payloadWithError);
    } catch (error) {
      setRagStatus(null);
      setRagStatusError(
        error instanceof Error ? error.message : copy.loadError,
      );
    } finally {
      setStatusLoading(false);
    }
  }, [copy.loadError]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadRagStatus();
    });
  }, [loadRagStatus]);

  useEffect(() => {
    const targets: Array<{ ingestId: string; prefix: boolean }> = [];

    if (isPending && activeIngestId) {
      targets.push({ ingestId: activeIngestId, prefix: false });
    }

    if (bulkJsonPending && activeBulkIngestId) {
      targets.push({ ingestId: activeBulkIngestId, prefix: true });
    }

    if (targets.length === 0) {
      queueMicrotask(() => {
        setLiveLogs([]);
      });
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

            const { data: payload } =
              await readJsonResponse<LiveRagLogsResponse>(response);
            if (!payload?.success || !payload.logs) {
              return [] as DashboardLogEntry[];
            }

            return payload.logs;
          }),
        );

        if (!cancelled) {
          queueMicrotask(() => {
            setLiveLogs(responses.flat());
          });
        }
      } catch {
        if (!cancelled) {
          queueMicrotask(() => {
            setLiveLogs([]);
          });
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

      const { data: payload, text } =
        await readJsonResponse<BulkJsonIngestionResponse>(response);

      if (!payload) {
        setBulkJsonState({
          success: false,
          chunksInserted: 0,
          embeddingProvider,
          filesDiscovered: 0,
          filesFailed: 0,
          filesSucceeded: 0,
          ingestId,
          message: copy.jsonError,
          error: summarizeResponseText(text, copy.unknownRequestError),
        });
        return;
      }

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
        ingestId,
        message: copy.jsonError,
        error:
          error instanceof Error ? error.message : copy.unknownRequestError,
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

      const selectedProvider = toEmbeddingProvider(
        formData.get("embedding_provider"),
      );
      setEmbeddingProvider(selectedProvider);
      console.warn(
        `[RAG] Starting ingestion ${ingestId} with provider=${selectedProvider}. Watch server logs for stage timings.`,
      );

      const response = await fetch("/api/admin/rag/ingest", {
        method: "POST",
        body: formData,
      });

      const { data: payload, text } =
        await readJsonResponse<RagIngestionState>(response);

      if (!payload) {
        setState({
          success: false,
          error: summarizeResponseText(text, copy.unknownRequestError),
          ingestId,
        });
        return;
      }

      if (!response.ok) {
        setState({
          success: false,
          embeddingProvider: payload.embeddingProvider,
          error: payload.error ?? copy.uploadError,
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
        error: error instanceof Error ? error.message : copy.uploadError,
      });
    } finally {
      setIsPending(false);
      setActiveIngestId(null);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <SurfacePanel rounded="lg" variant="subtle" shadow="soft" className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            {copy.systemStatus}
          </p>
          <button
            type="button"
            onClick={() => {
              void loadRagStatus();
            }}
            className={buttonClassName({ size: "sm", variant: "secondary" })}
          >
            {copy.refresh}
          </button>
        </div>

        {statusLoading ? (
          <p className="rounded-lg border border-line bg-surface/80 px-4 py-3 text-sm text-muted shadow-sm">
            {copy.checking}
          </p>
        ) : null}

        {!statusLoading && ragStatusError ? (
          <AdminErrorDisclosure
            language={language}
            message={copy.loadError}
            technicalDetails={ragStatusError}
          />
        ) : null}

        {!statusLoading && !ragStatusError && ragStatus ? (
          <ul className="grid gap-3 md:grid-cols-2">
            <RagStatusCard status={ragStatus.statuses.llm} />
            <RagStatusCard status={ragStatus.statuses.embeddingModel} />
            <RagStatusCard status={ragStatus.statuses.dictionaryJsonRag} />
            <RagStatusCard status={ragStatus.statuses.grammarJsonRag} />
            <RagStatusCard status={ragStatus.statuses.vectorDb} />
            <RagStatusCard
              status={ragStatus.statuses.knowledgeBase}
              detail={
                <span className="mt-1 block text-xs font-semibold text-coptic">
                  {formatNumber(ragStatus.chunkCount, language)} {copy.chunks}
                </span>
              }
            />
          </ul>
        ) : null}
      </SurfacePanel>

      <SurfacePanel rounded="lg" variant="subtle" shadow="soft" className="p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-ink">
              {copy.sourceLabel}
            </span>
            <input
              name="source_title"
              type="text"
              placeholder="Comprehensive Lexicon Volume 2"
              className="input-base text-sm"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-ink">
              {copy.knowledgeFile}
            </span>
            <input
              name="file"
              type="file"
              accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown,text/csv,application/json,text/xml,text/html,image/*,.pdf,.docx,.txt,.md,.markdown,.csv,.tsv,.json,.xml,.html,.htm,.yaml,.yml"
              required
              className="input-base h-auto py-2 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-accent-soft file:px-3 file:py-2 file:text-sm file:font-semibold file:text-accent-strong"
            />
          </label>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(14rem,18rem)]">
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="checkbox-row border border-line bg-surface/75 shadow-sm">
              <input
                name="enable_ocr"
                type="checkbox"
                defaultChecked
                className="checkbox-base"
              />
              <span className="text-sm leading-6 text-muted">
                {copy.runOcr}
              </span>
            </label>

            <label className="checkbox-row border border-line bg-surface/75 shadow-sm">
              <input
                name="force_ocr"
                type="checkbox"
                className="checkbox-base"
              />
              <span className="text-sm leading-6 text-muted">
                {copy.forceOcr}
              </span>
            </label>
          </div>

          <label className="flex flex-col gap-2 text-sm text-muted">
            <span className="font-semibold text-ink">
              {copy.embeddingProvider}
            </span>
            <select
              name="embedding_provider"
              value={embeddingProvider}
              onChange={(event) => {
                setEmbeddingProvider(toEmbeddingProvider(event.target.value));
              }}
              className="compact-select-base"
            >
              <option value="hf">Hugging Face</option>
              <option value="gemini">Gemini</option>
              <option value="openrouter">OpenRouter</option>
            </select>
          </label>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={isPending}
            className={buttonClassName({ className: "px-6" })}
          >
            {isPending ? copy.fileIngesting : copy.fileIngest}
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
            {bulkJsonPending ? copy.bulkIngesting : copy.bulkIngest}
          </button>
        </div>

        <div className="mt-4 grid gap-2 text-xs leading-5 text-muted md:grid-cols-2">
          <p>{copy.supports}</p>
          <p>{copy.defaultChunkProfile}</p>
        </div>
      </SurfacePanel>

      {isPending && activeIngestId ? (
        <StatusNotice tone="info" align="left">
          {copy.liveLogs} <code>RAG:{activeIngestId}</code>.
        </StatusNotice>
      ) : null}

      {state?.error ? (
        <AdminErrorDisclosure
          language={language}
          message={copy.uploadError}
          technicalDetails={state.error}
        />
      ) : null}

      {bulkJsonState?.error ? (
        <AdminErrorDisclosure
          language={language}
          message={copy.jsonError}
          technicalDetails={bulkJsonState.error}
        />
      ) : null}

      {bulkJsonState?.message ? (
        <StatusNotice
          tone={bulkJsonState.success ? "success" : "error"}
          align="left"
        >
          {bulkJsonState.message}
          {bulkJsonState.ingestId
            ? ` ${copy.requestId}: ${bulkJsonState.ingestId}.`
            : ""}
          {` ${copy.sources}: ${formatNumber(
            bulkJsonState.filesSucceeded,
            language,
          )}/${formatNumber(
            bulkJsonState.filesDiscovered,
            language,
          )} ${copy.succeeded}.`}
        </StatusNotice>
      ) : null}

      {failedBulkJsonResults.length > 0 ? (
        <AdminErrorDisclosure
          language={language}
          message={
            <div>
              <p className="font-semibold">
                {copy.partialFailures}: {copy.failedJsonSources}
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
                {failedBulkJsonResults.slice(0, 5).map((result) => (
                  <li key={result.sourcePath}>{result.sourcePath}</li>
                ))}
              </ul>
            </div>
          }
          technicalDetails={failedBulkJsonResults.map((result) => ({
            error: result.error ?? copy.unknownError,
            sourcePath: result.sourcePath,
          }))}
          tone="warning"
        />
      ) : null}

      <SurfacePanel rounded="lg" variant="subtle" shadow="soft" className="p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            {copy.logs}
          </p>
          <p className="text-[11px] text-muted">
            {formatNumber(dashboardLogs.length, language)} {copy.entries}
          </p>
        </div>

        {dashboardLogs.length === 0 ? (
          <p className="rounded-lg border border-line bg-surface/80 px-4 py-3 text-xs text-muted shadow-sm">
            {isPending || bulkJsonPending ? copy.logsRunning : copy.logsEmpty}
          </p>
        ) : (
          <div
            className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-line bg-surface/80 p-3 font-mono text-[11px] shadow-sm"
            aria-live="polite"
          >
            {dashboardLogs.map((log, index) => (
              <p
                key={`${log.timestamp}-${index}`}
                className="leading-relaxed text-muted"
              >
                {log.line ? (
                  <span>{log.line}</span>
                ) : (
                  <>
                    <span className="text-accent-strong dark:text-accent">
                      [{formatLogTimestamp(log.timestamp, language)}]
                    </span>{" "}
                    {log.sourcePath ? (
                      <span className="text-coptic">{log.sourcePath} </span>
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
          {state.embeddingProvider
            ? ` ${copy.provider}: ${getEmbeddingProviderLabel(
                state.embeddingProvider,
              )}.`
            : ""}
          {typeof state.chunksInserted === "number"
            ? ` ${copy.chunksLabel}: ${formatNumber(
                state.chunksInserted,
                language,
              )}.`
            : ""}
          {typeof state.ocrUsed === "boolean"
            ? ` ${copy.ocrUsed}: ${state.ocrUsed ? copy.ocrYes : copy.ocrNo}.`
            : ""}
          {state.ingestId ? ` ${copy.requestId}: ${state.ingestId}.` : ""}
        </StatusNotice>
      ) : null}

      {state?.success && state.chunkStats ? (
        <SurfacePanel
          rounded="lg"
          variant="subtle"
          shadow="soft"
          className="p-5 text-ink"
        >
          <p className="mb-3 font-semibold">{copy.chunkDetails}</p>
          <dl className="grid gap-3 sm:grid-cols-2">
            <RagMetricCard label={copy.sourceTextChars}>
              {formatNumber(state.chunkStats.sourceTextChars, language)}
            </RagMetricCard>
            <RagMetricCard label={copy.totalChunkChars}>
              {formatNumber(state.chunkStats.totalChunkChars, language)}
            </RagMetricCard>
            <RagMetricCard label={copy.totalChunks}>
              {formatNumber(state.chunkStats.totalChunks, language)}
            </RagMetricCard>
            <RagMetricCard label={copy.targetOverlap}>
              {formatNumber(state.chunkStats.chunkSizeTarget, language)} /{" "}
              {formatNumber(state.chunkStats.chunkOverlap, language)}
            </RagMetricCard>
            <RagMetricCard label={copy.minAvgMaxChunkChars}>
              {formatNumber(state.chunkStats.minChunkChars, language)} /{" "}
              {formatNumber(state.chunkStats.avgChunkChars, language)} /{" "}
              {formatNumber(state.chunkStats.maxChunkChars, language)}
            </RagMetricCard>
            <RagMetricCard label={copy.minAvgMaxChunkWords}>
              {formatNumber(state.chunkStats.minChunkWords, language)} /{" "}
              {formatNumber(state.chunkStats.avgChunkWords, language)} /{" "}
              {formatNumber(state.chunkStats.maxChunkWords, language)}
            </RagMetricCard>
            <RagMetricCard label={copy.estimatedTokensTotal}>
              {formatNumber(state.chunkStats.totalEstimatedTokens, language)}
            </RagMetricCard>
            <RagMetricCard label={copy.estimatedTokensPerChunk}>
              {formatNumber(state.chunkStats.minChunkEstimatedTokens, language)}{" "}
              /{" "}
              {formatNumber(state.chunkStats.avgChunkEstimatedTokens, language)}{" "}
              /{" "}
              {formatNumber(state.chunkStats.maxChunkEstimatedTokens, language)}
            </RagMetricCard>
            <RagMetricCard label={copy.overlapOverhead}>
              {state.chunkStats.overlapOverheadPct > 0 ? "+" : ""}
              {state.chunkStats.overlapOverheadPct}%
            </RagMetricCard>
            <RagMetricCard label={copy.embeddingBatches}>
              {formatNumber(state.chunkStats.embeddingBatchesPlanned, language)}{" "}
              ({copy.size}{" "}
              {formatNumber(state.chunkStats.embeddingBatchSize, language)})
            </RagMetricCard>
            <RagMetricCard label={copy.insertBatches}>
              {formatNumber(state.chunkStats.insertBatchesPlanned, language)} (
              {copy.size}{" "}
              {formatNumber(state.chunkStats.insertBatchSize, language)})
            </RagMetricCard>
          </dl>
        </SurfacePanel>
      ) : null}
    </form>
  );
}
