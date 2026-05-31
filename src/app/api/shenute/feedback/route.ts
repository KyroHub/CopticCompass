import { getProfileRole } from "@/features/profile/lib/server/queries";
import { jsonErrorResponse, type AppErrorCode } from "@/lib/errors";
import {
  ingestShenuteFeedbackLearningSignal,
  type ShenuteFeedbackEmbeddingProvider,
  type ShenuteFeedbackPageContext,
  type ShenuteFeedbackSignal,
} from "@/lib/rag/shenuteFeedbackIngestion";
import { getAuthenticatedUser } from "@/lib/supabase/authQueries";
import { hasSupabaseRuntimeEnv } from "@/lib/supabase/config";
import { isMissingSupabaseTableError } from "@/lib/supabase/errors";
import { createClient } from "@/lib/supabase/server";
import {
  hasLengthInRange,
  normalizeMultiline,
  normalizeWhitespace,
} from "@/lib/validation";

export const runtime = "nodejs";

type FeedbackRequestPayload = {
  assistantMessageId?: unknown;
  assistantResponse?: unknown;
  shenuteSessionId?: unknown;
  feedbackText?: unknown;
  inferenceProvider?: unknown;
  pageContext?: unknown;
  prompt?: unknown;
  signal?: unknown;
  userMessageId?: unknown;
};

function createFeedbackErrorResponse(code: AppErrorCode, status: number) {
  return jsonErrorResponse({
    context: "feedback",
    error: code,
    fallbackCode: code,
    requestIdPrefix: "feedback",
    status,
  });
}

function toProvider(value: unknown): ShenuteFeedbackEmbeddingProvider {
  if (value === "gemini") {
    return "gemini";
  }

  if (value === "gemini_nmt") {
    return "gemini";
  }

  if (value === "hf") {
    return "hf";
  }

  if (value === "openrouter") {
    return "openrouter";
  }

  if (value === "thoth") {
    return "openrouter";
  }

  return "openrouter";
}

function toSignal(value: unknown): ShenuteFeedbackSignal | null {
  if (value === "admin_feedback") {
    return "admin_feedback";
  }

  if (value === "like") {
    return "like";
  }

  if (value === "dislike") {
    return "dislike";
  }

  return null;
}

function toOptionalBoundedString(
  value: unknown,
  maxLength: number,
  options?: { multiline?: boolean },
): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = options?.multiline
    ? normalizeMultiline(value)
    : normalizeWhitespace(value);

  if (!normalized || normalized.length === 0) {
    return undefined;
  }

  return normalized.slice(0, maxLength);
}

function toPageContext(value: unknown): ShenuteFeedbackPageContext | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const candidate = value as {
    excerpt?: unknown;
    path?: unknown;
    title?: unknown;
    url?: unknown;
  };

  return {
    excerpt: toOptionalBoundedString(candidate.excerpt, 2000),
    path: toOptionalBoundedString(candidate.path, 260),
    title: toOptionalBoundedString(candidate.title, 320),
    url: toOptionalBoundedString(candidate.url, 500),
  };
}

export async function POST(request: Request) {
  try {
    if (!hasSupabaseRuntimeEnv()) {
      return createFeedbackErrorResponse("storage_unavailable", 503);
    }

    let body: FeedbackRequestPayload;

    try {
      body = (await request.json()) as FeedbackRequestPayload;
    } catch {
      return createFeedbackErrorResponse("validation_failed", 400);
    }

    const signal = toSignal(body.signal);

    if (!signal) {
      return createFeedbackErrorResponse("validation_failed", 400);
    }

    const prompt = normalizeMultiline(
      typeof body.prompt === "string" ? body.prompt : "",
    );
    const assistantResponse = normalizeMultiline(
      typeof body.assistantResponse === "string" ? body.assistantResponse : "",
    );

    if (
      !hasLengthInRange(prompt, { min: 1, max: 12000 }) ||
      !hasLengthInRange(assistantResponse, { min: 1, max: 24000 })
    ) {
      return createFeedbackErrorResponse("validation_failed", 400);
    }

    const supabase = await createClient();
    const user = await getAuthenticatedUser(supabase);

    if (!user) {
      return createFeedbackErrorResponse("auth_required", 401);
    }

    const role = await getProfileRole(supabase, user.id);
    const isAdmin = role === "admin";
    const feedbackText =
      signal === "admin_feedback"
        ? toOptionalBoundedString(body.feedbackText, 5000, { multiline: true })
        : undefined;

    if (signal === "admin_feedback" && !isAdmin) {
      return createFeedbackErrorResponse("permission_denied", 403);
    }

    if (signal === "admin_feedback" && !feedbackText) {
      return createFeedbackErrorResponse("validation_failed", 400);
    }

    const pageContext = toPageContext(body.pageContext);
    const inferenceProvider = toProvider(body.inferenceProvider);
    const shenuteSessionId = toOptionalBoundedString(
      body.shenuteSessionId,
      120,
    );
    const userMessageId = toOptionalBoundedString(body.userMessageId, 120);
    const assistantMessageId = toOptionalBoundedString(
      body.assistantMessageId,
      120,
    );

    const { error: insertError } = await supabase
      .from("chat_feedback_events")
      .insert({
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
