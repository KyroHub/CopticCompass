import type {
  NMTTranslationRequest,
  NMTTranslationSuggestion,
} from "@/lib/copticTranslator";

import type { ContextDoc } from "./chatTypes";

export type NMTTranslationTarget = {
  dialect?: NMTTranslationRequest["dialect"];
  direction?: NMTTranslationRequest["direction"];
  expertTranslation?: string;
  text?: string;
};

export function buildNMTContextDoc(
  suggestion: NMTTranslationSuggestion,
): ContextDoc {
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

export function shouldRequestNMTTranslation(options: {
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
