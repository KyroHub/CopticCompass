export function buildThothChunkEnrichmentPrompt(options: {
  chunkText: string;
  inputLimit: number;
  sourceFileName: string;
}) {
  return `You are THOTH AI optimizing Coptic RAG ingestion.
Analyze the text chunk below and produce retrieval-optimized structured output.

Return only valid JSON with this schema:
{
  "category": "grammar" | "vocabulary" | "document",
  "rephrasedContent": "clean standalone text for embeddings",
  "retrievalKeywords": ["keyword1", "keyword2"],
  "retrievalSummary": "one sentence helping semantic retrieval",
  "metadata": {
    "topics": ["..."],
    "languages": ["Coptic", "English", "German"],
    "dialect": "Sahidic | Bohairic | Fayyumic | Akhmimic | Unknown",
    "grammatical_structures": ["..."],
    "parts_of_speech": ["..."],
    "has_coptic_examples": true,
    "linguistic_domain": "syntax | morphology | phonology | lexicography | general"
  }
}

File name: ${options.sourceFileName}
Chunk text:
${options.chunkText.slice(0, options.inputLimit)}`;
}

export function buildThothChunkProofcheckPrompt(options: {
  chunkText: string;
  fileName: string;
  inputLimit: number;
  metadata: Record<string, unknown>;
}) {
  return `You are THOTH AI performing mandatory final proof-check before a chunk is inserted into the Coptic knowledge base.
Rewrite the chunk for maximum retrieval quality while preserving factual meaning.
Correct OCR artifacts, normalize wording, improve clarity, and keep key Coptic/English/German terminology.

Return only valid JSON with this schema:
{
  "rewrittenContent": "final rewritten chunk for best retrieval",
  "retrievalKeywords": ["keyword1", "keyword2"],
  "retrievalSummary": "one sentence retrieval intent",
  "qualityScore": 0.0,
  "metadataPatch": {
    "type": "grammar | vocabulary | document",
    "dialect": "Sahidic | Bohairic | Fayyumic | Akhmimic | Unknown",
    "topics": ["..."],
    "languages": ["Coptic", "English", "German"]
  }
}

File name: ${options.fileName}
Existing metadata: ${JSON.stringify(options.metadata).slice(0, 1200)}
Chunk text:
${options.chunkText.slice(0, options.inputLimit)}`;
}

export function buildGeminiChunkEnrichmentPrompt(options: {
  chunkText: string;
  inputLimit: number;
}) {
  return `You are an expert in Coptic linguistics. Analyze the following text extracted from a document. 
Identify if this text primarily contains Grammar rules, Vocabulary/Dictionary entries, or just general text.
Rephrase, translate, or structure the content so it is highly optimized for an AI RAG vector search. If it contains vocabulary, format it distinctly with translations. If it contains grammar, explain the rule clearly and distinctly.
Output ONLY a valid JSON object matching this schema (do NOT wrap in \`\`\`json):
{
  "category": "grammar" | "vocabulary" | "document",
  "rephrasedContent": "The clean, standalone rephrased text describing the rule, words, or document...",
  "retrievalKeywords": ["keyword1", "keyword2"],
  "retrievalSummary": "one sentence helping semantic retrieval",
  "metadata": { 
    "topics": ["..."], 
    "keywords": ["..."],
    "languages": ["Coptic", "English", "German", ...],
    "dialect": "Sahidic | Bohairic | Fayyumic | Akhmimic | Unknown",
    "entities": ["..."],
    "complexity": "beginner" | "intermediate" | "advanced",
    "grammatical_structures": ["verb conjugation", "relative clause", ...],
    "parts_of_speech": ["noun", "verb", "preposition", ...],
    "has_coptic_examples": true,
    "linguistic_domain": "syntax" | "morphology" | "phonology" | "lexicography" | "general"
  }
}
Text to analyze:
${options.chunkText.slice(0, options.inputLimit)}`;
}

export function buildThothStructuredSourceExtractionPrompt(options: {
  sampleText: string;
  sourceFormat: "JSON" | "XML";
}) {
  return `You are THOTH AI enriching a Coptic RAG ingestion pipeline.
Extract records from this ${options.sourceFormat} source and return only valid JSON Array.
Schema for each element:
{
  "content": "standalone retrieval-optimized text",
  "metadata": { "type": "...", "topic": "...", "dialect": "..." },
  "retrievalKeywords": ["..."],
  "retrievalSummary": "..."
}
Data sample:
${options.sampleText}`;
}

export function buildGeminiStructuredSourceExtractionPrompt(options: {
  sampleText: string;
  sourceFormat: "JSON" | "XML";
}) {
  return `Analyze this ${options.sourceFormat} data. It contains semi-structured records.
Extract the records and normalize them into an array of structured JSON objects.
Generate a predictable schema for the metadata based on the fields you discover.
For each record, provide:
1. "content": A clean text paragraph summarizing the record (for vector embeddings).
2. "metadata": A JSON object containing the distinct fields found (e.g. title, meaning, author, type, category).
Output ONLY a valid JSON Array. Do not wrap with \`\`\`json.
Data:
${options.sampleText}`;
}

export function buildThothPdfOcrReconciliationPrompt(options: {
  inputLimit: number;
  nativePdfText: string;
  ocrText: string;
}) {
  return `You are THOTH AI reconciling OCR and native PDF extraction for Coptic language sources.
Return only valid JSON with schema:
{
  "strategy": "merge" | "ocr" | "pdf",
  "confidence": 0.0,
  "reconciledText": "single cleaned text"
}

Native PDF text:
${options.nativePdfText.slice(0, options.inputLimit)}

OCR text:
${options.ocrText.slice(0, options.inputLimit)}`;
}
