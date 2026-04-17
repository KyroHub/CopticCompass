import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import { fileURLToPath } from "url";
import nextEnv from "@next/env";

type ChunkRecord = {
  chunkId: number;
  content: string;
  metadata: Record<string, unknown>;
};

type TeacherQaPair = {
  instruction: string;
  response: string;
};

type TeacherNegative = {
  badAnswer: string;
  instruction: string;
  whyBad: string;
};

type TeacherOutput = {
  dialect?: string;
  hardNegatives?: TeacherNegative[];
  qaPairs?: TeacherQaPair[];
  qualityScore?: number;
  retrievalKeywords?: string[];
  retrievalSummary?: string;
  summary?: string;
  tags?: string[];
};

type TeacherRecord = {
  chunkId: number;
  content: string;
  metadata: Record<string, unknown>;
  teacher: {
    dialect?: string;
    hardNegatives: TeacherNegative[];
    qaPairs: TeacherQaPair[];
    qualityScore?: number;
    retrievalKeywords: string[];
    retrievalSummary?: string;
    summary: string;
    tags: string[];
  };
  teacherName: "Shenute AI Expert";
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const { loadEnvConfig } = nextEnv;
loadEnvConfig(path.resolve(__dirname, ".."));

const DISTILL_TEACHER_MAX_RETRIES = parseNonNegativeInt(
  process.env.DISTILL_TEACHER_MAX_RETRIES,
  3,
);
const DISTILL_TEACHER_RETRY_BASE_MS = parsePositiveInt(
  process.env.DISTILL_TEACHER_RETRY_BASE_MS,
  1200,
);
const DISTILL_TEACHER_RETRY_MAX_MS = parsePositiveInt(
  process.env.DISTILL_TEACHER_RETRY_MAX_MS,
  15000,
);
const DISTILL_TEACHER_TIMEOUT_MS = parsePositiveInt(
  process.env.DISTILL_TEACHER_TIMEOUT_MS,
  60000,
);

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }

  return value;
}

function getTimestampId() {
  return new Date().toISOString().replace(/[-:.TZ]/g, "");
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

function parseNonNegativeInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

function isRetryableStatus(status: number) {
  return (
    status === 408 ||
    status === 409 ||
    status === 425 ||
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504
  );
}

function computeRetryDelayMs(attemptNumber: number) {
  const exponential = DISTILL_TEACHER_RETRY_BASE_MS * 2 ** (attemptNumber - 1);
  const bounded = Math.min(exponential, DISTILL_TEACHER_RETRY_MAX_MS);
  const jitter = Math.floor(Math.random() * 300);
  return bounded + jitter;
}

function waitMs(durationMs: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, durationMs);
  });
}

class DistillTeacherRequestError extends Error {
  statusCode?: number;
  retryable: boolean;

  constructor(
    message: string,
    options?: { retryable?: boolean; statusCode?: number },
  ) {
    super(message);
    this.name = "DistillTeacherRequestError";
    this.statusCode = options?.statusCode;
    this.retryable = options?.retryable ?? false;
  }
}

function isRetryableTeacherError(error: unknown) {
  if (error instanceof DistillTeacherRequestError) {
    return error.retryable;
  }

  if (error instanceof TypeError) {
    return true;
  }

  if (error instanceof Error && error.name === "AbortError") {
    return true;
  }

  return false;
}

function findLatestChunksFile(rootDir: string) {
  const files = fs
    .readdirSync(rootDir)
    .filter((file) => file.startsWith("chunks-") && file.endsWith(".jsonl"))
    .sort();

  if (files.length === 0) {
    throw new Error(
      "No extracted chunk file found. Run distill:extract first.",
    );
  }

  return path.join(rootDir, files[files.length - 1]);
}

function normalizeStringArray(value: unknown, maxItems = 20) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  const normalized: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string") {
      continue;
    }

    const trimmed = entry.trim();
    if (!trimmed) {
      continue;
    }

    normalized.push(trimmed.slice(0, 120));
    if (normalized.length >= maxItems) {
      break;
    }
  }

  return normalized;
}

function tryParseJsonFromAnswer(answer: string) {
  const trimmed = answer.trim();
  const candidates: string[] = [trimmed];

  const fenced = [...trimmed.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)];
  for (const match of fenced) {
    if (match[1]) {
      candidates.push(match[1].trim());
    }
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(trimmed.slice(firstBrace, lastBrace + 1));
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as TeacherOutput;
    } catch {
      // Continue trying.
    }
  }

  return null;
}

async function callShenuteExpert(options: {
  chunk: ChunkRecord;
  thothApiKey: string;
  thothBaseUrl: string;
}) {
  const prompt = `You are Shenute AI Expert.
Create distillation-ready teaching data from this Coptic knowledge chunk.
Return only valid JSON with schema:
{
  "summary": "short faithful summary",
  "retrievalKeywords": ["..."],
  "retrievalSummary": "retrieval intent sentence",
  "dialect": "Sahidic | Bohairic | Fayyumic | Akhmimic | Unknown",
  "tags": ["..."],
  "qualityScore": 0.0,
  "qaPairs": [{"instruction": "...", "response": "..."}],
  "hardNegatives": [{"instruction": "...", "badAnswer": "...", "whyBad": "..."}]
}

Chunk metadata: ${JSON.stringify(options.chunk.metadata).slice(0, 1000)}
Chunk content:
${options.chunk.content.slice(0, 3200)}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, DISTILL_TEACHER_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${options.thothBaseUrl}/chat-messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${options.thothApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: {},
        query: prompt,
        response_mode: "blocking",
        user: `distill-teacher-${options.chunk.chunkId}`,
      }),
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new DistillTeacherRequestError(
        `Shenute AI Expert request timed out after ${DISTILL_TEACHER_TIMEOUT_MS}ms`,
        { retryable: true, statusCode: 408 },
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const details = (await response.text()).slice(0, 1600);
    throw new DistillTeacherRequestError(
      `Shenute AI Expert generation failed (${response.status}): ${details}`,
      {
        retryable: isRetryableStatus(response.status),
        statusCode: response.status,
      },
    );
  }

  const payload = (await response.json()) as { answer?: string };
  if (!payload.answer) {
    throw new Error("Shenute AI Expert returned empty answer.");
  }

  return payload.answer;
}

async function callShenuteExpertWithRetry(options: {
  chunk: ChunkRecord;
  thothApiKey: string;
  thothBaseUrl: string;
}) {
  const maxAttempts = DISTILL_TEACHER_MAX_RETRIES + 1;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await callShenuteExpert(options);
    } catch (error) {
      const isLastAttempt = attempt >= maxAttempts;
      const shouldRetry = !isLastAttempt && isRetryableTeacherError(error);

      if (!shouldRetry) {
        throw error;
      }

      const delayMs = computeRetryDelayMs(attempt);
      const reason = error instanceof Error ? error.message : String(error);
      console.warn(
        `Teacher call retry ${attempt}/${DISTILL_TEACHER_MAX_RETRIES} for chunk ${options.chunk.chunkId} after ${delayMs}ms: ${reason}`,
      );
      await waitMs(delayMs);
    }
  }

  throw new Error("Unexpected retry flow state.");
}

function normalizeTeacherRecord(
  chunk: ChunkRecord,
  teacherOutput: TeacherOutput,
) {
  const qaPairs = Array.isArray(teacherOutput.qaPairs)
    ? teacherOutput.qaPairs.filter(
        (pair): pair is TeacherQaPair =>
          Boolean(pair) &&
          typeof pair.instruction === "string" &&
          typeof pair.response === "string" &&
          pair.instruction.trim().length > 0 &&
          pair.response.trim().length > 0,
      )
    : [];

  const hardNegatives = Array.isArray(teacherOutput.hardNegatives)
    ? teacherOutput.hardNegatives.filter(
        (entry): entry is TeacherNegative =>
          Boolean(entry) &&
          typeof entry.instruction === "string" &&
          typeof entry.badAnswer === "string" &&
          typeof entry.whyBad === "string" &&
          entry.instruction.trim().length > 0 &&
          entry.badAnswer.trim().length > 0,
      )
    : [];

  const summary =
    typeof teacherOutput.summary === "string" && teacherOutput.summary.trim()
      ? teacherOutput.summary.trim()
      : chunk.content.slice(0, 500);

  const qualityScore =
    typeof teacherOutput.qualityScore === "number" &&
    Number.isFinite(teacherOutput.qualityScore)
      ? Math.max(0, Math.min(1, teacherOutput.qualityScore))
      : undefined;

  const teacherRecord: TeacherRecord = {
    chunkId: chunk.chunkId,
    content: chunk.content,
    metadata: chunk.metadata,
    teacher: {
      dialect:
        typeof teacherOutput.dialect === "string"
          ? teacherOutput.dialect.trim()
          : undefined,
      hardNegatives,
      qaPairs,
      qualityScore,
      retrievalKeywords: normalizeStringArray(teacherOutput.retrievalKeywords),
      retrievalSummary:
        typeof teacherOutput.retrievalSummary === "string"
          ? teacherOutput.retrievalSummary.trim().slice(0, 280)
          : undefined,
      summary,
      tags: normalizeStringArray(teacherOutput.tags),
    },
    teacherName: "Shenute AI Expert",
  };

  return teacherRecord;
}

async function main() {
  const thothApiKey = getRequiredEnv("THOTH_API_KEY");
  const thothBaseUrl = process.env.THOTH_BASE_URL ?? "https://api.dify.ai/v1";

  const distillRoot = path.resolve(__dirname, "../tmp/distill");
  fs.mkdirSync(distillRoot, { recursive: true });

  const inputPath = process.argv[2]
    ? path.resolve(process.cwd(), process.argv[2])
    : findLatestChunksFile(distillRoot);

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input chunk file not found: ${inputPath}`);
  }

  const runId = getTimestampId();
  const outputPath = path.join(distillRoot, `teacher-${runId}.jsonl`);
  const stream = fs.createWriteStream(outputPath, { flags: "w" });

  const input = fs.createReadStream(inputPath, "utf8");
  const rl = readline.createInterface({ crlfDelay: Infinity, input });

  let index = 0;
  let successCount = 0;

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    index += 1;
    const chunk = JSON.parse(trimmed) as ChunkRecord;

    try {
      const answer = await callShenuteExpertWithRetry({
        chunk,
        thothApiKey,
        thothBaseUrl,
      });
      const parsed = tryParseJsonFromAnswer(answer);
      if (!parsed) {
        throw new Error("Could not parse teacher JSON output.");
      }

      const record = normalizeTeacherRecord(chunk, parsed);
      stream.write(`${JSON.stringify(record)}\n`);
      successCount += 1;
    } catch (error) {
      console.warn(
        `Teacher generation failed for chunk ${chunk.chunkId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  stream.end();

  console.log(`Teacher distillation records: ${successCount}/${index}`);
  console.log(`Wrote teacher data to ${outputPath}`);
}

await main();
