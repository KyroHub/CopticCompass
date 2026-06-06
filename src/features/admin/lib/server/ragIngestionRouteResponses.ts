import type {
  AdminRagBulkJsonIngestionResponse,
  AdminRagBulkJsonResult,
  AdminRagLiveLogsResponse,
  AdminRagLogEntry,
} from "@/lib/admin/ragDashboard";

import type {
  RagEmbeddingProvider,
  RagIngestionResult,
  RagIngestionState,
} from "../ragIngestionTypes";
import type {
  AdminRagRouteAccessFailureResponses,
  AdminRagRouteJsonResult,
} from "./ragRouteAccess";

export type AdminRagErrorPayload = {
  error: string;
  ingestId?: string;
  success: false;
};

type AdminRagErrorAccessFailureResponses =
  AdminRagRouteAccessFailureResponses<AdminRagErrorPayload>;

type AdminRagLogsQueryParseResult =
  | {
      ingestId: string;
      prefix: boolean;
      success: true;
    }
  | {
      response: AdminRagRouteJsonResult<AdminRagErrorPayload>;
      success: false;
    };

export function getAdminRagErrorMessage(
  error: unknown,
  fallbackMessage: string,
) {
  return error instanceof Error ? error.message : fallbackMessage;
}

export function buildAdminRagErrorResponse(
  payload: AdminRagErrorPayload,
  status: number,
): AdminRagRouteJsonResult<AdminRagErrorPayload> {
  return {
    init: { status },
    payload,
  };
}

export function parseAdminRagLogsQuery(
  url: string,
): AdminRagLogsQueryParseResult {
  const { searchParams } = new URL(url);
  const ingestId = searchParams.get("ingestId")?.trim();
  const prefix = searchParams.get("prefix") === "1";

  if (!ingestId) {
    return {
      response: buildAdminRagErrorResponse(
        {
          success: false,
          error: "Missing ingestId query parameter.",
        },
        400,
      ),
      success: false,
    };
  }

  return {
    ingestId,
    prefix,
    success: true,
  };
}

export function buildAdminRagLogsSuccessResponse(options: {
  ingestId: string;
  logs: AdminRagLogEntry[];
  prefix: boolean;
}): AdminRagRouteJsonResult<
  AdminRagLiveLogsResponse & {
    ingestId: string;
    prefix: boolean;
  }
> {
  return {
    payload: {
      success: true,
      ingestId: options.ingestId,
      prefix: options.prefix,
      logs: options.logs,
    },
  };
}

export function buildAdminRagIngestionAccessFailureResponses(): AdminRagErrorAccessFailureResponses {
  return {
    runtimeUnavailable: buildAdminRagErrorResponse(
      {
        success: false,
        error: "RAG ingestion is unavailable right now.",
      },
      503,
    ),
    unauthenticated: buildAdminRagErrorResponse(
      {
        success: false,
        error: "You must be signed in to ingest files.",
      },
      401,
    ),
    forbidden: buildAdminRagErrorResponse(
      {
        success: false,
        error: "Only admins can ingest RAG documents.",
      },
      403,
    ),
  };
}

export function buildAdminRagLogsAccessFailureResponses(): AdminRagErrorAccessFailureResponses {
  return {
    runtimeUnavailable: buildAdminRagErrorResponse(
      {
        success: false,
        error: "RAG ingestion logs are unavailable right now.",
      },
      503,
    ),
    unauthenticated: buildAdminRagErrorResponse(
      {
        success: false,
        error: "You must be signed in to view RAG logs.",
      },
      401,
    ),
    forbidden: buildAdminRagErrorResponse(
      {
        success: false,
        error: "Only admins can view RAG logs.",
      },
      403,
    ),
  };
}

export function buildAdminRagFileIngestionResponse(options: {
  embeddingProvider: RagEmbeddingProvider;
  ingestId: string;
  result: RagIngestionResult;
}): AdminRagRouteJsonResult<RagIngestionState> {
  const payload = {
    ...options.result,
    embeddingProvider: options.embeddingProvider,
    ingestId: options.ingestId,
  };

  if (!options.result.success) {
    return {
      init: { status: 400 },
      payload,
    };
  }

  return { payload };
}

export function buildAdminRagJsonSourceEmptyFileResult(
  sourcePath: string,
): AdminRagBulkJsonResult {
  return {
    success: false,
    sourcePath,
    error: "File is empty.",
  };
}

export function buildAdminRagJsonSourceIngestionResult(options: {
  result: RagIngestionResult;
  sourcePath: string;
}): AdminRagBulkJsonResult {
  if (!options.result.success) {
    return {
      success: false,
      sourcePath: options.sourcePath,
      error: options.result.error ?? "Ingestion failed for this source file.",
      logs: options.result.logs,
    };
  }

  return {
    success: true,
    sourcePath: options.sourcePath,
    chunksInserted: options.result.chunksInserted ?? 0,
    logs: options.result.logs,
  };
}

export function buildAdminRagJsonSourceErrorResult(options: {
  error: unknown;
  sourcePath: string;
}): AdminRagBulkJsonResult {
  return {
    success: false,
    sourcePath: options.sourcePath,
    error: getAdminRagErrorMessage(options.error, "Unknown ingestion error."),
  };
}

export function buildAdminRagJsonSourcesIngestionResponse(options: {
  chunksInserted: number;
  embeddingProvider: RagEmbeddingProvider;
  filesDiscovered: number;
  ingestId: string;
  results: AdminRagBulkJsonResult[];
}): AdminRagRouteJsonResult<AdminRagBulkJsonIngestionResponse> {
  const filesSucceeded = options.results.filter(
    (result) => result.success,
  ).length;
  const filesFailed = options.results.length - filesSucceeded;
  const payload: AdminRagBulkJsonIngestionResponse = {
    success: filesSucceeded > 0,
    ingestId: options.ingestId,
    embeddingProvider: options.embeddingProvider,
    filesDiscovered: options.filesDiscovered,
    filesSucceeded,
    filesFailed,
    chunksInserted: options.chunksInserted,
    message:
      filesFailed === 0
        ? `Ingested ${options.chunksInserted} chunks from ${filesSucceeded} JSON sources.`
        : `Ingested ${options.chunksInserted} chunks from ${filesSucceeded}/${options.filesDiscovered} JSON sources. ${filesFailed} failed.`,
    results: options.results,
  };

  if (filesSucceeded === 0) {
    return {
      init: { status: 500 },
      payload,
    };
  }

  return { payload };
}
