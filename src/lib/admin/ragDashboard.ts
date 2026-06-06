import type { Language } from "@/types/i18n";

import type { AdminRagEmbeddingProvider } from "./ragRequestPayload";

export type AdminRagStatusItem = {
  healthy: boolean;
  label: string;
  note?: string;
};

export type AdminRagStatusResponse = {
  chunkCount: number;
  statuses: {
    embeddingModel: AdminRagStatusItem;
    grammarJsonRag: AdminRagStatusItem;
    dictionaryJsonRag: AdminRagStatusItem;
    knowledgeBase: AdminRagStatusItem;
    llm: AdminRagStatusItem;
    vectorDb: AdminRagStatusItem;
  };
  success: boolean;
};

export type AdminRagLogEntry = {
  line?: string;
  message: string;
  sourcePath?: string;
  timestamp: string;
};

export type AdminRagBulkJsonResult = {
  chunksInserted?: number;
  error?: string;
  logs?: AdminRagLogEntry[];
  sourcePath: string;
  success: boolean;
};

export type AdminRagBulkJsonIngestionResponse = {
  chunksInserted: number;
  embeddingProvider: AdminRagEmbeddingProvider;
  error?: string;
  filesDiscovered: number;
  filesFailed: number;
  filesSucceeded: number;
  ingestId: string;
  message: string;
  results?: AdminRagBulkJsonResult[];
  success: boolean;
};

export type AdminRagLiveLogsResponse = {
  error?: string;
  logs?: AdminRagLogEntry[];
  success: boolean;
};

export function formatAdminRagNumber(value: number, language: Language) {
  return new Intl.NumberFormat(language === "nl" ? "nl-BE" : "en-US").format(
    value,
  );
}

export function formatAdminRagLogTimestamp(value: string, language: Language) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleTimeString(language === "nl" ? "nl-BE" : "en-US");
}

export function getAdminRagEmbeddingProviderLabel(
  provider: AdminRagEmbeddingProvider | undefined,
) {
  if (provider === "gemini") {
    return "Gemini";
  }

  if (provider === "openrouter") {
    return "OpenRouter";
  }

  return "Hugging Face";
}

export function collectAdminRagBulkLogs(
  state: AdminRagBulkJsonIngestionResponse | null,
) {
  if (!state?.results) {
    return [] as AdminRagLogEntry[];
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

export function collectAdminRagDashboardLogs(
  singleLogs: readonly AdminRagLogEntry[] | undefined,
  bulkLogs: readonly AdminRagLogEntry[],
  liveLogs: readonly AdminRagLogEntry[],
) {
  const single: AdminRagLogEntry[] = (singleLogs ?? []).map((log) => ({
    line: log.line,
    message: log.message,
    timestamp: log.timestamp,
  }));
  const unique = new Map<string, AdminRagLogEntry>();

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

export function getFailedAdminRagBulkJsonResults(
  state: AdminRagBulkJsonIngestionResponse | null,
) {
  return state?.results?.filter((result) => !result.success) ?? [];
}

export function buildAdminRagBulkJsonErrorState(options: {
  embeddingProvider: AdminRagEmbeddingProvider;
  error: string;
  ingestId: string;
  message: string;
}): AdminRagBulkJsonIngestionResponse {
  return {
    success: false,
    chunksInserted: 0,
    embeddingProvider: options.embeddingProvider,
    filesDiscovered: 0,
    filesFailed: 0,
    filesSucceeded: 0,
    ingestId: options.ingestId,
    message: options.message,
    error: options.error,
  };
}
