"use client";

import { useCallback, useEffect, useState } from "react";

import {
  createAdminRagFileIngestionRequest,
  getAdminRagLiveLogTargets,
  requestAdminRagBulkJsonIngestion,
  requestAdminRagFileIngestion,
  requestAdminRagLiveLogs,
  requestAdminRagStatus,
} from "@/features/admin/lib/client/ragDashboardApi";
import {
  collectAdminRagBulkLogs,
  collectAdminRagDashboardLogs,
  getFailedAdminRagBulkJsonResults,
  type AdminRagBulkJsonIngestionResponse,
  type AdminRagLogEntry,
  type AdminRagStatusResponse,
} from "@/lib/admin/ragDashboard";
import type { AdminRagEmbeddingProvider } from "@/lib/admin/ragRequestPayload";

import type { RagIngestionState } from "../lib/ragIngestionTypes";
import type { Dispatch, FormEvent, SetStateAction } from "react";

type AdminRagControllerMessages = {
  jsonError: string;
  loadError: string;
  unknownRequestError: string;
  uploadError: string;
};

type AdminRagControllerDependencies = {
  createIngestId: () => string;
  fetch: typeof fetch;
  now: () => number;
  warn: (message: string) => void;
};

type AdminRagIngestionController = {
  activeIngestId: string | null;
  bulkJsonPending: boolean;
  bulkJsonState: AdminRagBulkJsonIngestionResponse | null;
  dashboardLogs: AdminRagLogEntry[];
  embeddingProvider: AdminRagEmbeddingProvider;
  failedBulkJsonResults: ReturnType<typeof getFailedAdminRagBulkJsonResults>;
  handleIngestJsonSources: () => Promise<void>;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  isPending: boolean;
  loadRagStatus: () => Promise<void>;
  ragStatus: AdminRagStatusResponse | null;
  ragStatusError: string | null;
  setEmbeddingProvider: Dispatch<SetStateAction<AdminRagEmbeddingProvider>>;
  statusLoading: boolean;
  state: RagIngestionState | null;
};

const defaultCreateIngestId = () => crypto.randomUUID();
const defaultFetch: typeof fetch = (input, init) =>
  globalThis.fetch(input, init);
const defaultNow = () => performance.now();
const defaultWarn = (message: string) => console.warn(message);

export function useAdminRagIngestionController(
  messages: AdminRagControllerMessages,
  dependencies: Partial<AdminRagControllerDependencies> = {},
): AdminRagIngestionController {
  const fetcher = dependencies.fetch ?? defaultFetch;
  const createIngestId = dependencies.createIngestId ?? defaultCreateIngestId;
  const now = dependencies.now ?? defaultNow;
  const warn = dependencies.warn ?? defaultWarn;
  const [activeIngestId, setActiveIngestId] = useState<string | null>(null);
  const [activeBulkIngestId, setActiveBulkIngestId] = useState<string | null>(
    null,
  );
  const [bulkJsonState, setBulkJsonState] =
    useState<AdminRagBulkJsonIngestionResponse | null>(null);
  const [bulkJsonPending, setBulkJsonPending] = useState(false);
  const [embeddingProvider, setEmbeddingProvider] =
    useState<AdminRagEmbeddingProvider>("hf");
  const [ragStatus, setRagStatus] = useState<AdminRagStatusResponse | null>(
    null,
  );
  const [ragStatusError, setRagStatusError] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [state, setState] = useState<RagIngestionState | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [liveLogs, setLiveLogs] = useState<AdminRagLogEntry[]>([]);
  const bulkLogs = collectAdminRagBulkLogs(bulkJsonState);
  const dashboardLogs = collectAdminRagDashboardLogs(
    state?.logs,
    bulkLogs,
    liveLogs,
  );
  const failedBulkJsonResults = getFailedAdminRagBulkJsonResults(bulkJsonState);

  const loadRagStatus = useCallback(async () => {
    setStatusLoading(true);
    setRagStatusError(null);

    try {
      const result = await requestAdminRagStatus({
        fetcher,
        messages: {
          loadError: messages.loadError,
        },
      });
      setRagStatus(result.status);
      setRagStatusError(result.error);
    } finally {
      setStatusLoading(false);
    }
  }, [fetcher, messages.loadError]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadRagStatus();
    });
  }, [loadRagStatus]);

  useEffect(() => {
    const targets = getAdminRagLiveLogTargets({
      activeBulkIngestId,
      activeIngestId,
      bulkJsonPending,
      isPending,
    });

    if (targets.length === 0) {
      queueMicrotask(() => {
        setLiveLogs([]);
      });
      return;
    }

    let cancelled = false;

    async function pollLiveLogs() {
      try {
        const logs = await requestAdminRagLiveLogs({ fetcher, targets });

        if (!cancelled) {
          queueMicrotask(() => {
            setLiveLogs(logs);
          });
        }
      } catch {
        if (!cancelled) {
          queueMicrotask(() => {
            setLiveLogs([]);
          });
        }
      }
    }

    void pollLiveLogs();
    const intervalId = setInterval(() => {
      void pollLiveLogs();
    }, 1400);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [activeBulkIngestId, activeIngestId, bulkJsonPending, fetcher, isPending]);

  const handleIngestJsonSources = useCallback(async () => {
    const ingestId = createIngestId();
    setBulkJsonPending(true);
    setBulkJsonState(null);
    setActiveBulkIngestId(ingestId);
    setLiveLogs([]);

    try {
      const result = await requestAdminRagBulkJsonIngestion({
        embeddingProvider,
        fetcher,
        ingestId,
        messages: {
          jsonError: messages.jsonError,
          unknownRequestError: messages.unknownRequestError,
        },
      });

      setBulkJsonState(result.state);

      if (result.shouldRefreshStatus) {
        void loadRagStatus();
      }
    } finally {
      setBulkJsonPending(false);
      setActiveBulkIngestId(null);
    }
  }, [
    createIngestId,
    embeddingProvider,
    fetcher,
    loadRagStatus,
    messages.jsonError,
    messages.unknownRequestError,
  ]);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setIsPending(true);
      setState(null);
      setLiveLogs([]);

      try {
        const startedAt = now();
        const ingestId = createIngestId();
        setActiveIngestId(ingestId);
        const { formData, selectedProvider } =
          createAdminRagFileIngestionRequest(event.currentTarget, ingestId);
        setEmbeddingProvider(selectedProvider);
        warn(
          `[RAG] Starting ingestion ${ingestId} with provider=${selectedProvider}. Watch server logs for stage timings.`,
        );

        const result = await requestAdminRagFileIngestion({
          fetcher,
          formData,
          ingestId,
          messages: {
            unknownRequestError: messages.unknownRequestError,
            uploadError: messages.uploadError,
          },
        });

        setState(result.state);

        if (result.state.success) {
          warn(
            `[RAG] Completed ingestion request ${result.state.ingestId ?? "(no id)"} in ${Math.round(now() - startedAt)} ms.`,
          );
        }

        if (result.shouldRefreshStatus) {
          void loadRagStatus();
        }
      } catch (error) {
        setState({
          success: false,
          error: error instanceof Error ? error.message : messages.uploadError,
        });
      } finally {
        setIsPending(false);
        setActiveIngestId(null);
      }
    },
    [
      createIngestId,
      fetcher,
      loadRagStatus,
      messages.unknownRequestError,
      messages.uploadError,
      now,
      warn,
    ],
  );

  return {
    activeIngestId,
    bulkJsonPending,
    bulkJsonState,
    dashboardLogs,
    embeddingProvider,
    failedBulkJsonResults,
    handleIngestJsonSources,
    handleSubmit,
    isPending,
    loadRagStatus,
    ragStatus,
    ragStatusError,
    setEmbeddingProvider,
    statusLoading,
    state,
  };
}
