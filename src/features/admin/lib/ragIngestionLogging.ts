import type { RagIngestionLogEntry } from "./ragIngestionTypes";

type IngestionLogStoreEntry = {
  done: boolean;
  error?: string;
  logs: RagIngestionLogEntry[];
  updatedAt: number;
};

type GlobalWithRagLogStore = typeof globalThis & {
  __copticRagIngestionLogStore?: Map<string, IngestionLogStoreEntry>;
};

const LOG_STORE_TTL_MS = 2 * 60 * 60 * 1000;

function getLogStore() {
  const globalWithStore = globalThis as GlobalWithRagLogStore;
  if (!globalWithStore.__copticRagIngestionLogStore) {
    globalWithStore.__copticRagIngestionLogStore = new Map();
  }

  return globalWithStore.__copticRagIngestionLogStore;
}

function pruneExpiredLogStreams(store: Map<string, IngestionLogStoreEntry>) {
  const now = Date.now();

  for (const [ingestId, stream] of store.entries()) {
    if (now - stream.updatedAt > LOG_STORE_TTL_MS) {
      store.delete(ingestId);
    }
  }
}

function appendLiveIngestionLog(ingestId: string, entry: RagIngestionLogEntry) {
  const store = getLogStore();
  pruneExpiredLogStreams(store);

  const stream = store.get(ingestId) ?? {
    done: false,
    logs: [],
    updatedAt: Date.now(),
  };
  stream.logs.push(entry);
  stream.updatedAt = Date.now();
  store.set(ingestId, stream);
}

export function markLiveIngestionDone(ingestId: string, error?: string) {
  const store = getLogStore();
  pruneExpiredLogStreams(store);

  const stream = store.get(ingestId) ?? {
    done: false,
    logs: [],
    updatedAt: Date.now(),
  };
  stream.done = true;
  stream.error = error;
  stream.updatedAt = Date.now();
  store.set(ingestId, stream);
}

/**
 * Reads live ingestion logs for either a single run or a prefixed group. Prefix
 * mode lets JSON-source sub-ingestions stream into the same admin progress view.
 */
export function getRagIngestionLogs(options: {
  ingestId: string;
  prefix?: boolean;
}) {
  const store = getLogStore();
  pruneExpiredLogStreams(store);

  const { ingestId, prefix = false } = options;
  const entries: RagIngestionLogEntry[] = [];

  for (const [streamIngestId, stream] of store.entries()) {
    const matched = prefix
      ? streamIngestId.startsWith(`${ingestId}-`) || streamIngestId === ingestId
      : streamIngestId === ingestId;

    if (!matched) {
      continue;
    }

    entries.push(...stream.logs);
  }

  entries.sort(
    (left, right) =>
      new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime(),
  );

  return entries;
}

/**
 * Records an ingestion event in both the request-local log array and the shared
 * live log store used by admin polling.
 */
export function logIngestion(
  ingestId: string,
  message: string,
  logs?: RagIngestionLogEntry[],
) {
  const entry = {
    line: `[RAG:${ingestId}] ${message}`,
    message,
    timestamp: new Date().toISOString(),
  };
  appendLiveIngestionLog(ingestId, entry);
  const line = `[RAG:${ingestId}] ${message}`;
  logs?.push(entry);
  console.warn(line);
}
