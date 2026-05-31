import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  generateText,
  type UIMessage,
} from "ai";

import {
  searchCopticDocuments,
  searchVocabularyByKeywords,
} from "@/actions/vectorSearch";
import {
  requestNMTTranslation,
  type NMTTranslationSuggestion,
} from "@/lib/copticTranslator";
import {
  recordDistillationExample,
  formatNMTForDistillation,
} from "@/lib/distillation";
import {
  getPublicErrorMessage,
  jsonErrorResponse,
  type AppErrorCode,
} from "@/lib/errors";
import { getGeminiModel } from "@/lib/gemini";
import { createHfChatCompletion, type HfChatMessage } from "@/lib/hf";
import {
  createOpenRouterChatCompletion,
  type OpenRouterChatMessage,
} from "@/lib/openrouter";
import {
  consumeRateLimit,
  getUserRateLimitIdentifier,
  hasAvailableRateLimitProtection,
} from "@/lib/rateLimit";
import { getAuthenticatedUser } from "@/lib/supabase/authQueries";
import { hasSupabaseRuntimeEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { createThothChatCompletion } from "@/lib/thoth";

export const maxDuration = 300;
export const runtime = "nodejs";

type InferenceProvider =
  | "gemini"
  | "gemini_nmt"
  | "hf"
  | "openrouter"
  | "thoth";

type OpenRouterReasoningCacheEntry = {
  updatedAt: number;
  byAssistantContent: Map<string, unknown>;
};

type GlobalWithOpenRouterReasoningStore = typeof globalThis & {
  __copticOpenRouterReasoningStore?: Map<string, OpenRouterReasoningCacheEntry>;
};

const OPENROUTER_REASONING_TTL_MS = 4 * 60 * 60 * 1000;
const SHENUTE_CHAT_RATE_LIMIT = 20;
const SHENUTE_CHAT_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const SHENUTE_MAX_REQUEST_BYTES = 200 * 1024;

function getOpenRouterReasoningStore() {
  const globalWithStore = globalThis as GlobalWithOpenRouterReasoningStore;
  if (!globalWithStore.__copticOpenRouterReasoningStore) {
    globalWithStore.__copticOpenRouterReasoningStore = new Map();
  }

  return globalWithStore.__copticOpenRouterReasoningStore;
}

function pruneOpenRouterReasoningStore(
  store: Map<string, OpenRouterReasoningCacheEntry>,
) {
  const now = Date.now();

  for (const [shenuteSessionId, entry] of store.entries()) {
    if (now - entry.updatedAt > OPENROUTER_REASONING_TTL_MS) {
      store.delete(shenuteSessionId);
    }
  }
}

function getCachedReasoningDetails(
  shenuteSessionId: string,
  assistantContent: string,
) {
  const store = getOpenRouterReasoningStore();
  pruneOpenRouterReasoningStore(store);
  const entry = store.get(shenuteSessionId);
  if (!entry) {
    return undefined;
  }

  entry.updatedAt = Date.now();
  return entry.byAssistantContent.get(assistantContent);
}

function cacheReasoningDetails(
  shenuteSessionId: string,
  assistantContent: string,
  reasoningDetails: unknown,
) {
  if (!assistantContent || typeof reasoningDetails === "undefined") {
    return;
  }

  const store = getOpenRouterReasoningStore();
  pruneOpenRouterReasoningStore(store);
  const entry =
    store.get(shenuteSessionId) ??
    ({
      updatedAt: Date.now(),
      byAssistantContent: new Map<string, unknown>(),
    } satisfies OpenRouterReasoningCacheEntry);

  entry.byAssistantContent.set(assistantContent, reasoningDetails);
  entry.updatedAt = Date.now();
  store.set(shenuteSessionId, entry);
}

type PageContext = {
  excerpt?: string;
  path?: string;
  title?: string;
  url?: string;
};

type ShenuteChatRequestPayload = {
  id?: unknown;
  inferenceProvider?: unknown;
  messages: UIMessage[];
  pageContext?: unknown;
};

type ContextDoc = {
  content: string;
  metadata?: Record<string, unknown> | null;
};

function getErrorStatusCode(error: unknown): number | undefined {
  if (!error || typeof error !== "object") {
    return undefined;
  }

  const candidate = error as { status?: unknown; cause?: unknown };
  if (typeof candidate.status === "number") {
    return candidate.status;
  }

  if (candidate.cause && typeof candidate.cause === "object") {
    const cause = candidate.cause as { status?: unknown };
    if (typeof cause.status === "number") {
      return cause.status;
    }
  }

  return undefined;
}

function getUnknownErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function isRateLimitError(error: unknown): boolean {
  const status = getErrorStatusCode(error);
  if (status === 429) {
    return true;
  }

  const message = getUnknownErrorMessage(error).toLowerCase();
  return message.includes("429") || message.includes("rate limit");
}

function hasGeminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

function hasOpenRouterConfigured() {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

function extractMessageText(message: UIMessage): string {
  const candidate = message as { content?: unknown };
  if (typeof candidate.content === "string") {
    return candidate.content;
  }

  if (!Array.isArray(message.parts)) {
    return "";
  }

  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();
}

function toOpenAiMessages(messages: UIMessage[]): HfChatMessage[] {
  const openAiMessages: HfChatMessage[] = [];

  for (const message of messages) {
    const content = extractMessageText(message);
    if (!content) {
      continue;
    }

    if (message.role === "user") {
      openAiMessages.push({ role: "user", content });
      continue;
    }

    if (message.role === "assistant") {
      openAiMessages.push({ role: "assistant", content });
      continue;
    }

    if (message.role === "system") {
      openAiMessages.push({ role: "system", content });
    }
  }

  return openAiMessages;
}

function toGeminiMessages(messages: UIMessage[]) {
  return messages
    .map((message) => {
      const content = extractMessageText(message).trim();
      if (!content) {
        return undefined;
      }

      if (
        message.role === "system" ||
        message.role === "user" ||
        message.role === "assistant"
      ) {
        return { role: message.role, content };
      }

      return undefined;
    })
    .filter(
      (
        message,
      ): message is {
        role: "system" | "user" | "assistant";
        content: string;
      } => typeof message !== "undefined",
    );
}

function getMessageReasoningDetails(message: UIMessage): unknown {
  const candidate = message as {
    metadata?: unknown;
    reasoning_details?: unknown;
  };

  if (
    candidate.metadata &&
    typeof candidate.metadata === "object" &&
    "reasoning_details" in candidate.metadata
  ) {
    return (candidate.metadata as { reasoning_details?: unknown })
      .reasoning_details;
  }

  if ("reasoning_details" in candidate) {
    return candidate.reasoning_details;
  }

  return undefined;
}

function toOpenRouterMessages(
  messages: UIMessage[],
  shenuteSessionId: string,
): OpenRouterChatMessage[] {
  const openRouterMessages: OpenRouterChatMessage[] = [];

  for (const message of messages) {
    const content = extractMessageText(message);
    if (!content) {
      continue;
    }

    if (message.role === "system") {
      openRouterMessages.push({ role: "system", content });
      continue;
    }

    if (message.role === "user") {
      openRouterMessages.push({ role: "user", content });
      continue;
    }

    if (message.role === "assistant") {
      const reasoningDetails =
        getMessageReasoningDetails(message) ??
        getCachedReasoningDetails(shenuteSessionId, content);

      openRouterMessages.push({
        role: "assistant",
        content,
        ...(typeof reasoningDetails !== "undefined"
          ? { reasoning_details: reasoningDetails }
          : {}),
      });
    }
  }

  return openRouterMessages;
}

function buildThothQuery(systemPrompt: string, messages: UIMessage[]): string {
  const history = toOpenAiMessages(messages)
    .slice(-10)
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join("\n\n");

  return [
    "Follow the instructions below exactly.",
    "[SYSTEM INSTRUCTIONS]",
    systemPrompt,
    "[CONVERSATION HISTORY]",
    history.length > 0 ? history : "No prior history provided.",
    "[TASK] Reply to the latest user request using the instructions and context above.",
  ].join("\n\n");
}

function toOptionalInferenceProvider(
  value: unknown,
): InferenceProvider | undefined {
  if (value === "gemini") {
    return "gemini";
  }

  if (value === "gemini_nmt") {
    return "gemini_nmt";
  }

  if (value === "hf") {
    return "hf";
  }

  if (value === "openrouter") {
    return "openrouter";
  }

  if (value === "thoth") {
    return "thoth";
  }

  return undefined;
}

function toRagInferenceProvider(
  value: InferenceProvider,
): "gemini" | "hf" | "openrouter" {
  if (value === "thoth") {
    return "openrouter";
  }

  if (value === "gemini_nmt") {
    return "gemini";
  }

  return value;
}

function createStaticAssistantStream(responseText: string) {
  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      const textPartId = crypto.randomUUID();

      writer.write({ type: "start" });
      writer.write({ type: "start-step" });
      writer.write({ type: "text-start", id: textPartId });
      writer.write({ type: "text-delta", id: textPartId, delta: responseText });
      writer.write({ type: "text-end", id: textPartId });
      writer.write({ type: "finish-step" });
      writer.write({ type: "finish", finishReason: "stop" });
    },
  });

  return createUIMessageStreamResponse({ stream });
}

function createShenuteErrorResponse(
  code: AppErrorCode,
  status: number,
  headers?: HeadersInit,
) {
  return jsonErrorResponse({
    context: "shenute",
    error: code,
    fallbackCode: code,
    headers,
    requestIdPrefix: "shenute",
    status,
  });
}

async function getShenuteRateLimitResponse(userId: string) {
  if (!hasAvailableRateLimitProtection()) {
    return createShenuteErrorResponse("external_service_unavailable", 503);
  }

  try {
    const result = await consumeRateLimit({
      identifier: getUserRateLimitIdentifier(userId),
      limit: SHENUTE_CHAT_RATE_LIMIT,
      namespace: "shenute:chat",
      windowMs: SHENUTE_CHAT_RATE_LIMIT_WINDOW_MS,
    });

    if (result.ok) {
      return null;
    }

    return createShenuteErrorResponse("rate_limited", 429, {
      "Retry-After": Math.max(
        1,
        Math.ceil(result.retryAfterMs / 1000),
      ).toString(),
    });
  } catch (error) {
    console.error("Shenute rate-limit check failed:", error);
    return createShenuteErrorResponse("external_service_unavailable", 503);
  }
}

function getShenutePayloadSizeResponse(headers: Headers) {
  const contentLength = Number.parseInt(
    headers.get("content-length") ?? "",
    10,
  );

  if (
    !Number.isFinite(contentLength) ||
    contentLength <= SHENUTE_MAX_REQUEST_BYTES
  ) {
    return null;
  }

  return createShenuteErrorResponse("validation_failed", 413);
}

function toPageContext(value: unknown): PageContext {
  if (!value || typeof value !== "object") {
    return {};
  }

  const candidate = value as {
    excerpt?: unknown;
    path?: unknown;
    title?: unknown;
    url?: unknown;
  };

  const excerpt =
    typeof candidate.excerpt === "string"
      ? candidate.excerpt.replace(/\s+/g, " ").trim().slice(0, 2500)
      : undefined;
  const path =
    typeof candidate.path === "string"
      ? candidate.path.replace(/\s+/g, " ").trim().slice(0, 200)
      : undefined;
  const title =
    typeof candidate.title === "string"
      ? candidate.title.replace(/\s+/g, " ").trim().slice(0, 300)
      : undefined;
  const url =
    typeof candidate.url === "string"
      ? candidate.url.replace(/\s+/g, " ").trim().slice(0, 400)
      : undefined;

  return {
    excerpt,
    path,
    title,
    url,
  };
}

function buildNMTContextDoc(suggestion: NMTTranslationSuggestion): ContextDoc {
  const confidenceLine = suggestion.confidenceLabel
    ? `Model confidence: ${suggestion.confidenceLabel}`
    : "Model confidence: unavailable";
  const reliabilityLine =
    suggestion.confidence !== null && suggestion.confidence < 0.8
      ? "Reliability: tentative. Verify this suggestion against retrieved lexicon and grammar sources."
      : "Reliability: retrieval hint only. Retrieved lexicon and grammar sources take precedence on conflict.";

  return {
    content: [
      "NMT translation hint (secondary evidence for retrieval):",
      `Direction: ${suggestion.direction}`,
      `Dialect: ${suggestion.dialect}`,
      `Input text: ${suggestion.textToTranslate}`,
      `Suggested translation: ${suggestion.translatedText}`,
      confidenceLine,
      reliabilityLine,
    ].join("\n"),
    metadata: {
      dialect: suggestion.dialect,
      sourceName: suggestion.modelId,
      type: "NMT_translation_hint",
    },
  };
}

function hasCopticScript(text: string) {
  return /[\u2c80-\u2cff]/i.test(text);
}

function shouldRequestNMTTranslation(options: {
  direction?: unknown;
  targetText?: unknown;
  userText: string;
}) {
  if (
    typeof options.targetText !== "string" ||
    options.targetText.trim().length === 0
  ) {
    return false;
  }

  const normalizedUserText = options.userText.toLowerCase();
  const direction =
    typeof options.direction === "string" ? options.direction : "";

  const asksForTranslation =
    /\b(translate|translation|render|convert)\b/.test(normalizedUserText) ||
    /\bhow\s+(?:do|would|can|should)\s+(?:i|we|you)\s+(?:say|write|render)\b/.test(
      normalizedUserText,
    ) ||
    /\b(?:coptic|bohairic|sahidic|english)\s+(?:for|translation)\b/.test(
      normalizedUserText,
    ) ||
    /\b(?:what(?:'s| is)\s+the\s+)?(?:coptic|bohairic|sahidic|english)\s+(?:word|phrase|equivalent)\s+for\b/.test(
      normalizedUserText,
    );

  const asksForMeaning =
    /\bwhat\s+(?:does|do|is)\b.+\bmean\b/.test(normalizedUserText) &&
    (direction === "coptic-to-english" || hasCopticScript(options.userText));

  return asksForTranslation || asksForMeaning;
}

export async function POST(req: Request) {
  try {
    const payloadSizeResponse = getShenutePayloadSizeResponse(req.headers);
    if (payloadSizeResponse) {
      return payloadSizeResponse;
    }

    if (!hasSupabaseRuntimeEnv()) {
      return createShenuteErrorResponse("external_service_unavailable", 503);
    }

    const supabase = await createClient();
    const authenticatedUser = await getAuthenticatedUser(supabase);

    if (!authenticatedUser) {
      return createShenuteErrorResponse("auth_required", 401);
    }

    const rateLimitResponse = await getShenuteRateLimitResponse(
      authenticatedUser.id,
    );
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    let payload: ShenuteChatRequestPayload;

    try {
      payload = (await req.json()) as ShenuteChatRequestPayload;
    } catch {
      return createShenuteErrorResponse("validation_failed", 400);
    }

    const { messages } = payload;

    if (!Array.isArray(messages) || messages.length === 0) {
      return createShenuteErrorResponse("validation_failed", 400);
    }

    const queryProvider = toOptionalInferenceProvider(
      new URL(req.url).searchParams.get("provider"),
    );
    const bodyProvider = toOptionalInferenceProvider(payload.inferenceProvider);
    const inferenceProvider = bodyProvider ?? queryProvider ?? "thoth";
    const shouldUseNmtSuggestion = inferenceProvider !== "gemini";
    const ragInferenceProvider = toRagInferenceProvider(inferenceProvider);
    const shenuteSessionId =
      typeof payload.id === "string" && payload.id.trim().length > 0
        ? payload.id.trim()
        : "default";
    const pageContext = toPageContext(payload.pageContext);

    const latestMessage = messages[messages.length - 1];
    const latestMessageText = extractMessageText(latestMessage);
    let NMTSuggestion: NMTTranslationSuggestion | null = null;

    let contextText = "";
    const shouldBuildRagContext = Boolean(latestMessageText);
    if (shouldBuildRagContext && latestMessageText) {
      try {
        // Step 1: Translate the prompt into German (for the Lexicon), extract keywords, and analyze grammar
        let extractedKeywords: string[] = [];
        let extractedConcepts: string[] = [];
        let isolatedTargetText: string | null = null;
        const retrievalPromptSegments = new Set<string>([latestMessageText]);

        try {
          const kwResponse = await generateText({
            model: getGeminiModel(),
            prompt: `You are assisting a RAG pipeline. The user query is: "${latestMessageText}".
Our Coptic Lexicon is in German, and our general dictionary is in English.
1. Translate the user's query into German.
2. Extract ALL meaningful keywords (nouns, verbs, adjectives, adverbs) to maximize dictionary lookup hits. Include at least 5-15 keywords if the prompt allows, in BOTH English AND German.
3. Analyze the grammatical structure of the user's query (e.g., tenses, moods, cases, clauses) and list 1-3 core English grammatical concepts required to build or understand this sentence.
4. Only populate "translationTarget" when the user's primary intent is translation, e.g. "translate...", "render... into Coptic", "how do I say/write...", "what is the Coptic for...", or "what does this Coptic phrase mean?". For grammar explanations, vocabulary discussion, parsing, etymology, lesson questions, or prompts that merely mention translatable words, set "translationTarget": null.
Respond ONLY with a valid JSON object matching this schema, no markdown blocks:
{
  "germanTranslation": "...",
  "keywords": ["englishKw1", "germanKw1", "englishKw2", "germanKw2"],
  "grammaticalConcepts": ["past perfect", "definite article", "direct object"],
  "translationTarget": null | {
    "text": "the isolated FULL phrase or sentence to translate (do not truncate)",
    "direction": "english-to-coptic" | "coptic-to-english",
    "dialect": "Bohairic" | "Sahidic",
    "expertTranslation": "your authoritative translation for this isolated string"
  }
}
`,
          });

          const rawResponse = kwResponse.text
            .replace(/```json/i, "")
            .replace(/```/g, "")
            .trim();
          const parsed = JSON.parse(rawResponse);

          if (parsed.germanTranslation) {
            retrievalPromptSegments.add(parsed.germanTranslation);
            console.warn(
              `[RAG DEBUG] Translated prompt for vector search:`,
              parsed.germanTranslation,
            );
          }

          if (Array.isArray(parsed.keywords)) {
            extractedKeywords = parsed.keywords
              .map((k: string) => k.trim().toLowerCase())
              .filter(Boolean);
          }

          if (Array.isArray(parsed.grammaticalConcepts)) {
            extractedConcepts = parsed.grammaticalConcepts
              .map((k: string) => k.trim())
              .filter(Boolean);
          }

          // Step 1.5: If LLM extracted a translation target and we don't have a suggestion yet, call NMT now
          if (
            shouldUseNmtSuggestion &&
            !NMTSuggestion &&
            parsed.translationTarget?.text &&
            parsed.translationTarget.direction &&
            shouldRequestNMTTranslation({
              direction: parsed.translationTarget.direction,
              targetText: parsed.translationTarget.text,
              userText: latestMessageText,
            })
          ) {
            console.warn(
              `[RAG DEBUG] LLM isolated translation target: "${parsed.translationTarget.text}" (${parsed.translationTarget.direction})`,
            );
            try {
              NMTSuggestion = await requestNMTTranslation({
                dialect: parsed.translationTarget.dialect ?? "Bohairic",
                direction: parsed.translationTarget.direction,
                originalPrompt: latestMessageText,
                textToTranslate: parsed.translationTarget.text,
              });

              if (NMTSuggestion) {
                console.warn(
                  `[RAG DEBUG] NMT translation hint (LLM-triggered): "${parsed.translationTarget.text}" -> "${NMTSuggestion.translatedText}" (${NMTSuggestion.direction})`,
                );
                retrievalPromptSegments.add(NMTSuggestion.translatedText);
                if (NMTSuggestion.textToTranslate) {
                  retrievalPromptSegments.add(NMTSuggestion.textToTranslate);
                }
              }
            } catch (error) {
              console.error("LLM-triggered NMT request failed:", error);
            }
          }

          // Step 1.6: Record distillation example if we have an expert translation
          if (
            parsed.translationTarget?.text &&
            parsed.translationTarget.expertTranslation &&
            shouldRequestNMTTranslation({
              direction: parsed.translationTarget.direction,
              targetText: parsed.translationTarget.text,
              userText: latestMessageText,
            })
          ) {
            isolatedTargetText = parsed.translationTarget.text;
            recordDistillationExample({
              taskType: "translation",
              prompt: parsed.translationTarget.text,
              teacherAnswer: parsed.translationTarget.expertTranslation,
              studentTarget: NMTSuggestion
                ? formatNMTForDistillation(NMTSuggestion)
                : undefined,
              metadata: {
                direction: parsed.translationTarget.direction,
                dialect: parsed.translationTarget.dialect,
                original_prompt: latestMessageText,
              },
            }).catch((err) =>
              console.error("Distillation recording failed:", err),
            );
          }

          console.warn(`[RAG DEBUG] Extracted keywords:`, extractedKeywords);
          console.warn(`[RAG DEBUG] Extracted concepts:`, extractedConcepts);
        } catch (e) {
          console.error("Keyword/Translation extraction failed:", e);
        }

        const keywordCandidates = [
          ...extractedKeywords,
          ...(isolatedTargetText && isolatedTargetText.length <= 120
            ? [isolatedTargetText]
            : []),
          ...(NMTSuggestion?.translatedText &&
          NMTSuggestion.translatedText.length <= 120
            ? [NMTSuggestion.translatedText]
            : []),
        ];
        const dedupedKeywordCandidates = Array.from(new Set(keywordCandidates));
        const contextChunks: ContextDoc[] = NMTSuggestion
          ? [buildNMTContextDoc(NMTSuggestion)]
          : [];

        // Step 2: Fetch by exact/partial string metadata match FIRST
        if (dedupedKeywordCandidates.length > 0) {
          const keywordDocs = await searchVocabularyByKeywords(
            dedupedKeywordCandidates,
          );
          if (keywordDocs && keywordDocs.length > 0) {
            console.warn(
              `[RAG DEBUG] Found ${keywordDocs.length} dictionary entries via metadata/keyword match.`,
            );
            contextChunks.push(...keywordDocs);
          }
        }

        // Step 2.5: Fetch grammar lessons by semantic concept match
        if (extractedConcepts.length > 0) {
          const grammarQuery = extractedConcepts.join(" ");
          const grammarDocs = await searchCopticDocuments(
            grammarQuery,
            3, // Pull the top 3 most relevant grammatical lessons
            { type: "grammar" },
            ragInferenceProvider,
          );
          if (grammarDocs && grammarDocs.length > 0) {
            console.warn(
              `[RAG DEBUG] Found ${grammarDocs.length} grammar chunks via concept search.`,
            );
            contextChunks.push(...grammarDocs);
          }
        }

        // Step 3: Run vector search as fallback/enrichment using the prompt, German hint, and NMT suggestion when available
        const translatedPrompt = Array.from(retrievalPromptSegments).join("\n");
        const vectorDocs = await searchCopticDocuments(
          translatedPrompt,
          8, // Get top 8 most relevant chunks overall to leave room for dictionary/other context
          {},
          ragInferenceProvider,
        );
        console.warn(
          `[RAG DEBUG] Retrieved ${vectorDocs?.length || 0} documents from vector search using ${inferenceProvider}.`,
        );
        if (vectorDocs && vectorDocs.length > 0) {
          contextChunks.push(...vectorDocs);
        }

        // Combine chunks and deduplicate
        const uniqueContents = new Set();
        const finalDocs = contextChunks.filter((doc) => {
          if (uniqueContents.has(doc.content)) {
            return false;
          }
          uniqueContents.add(doc.content);
          return true;
        });

        if (finalDocs.length > 0) {
          contextText = finalDocs
            .map((doc) => {
              const sourceName =
                doc.metadata && typeof doc.metadata.sourceName === "string"
                  ? doc.metadata.sourceName
                  : "Unknown";
              const dialect =
                doc.metadata && typeof doc.metadata.dialect === "string"
                  ? doc.metadata.dialect
                  : "Any dialect";

              return `Source (${sourceName} -> ${dialect}):\n${doc.content}`;
            })
            .join("\n\n");

          // Hard limit text character size to roughly ~6,250 tokens (25000 chars)
          if (contextText.length > 25000) {
            contextText = `${contextText.slice(
              0,
              25000,
            )}\n...[Context Truncated to fit token limits]`;
          }
        } else {
          console.warn(
            "[RAG DEBUG] Vector and keyword search returned 0 results.",
          );
        }
      } catch (error) {
        console.error("Vector search failed:", error);
      }
    }

    const shenuteSystemPrompt = `You are "Shenute AI Learner", a student assistant specialized in the Coptic language (Sahidic/Bohairic dialects).
  You are a distilled learner model guided by Shenute AI Expert quality standards.
  You help users learn, translate, and understand Coptic with high precision.
You have access to the Comprehensive Coptic Lexicon via the provided context.

CRITICAL INSTRUCTION: You must base your Coptic translations and vocabulary answers STRICTLY on the "Context relevant to the user's query" provided below. 
If the context does not contain the specific Coptic words or grammar needed to accurately answer the user's request, you MUST admit that you do not know or that the words are not in your current database. DO NOT hallucinate, guess, or invent Coptic words, spellings, or transliterations.
Treat any NMT translation hint as secondary evidence for lookup only; retrieved lexicon and grammar sources take precedence if they conflict.

  The user is currently viewing this page on the website:
  - Path: ${pageContext.path ?? "unknown"}
  - Title: ${pageContext.title ?? "unknown"}
  - URL: ${pageContext.url ?? "unknown"}

  Visible text excerpt from the opened page:
  ${pageContext.excerpt && pageContext.excerpt.length > 0 ? pageContext.excerpt : "No page excerpt provided."}

Context relevant to the user's query:
${contextText || "No additional retrieval context was found."}
`;

    const geminiSystemPrompt = `You are "Shenute AI Learner", a student assistant specialized in the Coptic language (Sahidic/Bohairic dialects).
You help users learn, translate, and understand Coptic with high precision.
Use the provided retrieval context when it helps, but you may also use your own pretrained linguistic knowledge to answer accurately.
Do not treat retrieval context as a hard constraint, and do not refuse an answer solely because a needed word is missing from retrieved chunks.

The user is currently viewing this page on the website:
- Path: ${pageContext.path ?? "unknown"}
- Title: ${pageContext.title ?? "unknown"}
- URL: ${pageContext.url ?? "unknown"}

Visible text excerpt from the opened page:
${pageContext.excerpt && pageContext.excerpt.length > 0 ? pageContext.excerpt : "No page excerpt provided."}

Context relevant to the user's query:
${contextText || "No additional retrieval context was found."}
`;

    const thothSystemPrompt = `You are "Shenute AI Expert" not "THOTH AI", the teacher model for Coptic language mastery (Sahidic/Bohairic dialects).
You deliver authoritative answers for Coptic vocabulary, grammar, translation, and etymology.
You are the expert teacher that the Shenute AI Learner is distilled from.
Use retrieved lexicon and grammar context when it is available, and treat any NMT translation hint as supporting evidence rather than ground truth.

The user is currently viewing this page on the website:
- Path: ${pageContext.path ?? "unknown"}
- Title: ${pageContext.title ?? "unknown"}
- URL: ${pageContext.url ?? "unknown"}

Visible text excerpt from the opened page:
${pageContext.excerpt && pageContext.excerpt.length > 0 ? pageContext.excerpt : "No page excerpt provided."}

Context relevant to the user's query:
${contextText || "No additional retrieval context was found."}
`;

    let systemPrompt = shenuteSystemPrompt;
    if (inferenceProvider === "thoth") {
      systemPrompt = thothSystemPrompt;
    } else if (inferenceProvider === "gemini") {
      systemPrompt = geminiSystemPrompt;
    }

    if (inferenceProvider === "gemini" || inferenceProvider === "gemini_nmt") {
      const result = streamText({
        model: getGeminiModel(),
        system: systemPrompt,
        messages: toGeminiMessages(messages),
      });

      return result.toUIMessageStreamResponse({
        onError: (error) => {
          console.error("Gemini streaming failed:", error);

          return getPublicErrorMessage(
            "external_service_unavailable",
            "en",
            "shenute",
          );
        },
      });
    }

    if (inferenceProvider === "openrouter") {
      const completion = await createOpenRouterChatCompletion(
        [
          { role: "system" as const, content: systemPrompt },
          ...toOpenRouterMessages(messages, shenuteSessionId),
          ...(latestMessageText
            ? []
            : [
                {
                  role: "user" as const,
                  content: "Please answer the latest user request.",
                },
              ]),
        ],
        { enableReasoning: true },
      );

      const openRouterMessage = completion?.choices?.[0]?.message as
        | {
            content?: string | null;
            reasoning_details?: unknown;
          }
        | undefined;
      const assistantText = openRouterMessage?.content;

      const responseText =
        typeof assistantText === "string" && assistantText.trim().length > 0
          ? assistantText
          : "I could not generate a response from OpenRouter right now.";

      if (typeof openRouterMessage?.reasoning_details !== "undefined") {
        cacheReasoningDetails(
          shenuteSessionId,
          responseText,
          openRouterMessage.reasoning_details,
        );
      }

      return createStaticAssistantStream(responseText);
    }

    if (inferenceProvider === "thoth") {
      const completion = await createThothChatCompletion({
        query: buildThothQuery(systemPrompt, messages),
        user: authenticatedUser.id,
      });

      const responseText =
        typeof completion.answer === "string" &&
        completion.answer.trim().length > 0
          ? completion.answer
          : "I could not generate a response from Shenute AI Expert right now.";

      return createStaticAssistantStream(responseText);
    }

    try {
      const completion = await createHfChatCompletion([
        { role: "system" as const, content: systemPrompt },
        ...toOpenAiMessages(messages),
        ...(latestMessageText
          ? []
          : [
              {
                role: "user" as const,
                content: "Please answer the latest user request.",
              },
            ]),
      ]);

      const assistantText = completion.choices[0]?.message?.content;
      const responseText =
        typeof assistantText === "string" && assistantText.trim().length > 0
          ? assistantText
          : "I could not generate a response from Hugging Face right now.";

      return createStaticAssistantStream(responseText);
    } catch (hfError) {
      if (!isRateLimitError(hfError)) {
        throw hfError;
      }

      console.warn("HF rate-limited, attempting provider fallback.", hfError);

      if (hasGeminiConfigured()) {
        try {
          const fallbackResult = streamText({
            model: getGeminiModel(),
            system: systemPrompt,
            messages: toGeminiMessages(messages),
          });

          return fallbackResult.toUIMessageStreamResponse({
            onError: (error) => {
              console.error("Gemini fallback streaming failed:", error);

              return getPublicErrorMessage(
                "external_service_unavailable",
                "en",
                "shenute",
              );
            },
          });
        } catch (geminiFallbackError) {
          console.error(
            "Gemini fallback failed after HF 429:",
            geminiFallbackError,
          );
        }
      }

      if (hasOpenRouterConfigured()) {
        try {
          const fallbackCompletion = await createOpenRouterChatCompletion(
            [
              { role: "system" as const, content: systemPrompt },
              ...toOpenRouterMessages(messages, shenuteSessionId),
              ...(latestMessageText
                ? []
                : [
                    {
                      role: "user" as const,
                      content: "Please answer the latest user request.",
                    },
                  ]),
            ],
            { enableReasoning: true },
          );

          const openRouterMessage = fallbackCompletion.choices?.[0]?.message;
          const assistantText = openRouterMessage?.content;
          const responseText =
            typeof assistantText === "string" && assistantText.trim().length > 0
              ? assistantText
              : "I could not generate a response from OpenRouter right now.";

          if (typeof openRouterMessage?.reasoning_details !== "undefined") {
            cacheReasoningDetails(
              shenuteSessionId,
              responseText,
              openRouterMessage.reasoning_details,
            );
          }

          return createStaticAssistantStream(responseText);
        } catch (openRouterFallbackError) {
          console.error(
            "OpenRouter fallback failed after HF 429:",
            openRouterFallbackError,
          );
        }
      }

      return createShenuteErrorResponse("rate_limited", 429);
    }
  } catch (error: unknown) {
    console.error("AI API Error:", error);

    return createShenuteErrorResponse("external_service_unavailable", 500);
  }
}
