import "server-only";

import { NextResponse } from "next/server";

import { requireAdminRagRouteAccess } from "@/features/admin/lib/server/ragRouteGuards";
import {
  buildAdminRagStatusAccessFailureResponses,
  buildAdminRagStatusResponse,
  type AdminRagStatusFailurePayload,
} from "@/features/admin/lib/server/ragStatusRouteResponses";
import { getAiProviderTokenStatus } from "@/lib/ai/providerStatus";
import { getRagJsonSourceStatuses } from "@/lib/server/ragJsonSourceStatus";
import { getCopticDocumentVectorStatus } from "@/lib/supabase/copticDocumentVectorStatus";

export async function handleAdminRagStatusGet() {
  try {
    const access =
      await requireAdminRagRouteAccess<AdminRagStatusFailurePayload>(
        buildAdminRagStatusAccessFailureResponses(),
      );

    if (!access.success) {
      return NextResponse.json(access.response.payload, access.response.init);
    }

    const providerTokenStatus = getAiProviderTokenStatus(process.env);
    const {
      chunkCount,
      healthy: vectorDbHealthy,
      note: vectorDbNote,
    } = await getCopticDocumentVectorStatus();
    const { dictionaryJsonRag, grammarJsonRag } =
      await getRagJsonSourceStatuses();

    return NextResponse.json(
      buildAdminRagStatusResponse({
        providerTokenStatus,
        vectorStatus: {
          chunkCount,
          healthy: vectorDbHealthy,
          note: vectorDbNote,
        },
        jsonSourceStatuses: {
          dictionaryJsonRag,
          grammarJsonRag,
        },
      }),
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Could not load RAG status.",
      },
      { status: 500 },
    );
  }
}
