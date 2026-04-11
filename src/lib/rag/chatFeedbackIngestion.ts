import { embedMany } from "ai";

import { GEMINI_EMBEDDING_MODEL, getGeminiEmbeddingModel } from "@/lib/gemini";
import { HF_EMBEDDING_MODEL, generateHFEmbeddings } from "@/lib/hf";
import {
  OPENROUTER_EMBEDDING_MODEL,
  generateOpenRouterEmbeddings,
} from "@/lib/openrouter";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import type { Json } from "@/types/supabase";

const RAG_VECTOR_DIMENSIONS = Number(
  process.env.RAG_VECTOR_DIMENSIONS ?? "768",
);
const GEMINI_EMBEDDING_OUTPUT_DIMENSION = Number(
  process.env.GEMINI_EMBEDDING_OUTPUT_DIMENSION ?? "3072",
);

export type ChatFeedbackSignal = "admin_feedback" | "dislike" | "like";
export type ChatFeedbackEmbeddingProvider = "gemini" | "hf" | "openrouter";

export type ChatFeedbackPageContext = {
  excerpt?: string;
  path?: string;
  title?: string;
  url?: string;
};

type IngestChatFeedbackSignalOptions = {
  assistantMessageId?: string;
  assistantResponse: string;
  chatId?: string;
  feedbackText?: string;
  inferenceProvider: ChatFeedbackEmbeddingProvider;
  pageContext?: ChatFeedbackPageContext;
  prompt: string;
  signal: ChatFeedbackSignal;
  userId: string;
  userMessageId?: string;
};

type CopticDocumentsInsertRow = {
  content: string;
  embedding: string;
  metadata: Json;
};

type JsonObject = { [key: string]: Json | undefined };

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

function getSignalLearningLine(signal: ChatFeedbackSignal) {
  if (signal === "like") {
    return "Learner signal: helpful response (like).";
  }

  if (signal === "dislike") {
    return "Learner signal: unhelpful response (dislike).";
  }

  return "Admin signal: curated written feedback provided.";
}

async function generateFeedbackEmbedding(options: {
  provider: ChatFeedbackEmbeddingProvider;
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
  prompt: string;
  signal: ChatFeedbackSignal;
}) {
  const signalLine = getSignalLearningLine(options.signal);

  const sections = [
    "Type: chat_prompt_feedback",
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
      "Admin feedback:",
      normalizeWhitespace(options.feedbackText),
    );
  }

  return sections.join("\n");
}

function truncateOptionalText(value: string | undefined, maxLength: number) {
  if (typeof value !== "string") {
    return null;
  }

  return value.slice(0, maxLength);
}

function getAdminFeedbackText(
  signal: ChatFeedbackSignal,
  feedbackText?: string,
) {
  if (signal !== "admin_feedback") {
    return null;
  }

  return feedbackText ?? null;
}

function buildFeedbackMetadata(options: {
  embedding: number[];
  feedbackText?: string;
  model: string;
  pageContext?: ChatFeedbackPageContext;
  prompt: string;
  signal: ChatFeedbackSignal;
  sourceEmbeddingDimensions: number;
  uploadedAt: string;
  userId: string;
}): JsonObject {
  const isAdminFeedback = options.signal === "admin_feedback";

  return {
    createdAt: options.uploadedAt,
    embeddingDimensions: options.embedding.length,
    embeddingModel: options.model,
    feedbackText: getAdminFeedbackText(options.signal, options.feedbackText),
    isAdminFeedback,
    pageExcerpt: truncateOptionalText(options.pageContext?.excerpt, 1200),
    pagePath: truncateOptionalText(options.pageContext?.path, 240),
    pageTitle: truncateOptionalText(options.pageContext?.title, 320),
    pageUrl: truncateOptionalText(options.pageContext?.url, 500),
    promptPreview: normalizeWhitespace(options.prompt).slice(0, 240),
    signal: options.signal,
    sourceEmbeddingDimensions: options.sourceEmbeddingDimensions,
    uploadedAt: options.uploadedAt,
    uploadedBy: options.userId,
  };
}

function buildFeedbackDocumentRow(options: {
  assistantMessageId?: string;
  assistantResponse: string;
  chatId?: string;
  content: string;
  embedding: number[];
  feedbackText?: string;
  inferenceProvider: ChatFeedbackEmbeddingProvider;
  model: string;
  pageContext?: ChatFeedbackPageContext;
  prompt: string;
  signal: ChatFeedbackSignal;
  sourceEmbeddingDimensions: number;
  uploadedAt: string;
  userId: string;
  userMessageId?: string;
}): CopticDocumentsInsertRow {
  const metadata: JsonObject = {
    ...buildFeedbackMetadata({
      embedding: options.embedding,
      feedbackText: options.feedbackText,
      model: options.model,
      pageContext: options.pageContext,
      prompt: options.prompt,
      signal: options.signal,
      sourceEmbeddingDimensions: options.sourceEmbeddingDimensions,
      uploadedAt: options.uploadedAt,
      userId: options.userId,
    }),
    assistantMessageId: options.assistantMessageId ?? null,
    chatId: options.chatId ?? null,
    inferenceProvider: options.inferenceProvider,
    responsePreview: normalizeWhitespace(options.assistantResponse).slice(
      0,
      240,
    ),
    sourceName: "chat_feedback_signal",
    sourceType: "chat_feedback_signal",
    userMessageId: options.userMessageId ?? null,
  };

  return {
    content: options.content,
    embedding: createVectorLiteral(options.embedding),
    metadata,
  };
}

export async function ingestChatFeedbackLearningSignal(
  options: IngestChatFeedbackSignalOptions,
) {
  const uploadedAt = new Date().toISOString();
  const content = buildFeedbackLearningContent({
    assistantResponse: options.assistantResponse,
    feedbackText: options.feedbackText,
    prompt: options.prompt,
    signal: options.signal,
  });

  const { embedding, model } = await generateFeedbackEmbedding({
    provider: options.inferenceProvider,
    text: content,
  });

  const targetEmbedding = normalizeEmbeddingDimensions(embedding);

  const row = buildFeedbackDocumentRow({
    assistantMessageId: options.assistantMessageId,
    assistantResponse: options.assistantResponse,
    chatId: options.chatId,
    content,
    embedding: targetEmbedding,
    feedbackText: options.feedbackText,
    inferenceProvider: options.inferenceProvider,
    model,
    pageContext: options.pageContext,
    prompt: options.prompt,
    signal: options.signal,
    sourceEmbeddingDimensions: embedding.length,
    uploadedAt,
    userId: options.userId,
    userMessageId: options.userMessageId,
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
      `Failed to ingest chat feedback into RAG: ${error.message}`,
    );
  }

  return {
    contentLength: content.length,
    embeddingDimensions: targetEmbedding.length,
    success: true as const,
  };
}
