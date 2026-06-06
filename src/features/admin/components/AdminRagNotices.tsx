import { StatusNotice } from "@/components/StatusNotice";
import { AdminErrorDisclosure } from "@/features/admin/components/AdminErrorDisclosure";
import {
  formatAdminRagNumber,
  getAdminRagEmbeddingProviderLabel,
  type AdminRagBulkJsonIngestionResponse,
  type AdminRagBulkJsonResult,
} from "@/lib/admin/ragDashboard";
import type { Language } from "@/types/i18n";

import type { AdminRagIngestionCopy } from "./adminRagIngestionCopy";
import type { RagIngestionState } from "../lib/ragIngestionTypes";

export function AdminRagNotices({
  activeIngestId,
  bulkJsonState,
  copy,
  failedBulkJsonResults,
  isPending,
  language,
  state,
}: {
  activeIngestId: string | null;
  bulkJsonState: AdminRagBulkJsonIngestionResponse | null;
  copy: AdminRagIngestionCopy;
  failedBulkJsonResults: AdminRagBulkJsonResult[];
  isPending: boolean;
  language: Language;
  state: RagIngestionState | null;
}) {
  return (
    <>
      {isPending && activeIngestId ? (
        <StatusNotice tone="info" align="left">
          {copy.liveLogs} <code>RAG:{activeIngestId}</code>.
        </StatusNotice>
      ) : null}

      {state?.error ? (
        <AdminErrorDisclosure
          language={language}
          message={copy.uploadError}
          technicalDetails={state.error}
        />
      ) : null}

      {bulkJsonState?.error ? (
        <AdminErrorDisclosure
          language={language}
          message={copy.jsonError}
          technicalDetails={bulkJsonState.error}
        />
      ) : null}

      {bulkJsonState?.message ? (
        <StatusNotice
          tone={bulkJsonState.success ? "success" : "error"}
          align="left"
        >
          {bulkJsonState.message}
          {bulkJsonState.ingestId
            ? ` ${copy.requestId}: ${bulkJsonState.ingestId}.`
            : ""}
          {` ${copy.sources}: ${formatAdminRagNumber(
            bulkJsonState.filesSucceeded,
            language,
          )}/${formatAdminRagNumber(
            bulkJsonState.filesDiscovered,
            language,
          )} ${copy.succeeded}.`}
        </StatusNotice>
      ) : null}

      {failedBulkJsonResults.length > 0 ? (
        <AdminErrorDisclosure
          language={language}
          message={
            <div>
              <p className="font-semibold">
                {copy.partialFailures}: {copy.failedJsonSources}
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
                {failedBulkJsonResults.slice(0, 5).map((result) => (
                  <li key={result.sourcePath}>{result.sourcePath}</li>
                ))}
              </ul>
            </div>
          }
          technicalDetails={failedBulkJsonResults.map((result) => ({
            error: result.error ?? copy.unknownError,
            sourcePath: result.sourcePath,
          }))}
          tone="warning"
        />
      ) : null}

      {state?.success ? (
        <StatusNotice tone="success" align="left">
          {state.message}
          {state.embeddingProvider
            ? ` ${copy.provider}: ${getAdminRagEmbeddingProviderLabel(
                state.embeddingProvider,
              )}.`
            : ""}
          {typeof state.chunksInserted === "number"
            ? ` ${copy.chunksLabel}: ${formatAdminRagNumber(
                state.chunksInserted,
                language,
              )}.`
            : ""}
          {typeof state.ocrUsed === "boolean"
            ? ` ${copy.ocrUsed}: ${state.ocrUsed ? copy.ocrYes : copy.ocrNo}.`
            : ""}
          {state.ingestId ? ` ${copy.requestId}: ${state.ingestId}.` : ""}
        </StatusNotice>
      ) : null}
    </>
  );
}
