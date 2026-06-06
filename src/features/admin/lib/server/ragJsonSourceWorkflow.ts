import "server-only";

import { ingestRagFile } from "@/features/admin/lib/ragIngestion";
import type { AdminRagBulkJsonResult } from "@/lib/admin/ragDashboard";
import {
  discoverJsonKnowledgeSources,
  getRagJsonSourceLocations,
  readJsonKnowledgeSourceContent,
  type RagJsonKnowledgeSource,
  type RagJsonSourceDiscoveryOptions,
  type RagJsonSourceLocations,
} from "@/lib/server/ragJsonSources";

import {
  buildAdminRagJsonSourceEmptyFileResult,
  buildAdminRagJsonSourceErrorResult,
  buildAdminRagJsonSourceIngestionResult,
} from "./ragIngestionRouteResponses";

import type { RagEmbeddingProvider } from "../ragIngestionTypes";

export type AdminRagJsonSourceWorkflowDependencies = {
  createJsonFile: (content: string, fileName: string) => File;
  discoverJsonKnowledgeSources: (
    options: RagJsonSourceDiscoveryOptions,
  ) => Promise<RagJsonKnowledgeSource[]>;
  getRagJsonSourceLocations: () => RagJsonSourceLocations;
  ingestRagFile: typeof ingestRagFile;
  log: (message: string) => void;
  readJsonKnowledgeSourceContent: (sourcePath: string) => Promise<string>;
};

type AdminRagJsonSourceWorkflowResult =
  | {
      dataRoot: string;
      kind: "no_sources";
    }
  | {
      chunksInserted: number;
      filesDiscovered: number;
      kind: "completed";
      results: AdminRagBulkJsonResult[];
    };

const defaultWorkflowDependencies: AdminRagJsonSourceWorkflowDependencies = {
  createJsonFile: (content, fileName) =>
    new File([content], fileName, {
      type: "application/json",
    }),
  discoverJsonKnowledgeSources,
  getRagJsonSourceLocations,
  ingestRagFile,
  log: (message) => console.warn(message),
  readJsonKnowledgeSourceContent,
};

function resolveWorkflowDependencies(
  dependencies: Partial<AdminRagJsonSourceWorkflowDependencies> = {},
): AdminRagJsonSourceWorkflowDependencies {
  return {
    ...defaultWorkflowDependencies,
    ...dependencies,
  };
}

/**
 * Discovers bundled dictionary/grammar JSON sources and ingests each readable
 * source file into the RAG index while preserving per-source failure details.
 */
export async function ingestAdminRagJsonSources({
  dependencies,
  embeddingProvider,
  ingestId,
  userId,
}: {
  dependencies?: Partial<AdminRagJsonSourceWorkflowDependencies>;
  embeddingProvider: RagEmbeddingProvider;
  ingestId: string;
  userId: string;
}): Promise<AdminRagJsonSourceWorkflowResult> {
  const resolvedDependencies = resolveWorkflowDependencies(dependencies);
  const sourceLocations = resolvedDependencies.getRagJsonSourceLocations();
  resolvedDependencies.log(
    `[RAG:JSON] DATA_ROOT is: ${sourceLocations.dataRoot}`,
  );
  const sources = await resolvedDependencies.discoverJsonKnowledgeSources({
    ...sourceLocations,
    log: resolvedDependencies.log,
  });
  resolvedDependencies.log(`[RAG:JSON] Discovered ${sources.length} sources.`);

  if (sources.length === 0) {
    resolvedDependencies.log(
      `[RAG:JSON] No sources found in DATA_ROOT: ${sourceLocations.dataRoot}`,
    );
    return {
      dataRoot: sourceLocations.dataRoot,
      kind: "no_sources",
    };
  }

  const results: AdminRagBulkJsonResult[] = [];
  let chunksInserted = 0;

  for (let index = 0; index < sources.length; index += 1) {
    const source = sources[index];

    try {
      const content = await resolvedDependencies.readJsonKnowledgeSourceContent(
        source.filePath,
      );
      if (content.trim().length === 0) {
        results.push(buildAdminRagJsonSourceEmptyFileResult(source.title));
        continue;
      }

      const file = resolvedDependencies.createJsonFile(
        content,
        source.fileName,
      );
      const result = await resolvedDependencies.ingestRagFile({
        embeddingProvider,
        enableOcr: false,
        file,
        ingestId: `${ingestId}-${index + 1}`,
        jsonChunkMode: "compact",
        skipThothEnrichment: true,
        skipThothProofcheck: true,
        sourceTitle: source.title,
        userId,
      });

      const fileResult = buildAdminRagJsonSourceIngestionResult({
        result,
        sourcePath: source.title,
      });
      chunksInserted += fileResult.success
        ? (fileResult.chunksInserted ?? 0)
        : 0;
      results.push(fileResult);
    } catch (error) {
      results.push(
        buildAdminRagJsonSourceErrorResult({
          error,
          sourcePath: source.title,
        }),
      );
    }
  }

  return {
    chunksInserted,
    filesDiscovered: sources.length,
    kind: "completed",
    results,
  };
}
