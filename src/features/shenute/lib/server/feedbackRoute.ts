import { jsonErrorResponse, type AppErrorCode } from "@/lib/errors";
import {
  consumeRateLimit,
  getUserRateLimitIdentifier,
  hasAvailableRateLimitProtection,
} from "@/lib/rateLimit";
import { parseShenuteFeedbackPayload } from "@/lib/shenute/feedbackPayload";
import { getAuthenticatedUser } from "@/lib/supabase/authQueries";
import { insertChatFeedbackEvent } from "@/lib/supabase/chatFeedback";
import { hasSupabaseRuntimeEnv } from "@/lib/supabase/config";
import { isMissingSupabaseTableError } from "@/lib/supabase/errors";
import { getProfileRole } from "@/lib/supabase/profileRole";
import { createClient } from "@/lib/supabase/server";

import { ingestShenuteFeedbackLearningSignal } from "./feedbackIngestion";

const SHENUTE_FEEDBACK_RATE_LIMIT = 20;
const SHENUTE_FEEDBACK_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

function createFeedbackErrorResponse(
  code: AppErrorCode,
  status: number,
  headers?: HeadersInit,
) {
  return jsonErrorResponse({
    context: "feedback",
    error: code,
    fallbackCode: code,
    headers,
    requestIdPrefix: "feedback",
    status,
  });
}

function getRetryAfterSeconds(retryAfterMs: number) {
  return Math.max(1, Math.ceil(retryAfterMs / 1000)).toString();
}

async function getFeedbackRateLimitResponse(userId: string) {
  if (!hasAvailableRateLimitProtection()) {
    return createFeedbackErrorResponse("external_service_unavailable", 503);
  }

  try {
    const result = await consumeRateLimit({
      identifier: getUserRateLimitIdentifier(userId),
      limit: SHENUTE_FEEDBACK_RATE_LIMIT,
      namespace: "shenute:feedback",
      windowMs: SHENUTE_FEEDBACK_RATE_LIMIT_WINDOW_MS,
    });

    if (result.ok) {
      return null;
    }

    return createFeedbackErrorResponse("rate_limited", 429, {
      "Retry-After": getRetryAfterSeconds(result.retryAfterMs),
    });
  } catch (error) {
    console.error("Shenute feedback rate-limit check failed:", error);
    return createFeedbackErrorResponse("external_service_unavailable", 503);
  }
}

export async function handleShenuteFeedbackPost(request: Request) {
  try {
    if (!hasSupabaseRuntimeEnv()) {
      return createFeedbackErrorResponse("storage_unavailable", 503);
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return createFeedbackErrorResponse("validation_failed", 400);
    }

    const parsedPayload = parseShenuteFeedbackPayload(body);
    if (!parsedPayload.success) {
      return createFeedbackErrorResponse("validation_failed", 400);
    }
    const {
      assistantMessageId,
      assistantResponse,
      feedbackText,
      inferenceProvider,
      pageContext,
      prompt,
      shenuteSessionId,
      signal,
      userMessageId,
    } = parsedPayload.payload;

    const supabase = await createClient();
    const user = await getAuthenticatedUser(supabase);

    if (!user) {
      return createFeedbackErrorResponse("auth_required", 401);
    }

    const rateLimitResponse = await getFeedbackRateLimitResponse(user.id);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const role = await getProfileRole(supabase, user.id);
    const isAdmin = role === "admin";

    if (signal === "admin_feedback" && !isAdmin) {
      return createFeedbackErrorResponse("permission_denied", 403);
    }

    if (signal === "admin_feedback" && !feedbackText) {
      return createFeedbackErrorResponse("validation_failed", 400);
    }

    const { error: insertError } = await insertChatFeedbackEvent(supabase, {
      assistant_message_id: assistantMessageId ?? null,
      assistant_response_text: assistantResponse,
      chat_id: shenuteSessionId ?? null,
      feedback_text:
        signal === "admin_feedback" ? (feedbackText ?? null) : null,
      inference_provider: inferenceProvider,
      is_admin_feedback: signal === "admin_feedback",
      page_excerpt: pageContext?.excerpt ?? null,
      page_path: pageContext?.path ?? null,
      page_title: pageContext?.title ?? null,
      page_url: pageContext?.url ?? null,
      prompt_text: prompt,
      signal,
      user_id: user.id,
      user_message_id: userMessageId ?? null,
    });

    if (insertError) {
      console.error("Failed to persist Shenute feedback event:", insertError);
      const storageUnavailable = isMissingSupabaseTableError(insertError);

      return createFeedbackErrorResponse(
        storageUnavailable ? "storage_unavailable" : "unexpected",
        storageUnavailable ? 503 : 500,
      );
    }

    let ragIngested = false;
    let ragWarning = false;

    try {
      await ingestShenuteFeedbackLearningSignal({
        assistantMessageId,
        assistantResponse,
        shenuteSessionId,
        feedbackText,
        inferenceProvider,
        pageContext,
        prompt,
        signal,
        userId: user.id,
        userMessageId,
      });
      ragIngested = true;
    } catch (ragIngestionError) {
      ragWarning = true;
      console.error(
        "Failed to ingest Shenute feedback into RAG:",
        ragIngestionError,
      );
    }

    return Response.json(
      {
        ragIngested,
        ...(ragWarning ? { ragWarning: true } : {}),
        success: true,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("Shenute feedback API failed:", error);

    return createFeedbackErrorResponse("unexpected", 500);
  }
}
