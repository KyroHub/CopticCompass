import "server-only";
export const CHUNK_SIZE = 1600;
export const CHUNK_OVERLAP = 200;
export const OCR_MIN_TEXT_LENGTH = 250;
export const EMBEDDING_BATCH_SIZE = Number(
  process.env.RAG_EMBEDDING_BATCH_SIZE ?? "32",
);
export const GEMINI_EMBEDDING_OUTPUT_DIMENSION = Number(
  process.env.GEMINI_EMBEDDING_OUTPUT_DIMENSION ?? "3072",
);
export const INSERT_BATCH_SIZE = Number(
  process.env.RAG_INSERT_BATCH_SIZE ?? "50",
);
export const OCR_TIMEOUT_MS = Number(process.env.RAG_OCR_TIMEOUT_MS ?? "90000");
export const OCR_MAX_RETRIES = Number(process.env.RAG_OCR_MAX_RETRIES ?? "2");
export const DB_INSERT_MAX_RETRIES = Number(
  process.env.RAG_DB_INSERT_MAX_RETRIES ?? "3",
);
export const RETRY_BASE_MS = Number(process.env.RAG_RETRY_BASE_MS ?? "1500");
export const RAG_VECTOR_DIMENSIONS = Number(
  process.env.RAG_VECTOR_DIMENSIONS ?? "768",
);
export const RAG_THOTH_ENABLED = process.env.RAG_THOTH_ENABLED !== "false";
export const RAG_THOTH_PROOFCHECK_REQUIRED =
  process.env.RAG_THOTH_PROOFCHECK_REQUIRED !== "false";
export const THOTH_CHUNK_INPUT_LIMIT = Number(
  process.env.RAG_THOTH_CHUNK_INPUT_LIMIT ?? "3000",
);
export const THOTH_JSON_SAMPLE_LIMIT = Number(
  process.env.RAG_THOTH_JSON_SAMPLE_LIMIT ?? "35000",
);
export const THOTH_RECONCILE_TEXT_LIMIT = Number(
  process.env.RAG_THOTH_RECONCILE_TEXT_LIMIT ?? "12000",
);
