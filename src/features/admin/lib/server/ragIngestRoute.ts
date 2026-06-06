import "server-only";
import { NextResponse } from "next/server";

import { ingestAdminRagFile } from "@/features/admin/lib/server/ragFileIngestionWorkflow";
import {
  buildAdminRagErrorResponse,
  buildAdminRagFileIngestionResponse,
  buildAdminRagIngestionAccessFailureResponses,
  getAdminRagErrorMessage,
} from "@/features/admin/lib/server/ragIngestionRouteResponses";
import { requireAdminRagRouteAccess } from "@/features/admin/lib/server/ragRouteGuards";
import { parseAdminRagIngestForm } from "@/lib/admin/ragRequestPayload";

export async function handleAdminRagIngestPost(request: Request) {
  let requestId = crypto.randomUUID();

  try {
    const access = await requireAdminRagRouteAccess(
      buildAdminRagIngestionAccessFailureResponses(),
    );

    if (!access.success) {
      return NextResponse.json(access.response.payload, access.response.init);
    }

    const formData = await request.formData();
    const parsedForm = parseAdminRagIngestForm(formData, crypto.randomUUID());
    requestId = parsedForm.requestId;

    if (!parsedForm.success) {
      const response = buildAdminRagErrorResponse(
        {
          success: false,
          error: "Upload a file to ingest.",
        },
        400,
      );
      return NextResponse.json(response.payload, response.init);
    }

    const result = await ingestAdminRagFile({
      parsedForm,
      userId: access.user.id,
    });

    const response = buildAdminRagFileIngestionResponse({
      embeddingProvider: parsedForm.embeddingProvider,
      ingestId: requestId,
      result,
    });

    return NextResponse.json(response.payload, response.init);
  } catch (error) {
    console.error("RAG API ingestion failed:", error);

    const response = buildAdminRagErrorResponse(
      {
        success: false,
        error: getAdminRagErrorMessage(
          error,
          "Could not ingest this file into the RAG index.",
        ),
        ingestId: requestId,
      },
      500,
    );
    return NextResponse.json(response.payload, response.init);
  }
}
