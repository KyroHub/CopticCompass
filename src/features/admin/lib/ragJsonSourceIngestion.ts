import { generateText } from "ai";

import { getGeminiModel } from "@/lib/gemini";

import { THOTH_JSON_SAMPLE_LIMIT } from "./ragIngestionConfig";
import {
  normalizeWhitespace,
  runThothStructuredTask,
  stripHtml,
  toStringArray,
  tryParseJsonFromModelAnswer,
} from "./ragIngestionUtils";
import {
  buildStructuredJsonChunks,
  type StructuredJsonChunkMode,
} from "./structuredJsonChunks";

import type { RagChunkWithMetadata } from "./ragIngestionTypes";

/**
 * Sanitizes model-generated chunks into the internal RAG shape. Only string
 * content survives, while metadata and retrieval hints are bounded for storage.
 */
function normalizeStructuredChunkArray(value: unknown): RagChunkWithMetadata[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized: RagChunkWithMetadata[] = [];

  for (const entry of value) {
    if (!entry || typeof entry !== "object") {
      continue;
    }

    const candidate = entry as {
      content?: unknown;
      metadata?: unknown;
      retrievalKeywords?: unknown;
      retrievalSummary?: unknown;
    };

    const content =
      typeof candidate.content === "string"
        ? normalizeWhitespace(candidate.content)
        : "";
    if (!content) {
      continue;
    }

    const metadata =
      candidate.metadata && typeof candidate.metadata === "object"
        ? (candidate.metadata as Record<string, unknown>)
        : {};

    normalized.push({
      content,
      metadata: {
        ...metadata,
        retrieval_keywords: toStringArray(candidate.retrievalKeywords),
        retrieval_summary:
          typeof candidate.retrievalSummary === "string"
            ? normalizeWhitespace(candidate.retrievalSummary).slice(0, 280)
            : null,
        type:
          typeof metadata.type === "string"
            ? metadata.type
            : "llm_generated_schema",
      },
    });
  }

  return normalized;
}

/**
 * Handles TEI-like vocabulary XML directly before invoking model fallback.
 * These records have stable enough tags that deterministic parsing is safer
 * than schema inference.
 */
function buildXmlVocabularyChunks(text: string): RagChunkWithMetadata[] | null {
  const entryRegex = /<entry[^>]*>([\s\S]*?)<\/entry>/gi;
  const matches = [...text.matchAll(entryRegex)];
  if (matches.length === 0) {
    return null;
  }

  return matches
    .map((match) => {
      const entryXml = match[1] || "";

      const orthMatch = entryXml.match(/<orth[^>]*>([\s\S]*?)<\/orth>/i);
      const posMatch = entryXml.match(/<pos[^>]*>([\s\S]*?)<\/pos>/i);
      const defMatch =
        entryXml.match(/<quote[^>]*>([\s\S]*?)<\/quote>/i) ||
        entryXml.match(/<def[^>]*>([\s\S]*?)<\/def>/i);
      const gramMatch = entryXml.match(/<gramGrp[^>]*>([\s\S]*?)<\/gramGrp>/i);

      const word = orthMatch ? stripHtml(orthMatch[1]) : "";
      const pos = posMatch ? stripHtml(posMatch[1]) : "";
      const definition = defMatch ? stripHtml(defMatch[1]) : "";
      const grammar = gramMatch
        ? stripHtml(gramMatch[1]).replace(/\s+/g, " ")
        : "";

      if (word || definition) {
        let parsedContent = `Coptic Word: ${word}.`;
        if (pos) {
          parsedContent += ` Part of Speech: ${pos}.`;
        }
        if (definition) {
          parsedContent += ` Definition: ${definition}.`;
        }
        if (grammar) {
          parsedContent += ` Grammar/Notes: ${grammar}.`;
        }

        return {
          content: parsedContent.trim(),
          metadata: {
            type: "vocabulary_xml",
            word,
            englishTranslation: definition,
            partOfSpeech: pos,
            definition,
            grammar,
            translation: definition,
          },
        };
      }

      return {
        content: match[0]
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim(),
        metadata: { type: "vocabulary_xml" },
      };
    })
    .filter((chunk) => chunk.content.length > 10);
}

/**
 * Prefers known structured JSON/XML parsing before model-assisted schema
 * inference. Returning null deliberately hands unknown formats back to semantic
 * chunking instead of treating a weak parse as authoritative.
 */
export async function buildJsonOrXmlSourceChunks(options: {
  enrichChunks: (
    chunks: RagChunkWithMetadata[],
  ) => Promise<RagChunkWithMetadata[]>;
  fileName: string;
  ingestId?: string;
  jsonChunkMode: StructuredJsonChunkMode;
  skipThothEnrichment: boolean;
  text: string;
  userId?: string;
}): Promise<RagChunkWithMetadata[] | null> {
  const normalizedFileName = options.fileName.toLowerCase();
  const isJson = normalizedFileName.endsWith(".json");
  const isXml = normalizedFileName.endsWith(".xml");

  if (isJson) {
    const structuredJsonChunks = buildStructuredJsonChunks(options.text, {
      mode: options.jsonChunkMode,
    });

    if (structuredJsonChunks && structuredJsonChunks.length > 0) {
      return options.skipThothEnrichment
        ? structuredJsonChunks
        : options.enrichChunks(structuredJsonChunks);
    }
  }

  if (isXml) {
    const xmlChunks = buildXmlVocabularyChunks(options.text);
    if (xmlChunks) {
      return options.enrichChunks(xmlChunks);
    }
  }

  if (!isJson && !isXml) {
    return null;
  }

  try {
    const sampleText = options.text.slice(0, THOTH_JSON_SAMPLE_LIMIT);
    const thothParsed = await runThothStructuredTask({
      ingestId: options.ingestId ?? "local",
      prompt: `You are THOTH AI enriching a Coptic RAG ingestion pipeline.
Extract records from this ${isJson ? "JSON" : "XML"} source and return only valid JSON Array.
Schema for each element:
{
  "content": "standalone retrieval-optimized text",
  "metadata": { "type": "...", "topic": "...", "dialect": "..." },
  "retrievalKeywords": ["..."],
  "retrievalSummary": "..."
}
Data sample:
${sampleText}`,
      taskTag: "schema-extract",
      userId: options.userId ?? "system",
    });

    const thothChunks = normalizeStructuredChunkArray(thothParsed);
    if (thothChunks.length > 0) {
      return thothChunks;
    }

    const result = await generateText({
      model: getGeminiModel(),
      prompt: `Analyze this ${isJson ? "JSON" : "XML"} data. It contains semi-structured records.
Extract the records and normalize them into an array of structured JSON objects.
Generate a predictable schema for the metadata based on the fields you discover.
For each record, provide:
1. "content": A clean text paragraph summarizing the record (for vector embeddings).
2. "metadata": A JSON object containing the distinct fields found (e.g. title, meaning, author, type, category).
Output ONLY a valid JSON Array. Do not wrap with \`\`\`json.
Data:
${sampleText}`,
    });

    const dynamicallyParsed = tryParseJsonFromModelAnswer(result.text);
    const normalized = normalizeStructuredChunkArray(dynamicallyParsed);

    if (normalized.length > 0) {
      return normalized;
    }
  } catch (llmError) {
    console.warn(
      "[RAG Ingestion] LLM fallback parsing for new schema failed. Falling back to semantic chunking.",
      llmError,
    );
  }

  return null;
}
