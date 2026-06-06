"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { AdminRagChunkStatsPanel } from "@/features/admin/components/AdminRagChunkStatsPanel";
import { AdminRagIngestionControls } from "@/features/admin/components/AdminRagIngestionControls";
import { adminRagIngestionFormCopy } from "@/features/admin/components/adminRagIngestionCopy";
import { AdminRagLogsPanel } from "@/features/admin/components/AdminRagLogsPanel";
import { AdminRagNotices } from "@/features/admin/components/AdminRagNotices";
import { AdminRagStatusPanel } from "@/features/admin/components/AdminRagStatusPanel";
import { useAdminRagIngestionController } from "@/features/admin/hooks/useAdminRagIngestionController";

export function AdminRagIngestionForm() {
  const { language } = useLanguage();
  const copy = adminRagIngestionFormCopy[language];
  const {
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
  } = useAdminRagIngestionController({
    jsonError: copy.jsonError,
    loadError: copy.loadError,
    unknownRequestError: copy.unknownRequestError,
    uploadError: copy.uploadError,
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <AdminRagStatusPanel
        copy={copy}
        language={language}
        loadRagStatus={loadRagStatus}
        ragStatus={ragStatus}
        ragStatusError={ragStatusError}
        statusLoading={statusLoading}
      />
      <AdminRagIngestionControls
        bulkJsonPending={bulkJsonPending}
        copy={copy}
        embeddingProvider={embeddingProvider}
        handleIngestJsonSources={handleIngestJsonSources}
        isPending={isPending}
        setEmbeddingProvider={setEmbeddingProvider}
      />
      <AdminRagNotices
        activeIngestId={activeIngestId}
        bulkJsonState={bulkJsonState}
        copy={copy}
        failedBulkJsonResults={failedBulkJsonResults}
        isPending={isPending}
        language={language}
        state={state}
      />
      <AdminRagLogsPanel
        bulkJsonPending={bulkJsonPending}
        copy={copy}
        dashboardLogs={dashboardLogs}
        isPending={isPending}
        language={language}
      />
      {state?.success ? (
        <AdminRagChunkStatsPanel
          chunkStats={state.chunkStats}
          copy={copy}
          language={language}
        />
      ) : null}
    </form>
  );
}
