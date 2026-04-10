"use server";

import { ingestRagFile } from "@/features/admin/lib/ragIngestion";
import { revalidateAdminPaths } from "@/lib/server/revalidation";
import { getValidatedAdminContext } from "./shared";
import type { RagIngestionState } from "./states";

export async function ingestRagPdf(
  _prevState: RagIngestionState | null,
  formData: FormData,
): Promise<RagIngestionState> {
  try {
    const adminContext = await getValidatedAdminContext();
    if (!adminContext) {
      return {
        success: false,
        error: "RAG ingestion is unavailable right now.",
      };
    }

    const fileValue = formData.get("file") ?? formData.get("pdf");
    if (!(fileValue instanceof File)) {
      return {
        success: false,
        error: "Upload a file to ingest.",
      };
    }

    const sourceTitleValue = formData.get("source_title");
    const sourceTitle =
      typeof sourceTitleValue === "string" && sourceTitleValue.trim().length > 0
        ? sourceTitleValue.trim()
        : fileValue.name;

    const embeddingProviderRaw = formData.get("embedding_provider");
    const embeddingProvider =
      embeddingProviderRaw === "gemini"
        ? "gemini"
        : embeddingProviderRaw === "openrouter"
          ? "openrouter"
          : "hf";
    const ingestIdRaw = formData.get("ingest_id");

    const result = await ingestRagFile({
      embeddingProvider,
      enableOcr: formData.get("enable_ocr") === "on",
      file: fileValue,
      ingestId: typeof ingestIdRaw === "string" ? ingestIdRaw : undefined,
      sourceTitle,
      userId: adminContext.user.id,
    });

    if (!result.success) {
      return {
        success: false,
        error: result.error ?? "Could not ingest this file into the RAG index.",
      };
    }

    revalidateAdminPaths();

    return {
      success: true,
      chunkStats: result.chunkStats,
      chunksInserted: result.chunksInserted,
      embeddingProvider,
      logs: result.logs,
      message: result.message,
      ocrUsed: result.ocrUsed,
      sourceName: result.sourceName,
    };
  } catch (error) {
    console.error("RAG ingestion failed:", error);

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not ingest this file into the RAG index.",
    };
  }
}
