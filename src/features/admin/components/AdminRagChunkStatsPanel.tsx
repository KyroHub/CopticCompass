import { SurfacePanel } from "@/components/SurfacePanel";
import { formatAdminRagNumber } from "@/lib/admin/ragDashboard";
import type { Language } from "@/types/i18n";

import type { AdminRagIngestionCopy } from "./adminRagIngestionCopy";
import type { RagIngestionState } from "../lib/ragIngestionTypes";
import type { ReactNode } from "react";

function RagMetricCard({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <SurfacePanel shadow="soft" className="p-4 text-sm">
      <dt className="text-xs font-semibold uppercase tracking-widest text-muted">
        {label}
      </dt>
      <dd className="mt-2 font-semibold text-ink">{children}</dd>
    </SurfacePanel>
  );
}

export function AdminRagChunkStatsPanel({
  chunkStats,
  copy,
  language,
}: {
  chunkStats: RagIngestionState["chunkStats"];
  copy: AdminRagIngestionCopy;
  language: Language;
}) {
  if (!chunkStats) {
    return null;
  }

  return (
    <SurfacePanel
      rounded="lg"
      variant="subtle"
      shadow="soft"
      className="p-5 text-ink"
    >
      <p className="mb-3 font-semibold">{copy.chunkDetails}</p>
      <dl className="grid gap-3 sm:grid-cols-2">
        <RagMetricCard label={copy.sourceTextChars}>
          {formatAdminRagNumber(chunkStats.sourceTextChars, language)}
        </RagMetricCard>
        <RagMetricCard label={copy.totalChunkChars}>
          {formatAdminRagNumber(chunkStats.totalChunkChars, language)}
        </RagMetricCard>
        <RagMetricCard label={copy.totalChunks}>
          {formatAdminRagNumber(chunkStats.totalChunks, language)}
        </RagMetricCard>
        <RagMetricCard label={copy.targetOverlap}>
          {formatAdminRagNumber(chunkStats.chunkSizeTarget, language)} /{" "}
          {formatAdminRagNumber(chunkStats.chunkOverlap, language)}
        </RagMetricCard>
        <RagMetricCard label={copy.minAvgMaxChunkChars}>
          {formatAdminRagNumber(chunkStats.minChunkChars, language)} /{" "}
          {formatAdminRagNumber(chunkStats.avgChunkChars, language)} /{" "}
          {formatAdminRagNumber(chunkStats.maxChunkChars, language)}
        </RagMetricCard>
        <RagMetricCard label={copy.minAvgMaxChunkWords}>
          {formatAdminRagNumber(chunkStats.minChunkWords, language)} /{" "}
          {formatAdminRagNumber(chunkStats.avgChunkWords, language)} /{" "}
          {formatAdminRagNumber(chunkStats.maxChunkWords, language)}
        </RagMetricCard>
        <RagMetricCard label={copy.estimatedTokensTotal}>
          {formatAdminRagNumber(chunkStats.totalEstimatedTokens, language)}
        </RagMetricCard>
        <RagMetricCard label={copy.estimatedTokensPerChunk}>
          {formatAdminRagNumber(chunkStats.minChunkEstimatedTokens, language)} /{" "}
          {formatAdminRagNumber(chunkStats.avgChunkEstimatedTokens, language)} /{" "}
          {formatAdminRagNumber(chunkStats.maxChunkEstimatedTokens, language)}
        </RagMetricCard>
        <RagMetricCard label={copy.overlapOverhead}>
          {chunkStats.overlapOverheadPct > 0 ? "+" : ""}
          {chunkStats.overlapOverheadPct}%
        </RagMetricCard>
        <RagMetricCard label={copy.embeddingBatches}>
          {formatAdminRagNumber(chunkStats.embeddingBatchesPlanned, language)} (
          {copy.size}{" "}
          {formatAdminRagNumber(chunkStats.embeddingBatchSize, language)})
        </RagMetricCard>
        <RagMetricCard label={copy.insertBatches}>
          {formatAdminRagNumber(chunkStats.insertBatchesPlanned, language)} (
          {copy.size}{" "}
          {formatAdminRagNumber(chunkStats.insertBatchSize, language)})
        </RagMetricCard>
      </dl>
    </SurfacePanel>
  );
}
