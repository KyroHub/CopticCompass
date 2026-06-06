import {
  buildAdminRagBulkJsonErrorState,
  type AdminRagBulkJsonIngestionResponse,
  type AdminRagLiveLogsResponse,
  type AdminRagLogEntry,
  type AdminRagStatusResponse,
} from "@/lib/admin/ragDashboard";
import {
  toAdminRagEmbeddingProvider,
  type AdminRagEmbeddingProvider,
} from "@/lib/admin/ragRequestPayload";
import { readJsonResponse, summarizeResponseText } from "@/lib/response";

import type { RagIngestionState } from "../ragIngestionTypes";

type AdminRagDashboardFetch = typeof fetch;

type AdminRagLiveLogTarget = {
  ingestId: string;
  prefix: boolean;
};

type AdminRagStatusLoadResult = {
  error: string | null;
  status: AdminRagStatusResponse | null;
};

type AdminRagBulkJsonIngestionRequestResult = {
  shouldRefreshStatus: boolean;
  state: AdminRagBulkJsonIngestionResponse;
};

type AdminRagFileIngestionRequest = {
  formData: FormData;
  selectedProvider: AdminRagEmbeddingProvider;
};

type AdminRagFileIngestionRequestResult = {
  shouldRefreshStatus: boolean;
  state: RagIngestionState;
};

type AdminRagStatusMessages = {
  loadError: string;
};

type AdminRagBulkJsonMessages = {
  jsonError: string;
  unknownRequestError: string;
};

type AdminRagFileIngestionMessages = {
  unknownRequestError: string;
  uploadError: string;
};

function cloneFormData(source: FormData) {
  const clone = new FormData();
  source.forEach((value, key) => {
    clone.append(key, value);
  });
  return clone;
}

function createFormData(source: FormData | HTMLFormElement) {
  return source instanceof FormData
    ? cloneFormData(source)
    : new FormData(source);
}

/**
 * Creates the multipart upload payload while preserving the selected embedding
 * provider so the controller can update UI state before the network request.
 */
export function createAdminRagFileIngestionRequest(
  source: FormData | HTMLFormElement,
  ingestId: string,
): AdminRagFileIngestionRequest {
  const formData = createFormData(source);
  formData.set("ingest_id", ingestId);

  return {
    formData,
    selectedProvider: toAdminRagEmbeddingProvider(
      formData.get("embedding_provider"),
    ),
  };
}

export function getAdminRagLiveLogTargets(options: {
  activeBulkIngestId: string | null;
  activeIngestId: string | null;
  bulkJsonPending: boolean;
  isPending: boolean;
}) {
  const targets: AdminRagLiveLogTarget[] = [];

  if (options.isPending && options.activeIngestId) {
    targets.push({ ingestId: options.activeIngestId, prefix: false });
  }

  if (options.bulkJsonPending && options.activeBulkIngestId) {
    targets.push({ ingestId: options.activeBulkIngestId, prefix: true });
  }

  return targets;
}

export async function requestAdminRagStatus({
  fetcher,
  messages,
}: {
  fetcher: AdminRagDashboardFetch;
  messages: AdminRagStatusMessages;
}): Promise<AdminRagStatusLoadResult> {
  try {
    const response = await fetcher("/api/admin/rag/status", {
      method: "GET",
      cache: "no-store",
    });
    const { data: payload, text } = await readJsonResponse<
      AdminRagStatusResponse & {
        error?: string;
      }
    >(response);

    if (!payload) {
      return {
        error: summarizeResponseText(text, messages.loadError),
        status: null,
      };
    }

    if (!response.ok || !payload.success) {
      return {
        error: payload.error ?? messages.loadError,
        status: null,
      };
    }

    return {
      error: null,
      status: payload,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : messages.loadError,
      status: null,
    };
  }
}

async function requestAdminRagLiveLogTarget({
  fetcher,
  target,
}: {
  fetcher: AdminRagDashboardFetch;
  target: AdminRagLiveLogTarget;
}) {
  const query = new URLSearchParams({
    ingestId: target.ingestId,
    prefix: target.prefix ? "1" : "0",
  });
  const response = await fetcher(`/api/admin/rag/logs?${query.toString()}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    return [] as AdminRagLogEntry[];
  }

  const { data: payload } =
    await readJsonResponse<AdminRagLiveLogsResponse>(response);
  if (!payload?.success || !payload.logs) {
    return [] as AdminRagLogEntry[];
  }

  return payload.logs;
}

export async function requestAdminRagLiveLogs({
  fetcher,
  targets,
}: {
  fetcher: AdminRagDashboardFetch;
  targets: readonly AdminRagLiveLogTarget[];
}) {
  const responses = await Promise.all(
    targets.map((target) =>
      requestAdminRagLiveLogTarget({
        fetcher,
        target,
      }),
    ),
  );

  return responses.flat();
}

export async function requestAdminRagBulkJsonIngestion({
  embeddingProvider,
  fetcher,
  ingestId,
  messages,
}: {
  embeddingProvider: AdminRagEmbeddingProvider;
  fetcher: AdminRagDashboardFetch;
  ingestId: string;
  messages: AdminRagBulkJsonMessages;
}): Promise<AdminRagBulkJsonIngestionRequestResult> {
  try {
    const response = await fetcher("/api/admin/rag/ingest-json-sources", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ embeddingProvider, ingestId }),
    });

    const { data: payload, text } =
      await readJsonResponse<AdminRagBulkJsonIngestionResponse>(response);

    if (!payload) {
      return {
        shouldRefreshStatus: false,
        state: buildAdminRagBulkJsonErrorState({
          embeddingProvider,
          error: summarizeResponseText(text, messages.unknownRequestError),
          ingestId,
          message: messages.jsonError,
        }),
      };
    }

    return {
      shouldRefreshStatus: response.ok && payload.success,
      state: payload,
    };
  } catch (error) {
    return {
      shouldRefreshStatus: false,
      state: buildAdminRagBulkJsonErrorState({
        embeddingProvider,
        error:
          error instanceof Error ? error.message : messages.unknownRequestError,
        ingestId,
        message: messages.jsonError,
      }),
    };
  }
}

export async function requestAdminRagFileIngestion({
  fetcher,
  formData,
  ingestId,
  messages,
}: {
  fetcher: AdminRagDashboardFetch;
  formData: FormData;
  ingestId: string;
  messages: AdminRagFileIngestionMessages;
}): Promise<AdminRagFileIngestionRequestResult> {
  try {
    const response = await fetcher("/api/admin/rag/ingest", {
      method: "POST",
      body: formData,
    });

    const { data: payload, text } =
      await readJsonResponse<RagIngestionState>(response);

    if (!payload) {
      return {
        shouldRefreshStatus: false,
        state: {
          success: false,
          error: summarizeResponseText(text, messages.unknownRequestError),
          ingestId,
        },
      };
    }

    if (!response.ok) {
      return {
        shouldRefreshStatus: false,
        state: {
          success: false,
          embeddingProvider: payload.embeddingProvider,
          error: payload.error ?? messages.uploadError,
          ingestId: payload.ingestId,
          logs: payload.logs,
        },
      };
    }

    return {
      shouldRefreshStatus: true,
      state: {
        success: true,
        chunkStats: payload.chunkStats,
        chunksInserted: payload.chunksInserted,
        embeddingProvider: payload.embeddingProvider,
        ingestId: payload.ingestId,
        logs: payload.logs,
        message: payload.message,
        ocrUsed: payload.ocrUsed,
        sourceName: payload.sourceName,
      },
    };
  } catch (error) {
    return {
      shouldRefreshStatus: false,
      state: {
        success: false,
        error: error instanceof Error ? error.message : messages.uploadError,
      },
    };
  }
}
