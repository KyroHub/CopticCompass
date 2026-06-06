import { describe, expect, it } from "vitest";

import {
  buildAdminRagStatusAccessFailureResponses,
  buildAdminRagStatusResponse,
  buildAdminRagUnavailableStatusResponse,
} from "./ragStatusRouteResponses";

const checkedAt = "2026-01-02T03:04:05.000Z";

describe("admin RAG status route response helpers", () => {
  it("builds the runtime-unavailable health payload", () => {
    expect(buildAdminRagUnavailableStatusResponse(checkedAt)).toEqual({
      success: false,
      checkedAt,
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
    });
  });

  it("builds route-specific access failure payloads", () => {
    expect(buildAdminRagStatusAccessFailureResponses()).toMatchObject({
      runtimeUnavailable: {
        init: { status: 503 },
        payload: {
          success: false,
          chunkCount: 0,
        },
      },
      unauthenticated: {
        init: { status: 401 },
        payload: {
          success: false,
          error: "You must be signed in to view RAG status.",
        },
      },
      forbidden: {
        init: { status: 403 },
        payload: {
          success: false,
          error: "Only admins can view RAG status.",
        },
      },
    });
  });

  it("builds a healthy status payload from provider, vector, and JSON-source statuses", () => {
    expect(
      buildAdminRagStatusResponse({
        checkedAt,
        jsonSourceStatuses: {
          dictionaryJsonRag: {
            healthy: true,
            label: "Dictionary JSON RAG",
            note: "3,000 source entries available",
          },
          grammarJsonRag: {
            healthy: true,
            label: "Grammar JSON RAG",
            note: "20 JSON files available",
          },
        },
        providerTokenStatus: {
          configured: true,
          embeddingNote: "Provider token available",
          providerLabel: "Hugging Face + Gemini",
        },
        vectorStatus: {
          chunkCount: 1234,
          healthy: true,
        },
      }),
    ).toEqual({
      success: true,
      checkedAt,
      chunkCount: 1234,
      statuses: {
        llm: {
          healthy: true,
          label: "LLM model",
          note: "Hugging Face + Gemini",
        },
        embeddingModel: {
          healthy: true,
          label: "Embedding model",
          note: "Provider token available",
        },
        dictionaryJsonRag: {
          healthy: true,
          label: "Dictionary JSON RAG",
          note: "3,000 source entries available",
        },
        grammarJsonRag: {
          healthy: true,
          label: "Grammar JSON RAG",
          note: "20 JSON files available",
        },
        vectorDb: {
          healthy: true,
          label: "Vector database",
          note: "Supabase pgvector online",
        },
        knowledgeBase: {
          healthy: true,
          label: "Knowledge base",
          note: "1,234 chunks indexed",
        },
      },
    });
  });

  it("keeps the knowledge base unhealthy when no chunks are indexed", () => {
    expect(
      buildAdminRagStatusResponse({
        checkedAt,
        jsonSourceStatuses: {
          dictionaryJsonRag: {
            healthy: false,
            label: "Dictionary JSON RAG",
          },
          grammarJsonRag: {
            healthy: false,
            label: "Grammar JSON RAG",
          },
        },
        providerTokenStatus: {
          configured: false,
          embeddingNote: "No provider token found",
          providerLabel: "No LLM providers configured",
        },
        vectorStatus: {
          chunkCount: 0,
          healthy: false,
          note: "Service role key is missing",
        },
      }).statuses,
    ).toMatchObject({
      vectorDb: {
        healthy: false,
        note: "Service role key is missing",
      },
      knowledgeBase: {
        healthy: false,
        note: "No chunks indexed yet",
      },
    });
  });
});
