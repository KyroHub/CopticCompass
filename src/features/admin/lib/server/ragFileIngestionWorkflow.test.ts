import { describe, expect, it, vi } from "vitest";

import type { AdminRagIngestFormPayload } from "@/lib/admin/ragRequestPayload";

import {
  ingestAdminRagFile,
  type AdminRagFileIngestionWorkflowDependencies,
} from "./ragFileIngestionWorkflow";

function createParsedForm(
  overrides: Partial<
    Extract<AdminRagIngestFormPayload, { success: true }>
  > = {},
): Extract<AdminRagIngestFormPayload, { success: true }> {
  return {
    embeddingProvider: "hf",
    enableOcr: true,
    file: new File(["content"], "lexicon.pdf", {
      type: "application/pdf",
    }),
    forceOcr: false,
    requestId: "file-1",
    sourceTitle: "Lexicon",
    success: true,
    ...overrides,
  };
}

function createDependencies(
  overrides: Partial<AdminRagFileIngestionWorkflowDependencies> = {},
): AdminRagFileIngestionWorkflowDependencies {
  return {
    ingestRagFile: vi.fn(async () => ({
      success: true,
      chunksInserted: 12,
      message: "Ingested 12 chunks.",
    })),
    log: vi.fn(),
    revalidateAdminPaths: vi.fn(),
    ...overrides,
  };
}

describe("admin RAG file ingestion workflow", () => {
  it("passes the parsed upload form into the RAG ingestion pipeline", async () => {
    const dependencies = createDependencies();
    const parsedForm = createParsedForm({
      embeddingProvider: "openrouter",
      forceOcr: true,
      requestId: "file-2",
      sourceTitle: "Uploaded Lexicon",
    });

    await expect(
      ingestAdminRagFile({
        dependencies,
        parsedForm,
        userId: "user-1",
      }),
    ).resolves.toEqual({
      success: true,
      chunksInserted: 12,
      message: "Ingested 12 chunks.",
    });
    expect(dependencies.log).toHaveBeenCalledWith(
      "[RAG:file-2] API request received for lexicon.pdf with provider=openrouter.",
    );
    expect(dependencies.ingestRagFile).toHaveBeenCalledWith({
      embeddingProvider: "openrouter",
      enableOcr: true,
      forceOcr: true,
      file: parsedForm.file,
      ingestId: "file-2",
      sourceTitle: "Uploaded Lexicon",
      userId: "user-1",
    });
    expect(dependencies.revalidateAdminPaths).toHaveBeenCalledTimes(1);
  });

  it("does not revalidate admin paths after failed ingestion", async () => {
    const dependencies = createDependencies({
      ingestRagFile: vi.fn(async () => ({
        success: false,
        error: "Could not extract enough text.",
      })),
    });

    await expect(
      ingestAdminRagFile({
        dependencies,
        parsedForm: createParsedForm(),
        userId: "user-1",
      }),
    ).resolves.toEqual({
      success: false,
      error: "Could not extract enough text.",
    });
    expect(dependencies.revalidateAdminPaths).not.toHaveBeenCalled();
  });
});
