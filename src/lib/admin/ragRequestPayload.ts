export type AdminRagEmbeddingProvider = "gemini" | "hf" | "openrouter";

export type AdminRagIngestFormPayload =
  | {
      embeddingProvider: AdminRagEmbeddingProvider;
      enableOcr: boolean;
      file: File;
      forceOcr: boolean;
      requestId: string;
      sourceTitle: string;
      success: true;
    }
  | {
      reason: "missing_file";
      requestId: string;
      success: false;
    };

type AdminRagJsonSourcesRequestPayload = {
  embeddingProvider: AdminRagEmbeddingProvider;
  ingestId: string;
};

function toTrimmedString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

export function toAdminRagEmbeddingProvider(
  value: unknown,
): AdminRagEmbeddingProvider {
  if (value === "gemini") {
    return "gemini";
  }

  if (value === "openrouter") {
    return "openrouter";
  }

  return "hf";
}

export function toAdminRagBoolean(value: unknown) {
  return value === "on" || value === "true";
}

export function parseAdminRagIngestForm(
  formData: FormData,
  fallbackRequestId: string,
): AdminRagIngestFormPayload {
  const requestId =
    toTrimmedString(formData.get("ingest_id")) ?? fallbackRequestId;
  const fileValue = formData.get("file") ?? formData.get("pdf");

  if (!(fileValue instanceof File)) {
    return {
      reason: "missing_file",
      requestId,
      success: false,
    };
  }

  return {
    embeddingProvider: toAdminRagEmbeddingProvider(
      formData.get("embedding_provider"),
    ),
    enableOcr: toAdminRagBoolean(formData.get("enable_ocr")),
    file: fileValue,
    forceOcr: toAdminRagBoolean(formData.get("force_ocr")),
    requestId,
    sourceTitle:
      toTrimmedString(formData.get("source_title")) ?? fileValue.name,
    success: true,
  };
}

export function parseAdminRagJsonSourcesRequest(
  value: unknown,
  fallbackIngestId: string,
): AdminRagJsonSourcesRequestPayload {
  const body =
    value !== null && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};

  return {
    embeddingProvider: toAdminRagEmbeddingProvider(body.embeddingProvider),
    ingestId: toTrimmedString(body.ingestId) ?? fallbackIngestId,
  };
}
