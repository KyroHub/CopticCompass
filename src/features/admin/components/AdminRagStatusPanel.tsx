import { buttonClassName } from "@/components/Button";
import { SurfacePanel } from "@/components/SurfacePanel";
import { AdminErrorDisclosure } from "@/features/admin/components/AdminErrorDisclosure";
import {
  formatAdminRagNumber,
  type AdminRagStatusItem,
  type AdminRagStatusResponse,
} from "@/lib/admin/ragDashboard";
import type { Language } from "@/types/i18n";

import type { AdminRagIngestionCopy } from "./adminRagIngestionCopy";
import type { ReactNode } from "react";

function StatusDot({ healthy }: { healthy: boolean }) {
  return (
    <span
      aria-hidden
      className={`mt-2 inline-block h-2.5 w-2.5 rounded-full ${
        healthy ? "bg-coptic" : "bg-danger"
      }`}
    />
  );
}

function RagStatusCard({
  detail,
  status,
}: {
  detail?: ReactNode;
  status: AdminRagStatusItem;
}) {
  return (
    <li className="flex min-h-20 items-start gap-3 rounded-lg border border-line bg-surface/80 p-4 shadow-sm">
      <StatusDot healthy={status.healthy} />
      <span className="min-w-0 text-sm leading-6 text-ink">
        <span className="block font-semibold">{status.label}</span>
        {status.note ? (
          <span className="block text-xs leading-5 text-muted">
            {status.note}
          </span>
        ) : null}
        {detail}
      </span>
    </li>
  );
}

export function AdminRagStatusPanel({
  copy,
  language,
  loadRagStatus,
  ragStatus,
  ragStatusError,
  statusLoading,
}: {
  copy: AdminRagIngestionCopy;
  language: Language;
  loadRagStatus: () => Promise<void>;
  ragStatus: AdminRagStatusResponse | null;
  ragStatusError: string | null;
  statusLoading: boolean;
}) {
  return (
    <SurfacePanel rounded="lg" variant="subtle" shadow="soft" className="p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          {copy.systemStatus}
        </p>
        <button
          type="button"
          onClick={() => {
            void loadRagStatus();
          }}
          className={buttonClassName({ size: "sm", variant: "secondary" })}
        >
          {copy.refresh}
        </button>
      </div>

      {statusLoading ? (
        <p className="rounded-lg border border-line bg-surface/80 px-4 py-3 text-sm text-muted shadow-sm">
          {copy.checking}
        </p>
      ) : null}

      {!statusLoading && ragStatusError ? (
        <AdminErrorDisclosure
          language={language}
          message={copy.loadError}
          technicalDetails={ragStatusError}
        />
      ) : null}

      {!statusLoading && !ragStatusError && ragStatus ? (
        <ul className="grid gap-3 md:grid-cols-2">
          <RagStatusCard status={ragStatus.statuses.llm} />
          <RagStatusCard status={ragStatus.statuses.embeddingModel} />
          <RagStatusCard status={ragStatus.statuses.dictionaryJsonRag} />
          <RagStatusCard status={ragStatus.statuses.grammarJsonRag} />
          <RagStatusCard status={ragStatus.statuses.vectorDb} />
          <RagStatusCard
            status={ragStatus.statuses.knowledgeBase}
            detail={
              <span className="mt-1 block text-xs font-semibold text-coptic">
                {formatAdminRagNumber(ragStatus.chunkCount, language)}{" "}
                {copy.chunks}
              </span>
            }
          />
        </ul>
      ) : null}
    </SurfacePanel>
  );
}
