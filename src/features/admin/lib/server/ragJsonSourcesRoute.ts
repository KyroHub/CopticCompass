import "server-only";
import crypto from "node:crypto";

import { NextResponse } from "next/server";

import {
  buildAdminRagErrorResponse,
  buildAdminRagIngestionAccessFailureResponses,
  buildAdminRagJsonSourcesIngestionResponse,
  getAdminRagErrorMessage,
} from "@/features/admin/lib/server/ragIngestionRouteResponses";
import { ingestAdminRagJsonSources } from "@/features/admin/lib/server/ragJsonSourceWorkflow";
import { requireAdminRagRouteAccess } from "@/features/admin/lib/server/ragRouteGuards";
import { parseAdminRagJsonSourcesRequest } from "@/lib/admin/ragRequestPayload";

export async function handleAdminRagJsonSourcesPost(request: Request) {
  let ingestId = "initial";
  try {
    ingestId = crypto.randomUUID?.() || `local-${Date.now()}`;
  } catch {
    ingestId = `local-${Date.now()}`;
  }

  try {
    const access = await requireAdminRagRouteAccess(
      buildAdminRagIngestionAccessFailureResponses(),
    );

    if (!access.success) {
      return NextResponse.json(access.response.payload, access.response.init);
    }

    const requestBody = await request.json().catch(() => ({}));
    const parsedRequest = parseAdminRagJsonSourcesRequest(
      requestBody,
      ingestId,
    );
    ingestId = parsedRequest.ingestId;
    const { embeddingProvider } = parsedRequest;

    const workflowResult = await ingestAdminRagJsonSources({
      embeddingProvider,
      ingestId,
      userId: access.user.id,
    });

    if (workflowResult.kind === "no_sources") {
      const response = buildAdminRagErrorResponse(
        {
          success: false,
          error:
            "No dictionary or grammar JSON files were found under public/data.",
          ingestId,
        },
        400,
      );
      return NextResponse.json(response.payload, response.init);
    }

    const response = buildAdminRagJsonSourcesIngestionResponse({
      ingestId,
      embeddingProvider,
      filesDiscovered: workflowResult.filesDiscovered,
      chunksInserted: workflowResult.chunksInserted,
      results: workflowResult.results,
    });

    return NextResponse.json(response.payload, response.init);
  } catch (error) {
    const response = buildAdminRagErrorResponse(
      {
        success: false,
        error: getAdminRagErrorMessage(
          error,
          "Could not ingest JSON knowledge sources.",
        ),
        ingestId,
      },
      500,
    );
    return NextResponse.json(response.payload, response.init);
  }
}
