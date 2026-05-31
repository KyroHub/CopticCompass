import { embedMany } from "ai";

import { GEMINI_EMBEDDING_MODEL, getGeminiEmbeddingModel } from "@/lib/gemini";
import { HF_EMBEDDING_MODEL, generateHFEmbeddings } from "@/lib/hf";
import {
  OPENROUTER_EMBEDDING_MODEL,
  generateOpenRouterEmbeddings,
} from "@/lib/openrouter";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { createThothChatCompletion } from "@/lib/thoth";
import type { Json } from "@/types/supabase";

const RAG_VECTOR_DIMENSIONS = Number(
  process.env.RAG_VECTOR_DIMENSIONS ?? "768",
);
const GEMINI_EMBEDDING_OUTPUT_DIMENSION = Number(
  process.env.GEMINI_EMBEDDING_OUTPUT_DIMENSION ?? "3072",
);
const CHAT_FEEDBACK_THOTH_REFINEMENT_ENABLED =
  process.env.CHAT_FEEDBACK_THOTH_REFINEMENT_ENABLED !== "false";
const CHAT_FEEDBACK_THOTH_INPUT_LIMIT = Number(
  process.env.CHAT_FEEDBACK_THOTH_INPUT_LIMIT ?? "4000",
);

export type ShenuteFeedbackSignal = "admin_feedback" | "dislike" | "like";
export type ShenuteFeedbackEmbeddingProvider = "gemini" | "hf" | "openrouter";

export type ShenuteFeedbackPageContext = {
  excerpt?: string;
  path?: string;
  title?: string;
  url?: string;
};

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

type CopticDocumentsInsertRow = {
  content: string;
  embedding: string;
  metadata: Json;
};

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function createVectorLiteral(embedding: number[]) {
  return `[${embedding.join(",")}]`;
}

function normalizeEmbeddingDimensions(
  embedding: number[],
  targetDimensions = RAG_VECTOR_DIMENSIONS,
) {
  if (embedding.length === targetDimensions) {
    return embedding;
  }

  if (embedding.length > targetDimensions) {
    return embedding.slice(0, targetDimensions);
  }

  return [
    ...embedding,
    ...new Array(targetDimensions - embedding.length).fill(0),
  ];
}

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
    CHAT_FEEDBACK_THOTH_REFINEMENT_ENABLED && Boolean(process.env.THOTH_API_KEY)
  );
}

function buildThothAdminFeedbackRefinementQuery(options: {
  assistantResponse: string;
  feedbackText: string;
  prompt: string;
}) {
  return `You are THOTH AI refining admin feedback for a Coptic tutoring assistant quality-improvement pipeline.

Task:
- Rewrite the admin note so it is concise, actionable, and specific.
- Keep factual intent identical to the original note.
- Preserve mentions of Coptic terms, dialect details, or correction targets.
- Output plain text only with no markdown and no preface.

User prompt:
${options.prompt}

Assistant response:
${options.assistantResponse}

Original admin note:
${options.feedbackText}`;
}

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
      query: buildThothAdminFeedbackRefinementQuery({
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

async function generateFeedbackEmbedding(options: {
  provider: ShenuteFeedbackEmbeddingProvider;
  text: string;
}) {
  if (options.provider === "gemini") {
    const { embeddings } = await embedMany({
      model: getGeminiEmbeddingModel(),
      values: [options.text],
      providerOptions: {
        google: {
          outputDimensionality: GEMINI_EMBEDDING_OUTPUT_DIMENSION,
          taskType: "RETRIEVAL_DOCUMENT",
        },
      },
    });

    const embedding = embeddings[0];
    if (!Array.isArray(embedding) || embedding.length === 0) {
      throw new Error("Gemini did not return a usable embedding for feedback.");
    }

    return {
      embedding,
      model: GEMINI_EMBEDDING_MODEL,
    };
  }

  if (options.provider === "openrouter") {
    const embeddings = await generateOpenRouterEmbeddings([options.text]);
    const embedding = embeddings[0];
    if (!Array.isArray(embedding) || embedding.length === 0) {
      throw new Error(
        "OpenRouter did not return a usable embedding for feedback.",
      );
    }

    return {
      embedding,
      model: OPENROUTER_EMBEDDING_MODEL,
    };
  }

  const embeddings = await generateHFEmbeddings([options.text]);
  const embedding = embeddings[0];

  if (!Array.isArray(embedding) || embedding.length === 0) {
    throw new Error(
      "Hugging Face did not return a usable embedding for feedback.",
    );
  }

  return {
    embedding,
    model: HF_EMBEDDING_MODEL,
  };
}

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
}): CopticDocumentsInsertRow {
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

  const targetEmbedding = normalizeEmbeddingDimensions(embedding);

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
  const copticDocumentsTable = serviceRoleClient.from(
    "coptic_documents",
  ) as unknown as {
    insert: (
      values: CopticDocumentsInsertRow[],
    ) => Promise<{ error: { message: string } | null }>;
  };

  const { error } = await copticDocumentsTable.insert([row]);
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
