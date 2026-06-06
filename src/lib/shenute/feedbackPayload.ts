import {
  hasLengthInRange,
  normalizeMultiline,
  normalizeWhitespace,
} from "@/lib/validation";

export type ShenuteFeedbackSignal = "admin_feedback" | "dislike" | "like";
export type ShenuteFeedbackEmbeddingProvider = "gemini" | "hf" | "openrouter";

export type ShenuteFeedbackPageContext = {
  excerpt?: string;
  path?: string;
  title?: string;
  url?: string;
};

type ShenuteFeedbackRequestPayload = {
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

type NormalizedShenuteFeedbackPayload = {
  assistantMessageId?: string;
  assistantResponse: string;
  feedbackText?: string;
  inferenceProvider: ShenuteFeedbackEmbeddingProvider;
  pageContext?: ShenuteFeedbackPageContext;
  prompt: string;
  shenuteSessionId?: string;
  signal: ShenuteFeedbackSignal;
  userMessageId?: string;
};

type ShenuteFeedbackPayloadParseResult =
  | {
      payload: NormalizedShenuteFeedbackPayload;
      success: true;
    }
  | {
      reason: "invalid_message_content" | "invalid_payload" | "invalid_signal";
      success: false;
    };

const SHENUTE_FEEDBACK_PROMPT_MAX_CHARS = 12_000;
const SHENUTE_FEEDBACK_RESPONSE_MAX_CHARS = 24_000;
const SHENUTE_FEEDBACK_TEXT_MAX_CHARS = 5_000;

export function toShenuteFeedbackProvider(
  value: unknown,
): ShenuteFeedbackEmbeddingProvider {
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

export function toShenuteFeedbackSignal(
  value: unknown,
): ShenuteFeedbackSignal | null {
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

function toOptionalBoundedShenuteFeedbackString(
  value: unknown,
  maxLength: number,
  options?: { multiline?: boolean },
) {
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

function toShenuteFeedbackPageContext(
  value: unknown,
): ShenuteFeedbackPageContext | undefined {
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
    excerpt: toOptionalBoundedShenuteFeedbackString(candidate.excerpt, 2000),
    path: toOptionalBoundedShenuteFeedbackString(candidate.path, 260),
    title: toOptionalBoundedShenuteFeedbackString(candidate.title, 320),
    url: toOptionalBoundedShenuteFeedbackString(candidate.url, 500),
  };
}

/**
 * Normalizes a raw feedback request body while preserving admin authorization
 * checks for the route layer.
 */
export function parseShenuteFeedbackPayload(
  value: unknown,
): ShenuteFeedbackPayloadParseResult {
  if (!value || typeof value !== "object") {
    return { success: false, reason: "invalid_payload" };
  }

  const body = value as ShenuteFeedbackRequestPayload;
  const signal = toShenuteFeedbackSignal(body.signal);

  if (!signal) {
    return { success: false, reason: "invalid_signal" };
  }

  const prompt = normalizeMultiline(
    typeof body.prompt === "string" ? body.prompt : "",
  );
  const assistantResponse = normalizeMultiline(
    typeof body.assistantResponse === "string" ? body.assistantResponse : "",
  );

  if (
    !hasLengthInRange(prompt, {
      min: 1,
      max: SHENUTE_FEEDBACK_PROMPT_MAX_CHARS,
    }) ||
    !hasLengthInRange(assistantResponse, {
      min: 1,
      max: SHENUTE_FEEDBACK_RESPONSE_MAX_CHARS,
    })
  ) {
    return { success: false, reason: "invalid_message_content" };
  }

  return {
    success: true,
    payload: {
      assistantMessageId: toOptionalBoundedShenuteFeedbackString(
        body.assistantMessageId,
        120,
      ),
      assistantResponse,
      feedbackText:
        signal === "admin_feedback"
          ? toOptionalBoundedShenuteFeedbackString(
              body.feedbackText,
              SHENUTE_FEEDBACK_TEXT_MAX_CHARS,
              {
                multiline: true,
              },
            )
          : undefined,
      inferenceProvider: toShenuteFeedbackProvider(body.inferenceProvider),
      pageContext: toShenuteFeedbackPageContext(body.pageContext),
      prompt,
      shenuteSessionId: toOptionalBoundedShenuteFeedbackString(
        body.shenuteSessionId,
        120,
      ),
      signal,
      userMessageId: toOptionalBoundedShenuteFeedbackString(
        body.userMessageId,
        120,
      ),
    },
  };
}
