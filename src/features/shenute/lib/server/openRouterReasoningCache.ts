type OpenRouterReasoningCacheEntry = {
  updatedAt: number;
  byAssistantContent: Map<string, unknown>;
};

type GlobalWithOpenRouterReasoningStore = typeof globalThis & {
  __copticOpenRouterReasoningStore?: Map<string, OpenRouterReasoningCacheEntry>;
};

const OPENROUTER_REASONING_TTL_MS = 4 * 60 * 60 * 1000;

function getOpenRouterReasoningStore() {
  const globalWithStore = globalThis as GlobalWithOpenRouterReasoningStore;
  if (!globalWithStore.__copticOpenRouterReasoningStore) {
    globalWithStore.__copticOpenRouterReasoningStore = new Map();
  }

  return globalWithStore.__copticOpenRouterReasoningStore;
}

function pruneOpenRouterReasoningStore(
  store: Map<string, OpenRouterReasoningCacheEntry>,
) {
  const now = Date.now();

  for (const [shenuteSessionId, entry] of store.entries()) {
    if (now - entry.updatedAt > OPENROUTER_REASONING_TTL_MS) {
      store.delete(shenuteSessionId);
    }
  }
}

export function getCachedReasoningDetails(
  shenuteSessionId: string,
  assistantContent: string,
) {
  const store = getOpenRouterReasoningStore();
  pruneOpenRouterReasoningStore(store);
  const entry = store.get(shenuteSessionId);
  if (!entry) {
    return undefined;
  }

  entry.updatedAt = Date.now();
  return entry.byAssistantContent.get(assistantContent);
}

export function cacheReasoningDetails(
  shenuteSessionId: string,
  assistantContent: string,
  reasoningDetails: unknown,
) {
  if (!assistantContent || typeof reasoningDetails === "undefined") {
    return;
  }

  const store = getOpenRouterReasoningStore();
  pruneOpenRouterReasoningStore(store);
  const entry =
    store.get(shenuteSessionId) ??
    ({
      updatedAt: Date.now(),
      byAssistantContent: new Map<string, unknown>(),
    } satisfies OpenRouterReasoningCacheEntry);

  entry.byAssistantContent.set(assistantContent, reasoningDetails);
  entry.updatedAt = Date.now();
  store.set(shenuteSessionId, entry);
}
