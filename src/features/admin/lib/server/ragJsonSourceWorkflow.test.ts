import { describe, expect, it, vi } from "vitest";

import {
  ingestAdminRagJsonSources,
  type AdminRagJsonSourceWorkflowDependencies,
} from "./ragJsonSourceWorkflow";

function createDependencies(
  overrides: Partial<AdminRagJsonSourceWorkflowDependencies> = {},
): AdminRagJsonSourceWorkflowDependencies {
  return {
    createJsonFile: vi.fn(
      (content, fileName) =>
        new File([content], fileName, {
          type: "application/json",
        }),
    ),
    discoverJsonKnowledgeSources: vi.fn(async () => [
      {
        fileName: "empty.json",
        filePath: "/data/empty.json",
        title: "JSON Source: data/empty.json",
      },
      {
        fileName: "dictionary.json",
        filePath: "/data/dictionary.json",
        title: "JSON Source: data/dictionary.json",
      },
      {
        fileName: "grammar.json",
        filePath: "/data/grammar.json",
        title: "JSON Source: data/grammar.json",
      },
      {
        fileName: "broken.json",
        filePath: "/data/broken.json",
        title: "JSON Source: data/broken.json",
      },
    ]),
    getRagJsonSourceLocations: vi.fn(() => ({
      dataRoot: "/data",
      dictionaryPath: "/data/dictionary.json",
      grammarDirectoryPaths: ["/data/grammar"],
    })),
    ingestRagFile: vi.fn(async ({ sourceTitle }) =>
      sourceTitle.includes("grammar")
        ? {
            success: false,
            error: "Ingestion failed.",
            logs: [
              {
                message: "Failed",
                timestamp: "2026-01-02T03:04:06.000Z",
              },
            ],
          }
        : {
            success: true,
            chunksInserted: 7,
            logs: [
              {
                message: "Inserted chunks",
                timestamp: "2026-01-02T03:04:05.000Z",
              },
            ],
          },
    ),
    log: vi.fn(),
    readJsonKnowledgeSourceContent: vi.fn(async (sourcePath) => {
      if (sourcePath.includes("empty")) {
        return "   ";
      }

      if (sourcePath.includes("broken")) {
        throw new Error("Read failed.");
      }

      return JSON.stringify({ ok: true });
    }),
    ...overrides,
  };
}

describe("admin RAG JSON source workflow", () => {
  it("returns no_sources when discovery finds no JSON knowledge sources", async () => {
    const dependencies = createDependencies({
      discoverJsonKnowledgeSources: vi.fn(async () => []),
    });

    await expect(
      ingestAdminRagJsonSources({
        dependencies,
        embeddingProvider: "hf",
        ingestId: "bulk-1",
        userId: "user-1",
      }),
    ).resolves.toEqual({
      dataRoot: "/data",
      kind: "no_sources",
    });
    expect(dependencies.ingestRagFile).not.toHaveBeenCalled();
    expect(dependencies.log).toHaveBeenCalledWith(
      "[RAG:JSON] No sources found in DATA_ROOT: /data",
    );
  });

  it("ingests readable JSON sources and preserves per-source failures", async () => {
    const dependencies = createDependencies();

    await expect(
      ingestAdminRagJsonSources({
        dependencies,
        embeddingProvider: "gemini",
        ingestId: "bulk-2",
        userId: "user-1",
      }),
    ).resolves.toEqual({
      chunksInserted: 7,
      filesDiscovered: 4,
      kind: "completed",
      results: [
        {
          success: false,
          error: "File is empty.",
          sourcePath: "JSON Source: data/empty.json",
        },
        {
          success: true,
          chunksInserted: 7,
          logs: [
            {
              message: "Inserted chunks",
              timestamp: "2026-01-02T03:04:05.000Z",
            },
          ],
          sourcePath: "JSON Source: data/dictionary.json",
        },
        {
          success: false,
          error: "Ingestion failed.",
          logs: [
            {
              message: "Failed",
              timestamp: "2026-01-02T03:04:06.000Z",
            },
          ],
          sourcePath: "JSON Source: data/grammar.json",
        },
        {
          success: false,
          error: "Read failed.",
          sourcePath: "JSON Source: data/broken.json",
        },
      ],
    });
    expect(dependencies.discoverJsonKnowledgeSources).toHaveBeenCalledWith({
      dataRoot: "/data",
      dictionaryPath: "/data/dictionary.json",
      grammarDirectoryPaths: ["/data/grammar"],
      log: dependencies.log,
    });
    expect(dependencies.ingestRagFile).toHaveBeenCalledWith(
      expect.objectContaining({
        embeddingProvider: "gemini",
        enableOcr: false,
        ingestId: "bulk-2-2",
        jsonChunkMode: "compact",
        skipThothEnrichment: true,
        skipThothProofcheck: true,
        sourceTitle: "JSON Source: data/dictionary.json",
        userId: "user-1",
      }),
    );
    expect(dependencies.ingestRagFile).toHaveBeenCalledWith(
      expect.objectContaining({
        ingestId: "bulk-2-3",
        sourceTitle: "JSON Source: data/grammar.json",
      }),
    );
  });
});
