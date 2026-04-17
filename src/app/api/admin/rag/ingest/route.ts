import { NextResponse } from "next/server";

import { ingestRagFile } from "@/features/admin/lib/ragIngestion";
import { getProfileRole } from "@/features/profile/lib/server/queries";
import { revalidateAdminPaths } from "@/lib/server/revalidation";
import { getAuthenticatedUser } from "@/lib/supabase/authQueries";
import { hasSupabaseRuntimeEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 300;
export const runtime = "nodejs";

function toEmbeddingProvider(
  value: FormDataEntryValue | null,
): "gemini" | "hf" | "openrouter" {
  if (value === "gemini") {
    return "gemini";
  }

  if (value === "openrouter") {
    return "openrouter";
  }

  return "hf";
}

export async function POST(request: Request) {
  let requestId = crypto.randomUUID();

  try {
    if (!hasSupabaseRuntimeEnv()) {
      return NextResponse.json(
        {
          success: false,
          error: "RAG ingestion is unavailable right now.",
        },
        { status: 503 },
      );
    }

    const supabase = await createClient();
    const user = await getAuthenticatedUser(supabase);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "You must be signed in to ingest files.",
        },
        { status: 401 },
      );
    }

    const role = await getProfileRole(supabase, user.id);
    if (role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          error: "Only admins can ingest RAG documents.",
        },
        { status: 403 },
      );
    }

    const formData = await request.formData();
    const providedRequestId = formData.get("ingest_id");
    requestId =
      typeof providedRequestId === "string" &&
      providedRequestId.trim().length > 0
        ? providedRequestId.trim()
        : crypto.randomUUID();

    const fileValue = formData.get("file") ?? formData.get("pdf");

    if (!(fileValue instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          error: "Upload a file to ingest.",
        },
        { status: 400 },
      );
    }

    const sourceTitleValue = formData.get("source_title");
    const sourceTitle =
      typeof sourceTitleValue === "string" && sourceTitleValue.trim().length > 0
        ? sourceTitleValue.trim()
        : fileValue.name;

    const enableOcrRaw = formData.get("enable_ocr");
    const enableOcr = enableOcrRaw === "on" || enableOcrRaw === "true";

    const forceOcrRaw = formData.get("force_ocr");
    const forceOcr = forceOcrRaw === "on" || forceOcrRaw === "true";

    const embeddingProvider = toEmbeddingProvider(
      formData.get("embedding_provider"),
    );

    console.warn(
      `[RAG:${requestId}] API request received for ${fileValue.name} with provider=${embeddingProvider}.`,
    );

    const result = await ingestRagFile({
      embeddingProvider,
      enableOcr,
      forceOcr,
      file: fileValue,
      ingestId: requestId,
      sourceTitle,
      userId: user.id,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          ...result,
          embeddingProvider,
          ingestId: requestId,
        },
        { status: 400 },
      );
    }

    revalidateAdminPaths();
    return NextResponse.json({
      ...result,
      embeddingProvider,
      ingestId: requestId,
    });
  } catch (error) {
    console.error("RAG API ingestion failed:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not ingest this file into the RAG index.",
        ingestId: requestId,
      },
      { status: 500 },
    );
  }
}
