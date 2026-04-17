import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

type TeacherQaPair = {
  instruction: string;
  response: string;
};

type TeacherNegative = {
  badAnswer: string;
  instruction: string;
  whyBad: string;
};

type TeacherRecord = {
  chunkId: number;
  content: string;
  metadata: Record<string, unknown>;
  teacher: {
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

type SftExample = {
  messages: Array<{ content: string; role: "assistant" | "system" | "user" }>;
  metadata: Record<string, unknown>;
};

type PreferenceExample = {
  chosen: string;
  metadata: Record<string, unknown>;
  prompt: string;
  rejected: string;
  source: "Shenute AI Expert";
};

type RetrievalExample = {
  metadata: Record<string, unknown>;
  positive_chunk_id: number;
  positive_text: string;
  query: string;
  retrieval_keywords: string[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getTimestampId() {
  return new Date().toISOString().replace(/[-:.TZ]/g, "");
}

function findLatestTeacherFile(rootDir: string) {
  const files = fs
    .readdirSync(rootDir)
    .filter((file) => file.startsWith("teacher-") && file.endsWith(".jsonl"))
    .sort();

  if (files.length === 0) {
    throw new Error("No teacher file found. Run distill:teacher first.");
  }

  return path.join(rootDir, files[files.length - 1]);
}

function writeJsonl(filePath: string, rows: unknown[]) {
  const content = rows.map((row) => JSON.stringify(row)).join("\n");
  fs.writeFileSync(filePath, content.length > 0 ? `${content}\n` : "");
}

function splitRows<T>(rows: T[], trainRatio = 0.9) {
  const trainCount = Math.floor(rows.length * trainRatio);
  return {
    train: rows.slice(0, trainCount),
    val: rows.slice(trainCount),
  };
}

function toSftExamples(record: TeacherRecord): SftExample[] {
  const systemMessage =
    "You are Shenute AI Learner. Follow Shenute AI Expert quality standards. Use precise Coptic terminology and avoid hallucinations.";

  return record.teacher.qaPairs.map((pair) => ({
    messages: [
      { content: systemMessage, role: "system" },
      { content: pair.instruction, role: "user" },
      { content: pair.response, role: "assistant" },
    ],
    metadata: {
      chunkId: record.chunkId,
      qualityScore: record.teacher.qualityScore ?? null,
      source: "Shenute AI Expert",
      tags: record.teacher.tags,
    },
  }));
}

function toPreferenceExamples(record: TeacherRecord): PreferenceExample[] {
  const fallbackChosen =
    record.teacher.qaPairs[0]?.response ?? record.teacher.summary;

  return record.teacher.hardNegatives.map((negative) => {
    const matchingQa = record.teacher.qaPairs.find(
      (pair) => pair.instruction.trim() === negative.instruction.trim(),
    );

    return {
      chosen: matchingQa?.response ?? fallbackChosen,
      metadata: {
        chunkId: record.chunkId,
        whyBad: negative.whyBad,
      },
      prompt: negative.instruction,
      rejected: negative.badAnswer,
      source: "Shenute AI Expert",
    };
  });
}

function toRetrievalExamples(record: TeacherRecord): RetrievalExample[] {
  const positiveText = record.teacher.summary || record.content.slice(0, 600);

  return record.teacher.qaPairs.map((pair) => ({
    metadata: {
      chunkId: record.chunkId,
      source: "Shenute AI Expert",
      tags: record.teacher.tags,
    },
    positive_chunk_id: record.chunkId,
    positive_text: positiveText,
    query: pair.instruction,
    retrieval_keywords: record.teacher.retrievalKeywords,
  }));
}

async function main() {
  const distillRoot = path.resolve(__dirname, "../tmp/distill");
  fs.mkdirSync(distillRoot, { recursive: true });

  const inputPath = process.argv[2]
    ? path.resolve(process.cwd(), process.argv[2])
    : findLatestTeacherFile(distillRoot);

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Teacher file not found: ${inputPath}`);
  }

  const rows = fs
    .readFileSync(inputPath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as TeacherRecord);

  const sftExamples: SftExample[] = [];
  const preferenceExamples: PreferenceExample[] = [];
  const retrievalExamples: RetrievalExample[] = [];

  for (const row of rows) {
    sftExamples.push(...toSftExamples(row));
    preferenceExamples.push(...toPreferenceExamples(row));
    retrievalExamples.push(...toRetrievalExamples(row));
  }

  const timestampId = getTimestampId();
  const outputDir = path.join(distillRoot, `datasets-${timestampId}`);
  fs.mkdirSync(outputDir, { recursive: true });

  const sftSplit = splitRows(sftExamples);
  const prefSplit = splitRows(preferenceExamples);
  const retrievalSplit = splitRows(retrievalExamples);

  writeJsonl(path.join(outputDir, "sft-train.jsonl"), sftSplit.train);
  writeJsonl(path.join(outputDir, "sft-val.jsonl"), sftSplit.val);
  writeJsonl(path.join(outputDir, "preference-train.jsonl"), prefSplit.train);
  writeJsonl(path.join(outputDir, "preference-val.jsonl"), prefSplit.val);
  writeJsonl(path.join(outputDir, "retrieval-train.jsonl"), retrievalSplit.train);
  writeJsonl(path.join(outputDir, "retrieval-val.jsonl"), retrievalSplit.val);

  const manifest = {
    createdAt: new Date().toISOString(),
    inputFile: inputPath,
    learnerName: "Shenute AI Learner",
    teacherName: "Shenute AI Expert",
    totals: {
      preference: preferenceExamples.length,
      retrieval: retrievalExamples.length,
      sft: sftExamples.length,
    },
  };

  fs.writeFileSync(
    path.join(outputDir, "manifest.json"),
    JSON.stringify(manifest, null, 2),
  );

  console.log(`Built Shenute distillation datasets in ${outputDir}`);
  console.log(
    `SFT=${sftExamples.length}, PREF=${preferenceExamples.length}, RETR=${retrievalExamples.length}`,
  );
}

await main();
