import "server-only";

import { generateTextEmbeddings } from "@/lib/ai/embeddings";
import { buildThothAdminFeedbackRefinementPrompt } from "@/lib/ai/prompts/shenute";
import { hasAiProviderToken } from "@/lib/ai/providerStatus";
import { getRagVectorRuntimeConfig } from "@/lib/ai/ragRuntimeConfig";
import { readBooleanEnv, readNumberEnv } from "@/lib/env";
import type {
  ShenuteFeedbackEmbeddingProvider,
  ShenuteFeedbackPageContext,
  ShenuteFeedbackSignal,
} from "@/lib/shenute/feedbackPayload";
import {
  insertCopticDocumentRows,
  type CopticDocumentInsertRow,
} from "@/lib/supabase/copticDocuments";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { normalizeWhitespace } from "@/lib/text";
import { createThothChatCompletion } from "@/lib/thoth";
import {
  createVectorLiteral,
  normalizeEmbeddingDimensions,
} from "@/lib/vector";
import type { Json } from "@/types/supabase";

const {
  geminiEmbeddingOutputDimension: GEMINI_EMBEDDING_OUTPUT_DIMENSION,
  vectorDimensions: RAG_VECTOR_DIMENSIONS,
} = getRagVectorRuntimeConfig(process.env);
const CHAT_FEEDBACK_THOTH_REFINEMENT_ENABLED = readBooleanEnv(
  process.env,
  "CHAT_FEEDBACK_THOTH_REFINEMENT_ENABLED",
  true,
);
const CHAT_FEEDBACK_THOTH_INPUT_LIMIT = readNumberEnv(
  process.env,
  "CHAT_FEEDBACK_THOTH_INPUT_LIMIT",
  4000,
);

const feedbackEmbeddingFailureMessages = {
  gemini: "Gemini did not return a usable embedding for feedback.",
  hf: "Hugging Face did not return a usable embedding for feedback.",
  openrouter: "OpenRouter did not return a usable embedding for feedback.",
} as const;

type IngestShenuteFeedbackSignalOptions = {
  assistantMessageId?: string;
  assistantResponse: string;
  shenuteSessionId?: string;
  feedbackText?: string;
  inferenceProvider: ShenuteFeedbackEmbeddingProvider;
  pageContext?: ShenuteFeedbackPageContext;
  prompt: string;
  signal: ShenuteFeedbackSignal;
  userId: string;
  userMessageId?: string;
};

function getSignalLearningLine(signal: ShenuteFeedbackSignal) {
  if (signal === "like") {
    return "Learner signal: helpful response (like).";
  }

  if (signal === "dislike") {
    return "Learner signal: unhelpful response (dislike).";
  }

  return "Admin signal: curated written feedback provided.";
}

function hasThothFeedbackRefinementAvailable() {
  return (
    CHAT_FEEDBACK_THOTH_REFINEMENT_ENABLED &&
    hasAiProviderToken(process.env, "thoth")
  );
}

/**
 * Optionally rewrites admin feedback into a concise learning signal. Failures
 * return `null` so feedback ingestion can proceed with the original note.
 */
async function maybeRefineAdminFeedbackWithThoth(options: {
  assistantResponse: string;
  feedbackText?: string;
  prompt: string;
  signal: ShenuteFeedbackSignal;
  userId: string;
}) {
  if (options.signal !== "admin_feedback" || !options.feedbackText) {
    return null;
  }

  if (!hasThothFeedbackRefinementAvailable()) {
    return null;
  }

  const trimmedFeedbackText = options.feedbackText
    .slice(0, CHAT_FEEDBACK_THOTH_INPUT_LIMIT)
    .trim();

  if (trimmedFeedbackText.length === 0) {
    return null;
  }

  try {
    const completion = await createThothChatCompletion({
      query: buildThothAdminFeedbackRefinementPrompt({
        assistantResponse: options.assistantResponse,
        feedbackText: trimmedFeedbackText,
        prompt: options.prompt,
      }),
      user: `shenute-feedback-admin-refine:${options.userId}`,
    });

    const refinedFeedbackText =
      typeof completion.answer === "string"
        ? normalizeWhitespace(completion.answer)
        : "";

    if (!refinedFeedbackText) {
      return null;
    }

    return refinedFeedbackText.slice(0, 5000);
  } catch {
    return null;
  }
}

/**
 * Embeds feedback-learning content with the same provider family used by the
 * chat turn, rejecting empty vectors before persistence.
 */
async function generateFeedbackEmbedding(options: {
  provider: ShenuteFeedbackEmbeddingProvider;
  text: string;
}) {
  const { embeddings, model } = await generateTextEmbeddings({
    provider: options.provider,
    values: [options.text],
    geminiOutputDimension: GEMINI_EMBEDDING_OUTPUT_DIMENSION,
  });
  const embedding = embeddings[0];

  if (!Array.isArray(embedding) || embedding.length === 0) {
    throw new Error(feedbackEmbeddingFailureMessages[options.provider]);
  }

  return {
    embedding,
    model,
  };
}

/**
 * Builds the plain-text learning document that later retrieval can surface as
 * evidence about helpful, unhelpful, or admin-corrected responses.
 */
function buildFeedbackLearningContent(options: {
  assistantResponse: string;
  feedbackText?: string;
  isThothRefinedFeedback?: boolean;
  prompt: string;
  signal: ShenuteFeedbackSignal;
}) {
  const signalLine = getSignalLearningLine(options.signal);

  const sections = [
    "Type: shenute_prompt_feedback",
    signalLine,
    "",
    "Prompt:",
    normalizeWhitespace(options.prompt),
    "",
    "Assistant response:",
    normalizeWhitespace(options.assistantResponse),
  ];

  if (options.signal === "admin_feedback" && options.feedbackText) {
    sections.push(
      "",
      options.isThothRefinedFeedback
        ? "Admin feedback (THOTH refined):"
        : "Admin feedback:",
      normalizeWhitespace(options.feedbackText),
    );
  }

  return sections.join("\n");
}

function buildFeedbackDocumentRow(options: {
  assistantMessageId?: string;
  assistantResponse: string;
  shenuteSessionId?: string;
  content: string;
  embedding: string;
  metadata: Json;
}): CopticDocumentInsertRow {
  return {
    content: options.content,
    embedding: options.embedding,
    metadata: options.metadata,
  };
}

function buildPageContextMetadata(pageContext?: ShenuteFeedbackPageContext) {
  const metadata: Record<string, string | null> = {
    pageExcerpt: null,
    pagePath: null,
    pageTitle: null,
    pageUrl: null,
  };

  if (!pageContext) {
    return metadata;
  }

  if (pageContext.excerpt) {
    metadata.pageExcerpt = pageContext.excerpt.slice(0, 1200);
  }
  if (pageContext.path) {
    metadata.pagePath = pageContext.path.slice(0, 240);
  }
  if (pageContext.title) {
    metadata.pageTitle = pageContext.title.slice(0, 320);
  }
  if (pageContext.url) {
    metadata.pageUrl = pageContext.url.slice(0, 500);
  }

  return metadata;
}

function buildAdminFeedbackMetadata(options: {
  signal: ShenuteFeedbackSignal;
  feedbackTextOriginal?: string;
  feedbackTextRefined?: string;
  isThothRefined: boolean;
}) {
  if (options.signal !== "admin_feedback") {
    return {
      adminFeedbackOriginal: null,
      adminFeedbackRefined: null,
      adminFeedbackRefinementProvider: null,
      feedbackText: null,
    };
  }

  return {
    adminFeedbackOriginal: options.feedbackTextOriginal ?? null,
    adminFeedbackRefined: options.feedbackTextRefined ?? null,
    adminFeedbackRefinementProvider: options.isThothRefined ? "thoth" : null,
    feedbackText: options.feedbackTextRefined ?? null,
  };
}

/**
 * Builds bounded metadata for feedback-derived RAG documents, including page
 * context and both original/refined admin notes when available.
 */
function buildFeedbackMetadata(options: {
  assistantMessageId?: string;
  feedbackTextOriginal?: string;
  feedbackTextRefined?: string;
  isThothRefined: boolean;
  shenuteSessionId?: string;
  uploadedAt: string;
  embeddingDimensions: number;
  embeddingModel: string;
  inferenceProvider: ShenuteFeedbackEmbeddingProvider;
  pageContext?: ShenuteFeedbackPageContext;
  prompt: string;
  assistantResponse: string;
  signal: ShenuteFeedbackSignal;
  sourceEmbeddingDimensions: number;
  userId: string;
  userMessageId?: string;
}): Json {
  const metadata: Record<string, unknown> = {
    assistantMessageId: options.assistantMessageId ?? null,
    shenuteSessionId: options.shenuteSessionId ?? null,
    createdAt: options.uploadedAt,
    embeddingDimensions: options.embeddingDimensions,
    embeddingModel: options.embeddingModel,
    inferenceProvider: options.inferenceProvider,
    isAdminFeedback: options.signal === "admin_feedback",
    signal: options.signal,
    sourceEmbeddingDimensions: options.sourceEmbeddingDimensions,
    sourceName: "shenute_feedback_signal",
    sourceType: "shenute_feedback_signal",
    uploadedAt: options.uploadedAt,
    uploadedBy: options.userId,
    userMessageId: options.userMessageId ?? null,
    promptPreview: normalizeWhitespace(options.prompt).slice(0, 240),
    responsePreview: normalizeWhitespace(options.assistantResponse).slice(
      0,
      240,
    ),
    ...buildPageContextMetadata(options.pageContext),
    ...buildAdminFeedbackMetadata({
      signal: options.signal,
      feedbackTextOriginal: options.feedbackTextOriginal,
      feedbackTextRefined: options.feedbackTextRefined,
      isThothRefined: options.isThothRefined,
    }),
  };

  return metadata as unknown as Json;
}

/**
 * Converts a chat feedback event into a RAG document so future Shenute answers
 * can retrieve prior correction signals.
 */
export async function ingestShenuteFeedbackLearningSignal(
  options: IngestShenuteFeedbackSignalOptions,
) {
  const uploadedAt = new Date().toISOString();
  const thothRefinedFeedbackText = await maybeRefineAdminFeedbackWithThoth({
    assistantResponse: options.assistantResponse,
    feedbackText: options.feedbackText,
    prompt: options.prompt,
    signal: options.signal,
    userId: options.userId,
  });
  const feedbackTextForLearning =
    thothRefinedFeedbackText ?? options.feedbackText;
  const content = buildFeedbackLearningContent({
    assistantResponse: options.assistantResponse,
    feedbackText: feedbackTextForLearning,
    isThothRefinedFeedback: Boolean(thothRefinedFeedbackText),
    prompt: options.prompt,
    signal: options.signal,
  });

  const { embedding, model } = await generateFeedbackEmbedding({
    provider: options.inferenceProvider,
    text: content,
  });

  const targetEmbedding = normalizeEmbeddingDimensions(
    embedding,
    RAG_VECTOR_DIMENSIONS,
  );

  const metadata = buildFeedbackMetadata({
    assistantMessageId: options.assistantMessageId,
    feedbackTextOriginal: options.feedbackText,
    feedbackTextRefined: feedbackTextForLearning,
    isThothRefined: Boolean(thothRefinedFeedbackText),
    shenuteSessionId: options.shenuteSessionId,
    uploadedAt,
    embeddingDimensions: targetEmbedding.length,
    embeddingModel: model,
    inferenceProvider: options.inferenceProvider,
    pageContext: options.pageContext,
    prompt: options.prompt,
    assistantResponse: options.assistantResponse,
    signal: options.signal,
    sourceEmbeddingDimensions: embedding.length,
    userId: options.userId,
    userMessageId: options.userMessageId,
  });

  const row = buildFeedbackDocumentRow({
    assistantMessageId: options.assistantMessageId,
    assistantResponse: options.assistantResponse,
    shenuteSessionId: options.shenuteSessionId,
    content,
    embedding: createVectorLiteral(targetEmbedding),
    metadata,
  });

  const serviceRoleClient = createServiceRoleClient();
  const { error } = await insertCopticDocumentRows(serviceRoleClient, [row]);
  if (error) {
    throw new Error(
      `Failed to ingest Shenute feedback into RAG: ${error.message}`,
    );
  }

  return {
    contentLength: content.length,
    embeddingDimensions: targetEmbedding.length,
    success: true as const,
  };
}
