import type {
  AdminRagStatusItem,
  AdminRagStatusResponse,
} from "@/lib/admin/ragDashboard";
import type { AiProviderTokenStatus } from "@/lib/ai/providerStatus";
import type { CopticDocumentVectorStatus } from "@/lib/supabase/copticDocumentVectorStatus";

import {
  buildAdminRagErrorResponse,
  type AdminRagErrorPayload,
} from "./ragIngestionRouteResponses";

import type { AdminRagRouteAccessFailureResponses } from "./ragRouteAccess";

export type AdminRagRouteStatusResponse = AdminRagStatusResponse & {
  checkedAt: string;
};

export type AdminRagStatusFailurePayload =
  | AdminRagRouteStatusResponse
  | AdminRagErrorPayload;

type AdminRagJsonSourceStatusPair = {
  dictionaryJsonRag: AdminRagStatusItem;
  grammarJsonRag: AdminRagStatusItem;
};

type AdminRagStatusAccessFailureResponses =
  AdminRagRouteAccessFailureResponses<AdminRagStatusFailurePayload>;

function getCheckedAtTimestamp(checkedAt?: string) {
  return checkedAt ?? new Date().toISOString();
}

export function buildAdminRagUnavailableStatusResponse(
  checkedAt?: string,
): AdminRagRouteStatusResponse {
  return {
    success: false,
    checkedAt: getCheckedAtTimestamp(checkedAt),
    chunkCount: 0,
    statuses: {
      llm: {
        healthy: false,
        label: "LLM model",
        note: "Supabase runtime env is unavailable",
      },
      embeddingModel: {
        healthy: false,
        label: "Embedding model",
        note: "Supabase runtime env is unavailable",
      },
      dictionaryJsonRag: {
        healthy: false,
        label: "Dictionary JSON RAG",
        note: "Supabase runtime env is unavailable",
      },
      grammarJsonRag: {
        healthy: false,
        label: "Grammar JSON RAG",
        note: "Supabase runtime env is unavailable",
      },
      vectorDb: {
        healthy: false,
        label: "Vector database",
        note: "Supabase runtime env is unavailable",
      },
      knowledgeBase: {
        healthy: false,
        label: "Knowledge base",
      },
    },
  };
}

export function buildAdminRagStatusAccessFailureResponses(): AdminRagStatusAccessFailureResponses {
  return {
    runtimeUnavailable: {
      init: { status: 503 },
      payload: buildAdminRagUnavailableStatusResponse(),
    },
    unauthenticated: buildAdminRagErrorResponse(
      {
        success: false,
        error: "You must be signed in to view RAG status.",
      },
      401,
    ),
    forbidden: buildAdminRagErrorResponse(
      {
        success: false,
        error: "Only admins can view RAG status.",
      },
      403,
    ),
  };
}

export function buildAdminRagStatusResponse({
  checkedAt,
  jsonSourceStatuses,
  providerTokenStatus,
  vectorStatus,
}: {
  checkedAt?: string;
  jsonSourceStatuses: AdminRagJsonSourceStatusPair;
  providerTokenStatus: AiProviderTokenStatus;
  vectorStatus: CopticDocumentVectorStatus;
}): AdminRagRouteStatusResponse {
  const knowledgeBaseHealthy =
    vectorStatus.healthy && vectorStatus.chunkCount > 0;
  const knowledgeBaseNote =
    vectorStatus.chunkCount > 0
      ? `${new Intl.NumberFormat("en-US").format(
          vectorStatus.chunkCount,
        )} chunks indexed`
      : "No chunks indexed yet";

  return {
    success: true,
    checkedAt: getCheckedAtTimestamp(checkedAt),
    chunkCount: vectorStatus.chunkCount,
    statuses: {
      llm: {
        healthy: providerTokenStatus.configured,
        label: "LLM model",
        note: providerTokenStatus.providerLabel,
      },
      embeddingModel: {
        healthy: providerTokenStatus.configured,
        label: "Embedding model",
        note: providerTokenStatus.embeddingNote,
      },
      dictionaryJsonRag: jsonSourceStatuses.dictionaryJsonRag,
      grammarJsonRag: jsonSourceStatuses.grammarJsonRag,
      vectorDb: {
        healthy: vectorStatus.healthy,
        label: "Vector database",
        note: vectorStatus.healthy
          ? "Supabase pgvector online"
          : vectorStatus.note,
      },
      knowledgeBase: {
        healthy: knowledgeBaseHealthy,
        label: "Knowledge base",
        note: knowledgeBaseNote,
      },
    },
  };
}
