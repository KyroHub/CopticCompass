import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  generateText,
  type UIMessage,
} from "ai";
import { getGeminiModel } from "@/lib/gemini";
import { createHfChatCompletion, type HfChatMessage } from "@/lib/hf";
import {
  createOpenRouterChatCompletion,
  type OpenRouterChatMessage,
} from "@/lib/openrouter";
import { createThothChatCompletion } from "../../../lib/thoth";
import { getAuthenticatedUser } from "@/lib/supabase/authQueries";
import { hasSupabaseRuntimeEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { searchCopticDocuments, searchVocabularyByKeywords } from "@/actions/vectorSearch";

export const maxDuration = 30;
export const runtime = "nodejs";

type InferenceProvider = "gemini" | "hf" | "openrouter" | "thoth";

type OpenRouterReasoningCacheEntry = {
  updatedAt: number;
  byAssistantContent: Map<string, unknown>;
};

type GlobalWithOpenRouterReasoningStore = typeof globalThis & {
  __copticOpenRouterReasoningStore?: Map<string, OpenRouterReasoningCacheEntry>;
};

const OPENROUTER_REASONING_TTL_MS = 4 * 60 * 60 * 1000;

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

  for (const [chatId, entry] of store.entries()) {
    if (now - entry.updatedAt > OPENROUTER_REASONING_TTL_MS) {
      store.delete(chatId);
    }
  }
}

function getCachedReasoningDetails(chatId: string, assistantContent: string) {
  const store = getOpenRouterReasoningStore();
  pruneOpenRouterReasoningStore(store);
  const entry = store.get(chatId);
  if (!entry) {
    return undefined;
  }

  entry.updatedAt = Date.now();
  return entry.byAssistantContent.get(assistantContent);
}

function cacheReasoningDetails(
  chatId: string,
  assistantContent: string,
  reasoningDetails: unknown,
) {
  if (!assistantContent || typeof reasoningDetails === "undefined") {
    return;
  }

  const store = getOpenRouterReasoningStore();
  pruneOpenRouterReasoningStore(store);
  const entry =
    store.get(chatId) ??
    ({
      updatedAt: Date.now(),
      byAssistantContent: new Map<string, unknown>(),
    } satisfies OpenRouterReasoningCacheEntry);

  entry.byAssistantContent.set(assistantContent, reasoningDetails);
  entry.updatedAt = Date.now();
  store.set(chatId, entry);
}

type PageContext = {
  excerpt?: string;
  path?: string;
  title?: string;
  url?: string;
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
  if ("content" in message && typeof (message as any).content === "string") {
    return (message as any).content;
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
  chatId: string,
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
        getCachedReasoningDetails(chatId, content);

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

function toInferenceProvider(value: unknown): InferenceProvider {
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
    return "thoth";
  }

  return "thoth";
}

function toOptionalInferenceProvider(
  value: unknown,
): InferenceProvider | undefined {
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

export async function POST(req: Request) {
  try {
    if (!hasSupabaseRuntimeEnv()) {
      return new Response(
        JSON.stringify({
          error: "Shenute AI chat is unavailable right now.",
        }),
        {
          status: 503,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const supabase = await createClient();
    const authenticatedUser = await getAuthenticatedUser(supabase);

    if (!authenticatedUser) {
      return new Response(
        JSON.stringify({ error: "Sign in required to use Shenute AI chat." }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const payload: {
      id?: unknown;
      inferenceProvider?: unknown;
      messages: UIMessage[];
      pageContext?: unknown;
    } = await req.json();
    const { messages } = payload;

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "No messages provided." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const queryProvider = toOptionalInferenceProvider(
      new URL(req.url).searchParams.get("provider"),
    );
    const bodyProvider = toOptionalInferenceProvider(payload.inferenceProvider);
    const inferenceProvider = bodyProvider ?? queryProvider ?? "thoth";
    const ragInferenceProvider = toRagInferenceProvider(inferenceProvider);
    const chatId =
      typeof payload.id === "string" && payload.id.trim().length > 0
        ? payload.id.trim()
        : "default";
    const pageContext = toPageContext(payload.pageContext);

    const latestMessage = messages[messages.length - 1];
    const latestMessageText = extractMessageText(latestMessage);

    let contextText = "";
    if (inferenceProvider !== "thoth" && latestMessageText) {
      try {
        // Step 1: Translate the prompt into German (for the Lexicon), extract keywords, and analyze grammar
        let extractedKeywords: string[] = [];
        let extractedConcepts: string[] = [];
        let translatedPrompt = latestMessageText;

        try {
          const kwResponse = await generateText({
            model: getGeminiModel(),
            prompt: `You are assisting a RAG pipeline. The user query is: "${latestMessageText}".
Our Coptic Lexicon is in German, and our general dictionary is in English.
1. Translate the user's query into German.
2. Extract ALL meaningful keywords (nouns, verbs, adjectives, adverbs) to maximize dictionary lookup hits. Include at least 5-15 keywords if the prompt allows, in BOTH English AND German.
3. Analyze the grammatical structure of the user's query (e.g., tenses, moods, cases, clauses) and list 1-3 core English grammatical concepts required to build or understand this sentence.
Respond ONLY with a valid JSON object matching this schema, no markdown blocks:
{"germanTranslation": "...", "keywords": ["englishKw1", "germanKw1", "englishKw2", "germanKw2"], "grammaticalConcepts": ["past perfect", "definite article", "direct object"]}
`,
          });
          
          const rawResponse = kwResponse.text.replace(/```json/i, "").replace(/```/g, "").trim();
          const parsed = JSON.parse(rawResponse);
          
          if (parsed.germanTranslation) {
             translatedPrompt = `${latestMessageText}\n${parsed.germanTranslation}`;
             console.log(`[RAG DEBUG] Translated prompt for vector search:`, parsed.germanTranslation);
          }
          
          if (Array.isArray(parsed.keywords)) {
             extractedKeywords = parsed.keywords.map((k: string) => k.trim().toLowerCase()).filter(Boolean);
          }

          if (Array.isArray(parsed.grammaticalConcepts)) {
             extractedConcepts = parsed.grammaticalConcepts.map((k: string) => k.trim()).filter(Boolean);
          }

          console.log(`[RAG DEBUG] Extracted keywords:`, extractedKeywords);
          console.log(`[RAG DEBUG] Extracted concepts:`, extractedConcepts);
        } catch (e) {
          console.error("Keyword/Translation extraction failed:", e);
        }

        let contextChunks: any[] = [];

        // Step 2: Fetch by exact/partial string metadata match FIRST
        if (extractedKeywords.length > 0) {
          const keywordDocs = await searchVocabularyByKeywords(extractedKeywords);
          if (keywordDocs && keywordDocs.length > 0) {
            console.log(`[RAG DEBUG] Found ${keywordDocs.length} dictionary entries via metadata/keyword match.`);
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
            ragInferenceProvider
          );
          if (grammarDocs && grammarDocs.length > 0) {
            console.log(`[RAG DEBUG] Found ${grammarDocs.length} grammar chunks via concept search.`);
            contextChunks.push(...grammarDocs);
          }
        }

        // Step 3: Run vector search as fallback/enrichment using BOTH English and German text
        const vectorDocs = await searchCopticDocuments(
          translatedPrompt,
          8, // Get top 8 most relevant chunks overall to leave room for dictionary/other context
          {},
          ragInferenceProvider
        );
        console.log(`[RAG DEBUG] Retrieved ${vectorDocs?.length || 0} documents from vector search using ${inferenceProvider}.`);
        if (vectorDocs && vectorDocs.length > 0) {
          contextChunks.push(...vectorDocs);
        }

        // Combine chunks and deduplicate
        const uniqueContents = new Set();
        const finalDocs = contextChunks.filter(doc => {
            if (uniqueContents.has(doc.content)) return false;
            uniqueContents.add(doc.content);
            return true;
        });

        if (finalDocs.length > 0) {
          contextText = finalDocs
            .map(
              (doc: { content: string; metadata?: any }) =>
                `Source (${doc.metadata?.sourceName || "Unknown"} -> ${doc.metadata?.dialect || "Any dialect"}):\n${doc.content}`,
            )
            .join("\n\n");
            
          // Hard limit text character size to roughly ~6,250 tokens (25000 chars)
          if (contextText.length > 25000) {
             contextText = contextText.slice(0, 25000) + "\n...[Context Truncated to fit token limits]";
          }
        } else {
          console.warn("[RAG DEBUG] Vector and keyword search returned 0 results.");
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

  The user is currently viewing this page on the website:
  - Path: ${pageContext.path ?? "unknown"}
  - Title: ${pageContext.title ?? "unknown"}
  - URL: ${pageContext.url ?? "unknown"}

  Visible text excerpt from the opened page:
  ${pageContext.excerpt && pageContext.excerpt.length > 0 ? pageContext.excerpt : "No page excerpt provided."}

Context relevant to the user's query:
${contextText}
`;

  const thothSystemPrompt = `You are "Shenute AI Expert", the teacher model for Coptic language mastery (Sahidic/Bohairic dialects).
You deliver authoritative answers for Coptic vocabulary, grammar, translation, and etymology.
You are the expert teacher that the Shenute AI Learner is distilled from.

The user is currently viewing this page on the website:
- Path: ${pageContext.path ?? "unknown"}
- Title: ${pageContext.title ?? "unknown"}
- URL: ${pageContext.url ?? "unknown"}

Visible text excerpt from the opened page:
${pageContext.excerpt && pageContext.excerpt.length > 0 ? pageContext.excerpt : "No page excerpt provided."}
`;

  const systemPrompt =
    inferenceProvider === "thoth" ? thothSystemPrompt : shenuteSystemPrompt;

    if (inferenceProvider === "gemini") {
      const result = streamText({
        model: getGeminiModel(),
        system: systemPrompt,
        messages: await convertToModelMessages(messages),
      });

      return result.toUIMessageStreamResponse({
        onError: (error) => {
          if (error instanceof Error) {
            return error.message;
          }

          return "Unknown Gemini streaming error.";
        },
      });
    }

    if (inferenceProvider === "openrouter") {
      const completion = await createOpenRouterChatCompletion(
        [
          { role: "system" as const, content: systemPrompt },
          ...toOpenRouterMessages(messages, chatId),
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
          chatId,
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
            messages: await convertToModelMessages(messages),
          });

          return fallbackResult.toUIMessageStreamResponse({
            onError: (error) => {
              if (error instanceof Error) {
                return error.message;
              }

              return "Unknown Gemini fallback streaming error.";
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
              ...toOpenRouterMessages(messages, chatId),
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
              chatId,
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

      return new Response(
        JSON.stringify({
          error:
            "Hugging Face is currently rate-limited. Please retry in a moment or switch provider.",
        }),
        {
          status: 429,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown AI error.";
    console.error("AI API Error:", error);

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
