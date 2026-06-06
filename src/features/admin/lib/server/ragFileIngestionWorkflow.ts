import "server-only";

import { ingestRagFile } from "@/features/admin/lib/ragIngestion";
import type { AdminRagIngestFormPayload } from "@/lib/admin/ragRequestPayload";
import { revalidateAdminPaths } from "@/lib/server/revalidation";

import type { RagIngestionResult } from "../ragIngestionTypes";

type ParsedAdminRagIngestForm = Extract<
  AdminRagIngestFormPayload,
  { success: true }
>;

export type AdminRagFileIngestionWorkflowDependencies = {
  ingestRagFile: typeof ingestRagFile;
  log: (message: string) => void;
  revalidateAdminPaths: () => void;
};

const defaultWorkflowDependencies: AdminRagFileIngestionWorkflowDependencies = {
  ingestRagFile,
  log: (message) => console.warn(message),
  revalidateAdminPaths,
};

function resolveWorkflowDependencies(
  dependencies: Partial<AdminRagFileIngestionWorkflowDependencies> = {},
): AdminRagFileIngestionWorkflowDependencies {
  return {
    ...defaultWorkflowDependencies,
    ...dependencies,
  };
}

/**
 * Runs one admin-uploaded source through the RAG ingestion pipeline and
 * revalidates admin pages only after a successful persistence pass.
 */
export async function ingestAdminRagFile({
  dependencies,
  parsedForm,
  userId,
}: {
  dependencies?: Partial<AdminRagFileIngestionWorkflowDependencies>;
  parsedForm: ParsedAdminRagIngestForm;
  userId: string;
}): Promise<RagIngestionResult> {
  const resolvedDependencies = resolveWorkflowDependencies(dependencies);
  const {
    embeddingProvider,
    enableOcr,
    file,
    forceOcr,
    requestId,
    sourceTitle,
  } = parsedForm;

  resolvedDependencies.log(
    `[RAG:${requestId}] API request received for ${file.name} with provider=${embeddingProvider}.`,
  );

  const result = await resolvedDependencies.ingestRagFile({
    embeddingProvider,
    enableOcr,
    forceOcr,
    file,
    ingestId: requestId,
    sourceTitle,
    userId,
  });

  if (result.success) {
    resolvedDependencies.revalidateAdminPaths();
  }

  return result;
}
