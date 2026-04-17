import { NextResponse } from "next/server";

import { getProfileRole } from "@/features/profile/lib/server/queries";
import {
  ingestChatFeedbackLearningSignal,
  type ChatFeedbackEmbeddingProvider,
  type ChatFeedbackPageContext,
  type ChatFeedbackSignal,
} from "@/lib/rag/chatFeedbackIngestion";
import { getAuthenticatedUser } from "@/lib/supabase/authQueries";
import { hasSupabaseRuntimeEnv } from "@/lib/supabase/config";
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
  chatId?: unknown;
  feedbackText?: unknown;
  inferenceProvider?: unknown;
  pageContext?: unknown;
  prompt?: unknown;
  signal?: unknown;
  userMessageId?: unknown;
};

function toProvider(value: unknown): ChatFeedbackEmbeddingProvider {
  if (value === "gemini") {
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

function toSignal(value: unknown): ChatFeedbackSignal | null {
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

function toPageContext(value: unknown): ChatFeedbackPageContext | undefined {
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
      return NextResponse.json(
        {
          success: false,
          error: "Chat feedback is unavailable right now.",
        },
        { status: 503 },
      );
    }

    const body = (await request.json()) as FeedbackRequestPayload;
    const signal = toSignal(body.signal);

    if (!signal) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid feedback signal.",
        },
        { status: 400 },
      );
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
      return NextResponse.json(
        {
          success: false,
          error: "Prompt or assistant response payload is invalid.",
        },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const user = await getAuthenticatedUser(supabase);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "You must be signed in to send feedback.",
        },
        { status: 401 },
      );
    }

    const role = await getProfileRole(supabase, user.id);
    const isAdmin = role === "admin";
    const feedbackText =
      signal === "admin_feedback"
        ? toOptionalBoundedString(body.feedbackText, 5000, { multiline: true })
        : undefined;

    if (signal === "admin_feedback" && !isAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: "Only admins can submit written prompt feedback.",
        },
        { status: 403 },
      );
    }

    if (signal === "admin_feedback" && !feedbackText) {
      return NextResponse.json(
        {
          success: false,
          error: "Written admin feedback is required.",
        },
        { status: 400 },
      );
    }

    const pageContext = toPageContext(body.pageContext);
    const inferenceProvider = toProvider(body.inferenceProvider);
    const chatId = toOptionalBoundedString(body.chatId, 120);
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
        chat_id: chatId ?? null,
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
      console.error("Failed to persist chat feedback event:", insertError);
      return NextResponse.json(
        {
          success: false,
          error: "Could not store feedback right now.",
        },
        { status: 500 },
      );
    }

    let ragIngested = false;
    let ragWarning: string | undefined;

    try {
      await ingestChatFeedbackLearningSignal({
        assistantMessageId,
        assistantResponse,
        chatId,
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
      ragWarning =
        ragIngestionError instanceof Error
          ? ragIngestionError.message
          : "Unknown RAG ingestion error.";
      console.error(
        "Failed to ingest chat feedback into RAG:",
        ragIngestionError,
      );
    }

    return NextResponse.json({
      ragIngested,
      ...(ragWarning ? { ragWarning } : {}),
      success: true,
    });
  } catch (error) {
    console.error("Chat feedback API failed:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown chat feedback error.",
      },
      { status: 500 },
    );
  }
}
