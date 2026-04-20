import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import nextEnv from "@next/env";

type ChunkRow = {
  content: string;
  id: number;
  metadata: Record<string, unknown> | null;
};

type ChunkRecord = {
  chunkId: number;
  content: string;
  metadata: Record<string, unknown>;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const { loadEnvConfig } = nextEnv;
loadEnvConfig(path.resolve(__dirname, ".."));

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }

  return value;
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

function getTimestampId() {
  return new Date().toISOString().replace(/[-:.TZ]/g, "");
}

async function main() {
  const supabaseUrl = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");

  const limitArg = process.argv[2];
  const maxChunks = parsePositiveInt(limitArg, 2000);
  const pageSize = parsePositiveInt(process.env.DISTILL_EXTRACT_PAGE_SIZE, 500);

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const outputRoot = path.resolve(__dirname, "../tmp/distill");
  fs.mkdirSync(outputRoot, { recursive: true });

  const runId = getTimestampId();
  const chunksOutputPath = path.join(outputRoot, `chunks-${runId}.jsonl`);
  const manifestPath = path.join(outputRoot, `manifest-${runId}.json`);

  const chunksStream = fs.createWriteStream(chunksOutputPath, { flags: "w" });

  let offset = 0;
  let total = 0;

  while (total < maxChunks) {
    const end = Math.min(offset + pageSize - 1, maxChunks - 1);

    const { data, error } = await supabase
      .from("coptic_documents")
      .select("id, content, metadata")
      .order("id", { ascending: true })
      .range(offset, end);

    if (error) {
      throw new Error(`Failed to extract chunks: ${error.message}`);
    }

    const rows = (data ?? []) as ChunkRow[];
    if (rows.length === 0) {
      break;
    }

    for (const row of rows) {
      const record: ChunkRecord = {
        chunkId: row.id,
        content: row.content,
        metadata: (row.metadata ?? {}) as Record<string, unknown>,
      };

      chunksStream.write(`${JSON.stringify(record)}\n`);
      total += 1;

      if (total >= maxChunks) {
        break;
      }
    }

    offset += rows.length;

    if (rows.length < pageSize) {
      break;
    }
  }

  chunksStream.end();

  const manifest = {
    chunkCount: total,
    chunksFile: chunksOutputPath,
    createdAt: new Date().toISOString(),
    learnerName: "Shenute AI Learner",
    teacherName: "Shenute AI Expert",
  };

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  console.log(`Extracted ${total} chunks to ${chunksOutputPath}`);
  console.log(`Wrote manifest to ${manifestPath}`);
}

await main();
