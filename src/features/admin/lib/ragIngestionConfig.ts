import "server-only";
import { getRagVectorRuntimeConfig } from "@/lib/ai/ragRuntimeConfig";
import { readBooleanEnv, readNumberEnv } from "@/lib/env";

const ragVectorRuntimeConfig = getRagVectorRuntimeConfig(process.env);

export const CHUNK_SIZE = 1600;
export const CHUNK_OVERLAP = 200;
export const OCR_MIN_TEXT_LENGTH = 250;
export const EMBEDDING_BATCH_SIZE = readNumberEnv(
  process.env,
  "RAG_EMBEDDING_BATCH_SIZE",
  32,
);
export const GEMINI_EMBEDDING_OUTPUT_DIMENSION =
  ragVectorRuntimeConfig.geminiEmbeddingOutputDimension;
export const INSERT_BATCH_SIZE = readNumberEnv(
  process.env,
  "RAG_INSERT_BATCH_SIZE",
  50,
);
export const OCR_TIMEOUT_MS = readNumberEnv(
  process.env,
  "RAG_OCR_TIMEOUT_MS",
  90000,
);
export const OCR_MAX_RETRIES = readNumberEnv(
  process.env,
  "RAG_OCR_MAX_RETRIES",
  2,
);
export const DB_INSERT_MAX_RETRIES = readNumberEnv(
  process.env,
  "RAG_DB_INSERT_MAX_RETRIES",
  3,
);
export const RETRY_BASE_MS = readNumberEnv(
  process.env,
  "RAG_RETRY_BASE_MS",
  1500,
);
export const RAG_VECTOR_DIMENSIONS = ragVectorRuntimeConfig.vectorDimensions;
export const RAG_THOTH_ENABLED = readBooleanEnv(
  process.env,
  "RAG_THOTH_ENABLED",
  true,
);
export const RAG_THOTH_PROOFCHECK_REQUIRED = readBooleanEnv(
  process.env,
  "RAG_THOTH_PROOFCHECK_REQUIRED",
  true,
);
export const THOTH_CHUNK_INPUT_LIMIT = readNumberEnv(
  process.env,
  "RAG_THOTH_CHUNK_INPUT_LIMIT",
  3000,
);
export const THOTH_JSON_SAMPLE_LIMIT = readNumberEnv(
  process.env,
  "RAG_THOTH_JSON_SAMPLE_LIMIT",
  35000,
);
export const THOTH_RECONCILE_TEXT_LIMIT = readNumberEnv(
  process.env,
  "RAG_THOTH_RECONCILE_TEXT_LIMIT",
  12000,
);
