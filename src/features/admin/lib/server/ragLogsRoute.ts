import "server-only";
import { NextResponse } from "next/server";

import { getRagIngestionLogs } from "@/features/admin/lib/ragIngestion";
import {
  buildAdminRagLogsAccessFailureResponses,
  buildAdminRagLogsSuccessResponse,
  parseAdminRagLogsQuery,
} from "@/features/admin/lib/server/ragIngestionRouteResponses";
import { requireAdminRagRouteAccess } from "@/features/admin/lib/server/ragRouteGuards";

export async function handleAdminRagLogsGet(request: Request) {
  try {
    const access = await requireAdminRagRouteAccess(
      buildAdminRagLogsAccessFailureResponses(),
    );

    if (!access.success) {
      return NextResponse.json(access.response.payload, access.response.init);
    }

    const parsedQuery = parseAdminRagLogsQuery(request.url);
    if (!parsedQuery.success) {
      return NextResponse.json(
        parsedQuery.response.payload,
        parsedQuery.response.init,
      );
    }

    const logs = getRagIngestionLogs({
      ingestId: parsedQuery.ingestId,
      prefix: parsedQuery.prefix,
    });
    const response = buildAdminRagLogsSuccessResponse({
      ingestId: parsedQuery.ingestId,
      prefix: parsedQuery.prefix,
      logs,
    });

    return NextResponse.json(response.payload, response.init);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Could not load RAG logs.",
      },
      { status: 500 },
    );
  }
}
