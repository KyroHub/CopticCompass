import { describe, expect, it, vi } from "vitest";

type VectorSearchModuleContext = {
  createServiceRoleClientMock: ReturnType<typeof vi.fn>;
  fromMock: ReturnType<typeof vi.fn>;
  searchCopticDocuments: typeof import("./vectorSearch").searchCopticDocuments;
  searchVocabularyByKeywords: typeof import("./vectorSearch").searchVocabularyByKeywords;
};

async function loadVectorSearchModule(): Promise<VectorSearchModuleContext> {
  vi.resetModules();

  const rpcMock = vi.fn(function (
    this: { rest?: object },
    _fn: string,
    _args: unknown,
  ) {
    if (!this?.rest) {
      throw new TypeError(
        "Cannot read properties of undefined (reading 'rest')",
      );
    }

    return Promise.resolve({
      data: [{ content: "Dictionary chunk", metadata: { sourceName: "test" } }],
      error: null,
    });
  });

  const vocabularyLimitMock = vi.fn().mockResolvedValue({
    data: [
      { content: "Vocabulary chunk", metadata: { sourceName: "keyword" } },
    ],
    error: null,
  });
  const vocabularyInMock = vi.fn().mockReturnValue({
    limit: vocabularyLimitMock,
  });
  const vocabularyOrMock = vi.fn().mockReturnValue({
    in: vocabularyInMock,
  });
  const vocabularySelectMock = vi.fn().mockReturnValue({
    or: vocabularyOrMock,
  });
  const fromMock = vi.fn().mockReturnValue({
    select: vocabularySelectMock,
  });

  const createServiceRoleClientMock = vi.fn().mockReturnValue({
    from: fromMock,
    rest: {},
    rpc: rpcMock,
  });

  vi.doMock("@/lib/supabase/serviceRole", () => ({
    createServiceRoleClient: createServiceRoleClientMock,
  }));
  vi.doMock("@/lib/hf", () => ({
    HF_EMBEDDING_MODEL: "hf-test-model",
    generateHFEmbeddings: vi.fn().mockResolvedValue([[0.1, 0.2, 0.3]]),
  }));
  vi.doMock("@/lib/openrouter", () => ({
    OPENROUTER_EMBEDDING_MODEL: "openrouter-test-model",
    generateOpenRouterEmbeddings: vi.fn(),
  }));
  vi.doMock("@/lib/gemini", () => ({
    GEMINI_EMBEDDING_MODEL: "gemini-test-model",
    getGeminiEmbeddingModel: vi.fn(),
  }));

  const vectorSearchModule = await import("./vectorSearch");

  return {
    createServiceRoleClientMock,
    fromMock,
    searchCopticDocuments: vectorSearchModule.searchCopticDocuments,
    searchVocabularyByKeywords: vectorSearchModule.searchVocabularyByKeywords,
  };
}

describe("searchCopticDocuments", () => {
  it("calls the RPC with the bound Supabase client context", async () => {
    const { createServiceRoleClientMock, searchCopticDocuments } =
      await loadVectorSearchModule();

    await expect(searchCopticDocuments("father")).resolves.toEqual([
      {
        content: "Dictionary chunk",
        metadata: { sourceName: "test" },
      },
    ]);

    expect(createServiceRoleClientMock).toHaveBeenCalledTimes(1);
    const client = createServiceRoleClientMock.mock.results[0]?.value as {
      rpc: ReturnType<typeof vi.fn>;
    };
    expect(client.rpc).toHaveBeenCalledWith(
      "match_coptic_documents",
      expect.objectContaining({
        filter_metadata: {},
        match_count: 5,
        query_text: "father",
      }),
    );
  });
});

describe("searchVocabularyByKeywords", () => {
  it("keeps Coptic script while stripping punctuation from keyword lookups", async () => {
    const { fromMock, searchVocabularyByKeywords } =
      await loadVectorSearchModule();

    await expect(
      searchVocabularyByKeywords([
        "Jesus Christ!!!",
        "\u2c93\u2c8f\u2ca5??",
        "%%%ignored%%%",
      ]),
    ).resolves.toEqual([
      {
        content: "Vocabulary chunk",
        metadata: { sourceName: "keyword" },
      },
    ]);

    const vocabularyQuery = fromMock.mock.results[0]?.value as {
      select: ReturnType<typeof vi.fn>;
    };
    const selectResult = vocabularyQuery.select.mock.results[0]?.value as {
      or: ReturnType<typeof vi.fn>;
    };

    expect(selectResult.or).toHaveBeenCalledWith(
      "content.ilike.%Jesus Christ%,content.ilike.%\u2c93\u2c8f\u2ca5%,content.ilike.%ignored%",
    );
  });

  it("returns early when every keyword sanitizes to empty", async () => {
    const { fromMock, searchVocabularyByKeywords } =
      await loadVectorSearchModule();

    await expect(searchVocabularyByKeywords(["!!!", "%%%"])).resolves.toEqual(
      [],
    );
    expect(fromMock).not.toHaveBeenCalled();
  });
});
