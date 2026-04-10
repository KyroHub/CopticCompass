import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { ingestRagFile } from "@/features/admin/lib/ragIngestion";
import type { RagIngestionLogEntry } from "@/features/admin/lib/ragIngestion";
import { getProfileRole } from "@/features/profile/lib/server/queries";
import { getAuthenticatedUser } from "@/lib/supabase/authQueries";
import { hasSupabaseRuntimeEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 600;
export const runtime = "nodejs";

type JsonSourceIngestionFileResult = {
  chunksInserted?: number;
  error?: string;
  logs?: RagIngestionLogEntry[];
  sourcePath: string;
  success: boolean;
};

type JsonSourceIngestionResponse = {
  chunksInserted: number;
  embeddingProvider: "gemini" | "hf" | "openrouter";
  filesDiscovered: number;
  filesFailed: number;
  filesSucceeded: number;
  ingestId: string;
  message: string;
  results: JsonSourceIngestionFileResult[];
  success: boolean;
};

type JsonSourceIngestionRequest = {
  embeddingProvider?: "gemini" | "hf" | "openrouter";
  ingestId?: string;
};

const DATA_ROOT = path.join(process.cwd(), "public", "data");
const DICTIONARY_JSON_PATH = path.join(DATA_ROOT, "dictionary.json");
const GRAMMAR_JSON_CANDIDATE_DIRECTORIES = [
  path.join(DATA_ROOT, "grammar", "v1"),
  path.join(DATA_ROOT, "grammer", "v1"),
  path.join(DATA_ROOT, "grammar"),
  path.join(DATA_ROOT, "grammer"),
];

async function collectJsonFilesRecursively(
  directoryPath: string,
): Promise<string[]> {
  const entries = await readdir(directoryPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectJsonFilesRecursively(fullPath)));
      continue;
    }

    if (entry.isFile() && entry.name.toLowerCase().endsWith(".json")) {
      files.push(fullPath);
    }
  }

  return files;
}

async function collectJsonKnowledgeSourcePaths() {
  const sources = new Set<string>();

  try {
    await readFile(DICTIONARY_JSON_PATH, "utf-8");
    sources.add(DICTIONARY_JSON_PATH);
  } catch {
    // Dictionary source is optional for bulk runs.
  }

  for (const grammarDirectoryPath of GRAMMAR_JSON_CANDIDATE_DIRECTORIES) {
    try {
      const grammarFiles =
        await collectJsonFilesRecursively(grammarDirectoryPath);
      for (const grammarFile of grammarFiles) {
        sources.add(grammarFile);
      }
    } catch {
      // Candidate folder may not exist in all deployments.
    }
  }

  return Array.from(sources).sort((left, right) => left.localeCompare(right));
}

function buildSourceTitle(sourcePath: string) {
  const relativePath = path
    .relative(DATA_ROOT, sourcePath)
    .split(path.sep)
    .join("/");
  return `JSON Source: data/${relativePath}`;
}

function toProvider(value: unknown): "gemini" | "hf" | "openrouter" {
  if (value === "gemini") {
    return "gemini";
  }

  if (value === "openrouter") {
    return "openrouter";
  }

  return "hf";
}

export async function POST(request: Request) {
  let ingestId = crypto.randomUUID();

  try {
    if (!hasSupabaseRuntimeEnv()) {
      return NextResponse.json(
        {
          success: false,
          error: "RAG ingestion is unavailable right now.",
        },
        { status: 503 },
      );
    }

    const supabase = await createClient();
    const user = await getAuthenticatedUser(supabase);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "You must be signed in to ingest files.",
        },
        { status: 401 },
      );
    }

    const role = await getProfileRole(supabase, user.id);
    if (role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          error: "Only admins can ingest RAG documents.",
        },
        { status: 403 },
      );
    }

    const requestBody = (await request
      .json()
      .catch(() => ({}))) as JsonSourceIngestionRequest;
    const requestedIngestId = requestBody.ingestId;
    if (
      typeof requestedIngestId === "string" &&
      requestedIngestId.trim().length > 0
    ) {
      ingestId = requestedIngestId.trim();
    }
    const embeddingProvider = toProvider(requestBody.embeddingProvider);

    const sourcePaths = await collectJsonKnowledgeSourcePaths();
    if (sourcePaths.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No dictionary or grammar JSON files were found under public/data.",
          ingestId,
        },
        { status: 400 },
      );
    }

    const results: JsonSourceIngestionFileResult[] = [];
    let chunksInserted = 0;

    for (let index = 0; index < sourcePaths.length; index += 1) {
      const sourcePath = sourcePaths[index];

      try {
        const content = await readFile(sourcePath, "utf-8");
        if (content.trim().length === 0) {
          results.push({
            success: false,
            sourcePath: buildSourceTitle(sourcePath),
            error: "File is empty.",
          });
          continue;
        }

        const file = new File([content], path.basename(sourcePath), {
          type: "application/json",
        });

        const result = await ingestRagFile({
          embeddingProvider,
          enableOcr: false,
          file,
          ingestId: `${ingestId}-${index + 1}`,
          sourceTitle: buildSourceTitle(sourcePath),
          userId: user.id,
        });

        if (!result.success) {
          results.push({
            success: false,
            sourcePath: buildSourceTitle(sourcePath),
            error: result.error ?? "Ingestion failed for this source file.",
            logs: result.logs,
          });
          continue;
        }

        const insertedForFile = result.chunksInserted ?? 0;
        chunksInserted += insertedForFile;
        results.push({
          success: true,
          sourcePath: buildSourceTitle(sourcePath),
          chunksInserted: insertedForFile,
          logs: result.logs,
        });
      } catch (error) {
        results.push({
          success: false,
          sourcePath: buildSourceTitle(sourcePath),
          error:
            error instanceof Error ? error.message : "Unknown ingestion error.",
        });
      }
    }

    const filesSucceeded = results.filter((result) => result.success).length;
    const filesFailed = results.length - filesSucceeded;

    const responsePayload: JsonSourceIngestionResponse = {
      success: filesSucceeded > 0,
      ingestId,
      embeddingProvider,
      filesDiscovered: sourcePaths.length,
      filesSucceeded,
      filesFailed,
      chunksInserted,
      message:
        filesFailed === 0
          ? `Ingested ${chunksInserted} chunks from ${filesSucceeded} JSON sources.`
          : `Ingested ${chunksInserted} chunks from ${filesSucceeded}/${sourcePaths.length} JSON sources. ${filesFailed} failed.`,
      results,
    };

    if (filesSucceeded === 0) {
      return NextResponse.json(responsePayload, { status: 500 });
    }

    return NextResponse.json(responsePayload);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not ingest JSON knowledge sources.",
        ingestId,
      },
      { status: 500 },
    );
  }
}
