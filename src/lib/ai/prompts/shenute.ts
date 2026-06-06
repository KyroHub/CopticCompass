import { tryParseJsonFromModelAnswer } from "@/lib/llm";

type ShenutePromptProvider =
  | "gemini"
  | "gemini_nmt"
  | "hf"
  | "openrouter"
  | "thoth";

type ShenutePromptPageContext = {
  excerpt?: string;
  path?: string;
  title?: string;
  url?: string;
};

type ShenuteRetrievalAnalysisDirection =
  | "coptic-to-english"
  | "english-to-coptic";

type ShenuteRetrievalAnalysisDialect = "Bohairic" | "Sahidic";

type ShenuteRetrievalAnalysisTranslationTarget = {
  dialect?: ShenuteRetrievalAnalysisDialect;
  direction?: ShenuteRetrievalAnalysisDirection;
  expertTranslation?: string;
  text?: string;
};

type ShenuteRetrievalAnalysisResponse = {
  germanTranslation?: string;
  grammaticalConcepts?: string[];
  keywords?: string[];
  translationTarget?: ShenuteRetrievalAnalysisTranslationTarget;
};

const SHENUTE_RETRIEVAL_ANALYSIS_DIRECTIONS =
  new Set<ShenuteRetrievalAnalysisDirection>([
    "coptic-to-english",
    "english-to-coptic",
  ]);
const SHENUTE_RETRIEVAL_ANALYSIS_DIALECTS =
  new Set<ShenuteRetrievalAnalysisDialect>(["Bohairic", "Sahidic"]);

function getPageContextValue(value: string | undefined) {
  return value ?? "unknown";
}

function getPageExcerpt(value: string | undefined) {
  return value && value.length > 0 ? value : "No page excerpt provided.";
}

function getRetrievalContext(value: string) {
  return value || "No additional retrieval context was found.";
}

function buildIndentedPageContextBlock(pageContext: ShenutePromptPageContext) {
  return `  The user is currently viewing this page on the website:
  - Path: ${getPageContextValue(pageContext.path)}
  - Title: ${getPageContextValue(pageContext.title)}
  - URL: ${getPageContextValue(pageContext.url)}

  Visible text excerpt from the opened page:
  ${getPageExcerpt(pageContext.excerpt)}`;
}

function buildPageContextBlock(pageContext: ShenutePromptPageContext) {
  return `The user is currently viewing this page on the website:
- Path: ${getPageContextValue(pageContext.path)}
- Title: ${getPageContextValue(pageContext.title)}
- URL: ${getPageContextValue(pageContext.url)}

Visible text excerpt from the opened page:
${getPageExcerpt(pageContext.excerpt)}`;
}

export function buildShenuteSystemPrompt(options: {
  contextText: string;
  inferenceProvider: ShenutePromptProvider;
  pageContext: ShenutePromptPageContext;
}) {
  const { contextText, inferenceProvider, pageContext } = options;
  const indentedPageContextBlock = buildIndentedPageContextBlock(pageContext);
  const pageContextBlock = buildPageContextBlock(pageContext);
  const retrievalContext = getRetrievalContext(contextText);
  const shenuteSystemPrompt = `You are "Shenute AI Learner", a student assistant specialized in the Coptic language (Sahidic/Bohairic dialects).
  You are a distilled learner model guided by Shenute AI Expert quality standards.
  You help users learn, translate, and understand Coptic with high precision.
You have access to the Comprehensive Coptic Lexicon via the provided context.

CRITICAL INSTRUCTION: You must base your Coptic translations and vocabulary answers STRICTLY on the "Context relevant to the user's query" provided below. 
If the context does not contain the specific Coptic words or grammar needed to accurately answer the user's request, you MUST admit that you do not know or that the words are not in your current database. DO NOT hallucinate, guess, or invent Coptic words, spellings, or transliterations.
Treat any NMT translation hint as secondary evidence for lookup only; retrieved lexicon and grammar sources take precedence if they conflict.

${indentedPageContextBlock}

Context relevant to the user's query:
${retrievalContext}
`;

  const geminiSystemPrompt = `You are "Shenute AI Learner", a student assistant specialized in the Coptic language (Sahidic/Bohairic dialects).
You help users learn, translate, and understand Coptic with high precision.
Use the provided retrieval context when it helps, but you may also use your own pretrained linguistic knowledge to answer accurately.
Do not treat retrieval context as a hard constraint, and do not refuse an answer solely because a needed word is missing from retrieved chunks.

${pageContextBlock}

Context relevant to the user's query:
${retrievalContext}
`;

  const thothSystemPrompt = `You are "Shenute AI Expert" not "THOTH AI", the teacher model for Coptic language mastery (Sahidic/Bohairic dialects).
You deliver authoritative answers for Coptic vocabulary, grammar, translation, and etymology.
You are the expert teacher that the Shenute AI Learner is distilled from.
Use retrieved lexicon and grammar context when it is available, and treat any NMT translation hint as supporting evidence rather than ground truth.

${pageContextBlock}

Context relevant to the user's query:
${retrievalContext}
`;

  if (inferenceProvider === "thoth") {
    return thothSystemPrompt;
  }

  if (inferenceProvider === "gemini") {
    return geminiSystemPrompt;
  }

  return shenuteSystemPrompt;
}

export function buildShenuteRetrievalAnalysisPrompt(options: {
  latestMessageText: string;
}) {
  return `You are assisting a RAG pipeline. The user query is: "${options.latestMessageText}".
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
`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : undefined;
}

function parseRetrievalAnalysisDirection(value: unknown) {
  return typeof value === "string" &&
    SHENUTE_RETRIEVAL_ANALYSIS_DIRECTIONS.has(
      value as ShenuteRetrievalAnalysisDirection,
    )
    ? (value as ShenuteRetrievalAnalysisDirection)
    : undefined;
}

function parseRetrievalAnalysisDialect(value: unknown) {
  return typeof value === "string" &&
    SHENUTE_RETRIEVAL_ANALYSIS_DIALECTS.has(
      value as ShenuteRetrievalAnalysisDialect,
    )
    ? (value as ShenuteRetrievalAnalysisDialect)
    : undefined;
}

function parseTranslationTarget(value: unknown) {
  if (!isRecord(value)) {
    return undefined;
  }

  const direction = parseRetrievalAnalysisDirection(value.direction);
  const dialect = parseRetrievalAnalysisDialect(value.dialect);
  const target: ShenuteRetrievalAnalysisTranslationTarget = {
    ...(typeof value.text === "string" ? { text: value.text } : {}),
    ...(typeof value.expertTranslation === "string"
      ? { expertTranslation: value.expertTranslation }
      : {}),
    ...(direction ? { direction } : {}),
    ...(dialect ? { dialect } : {}),
  };

  return Object.keys(target).length > 0 ? target : undefined;
}

/**
 * Parses the JSON object emitted by the retrieval-analysis model, tolerating
 * fenced JSON blocks while normalizing unknown fields to the expected schema.
 */
export function parseShenuteRetrievalAnalysisResponse(
  answer: string,
): ShenuteRetrievalAnalysisResponse {
  const parsed = tryParseJsonFromModelAnswer(answer);

  if (!isRecord(parsed)) {
    throw new Error("Shenute retrieval analysis did not return a JSON object.");
  }

  const keywords = parseStringArray(parsed.keywords);
  const grammaticalConcepts = parseStringArray(parsed.grammaticalConcepts);
  const translationTarget = parseTranslationTarget(parsed.translationTarget);

  return {
    ...(typeof parsed.germanTranslation === "string"
      ? { germanTranslation: parsed.germanTranslation }
      : {}),
    ...(keywords ? { keywords } : {}),
    ...(grammaticalConcepts ? { grammaticalConcepts } : {}),
    ...(translationTarget ? { translationTarget } : {}),
  };
}

export function buildThothAdminFeedbackRefinementPrompt(options: {
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
