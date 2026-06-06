import { generateText } from "ai";

import {
  buildShenuteRetrievalAnalysisPrompt,
  parseShenuteRetrievalAnalysisResponse,
} from "@/lib/ai/prompts/shenute";
import {
  requestNMTTranslation,
  type NMTTranslationSuggestion,
} from "@/lib/copticTranslator";
import {
  formatNMTForDistillation,
  recordDistillationExample,
} from "@/lib/distillation";
import { getGeminiModel } from "@/lib/gemini";

import { searchCopticDocuments, searchVocabularyByKeywords } from "./retrieval";
import {
  buildNMTContextDoc,
  shouldRequestNMTTranslation,
} from "./translationContext";

import type {
  ContextDoc,
  InferenceProvider,
  RagInferenceProvider,
} from "./chatTypes";
import type { NMTTranslationTarget } from "./translationContext";

/**
 * Deduplicates retrieved chunks and formats them into the bounded context block
 * injected into Shenute's system prompt.
 */
function buildContextText(contextChunks: ContextDoc[]) {
  const uniqueContents = new Set<string>();
  const finalDocs = contextChunks.filter((doc) => {
    if (uniqueContents.has(doc.content)) {
      return false;
    }
    uniqueContents.add(doc.content);
    return true;
  });

  if (finalDocs.length === 0) {
    console.warn("[RAG DEBUG] Vector and keyword search returned 0 results.");
    return "";
  }

  const contextText = finalDocs
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

  if (contextText.length <= 25000) {
    return contextText;
  }

  return `${contextText.slice(
    0,
    25000,
  )}\n...[Context Truncated to fit token limits]`;
}

/**
 * Requests an NMT hint only when retrieval analysis isolated a genuine
 * translation target and the selected assistant provider benefits from it.
 */
async function maybeRequestNMTTranslation(options: {
  latestMessageText: string;
  nmtSuggestion: NMTTranslationSuggestion | null;
  shouldUseNmtSuggestion: boolean;
  translationTarget?: NMTTranslationTarget;
}) {
  const { latestMessageText, translationTarget } = options;
  if (
    !options.shouldUseNmtSuggestion ||
    options.nmtSuggestion ||
    !translationTarget?.text ||
    !translationTarget.direction ||
    !shouldRequestNMTTranslation({
      direction: translationTarget.direction,
      targetText: translationTarget.text,
      userText: latestMessageText,
    })
  ) {
    return null;
  }

  console.warn(
    `[RAG DEBUG] LLM isolated translation target: "${translationTarget.text}" (${translationTarget.direction})`,
  );

  try {
    const suggestion = await requestNMTTranslation({
      dialect: translationTarget.dialect ?? "Bohairic",
      direction: translationTarget.direction,
      originalPrompt: latestMessageText,
      textToTranslate: translationTarget.text,
    });

    if (suggestion) {
      console.warn(
        `[RAG DEBUG] NMT translation hint (LLM-triggered): "${translationTarget.text}" -> "${suggestion.translatedText}" (${suggestion.direction})`,
      );
    }

    return suggestion;
  } catch (error) {
    console.error("LLM-triggered NMT request failed:", error);
    return null;
  }
}

/**
 * Records expert translation targets for later distillation whenever the
 * retrieval-analysis model supplied an authoritative translation.
 */
function recordTranslationDistillationExample(options: {
  latestMessageText: string;
  nmtSuggestion: NMTTranslationSuggestion | null;
  translationTarget?: NMTTranslationTarget;
}) {
  const { latestMessageText, nmtSuggestion, translationTarget } = options;
  if (
    !translationTarget?.text ||
    !translationTarget.expertTranslation ||
    !shouldRequestNMTTranslation({
      direction: translationTarget.direction,
      targetText: translationTarget.text,
      userText: latestMessageText,
    })
  ) {
    return null;
  }

  recordDistillationExample({
    taskType: "translation",
    prompt: translationTarget.text,
    teacherAnswer: translationTarget.expertTranslation,
    studentTarget: nmtSuggestion
      ? formatNMTForDistillation(nmtSuggestion)
      : undefined,
    metadata: {
      direction: translationTarget.direction,
      dialect: translationTarget.dialect,
      original_prompt: latestMessageText,
    },
  }).catch((err) => console.error("Distillation recording failed:", err));

  return translationTarget.text;
}

/**
 * Uses Gemini as a routing assistant for retrieval: it expands keywords,
 * extracts grammar concepts, and optionally isolates a translation target for
 * NMT/context enrichment.
 */
async function analyzeRetrievalPrompt(options: {
  latestMessageText: string;
  nmtSuggestion: NMTTranslationSuggestion | null;
  retrievalPromptSegments: Set<string>;
  shouldUseNmtSuggestion: boolean;
}) {
  let extractedKeywords: string[] = [];
  let extractedConcepts: string[] = [];
  let isolatedTargetText: string | null = null;
  let nmtSuggestion = options.nmtSuggestion;

  try {
    const kwResponse = await generateText({
      model: getGeminiModel(),
      prompt: buildShenuteRetrievalAnalysisPrompt({
        latestMessageText: options.latestMessageText,
      }),
    });
    const parsed = parseShenuteRetrievalAnalysisResponse(kwResponse.text);

    if (parsed.germanTranslation) {
      options.retrievalPromptSegments.add(parsed.germanTranslation);
      console.warn(
        `[RAG DEBUG] Translated prompt for vector search:`,
        parsed.germanTranslation,
      );
    }

    if (Array.isArray(parsed.keywords)) {
      extractedKeywords = parsed.keywords
        .map((k) => k.trim().toLowerCase())
        .filter(Boolean);
    }

    if (Array.isArray(parsed.grammaticalConcepts)) {
      extractedConcepts = parsed.grammaticalConcepts
        .map((k) => k.trim())
        .filter(Boolean);
    }

    const requestedSuggestion = await maybeRequestNMTTranslation({
      latestMessageText: options.latestMessageText,
      nmtSuggestion,
      shouldUseNmtSuggestion: options.shouldUseNmtSuggestion,
      translationTarget: parsed.translationTarget,
    });

    if (requestedSuggestion) {
      nmtSuggestion = requestedSuggestion;
      options.retrievalPromptSegments.add(requestedSuggestion.translatedText);
      if (requestedSuggestion.textToTranslate) {
        options.retrievalPromptSegments.add(
          requestedSuggestion.textToTranslate,
        );
      }
    }

    isolatedTargetText = recordTranslationDistillationExample({
      latestMessageText: options.latestMessageText,
      nmtSuggestion,
      translationTarget: parsed.translationTarget,
    });

    console.warn(`[RAG DEBUG] Extracted keywords:`, extractedKeywords);
    console.warn(`[RAG DEBUG] Extracted concepts:`, extractedConcepts);
  } catch (e) {
    console.error("Keyword/Translation extraction failed:", e);
  }

  return {
    extractedConcepts,
    extractedKeywords,
    isolatedTargetText,
    nmtSuggestion,
  };
}

/**
 * Builds the final RAG context for one Shenute turn by combining NMT hints,
 * keyword vocabulary hits, grammar concept search, and broad vector retrieval.
 */
export async function buildShenuteRagContext(options: {
  inferenceProvider: InferenceProvider;
  latestMessageText: string;
  ragInferenceProvider: RagInferenceProvider;
}) {
  if (!options.latestMessageText) {
    return "";
  }

  try {
    const shouldUseNmtSuggestion = options.inferenceProvider !== "gemini";
    const retrievalPromptSegments = new Set<string>([
      options.latestMessageText,
    ]);
    const analysis = await analyzeRetrievalPrompt({
      latestMessageText: options.latestMessageText,
      nmtSuggestion: null,
      retrievalPromptSegments,
      shouldUseNmtSuggestion,
    });
    const keywordCandidates = [
      ...analysis.extractedKeywords,
      ...(analysis.isolatedTargetText &&
      analysis.isolatedTargetText.length <= 120
        ? [analysis.isolatedTargetText]
        : []),
      ...(analysis.nmtSuggestion?.translatedText &&
      analysis.nmtSuggestion.translatedText.length <= 120
        ? [analysis.nmtSuggestion.translatedText]
        : []),
    ];
    const dedupedKeywordCandidates = Array.from(new Set(keywordCandidates));
    const contextChunks: ContextDoc[] = analysis.nmtSuggestion
      ? [buildNMTContextDoc(analysis.nmtSuggestion)]
      : [];

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

    if (analysis.extractedConcepts.length > 0) {
      const grammarQuery = analysis.extractedConcepts.join(" ");
      const grammarDocs = await searchCopticDocuments(
        grammarQuery,
        3,
        { type: "grammar" },
        options.ragInferenceProvider,
      );
      if (grammarDocs && grammarDocs.length > 0) {
        console.warn(
          `[RAG DEBUG] Found ${grammarDocs.length} grammar chunks via concept search.`,
        );
        contextChunks.push(...grammarDocs);
      }
    }

    const translatedPrompt = Array.from(retrievalPromptSegments).join("\n");
    const vectorDocs = await searchCopticDocuments(
      translatedPrompt,
      8,
      {},
      options.ragInferenceProvider,
    );
    console.warn(
      `[RAG DEBUG] Retrieved ${vectorDocs?.length || 0} documents from vector search using ${options.inferenceProvider}.`,
    );
    if (vectorDocs && vectorDocs.length > 0) {
      contextChunks.push(...vectorDocs);
    }

    return buildContextText(contextChunks);
  } catch (error) {
    console.error("Vector search failed:", error);
    return "";
  }
}
